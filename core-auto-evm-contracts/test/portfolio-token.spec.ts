import {expect} from "chai";
import {ethers} from "hardhat";
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";

import {PortfolioToken} from "./helpers/portfolio-token";
import {ZeroAddress} from 'ethers';
import {add, floatToInt, intToFloat, normalizeFloatNumber, sub} from './helpers/utils';
import Big from 'big.js';

describe("PortfolioToken contract", function () {
  let portfolioToken: PortfolioToken;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  beforeEach(async () => {
    portfolioToken = await PortfolioToken.init();
    ({alice, bob} = portfolioToken.actors.getActors());
    await portfolioToken.activatePools(1, 2);
  });

  it("basic ERC-20 check", async () => {
    expect(await portfolioToken.contract.name()).to.equal("Core Portfolio");
    expect(await portfolioToken.contract.symbol()).to.equal("$CORE");
    expect(await portfolioToken.contract.decimals()).to.equal(3);
  });

  describe("Token Allowance", () => {
    it("increaseAllowance by 100", async () => {
      const {pool1} = portfolioToken.getPools();
      await portfolioToken.increaseAllowance(alice, pool1, 100)
        .then(result => result.expectEmitApprovalEvent(alice, pool1, 100))
      await portfolioToken.assertAllowance(alice, pool1, 100)
    });

    it("approve to 100", async () => {
      const {pool1} = portfolioToken.getPools();
      await portfolioToken.approve(alice, pool1, 100)
        .then(result => result.expectEmitApprovalEvent(alice, pool1, 100))
      await portfolioToken.assertAllowance(alice, pool1, 100)
    });

    it("Shouldn't approve for a zero-address spender", async () => {
      await expect(portfolioToken.contract.approve(ZeroAddress, "10")).revertedWith(
        "ERC20: approve to the zero address"
      );
    });

    it("Shouldn't transferFrom for a zero-address 'from'", async () => {
      await expect(portfolioToken.contract.connect(alice).transferFrom(ZeroAddress, bob, "100")).revertedWith(
        "ERC20: insufficient allowance"
      );
    });

    it("decreaseAllowance by 25", async () => {
      const {pool1} = portfolioToken.getPools();
      await portfolioToken.contract.connect(alice).increaseAllowance(pool1.target, "100");
      await expect(portfolioToken.contract.connect(alice).decreaseAllowance(pool1.target, "25"))
        .to.emit(portfolioToken.contract, "Approval")
        .withArgs(alice.address, pool1.target, "75");
      expect(await portfolioToken.contract.allowance(alice.address, pool1)).to.equal("75");
    });

    it("Should revert with 'ERC20: decreased allowance below zero' when currentAllowance < subtractedValue", async () => {
      const {pool1} = portfolioToken.getPools();
      await expect(portfolioToken.contract.connect(alice).decreaseAllowance(pool1.target, "100")).revertedWith(
        "ERC20: decreased allowance below zero"
      );
    });
  });

  describe("setPool", () => {
    it("setPool with zero-address (pool)", async () => {
      await expect(portfolioToken.setPool(2, ZeroAddress)).revertedWith("Zero pool address");
    });

    it("setPool already exists", async () => {
      await expect(portfolioToken.setPool(2, portfolioToken.getPool(2))).revertedWith("Already exists");
    });

    it("Should fail to set the pool when token precision is less than SYSTEM_PRECISION", async () => {
      const testToken = (await ethers.deployContract("TestToken", [`Test$`, `TST`, ethers.parseUnits("3000000000", 2), 2])) as any;
      const testPool = (await ethers.deployContract("TestPoolForRewards", [testToken.target])) as any;
      await expect(portfolioToken.setPool(3, testPool)).revertedWith("Token precision too low");
    });

    it("Should fail to set the pool when index is more than NUM_POOLS", async () => {
      const {pool4} = portfolioToken.getPools();
      await expect(portfolioToken.setPool(10 as any, pool4)).revertedWith("Index out of range");
    });

    it("Should fail to set the pool not by admin", async () => {
      const {token2} = portfolioToken.getTokens();
      await expect(portfolioToken.contract.connect(alice).setPool(2, token2.target)).revertedWith("Ownable: caller is not the owner");
    });

    it("Should fail to set the pool when token precision less than 3", async () => {
      const [, testPool] = await PortfolioToken.setupPoolAndToken(0, 2, 2);
      await expect(portfolioToken.setPool(3, testPool)).revertedWith("Token precision too low");
    });

    it("Should fail to set the pool when token is zero-address", async () => {
      const pool = (await ethers.deployContract("PoolWithZeroToken")) as any;
      await expect(portfolioToken.setPool(3, pool)).revertedWith("Zero token address");
    });

    it("Should fail to set the pool when wrong pool decimals", async () => {
      const pool = (await ethers.deployContract("PoolWithWrongDecimals")) as any;
      await expect(portfolioToken.setPool(3, pool)).revertedWith("Wrong pool decimals");
    });
  })

  describe('withdraw', () => {
    it("Basic withdraw", async () => {
      const {token1, token2} = portfolioToken.getTokens();

      await portfolioToken.deposit(alice, 10, 10)
        .then(async results => {
          await results[0].expectChangeTokenBalance(alice, token1, -10);
          await results[0].expectChangeTokenBalance(portfolioToken.getPool(1), token1, 10);
          await results[1].expectChangeTokenBalance(alice, token2, -10);
          await results[1].expectChangeTokenBalance(portfolioToken.getPool(2), token2, 10);
        })

      await portfolioToken.assertWithdrawProportionAmount(alice, 5, [2.5, 2.5, 0, 0])
      await portfolioToken.withdraw(alice, 5)
        .then(result => result.expectEmitWithdrawnEvent(alice, token1, 2.5))
        .then(result => result.expectEmitWithdrawnEvent(alice, token2, 2.5))
        .then(result => result.expectChangeTokenBalance(alice, token1, 2.5))
        .then(result => result.expectChangeTokenBalance(alice, token2, 2.5))

      await portfolioToken.checkState(15, 0, [7.5, 7.5]);
    });

    it('withdraw all after deposit', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1);
      await portfolioToken.deposit(bob, 1000);
      await portfolioToken.assertWithdrawProportionAmount(bob, 1000, [1000, 0, 0, 0])
      const result = await portfolioToken.withdraw(bob, 1000);
      await result.expectEmitWithdrawnEvent(bob, token, 1000);
      await result.expectEmitTokenTransferEvent(pool, portfolioToken.contract, 1000, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, bob, 1000, token);
      await result.expectChangeTokenBalance(bob, token, 1000);
      await result.expectChangeTokenBalance(pool, token, -1000);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 1000);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 1000, 0, 0, 0);
      await portfolioToken.assertTotalSupply(0);
    })


    it('withdraw less after deposit', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1);
      await portfolioToken.deposit(bob, 1000);
      await portfolioToken.assertWithdrawProportionAmount(bob, 100, [100, 0, 0, 0])
      const result = await portfolioToken.withdraw(bob, 100);
      await result.expectEmitWithdrawnEvent(bob, token, 100);
      await result.expectEmitTokenTransferEvent(pool, portfolioToken.contract, 100, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, bob, 100, token);
      await result.expectChangeTokenBalance(bob, token, 100);
      await result.expectChangeTokenBalance(pool, token, -100);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 100);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 100, 0, 0, 0);
      await portfolioToken.assertTotalSupply(900);
      await portfolioToken.assertBalanceOf(bob, 900);
    })

    it('withdraw with pending rewards', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1);
      await portfolioToken.deposit(bob, 1000);
      await portfolioToken.addRewards(1, 1000);
      await portfolioToken.assertWithdrawProportionAmount(bob, 500, [500, 0, 0, 0])
      const result = await portfolioToken.withdraw(bob, 500);
      await result.expectEmitWithdrawnEvent(bob, token, 500);
      await result.expectEmitTokenTransferEvent(pool, portfolioToken.contract, 500, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, bob, 500, token);
      await result.expectChangeTokenBalance(bob, token, 500);
      await result.expectChangeTokenBalance(pool, token, -500);
      await result.expectEmitDepositedRewardsEvent(token, 1000);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 500);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 500, 0, 0, 0);
      await portfolioToken.assertTotalSupply(1500);
      await portfolioToken.assertBalanceOf(bob, 1500);
    })

    it('withdraw when pending rewards too small', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1);
      await portfolioToken.deposit(bob, 1000);
      await portfolioToken.addRewards(1, 0.000101); // some math error?
      await portfolioToken.assertWithdrawProportionAmount(bob, 500, [500, 0, 0, 0]);
      const result = await portfolioToken.withdraw(bob, 500);
      await result.expectEmitWithdrawnEvent(bob, token, 500);
      await result.expectEmitTokenTransferEvent(pool, portfolioToken.contract, 500, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, bob, 500, token);
      await result.expectEmitTokenTransferEvent(pool, portfolioToken.contract, 0.0001, token);
      await result.expectChangeTokenBalance(bob, token, 500);
      await result.expectChangeTokenBalance(pool, token, -500.0001);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 500);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 500, 0, 0, 0);
      expect(await token.balanceOf(portfolioToken.contract)).eq(100);
      await portfolioToken.assertTotalSupply(500);
      await portfolioToken.assertBalanceOf(bob, 500);
    })

    it('withdraw from unbalanced pool', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1);
      await portfolioToken.deposit(bob, 1000);
      await portfolioToken.unbalancePool(1, 1500);
      await portfolioToken.assertWithdrawProportionAmount(bob, 700, [700, 0, 0, 0]);
      const result = await portfolioToken.withdraw(bob, 700);
      await result.expectEmitWithdrawnEvent(bob, token, 700);
      await result.expectEmitTokenTransferEvent(pool, portfolioToken.contract, 700, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, bob, 700, token);
      await result.expectChangeTokenBalance(bob, token, 700);
      await result.expectChangeTokenBalance(pool, token, -700);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 700);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 700, 0, 0, 0);
      await portfolioToken.assertTotalSupply(300);
      await portfolioToken.assertBalanceOf(bob, 300);
    })

    it('withdraw many pools', async () => {
      const {token1, token2, token3, token4} = portfolioToken.getTokens()
      await portfolioToken.activatePools(3, 4);
      await portfolioToken.deposit(alice, 0, 1000, 1000, 1000);
      await portfolioToken.addRewards(3, 1000);
      await portfolioToken.addRewards(4, 1000);
      await portfolioToken.unbalancePool(4, 1500);
      await portfolioToken.deposit(bob, 1000, 1000, 1000, 1000);
      await portfolioToken.assertBalanceOf(bob, 3499.477);
      await portfolioToken.assertWithdrawProportionAmount(bob, 1749.739, [500, 500, 500, 249.738]);
      const result = await portfolioToken.withdraw(bob, 1749.739); // withdraw a half
      await result.expectEmitWithdrawnEvent(bob, token1, 500);
      await result.expectEmitWithdrawnEvent(bob, token2, 500);
      await result.expectEmitWithdrawnEvent(bob, token3, 500);
      await result.expectEmitWithdrawnEvent(bob, token4, 249.738);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 1749.739);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 500, 500, 500, 249.738); // the sum of the parts is slightly less
      await portfolioToken.assertBalanceOf(bob, 1749.738);
      await portfolioToken.assertSubBalanceOf(bob, 1, 500);
      await portfolioToken.assertSubBalanceOf(bob, 2, 500);
      await portfolioToken.assertSubBalanceOf(bob, 3, 500);
      await portfolioToken.assertSubBalanceOf(bob, 4, 249.738);
    });

    it('withdraw when contract has more tokens on the balance', async () => {
      await portfolioToken.deposit(bob, 1000);
      const token = portfolioToken.getToken(1);
      await token.transfer(portfolioToken.contract.target, floatToInt(1000, PortfolioToken.getPrecision(1)));
      await portfolioToken.assertWithdrawProportionAmount(bob, 1000, [1000, 0, 0, 0]);
      const result = await portfolioToken.withdraw(bob, 1000);
      await result.expectEmitWithdrawnEvent(bob, token, 1000);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, bob, 1000, token);
      await result.expectChangeTokenBalance(bob, token, 1000);
      await result.expectEmitDepositedRewardsEvent(token, 1000);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 1000);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 1000, 0, 0, 0);
      await portfolioToken.assertTotalSupply(1000);
      await portfolioToken.assertSubBalanceOf(bob, 1, 1000);
    })

    it('withdraw when contract has slightly more tokens on the balance', async () => {
      await portfolioToken.deposit(bob, 1000);
      const token = portfolioToken.getToken(1);
      await token.transfer(portfolioToken.contract.target, floatToInt(0.0009, PortfolioToken.getPrecision(1)));
      await portfolioToken.assertWithdrawProportionAmount(bob, 1000, [1000, 0, 0, 0]);
      const result = await portfolioToken.withdraw(bob, 1000);
      await result.expectEmitWithdrawnEvent(bob, token, 1000);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, bob, 1000, token);
      await result.expectChangeTokenBalance(bob, token, 1000);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 1000);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 1000, 0, 0, 0);
      await portfolioToken.assertTotalSupply(0);
      await portfolioToken.assertSubBalanceOf(bob, 1, 0);
      expect(intToFloat(await token.balanceOf(portfolioToken.contract.target), PortfolioToken.getPrecision(1))).eq(normalizeFloatNumber(0.0009))
    })

    it('withdraw more than have', async () => {
      await portfolioToken.deposit(alice, 1000, 1000);
      await expect(portfolioToken.withdraw(alice, 3000)).revertedWith('Amount more than total')
    })

    it('withdraw fail from unbalanced pool with less virtual token', async () => {
      await portfolioToken.deposit(bob, 1000);
      await portfolioToken.unbalancePool(1, -500);
      await expect(portfolioToken.withdraw(bob, 700)).revertedWith('Pool: reserves');
    })

    it("withdraw Should do nothing when balanceOf(msg.sender) is 0", async () => {
      await portfolioToken.deposit(bob, 10, 10);
      await portfolioToken.assertWithdrawProportionAmount(alice, 5, [0, 0, 0, 0])
      await portfolioToken.withdraw(alice, 5);
      await portfolioToken.checkState(0, 20, [10, 10]);
    });

    it("withdraw Should do nothing when amount is 0", async () => {
      await portfolioToken.deposit(alice, 10, 10);
      await portfolioToken.withdraw(alice, 0);
      await portfolioToken.checkState(20, 0, [10, 10]);
    });

    it('withdraw Zero amount', async () => {
      await portfolioToken.deposit(alice, 1000);
      await portfolioToken.subWithdraw(alice, 0, 1);
      await portfolioToken.withdraw(alice, 0);
      await portfolioToken.assertSubBalanceOf(alice, 1, 1000);
    })

    it('withdraw One of two tokens', async () => {
      await portfolioToken.deposit(alice, 1000);
      await portfolioToken.assertWithdrawProportionAmount(alice, 5, [5, 0, 0, 0])
      await portfolioToken.withdraw(alice, 5);
      await portfolioToken.assertSubBalanceOf(alice, 1, 995);
    })

    it("Withdraw with fake pool withdrawing a half", async () => {
      const token = portfolioToken.getToken(3)
      const pool = (await ethers.deployContract("PoolWithFakeWithdraw", [token.target])) as any;
      await portfolioToken.setPool(3, pool);
      await portfolioToken.depositOnePool(alice,  1000, 3);
      const aliceTokenBalanceBefore = await portfolioToken.getTokenBalance(token, alice);
      await portfolioToken.subWithdraw(alice,  100, 3);
      const aliceTokenBalanceAfter = await portfolioToken.getTokenBalance(token, alice);
      expect(+aliceTokenBalanceAfter - +aliceTokenBalanceBefore).eq(50);
    });

  })

  describe('subWithdraw', () => {
    it('subWithdraw all after deposit', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1);
      await portfolioToken.deposit(bob, 1000);
      const result = await portfolioToken.subWithdraw(bob, 1000, 1);
      await result.expectEmitWithdrawnEvent(bob, token, 1000);
      await result.expectEmitTokenTransferEvent(pool, portfolioToken.contract, 1000, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, bob, 1000, token);
      await result.expectChangeTokenBalance(bob, token, 1000);
      await result.expectChangeTokenBalance(pool, token, -1000);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 1000);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 1000, 0, 0, 0);
      await portfolioToken.assertTotalSupply(0);
    })


    it('subWithdraw less after deposit', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1);
      await portfolioToken.deposit(bob, 1000);
      const result = await portfolioToken.subWithdraw(bob, 100, 1);
      await result.expectEmitWithdrawnEvent(bob, token, 100);
      await result.expectEmitTokenTransferEvent(pool, portfolioToken.contract, 100, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, bob, 100, token);
      await result.expectChangeTokenBalance(bob, token, 100);
      await result.expectChangeTokenBalance(pool, token, -100);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 100);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 100, 0, 0, 0);
      await portfolioToken.assertTotalSupply(900);
      await portfolioToken.assertBalanceOf(bob, 900);
    })

    it('subWithdraw with pending rewards', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1);
      await portfolioToken.deposit(bob, 1000);
      await portfolioToken.addRewards(1, 1000);
      const result = await portfolioToken.subWithdraw(bob, 500, 1);
      await result.expectEmitWithdrawnEvent(bob, token, 500);
      await result.expectEmitTokenTransferEvent(pool, portfolioToken.contract, 500, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, bob, 500, token);
      await result.expectChangeTokenBalance(bob, token, 500);
      await result.expectChangeTokenBalance(pool, token, -500);
      await result.expectEmitDepositedRewardsEvent(token, 1000);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 500);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 500, 0, 0, 0);
      await portfolioToken.assertTotalSupply(1500);
      await portfolioToken.assertBalanceOf(bob, 1500);
    })

    it('subWithdraw when pending rewards too small', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1);
      await portfolioToken.deposit(bob, 1000);
      await portfolioToken.addRewards(1, 0.000101); // some math error?
      const result = await portfolioToken.subWithdraw(bob, 500, 1);
      await result.expectEmitWithdrawnEvent(bob, token, 500);
      await result.expectEmitTokenTransferEvent(pool, portfolioToken.contract, 500, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, bob, 500, token);
      await result.expectEmitTokenTransferEvent(pool, portfolioToken.contract, 0.0001, token);
      await result.expectChangeTokenBalance(bob, token, 500);
      await result.expectChangeTokenBalance(pool, token, -500.0001);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 500);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 500, 0, 0, 0);
      expect(await token.balanceOf(portfolioToken.contract)).eq(100);
      await portfolioToken.assertTotalSupply(500);
      await portfolioToken.assertBalanceOf(bob, 500);
    })

    it('subWithdraw from unbalanced pool', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1);
      await portfolioToken.deposit(bob, 1000);
      await portfolioToken.unbalancePool(1, 1500);
      const result = await portfolioToken.subWithdraw(bob, 700, 1);
      await result.expectEmitWithdrawnEvent(bob, token, 700);
      await result.expectEmitTokenTransferEvent(pool, portfolioToken.contract, 700, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, bob, 700, token);
      await result.expectChangeTokenBalance(bob, token, 700);
      await result.expectChangeTokenBalance(pool, token, -700);
      await result.expectEmitVirtualTransferEvent(bob, ZeroAddress, 700);
      await result.expectEmitMultiTransferEvent(bob, ZeroAddress, 700, 0, 0, 0);
      await portfolioToken.assertTotalSupply(300);
      await portfolioToken.assertBalanceOf(bob, 300);
    })

    it('withdraw more than have', async () => {
      await portfolioToken.deposit(alice, 1000);
      await expect(portfolioToken.subWithdraw(alice, 2000, 1)).revertedWith('Amount more than total')
    })

    it("subWithdraw Should do nothing when amount is 0", async () => {
      await portfolioToken.deposit(alice, 10, 10);
      await portfolioToken.subWithdraw(alice, 0, 2);
      await portfolioToken.checkState(20, 0, [10, 10]);
    });

    it("subWithdraw No pool", async () => {
      await portfolioToken.deposit(alice, 10, 10);
      await expect(portfolioToken.subWithdraw(alice, 10, 3)).revertedWith("No pool")
    });
  })

  describe('Unbalanced pool', () => {
    it('success unbalance +', async () => {
      await portfolioToken.deposit(alice, 1000);
      await portfolioToken.unbalancePool(1, 1500);
      const expectedReceiveAmount = 499.5;
      await portfolioToken.assetEstimatedAmountOnDeposit(1000, expectedReceiveAmount, 1);
      await portfolioToken.deposit(alice, 1000);
      await portfolioToken.checkState(1000 + expectedReceiveAmount, 0, [1000 + expectedReceiveAmount]);

      await portfolioToken.assertedSubWithdraw(alice, 100, 1);
      await portfolioToken.checkState(900 + expectedReceiveAmount, 0, [900 + expectedReceiveAmount]);
    })

    it('success unbalance -', async () => {
      await portfolioToken.deposit(alice, 1000);
      await portfolioToken.unbalancePool(1, -1500);
      const expectedReceiveAmount = 499.5;
      await portfolioToken.assetEstimatedAmountOnDeposit(1000, expectedReceiveAmount, 1);
      await portfolioToken.deposit(alice, 1000);
      await portfolioToken.checkState(1000 + expectedReceiveAmount, 0, [Big(1000).add(expectedReceiveAmount).toFixed()]);

      await portfolioToken.assertedSubWithdraw(alice, 100, 1);
      await portfolioToken.checkState(900 + expectedReceiveAmount, 0, [900 + expectedReceiveAmount]);
    })

    it('success with adding rewards', async () => {
      await portfolioToken.deposit(alice, 1000);
      await portfolioToken.unbalancePool(1, 1500);
      await portfolioToken.addRewards(1, 100);
      const expectedReceiveAmount = 499.478;

      await portfolioToken.assetEstimatedAmountOnDeposit(1000, expectedReceiveAmount, 1);
      await portfolioToken.deposit(bob, 1000)
        .then(results => results[0])
        .then(result => result.expectEmitDepositedEvent(bob, portfolioToken.getToken(1), 1000, expectedReceiveAmount))
        .then(result => result.expectEmitTokenTransferEvent(bob, portfolioToken.contract, 1000, portfolioToken.getToken(1)))
        .then(result => result.expectEmitVirtualTransferEvent(ZeroAddress, bob, expectedReceiveAmount))
        .then(result => result.expectEmitMultiTransferEvent(ZeroAddress, bob, expectedReceiveAmount))
      await portfolioToken.checkState(1049.822, sub(expectedReceiveAmount, 0.001), [1549.3]); // user's balance is slightly less than expected due to math precision
      await portfolioToken.addRewards(1, 100);
      await portfolioToken.assertedSubWithdraw(alice, 100, 1);
      await portfolioToken.checkState(983.567, 515.532, [1499.1]);
    })
  })

  describe('deposit', () => {
    it("Basic deposit rewards", async () => {
      const {token1, token2} = portfolioToken.getTokens();

      await portfolioToken.deposit(alice, 1000, 1000);
      await portfolioToken.addRewards(1, 100);
      await portfolioToken.addRewards(2, 100);

      await portfolioToken.depositRewards()
        .then(result => result.expectEmitDepositedRewardsEvent(token1, 100))
        .then(result => result.expectEmitDepositedRewardsEvent(token2, 100))

      await portfolioToken.checkState(2200, 0, [1100, 1100]);
    });

    it('Empty pool', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1)
      await portfolioToken.assetEstimatedAmountOnDeposit(1, 1, 1);
      const result = (await portfolioToken.deposit(bob, 1))[0];
      await result.expectEmitTokenTransferEvent(bob, portfolioToken.contract, 1, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, pool, 1, token);
      await result.expectEmitVirtualTransferEvent(ZeroAddress, bob, 1);
      await result.expectEmitMultiTransferEvent(ZeroAddress, bob, 1, 0, 0, 0);
      await result.expectEmitDepositedEvent(bob, token, 1, 1);
      await portfolioToken.assertSubBalanceOf(bob, 1, 1)
      await portfolioToken.assertBalanceOf(bob, 1)
      await portfolioToken.assertTotalSupply(1);
      await portfolioToken.assertSubTotalSupply(1, 1);
      await portfolioToken.assertRealTotalSupply(1);
      await portfolioToken.assertPendingRewards(1, 0);
      await portfolioToken.assertTokenBalance(token, pool, 1);
      await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
    })

    it('Not empty pool', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1)
      await portfolioToken.deposit(alice, 1);
      await portfolioToken.assetEstimatedAmountOnDeposit(1, 1, 1);
      const result = (await portfolioToken.deposit(bob, 1))[0];
      await result.expectEmitTokenTransferEvent(bob, portfolioToken.contract, 1, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, pool, 1, token);
      await result.expectEmitVirtualTransferEvent(ZeroAddress, bob, 1);
      await result.expectEmitMultiTransferEvent(ZeroAddress, bob, 1, 0, 0, 0);
      await result.expectEmitDepositedEvent(bob, token, 1, 1);

      await portfolioToken.assertSubBalanceOf(bob, 1, 1)
      await portfolioToken.assertBalanceOf(bob, 1)
      await portfolioToken.assertBalanceOf(alice, 1)
      await portfolioToken.assertTotalSupply(2);
      await portfolioToken.assertRealTotalSupply(2);
      await portfolioToken.assertSubTotalSupply(2, 1);
      await portfolioToken.assertPendingRewards(1, 0);
      await portfolioToken.assertTokenBalance(token, pool, 2);
      await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
    })

    it('Pool with rewards', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1)
      await portfolioToken.deposit(alice, 1);
      await portfolioToken.addRewards(1, 1);
      await portfolioToken.assertPendingRewards(1, 1);
      await portfolioToken.assertRealTotalSupply(1);
      await portfolioToken.assetEstimatedAmountOnDeposit(1, 1, 1);
      const result = (await portfolioToken.deposit(bob, 1))[0];
      await result.expectEmitTokenTransferEvent(bob, portfolioToken.contract, 1, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, pool, 1, token);
      await result.expectEmitVirtualTransferEvent(ZeroAddress, bob, 1);
      await result.expectEmitMultiTransferEvent(ZeroAddress, bob, 1, 0, 0, 0);
      await result.expectEmitDepositedEvent(bob, token, 1, 1);
      await result.expectEmitDepositedRewardsEvent(token, 1);
      await portfolioToken.assertSubBalanceOf(bob, 1, 1)
      await portfolioToken.assertBalanceOf(bob, 1)
      await portfolioToken.assertBalanceOf(alice, 2)
      await portfolioToken.assertTotalSupply(3);
      await portfolioToken.assertRealTotalSupply(1.5);
      await portfolioToken.assertSubTotalSupply(3, 1);
      await portfolioToken.assertPendingRewards(1, 0);
      await portfolioToken.assertTokenBalance(token, pool, 3);
      await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
    })

    it('Pool with claimed rewards', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1)
      await portfolioToken.deposit(alice, 1);
      await portfolioToken.addRewards(1, 1);
      await portfolioToken.depositRewards();
      await portfolioToken.assertBalanceOf(alice, 2);
      await portfolioToken.assertPendingRewards(1, 0);
      await portfolioToken.assertRealTotalSupply(1);
      await portfolioToken.assetEstimatedAmountOnDeposit(1, 1, 1);
      const result = (await portfolioToken.deposit(bob, 1))[0];
      await result.expectEmitTokenTransferEvent(bob, portfolioToken.contract, 1, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, pool, 1, token);
      await result.expectEmitVirtualTransferEvent(ZeroAddress, bob, 1);
      await result.expectEmitMultiTransferEvent(ZeroAddress, bob, 1, 0, 0, 0);
      await result.expectEmitDepositedEvent(bob, token, 1, 1);
      await portfolioToken.assertSubBalanceOf(bob, 1, 1)
      await portfolioToken.assertBalanceOf(alice, 2)
      await portfolioToken.assertBalanceOf(bob, 1)
      await portfolioToken.assertTotalSupply(3);
      await portfolioToken.assertRealTotalSupply(1.5);
      await portfolioToken.assertSubTotalSupply(3, 1);
      await portfolioToken.assertPendingRewards(1, 0);
      await portfolioToken.assertTokenBalance(token, pool, 3);
      await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
    })

    it('Unbalanced pool', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1)
      await portfolioToken.deposit(alice, 1000);
      await portfolioToken.unbalancePool(1, 1500);
      const expectedReceiveAmount = 499.5;
      await portfolioToken.assetEstimatedAmountOnDeposit(1000, expectedReceiveAmount, 1);
      const result = (await portfolioToken.deposit(bob, 1000))[0];
      await result.expectEmitTokenTransferEvent(bob, portfolioToken.contract, 1000, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, pool, 1000, token);
      await result.expectEmitVirtualTransferEvent(ZeroAddress, bob, expectedReceiveAmount);
      await result.expectEmitMultiTransferEvent(ZeroAddress, bob, expectedReceiveAmount, 0, 0, 0);
      await result.expectEmitDepositedEvent(bob, token, 1000, expectedReceiveAmount);
      await portfolioToken.assertSubBalanceOf(bob, 1, expectedReceiveAmount);
      await portfolioToken.assertBalanceOf(bob, expectedReceiveAmount)
      await portfolioToken.assertBalanceOf(alice, 1000)
      await portfolioToken.assertTotalSupply(add(1000, expectedReceiveAmount));
      await portfolioToken.assertSubTotalSupply(add(1000, expectedReceiveAmount), 1);
      await portfolioToken.assertRealTotalSupply(add(1000, expectedReceiveAmount));
      await portfolioToken.assertPendingRewards(1, 0);
      await portfolioToken.assertTokenBalance(token, pool, 2000);
      await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
    })

    it('Unbalanced pool with rewards', async () => {
      const token = portfolioToken.getToken(1);
      const pool = portfolioToken.getPool(1)
      await portfolioToken.deposit(alice, 1000);
      await portfolioToken.addRewards(1, 1000);
      await portfolioToken.assertPendingRewards(1, 1000);
      await portfolioToken.unbalancePool(1, 1500);
      const expectedReceiveAmount = 499.478;
      await portfolioToken.assetEstimatedAmountOnDeposit(1000, expectedReceiveAmount, 1);
      const result = (await portfolioToken.deposit(bob, 1000))[0];
      await result.expectEmitTokenTransferEvent(bob, portfolioToken.contract, 1000, token);
      await result.expectEmitTokenTransferEvent(portfolioToken.contract, pool, 1000, token);
      await result.expectEmitVirtualTransferEvent(ZeroAddress, bob, expectedReceiveAmount);
      await result.expectEmitMultiTransferEvent(ZeroAddress, bob, expectedReceiveAmount, 0, 0, 0);
      await result.expectEmitDepositedEvent(bob, token, 1000, expectedReceiveAmount);
      await result.expectEmitDepositedRewardsEvent(token, 1000);
      await portfolioToken.assertSubBalanceOf(bob, 1, sub(expectedReceiveAmount, 0.001)); // user's balance is slightly less than expected due to math precision
      await portfolioToken.assertBalanceOf(bob, sub(expectedReceiveAmount, 0.001))
      await portfolioToken.assertBalanceOf(alice, add(1000, 499.5)) // added rewards
      await portfolioToken.assertTotalSupply(add(add(1000, 499.5), expectedReceiveAmount));
      await portfolioToken.assertSubTotalSupply(add(add(1000, 499.5), expectedReceiveAmount), 1);
      await portfolioToken.assertPendingRewards(1, 0);
      await portfolioToken.assertTokenBalance(token, pool, 3000);
      await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
    })

    it('All pools', async () => {
      await portfolioToken.activatePools(3, 4);
      await portfolioToken.deposit(alice, 0, 1000, 1000, 1000);
      await portfolioToken.addRewards(3, 1000);
      await portfolioToken.addRewards(4, 1000);
      await portfolioToken.unbalancePool(4, 1500);
      await portfolioToken.deposit(bob, 1000, 1000, 1000, 1000);
      await portfolioToken.checkState(4499.5, 3499.477, [1000, 2000, 3000, add(add(1000, 499.5), 499.478)]);
      await portfolioToken.assertTotalSupply(7998.978);
      await portfolioToken.assertRealSubTotalSupply(1000,1);
      await portfolioToken.assertRealSubTotalSupply(2000,2);
      await portfolioToken.assertRealSubTotalSupply(1500,3);
      await portfolioToken.assertRealSubTotalSupply(1333.096,4);
    })

    it('Amount too small', async () => {
      await expect(portfolioToken.deposit(alice, 0.0001)).revertedWith("Pool: too little");
    })

    it('Not enough balance', async () => {
      await expect(portfolioToken.deposit(alice, 10000000000)).revertedWith("ERC20: transfer amount exceeds balance");
    })

    it('No approve', async () => {
      const token = portfolioToken.getToken(1);
      await token.connect(alice).approve(portfolioToken.contract.target, 0);
      await expect(portfolioToken.deposit(alice, 0.0001)).revertedWith("ERC20: insufficient allowance");
    })

    it('Small amount', async () => {
      const token = portfolioToken.getToken(1);
      const amount = 0.002; // on deposit 0.001 you will receive 0 lp
      await portfolioToken.deposit(alice, amount)
        .then(result => result[0].expectEmitDepositedEvent(alice, token, amount, amount))
      await portfolioToken.assertBalanceOf(alice, amount)
    })

    it('Small amount with too small rewards', async () => {
      const token = portfolioToken.getToken(1);
      const amount = 0.002; // on deposit 0.001 you will receive 0 lp
      await portfolioToken.deposit(alice, amount);
      await portfolioToken.addRewards(1, 0.0001);
      await portfolioToken.deposit(alice, amount)
        .then(result => result[0].expectEmitDepositedEvent(alice, token, amount, amount))
      await portfolioToken.assertPendingRewards(1, 0);
      await portfolioToken.assertBalanceOf(alice, 0.004)
    })

    it('Deposit small amount after big', async () => {
      await portfolioToken.deposit(alice, 100_000_000);
      await portfolioToken.deposit(alice, 0.002);
      await portfolioToken.assertTotalSupply(100_000_000.002);
      await portfolioToken.assertBalanceOf(alice, 100_000_000.002);
    })

    it('Deposit big amount after small', async () => {
      await portfolioToken.deposit(alice, 0.002);
      await portfolioToken.deposit(alice, 100_000_000);
      await portfolioToken.assertTotalSupply(100_000_000.002);
      await portfolioToken.assertBalanceOf(alice, 100_000_000.002);
    })

    it("Pool not initialized", async () => {
      await expect(portfolioToken.deposit(alice, 0, 0, 10)).revertedWith("No pool");
    });

    it('Deposit without pre adding rewards', async () => {
      await portfolioToken.deposit(alice, 1);
      await portfolioToken.addRewards(1, 1);
      await portfolioToken.deposit(bob, 1);
      await portfolioToken.checkState(2, 1, [3]);
    })

    it("Check event", async () => {
      const {token1} = portfolioToken.getTokens();
      const amount = 300;

      await (await portfolioToken.deposit(alice, amount))[0]
        .expectEmitDepositedEvent(alice, token1, amount, amount)
    });
  })

  describe('depositRewards', () => {
    it('Simple depositRewards', async () => {
      await portfolioToken.activatePools(3);
      const {token1, token2} = portfolioToken.getTokens();
      await portfolioToken.deposit(alice, 1000, 600);
      await portfolioToken.deposit(bob, 1000, 400);
      await portfolioToken.addRewards(1, 10);
      await portfolioToken.addRewards(2, 20);
      await portfolioToken.assertSubBalanceOf(alice, 1, 1000);
      await portfolioToken.assertSubBalanceOf(bob, 1, 1000);
      await portfolioToken.assertSubBalanceOf(alice, 2, 600);
      await portfolioToken.assertSubBalanceOf(bob, 2, 400);
      const result = await portfolioToken.depositRewards();
      await portfolioToken.assertSubBalanceOf(alice, 1, 1005);
      await portfolioToken.assertSubBalanceOf(bob, 1, 1005);
      await portfolioToken.assertSubBalanceOf(alice, 2, 612);
      await portfolioToken.assertSubBalanceOf(bob, 2, 408);

      await result.expectEmitDepositedRewardsEvent(token1, 10);
      await result.expectEmitDepositedRewardsEvent(token2, 20);
    })

    it('4 pools', async () => {
      await portfolioToken.activatePools(3, 4);
      const {token1, token2, token3, token4} = portfolioToken.getTokens()
      await portfolioToken.deposit(alice, 1000, 1000, 1000, 1000);
      await portfolioToken.addRewards(1, 10);
      await portfolioToken.addRewards(2, 20);
      await portfolioToken.addRewards(3, 30);
      await portfolioToken.addRewards(4, 40);
      const result = await portfolioToken.depositRewards();
      await result.expectEmitDepositedRewardsEvent(token1, 10);
      await result.expectEmitDepositedRewardsEvent(token2, 20);
      await result.expectEmitDepositedRewardsEvent(token3, 30);
      await result.expectEmitDepositedRewardsEvent(token4, 39.999); // low precision math error
      await portfolioToken.assertSubBalanceOf(alice, 1, 1010);
      await portfolioToken.assertSubBalanceOf(alice, 2, 1020);
      await portfolioToken.assertSubBalanceOf(alice, 3, 1030);
      await portfolioToken.assertSubBalanceOf(alice, 4, 1039.998); // low precision math error
    })

    it ('Too small rewards', async () => {
      const {token1, token2, token3} = portfolioToken.getTokens();
      await portfolioToken.activatePools(3);
      await portfolioToken.deposit(alice, 1000, 1000, 1000);
      await portfolioToken.addRewards(1, 0.0009);
      await portfolioToken.addRewards(2, 0.0009);
      await portfolioToken.addRewards(3, 0.0009);
      await portfolioToken.depositRewards();
      await portfolioToken.assertTotalSupply(3000);

      // pools precision math error on claim
      expect(intToFloat(await token1.balanceOf(portfolioToken.contract.target), PortfolioToken.getPrecision(1))).eq(normalizeFloatNumber(0.000899))
      expect(intToFloat(await token2.balanceOf(portfolioToken.contract.target), PortfolioToken.getPrecision(2))).eq(normalizeFloatNumber(0.0009))
      expect(intToFloat(await token3.balanceOf(portfolioToken.contract.target), PortfolioToken.getPrecision(3))).eq(normalizeFloatNumber(0.000899999))
    })
  })

  describe('subDepositRewards', () => {
    it('Simple subDepositRewards', async () => {
      const {token1} = portfolioToken.getTokens();
      await portfolioToken.deposit(alice, 1000, 600);
      await portfolioToken.deposit(bob, 2000, 400);
      await portfolioToken.addRewards(1, 150);
      await portfolioToken.addRewards(2, 200);
      await portfolioToken.assertSubBalanceOf(alice, 1, 1000);
      await portfolioToken.assertSubBalanceOf(bob, 1, 2000);
      await portfolioToken.assertSubBalanceOf(alice, 2, 600);
      await portfolioToken.assertSubBalanceOf(bob, 2, 400);
      const result = await portfolioToken.subDepositRewards(1);
      await portfolioToken.assertSubBalanceOf(alice, 1, 1050);
      await portfolioToken.assertSubBalanceOf(bob, 1, 2100);
      await portfolioToken.assertSubBalanceOf(alice, 2, 600);
      await portfolioToken.assertSubBalanceOf(bob, 2, 400);

      await result.expectEmitDepositedRewardsEvent(token1, 150);
    })
    it ('Too small rewards', async () => {
      const {token1} = portfolioToken.getTokens();
      await portfolioToken.deposit(alice, 1000);
      await portfolioToken.addRewards(1, 0.0009);
      await portfolioToken.subDepositRewards(1);
      await portfolioToken.assertTotalSupply(1000);

      // pools precision math error on claim
      expect(intToFloat(await token1.balanceOf(portfolioToken.contract.target), PortfolioToken.getPrecision(1))).eq(normalizeFloatNumber(0.000899))
    })

  })

  describe('getEstimatedAmountOnDeposit', () => {
    it('No pool', async () => {
      await portfolioToken.assetEstimatedAmountOnDeposit(10, 0, 4);
    })
  })

  describe('getRewardsAmount', () => {
    it('No pool', async () => {
      expect(await portfolioToken.getRewardsAmount(4)).eq(normalizeFloatNumber(0))
    })
  })


  it("Basic flow", async function () {
    // Deposit 1 token (precision 6)
    await portfolioToken.assetEstimatedAmountOnDeposit(1, 1, 1);
    await portfolioToken.deposit(alice, 1, 0);
    await portfolioToken.checkState(1, 0, [1, 0]);

    // Expect 100% of portfolio token to be on the first depositor
    await portfolioToken.assertTotalSupply(await portfolioToken.balanceOf(alice));

    // Add 1 token of rewards (precision 6)
    await portfolioToken.assetEstimatedAmountOnDeposit(1, 1, 1);
    await portfolioToken.addSubRewardsAndDeposit(1, 1);
    await portfolioToken.checkState(2, 0, [2, 0]);

    // Expect balance to increase to 2 (1 deposited + 1 rewards)
    // Expect 100% of portfolio token still to be on the first depositor
    await portfolioToken.assertTotalSupply(await portfolioToken.balanceOf(alice));

    // Transfer half of tokens to Bob
    await portfolioToken.transfer(alice, bob, 1);
    await portfolioToken.checkState(1, 1, [2, 0]);

    // Bob deposit to the second pool
    // Deposit 2 tokens
    await portfolioToken.assetEstimatedAmountOnDeposit(2, 2, 2);
    await portfolioToken.deposit(bob, 0, 2);
    await portfolioToken.checkState(1, 3, [2, 2]);

    // Add rewards to the second pool
    await portfolioToken.addSubRewardsAndDeposit(2, 1);
    await portfolioToken.checkState(1, 4, [2, 3]);

    // Bob withdraw a half
    await portfolioToken.assertSubBalanceOf(bob, 1, 1);
    await portfolioToken.assertSubBalanceOf(bob, 2, 3);

    await portfolioToken.assertedSubWithdraw(bob, 0.5, 1);
    await portfolioToken.assertedSubWithdraw(bob, 1.5, 2);

    await portfolioToken.checkState(1, 2, [1.5, 1.5]);

    //Bob deposit to the both pools
    await portfolioToken.assetEstimatedAmountOnDeposit(1, 1, 1);
    await portfolioToken.assetEstimatedAmountOnDeposit(2, 2, 2);
    await portfolioToken.deposit(bob, 1, 2);
    await portfolioToken.checkState(1, 5, [2.5, 3.5]);
  });

  it("Simple balance test with different amount", async () => {
    await portfolioToken.deposit(alice, 1, 1); // Alice 2; Bob 0; Pool1 1; Pool2 1;
    await portfolioToken.deposit(bob, 1, 1);
    await portfolioToken.checkState(2, 2, [2, 2]);

    await portfolioToken.deposit(bob, 100, 100);
    await portfolioToken.checkState(2, 202, [102, 102]);

    await portfolioToken.deposit(bob, 1000000, 1000000);
    await portfolioToken.checkState(2, 2000202, [1000102, 1000102]);

    await portfolioToken.assertedSubWithdraw(bob, 1000000, 1);
    await portfolioToken.assertedSubWithdraw(bob, 1000000, 2);
    await portfolioToken.checkState(2, 202, [102, 102]);

    await portfolioToken.assertedSubWithdraw(bob, 100, 1);
    await portfolioToken.assertedSubWithdraw(bob, 100, 2);
    await portfolioToken.checkState(2, 2, [2, 2]);

    await portfolioToken.assertedSubWithdraw(bob, 1, 1);
    await portfolioToken.assertedSubWithdraw(bob, 1, 2);

    await portfolioToken.checkState(2, 0, [1, 1]);

    await portfolioToken.assertedSubWithdraw(alice, 1, 1);
    await portfolioToken.assertedSubWithdraw(alice, 1, 2);

    await portfolioToken.checkState(0, 0, [0, 0]);
  });
});
