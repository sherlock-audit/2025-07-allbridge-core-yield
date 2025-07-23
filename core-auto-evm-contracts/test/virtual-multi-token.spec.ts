import Big from "big.js";
import {expect} from "chai";
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";

import {floatToSystemInt} from "./helpers/utils";
import {log, next} from "./helpers/logger";
import {VirtualMultiToken} from "./helpers/virtual-multi-token";

const U64_MAX_IN_FLOAT = Big((2n ** 64n - 1n).toString())
  .div(1000)
  .toFixed();
const U256_MAX_IN_FLOAT = Big((2n ** 256n - 1n).toString())
  .div(1000)
  .toFixed();
const MIN_IN_FLOAT = "0.001";

describe("MultiToken contract", function () {
  let token: VirtualMultiToken;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let zero: HardhatEthersSigner;

  beforeEach(async function () {
    token = await VirtualMultiToken.init();
    ({alice, bob} = token.actors.getActors());
    zero = await token.actors.getZeroActor();
  });

  it("basic ERC-20 check", async () => {
    expect(await token.virtualMultiToken.name()).to.equal("Virtual Multi Token");
    expect(await token.virtualMultiToken.symbol()).to.equal("VMT");
    expect(await token.virtualMultiToken.decimals()).to.equal(3);
  });

  describe("Burn", () => {
    it("Shouldn't burn from zero-address", async () => {
      await expect(token.virtualMultiToken.burn("0x0000000000000000000000000000000000000000", 100, 1)).revertedWith(
        "ERC20: burn from the zero address"
      );
    });

    it("Shouldn't burn when burn amount exceeds balance", async () => {
      await token.mintAllRealAndVirtual(bob, 100, 100);
      await token.mintAllRealAndVirtual(alice, 10, 100);

      await expect(token.burn(alice, 11, 1)).revertedWith("ERC20: burn amount exceeds balance");
    });
  });

  describe("mint", () => {
    it("Shouldn't mint to zero-address", async () => {
      await expect(token.virtualMultiToken.mintReal("0x0000000000000000000000000000000000000000", 100, 1)).revertedWith(
        "ERC20: mint to the zero address"
      );
    });

    it("success", async () => {
      log(`Mint 1000 real tokens to Alice for each token`);
      await token.mintAllRealAndVirtual(alice, 1000, 1000, 1000);
      log(`Set the virtual amount to 2000. Alice owns 100% of the pools so the total Alice balance is 6000`);
      await token.addTotalVirtualAmounts(1000, 1000, 1000);
      await token.assertBalance(alice, 6000);
      await token.assertSubBalances(alice, 2000, 2000, 2000, 0);
      await token.assertTotalSupply(6000);
      await token.assertRealTotalSupply(3000);
      await token.assertRealTotalSupplies(1000, 1000, 1000, 0);
      await token.assertTotalSupplies(2000, 2000, 2000, 0);
      await token.logUserState(alice);
      await token.logPoolsState();
      next();

      log(
        `Mint 2000 virtual tokens (1000 real) for Bob. Virtual and real total supplies are now 6000, and Alice and Bob each own 50% of them`
      );
      // Alice's balance is decreased because tokens were minted without adding rewards, something that is impossible in real life
      await token.addTotalVirtualAmounts(2000, 2000, 2000);
      await token.mintAfterTotalChanged(bob, 2000, 1);
      await token.mintAfterTotalChanged(bob, 2000, 2);
      await token.mintAfterTotalChanged(bob, 2000, 3);
      await token.assertBalance(alice, 6000);
      await token.assertBalance(bob, 6000);
      await token.assertTotalSupply(12000);
      await token.assertRealTotalSupply(6000);
    });

    it("mint imbalance", async () => {
      await token.mintAllReal(alice, 1000, 1000, 1000);
      await token.addTotalVirtualAmounts(1000, 2000, 3000);
      await token.assertTotalSupply(6000);
      await token.assertRealTotalSupply(3000);
      await token.assertTotalSupplies(1000, 2000, 3000, 0);
      await token.mintAllReal(alice, 1000, 1000, 1000);
      await token.assertTotalSupplies(1000, 2000, 3000, 0);
      await token.assertRealTotalSupplies(2000, 2000, 2000, 0);
      await token.assertTotalSupply(6000);
      await token.assertRealTotalSupply(6000);
    });

    it("mint maximum", async () => {
      await token.mintReal(alice, U64_MAX_IN_FLOAT, 1);
      await token.setTotalVirtualAmount(U64_MAX_IN_FLOAT, 1);
      await token.mintReal(alice, U64_MAX_IN_FLOAT, 2);
      await token.setTotalVirtualAmount(U64_MAX_IN_FLOAT, 2);
      await token.mintReal(alice, U64_MAX_IN_FLOAT, 3);
      await token.setTotalVirtualAmount(U64_MAX_IN_FLOAT, 3);
      await token.mintReal(alice, U64_MAX_IN_FLOAT, 4);
      await token.setTotalVirtualAmount(U64_MAX_IN_FLOAT, 4);

      await token.assertRealTotalSupplies(U64_MAX_IN_FLOAT, U64_MAX_IN_FLOAT, U64_MAX_IN_FLOAT, U64_MAX_IN_FLOAT);
    });

    it('mint zero virtual on zero real', async () => {
      await token.mintAfterTotalChanged(alice, 0, 1);
      await token.assertTotalSupply(0);
    })

    it('mint 100% of the virtual amount', async () => {
      await token.mintReal(alice, 1000, 1);
      await token.addTotalVirtualAmount(1000, 1);
      await token.assertTotalSupply(1000);
      await token.mintAfterTotalChanged(alice, 1000, 1);
      await token.assertTotalSupply(1000);
    })

    it("fail: overflow", async () => {
      await token.mintReal(alice, U64_MAX_IN_FLOAT, 1);
      await token.mintReal(alice, U64_MAX_IN_FLOAT, 2);
      await token.mintReal(alice, U64_MAX_IN_FLOAT, 3);
      await token.mintReal(alice, U64_MAX_IN_FLOAT, 4);

      await expect(token.mintReal(alice, MIN_IN_FLOAT, 1)).revertedWith("Value overflow");
      await expect(token.mintReal(alice, MIN_IN_FLOAT, 2)).revertedWith("Value overflow");
      await expect(token.mintReal(alice, MIN_IN_FLOAT, 3)).revertedWith("Value overflow");
      await expect(token.mintReal(alice, MIN_IN_FLOAT, 4)).revertedWith("Value overflow");
    });
  });

  describe("transfer", async () => {
    it("check event", async () => {
      await token.mintRealInBalance(alice, 1000, 1);
      const systemAmount = floatToSystemInt(900);

      await expect(token.transfer(alice, bob, 900))
        .to.emit(token.virtualMultiToken, "Transfer")
        .withArgs(alice.address, bob.address, systemAmount)
        .and.to.emit(token.virtualMultiToken, "MultiTransfer")
        .withArgs(alice.address, bob.address, [systemAmount, 0, 0, 0]);
    });

    it("success imbalance received amount >= send", async () => {
      await token.mintReal(alice, 100, 3);
      await token.mintReal(alice, 500, 2);
      await token.mintReal(alice, 1000, 1);
      await token.mintReal(alice, 2000, 4);
      await token.setTotalVirtualAmount(1000, 1);
      await token.setTotalVirtualAmount(1000, 2);
      await token.setTotalVirtualAmount(1000, 3);
      await token.setTotalVirtualAmount(1000, 4);
      await token.logUserState(alice);
      await token.transfer(alice, bob, 1000);
      await token.logUserState(alice);
      await token.logUserState(bob);

      await token.assertBalance(bob, 1000);
    });

    it("fail: transfer more", async () => {
      await token.mintAllRealAndVirtual(alice, 1000, 1000, 1000, 1000);
      await expect(token.transfer(alice, bob, 4000.001)).revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("success: transfer all", async () => {
      await token.mintAllRealAndVirtual(alice, 1000, 1000, 1000, 1000);
      await token.transfer(alice, bob, 4000);
      await token.assertBalance(bob, 4000);
      await token.assertBalance(alice, 0);
    });

    it("small amount", async () => {
      await token.mintAllRealAndVirtual(alice, 0.001, 0.001, 0.001, 0.001);
      await token.addTotalVirtualAmounts(0.001, 0.001, 0.001, 0.001);
      await token.assertBalance(alice, 0.008);
      await token.transfer(alice, bob, 0.004);
      await token.assertBalance(alice, 0);
      await token.assertBalance(bob, 0.008);
    });

    it('transfer when no virtual amount but real exist (impossible)', async () => {
      await token.mintReal(alice, 1000, 1);
      await token.assertSubBalance(alice, 1, 0);
      await token.subTransfer(alice, bob, 1, 1);
      await token.assertSubBalance(alice, 1, 0);
      await token.assertSubBalance(bob, 1, 0);
    })

    it('transfer with zero values', async  () => {
      await token.mintRealInBalance(alice, 1000, 1);
      await expect(token.transfer(alice, zero, 1000)).revertedWith("ERC20: transfer to the zero address");
      await expect(token.subTransfer(alice, zero, 1000, 1)).revertedWith("ERC20: transfer to the zero address");
      await expect(token.transferFrom(zero, alice, 0)).revertedWith("ERC20: approve from the zero address");
      await expect(token.subTransferFrom(zero, alice, 0, 1)).revertedWith("ERC20: approve from the zero address");
      await expect(token.transfer(alice, bob, 0)).revertedWith("ERC20: transfer zero amount");
      await expect(token.subTransfer(alice, bob, 0, 1)).revertedWith("ERC20: transfer zero amount");
    })
  });

  describe("sub transfer", () => {
    it("fail: transfer more", async () => {
      await token.mintAllRealAndVirtual(alice, 1000, 1000, 1000, 1000);
      await expect(token.subTransfer(alice, bob, 1000.001, 1)).revertedWith("Amount more than total");
      await expect(token.subTransfer(alice, bob, 1000.001, 2)).revertedWith("Amount more than total");
      await expect(token.subTransfer(alice, bob, 1000.001, 3)).revertedWith("Amount more than total");
      await expect(token.subTransfer(alice, bob, 1000.001, 4)).revertedWith("Amount more than total");
    });

    it("check events", async () => {
      await token.mintAllRealAndVirtual(alice, 1000);
      const systemAmount = floatToSystemInt(500);

      await expect(token.subTransfer(alice, bob, 500, 1))
        .to.emit(token.virtualMultiToken, "Transfer")
        .withArgs(alice.address, bob.address, systemAmount)
        .and.to.emit(token.virtualMultiToken, "MultiTransfer")
        .withArgs(alice.address, bob.address, [systemAmount, 0, 0, 0]);
    });
  });

  describe("Real and virtual equals", async () => {
    describe("transfer", () => {
      it("success", async () => {
        await token.mintRealInBalance(alice, 3000, 2);
        await token.assertSubBalances(alice, 0, 3000, 0);
        await token.transfer(alice, bob, 1000);
        await token.assertSubBalances(alice, 0, 2000, 0);
        await token.assertSubBalances(bob, 0, 1000, 0);
        await token.assertBalance(alice, 2000);
        await token.assertBalance(bob, 1000);
      });
      it("transfer triple", async () => {
        await token.mintAllRealAndVirtual(alice, 3000, 3000, 3000);
        await token.assertSubBalances(alice, 3000, 3000, 3000);
        await token.transfer(alice, bob, 3000);
        await token.assertSubBalances(alice, 2000, 2000, 2000);
        await token.assertSubBalances(bob, 1000, 1000, 1000);
        await token.assertBalance(alice, 6000);
        await token.assertBalance(bob, 3000);
      });
      it("transfer imbalance", async () => {
        await token.mintAllRealAndVirtual(alice, 1000, 2000, 3000);
        await token.assertSubBalances(alice, 1000, 2000, 3000);
        await token.transfer(alice, bob, 3000);
        await token.assertSubBalances(alice, 500, 1000, 1500);
        await token.assertSubBalances(bob, 500, 1000, 1500);
        await token.assertBalance(alice, 3000);
        await token.assertBalance(bob, 3000);
      });
    });

    describe("subTransfer", () => {
      it("success", async () => {
        await token.mintAllRealAndVirtual(alice, 1000, 2000, 3000, 4000);

        next();
        await token.subTransfer(alice, bob, 500, 1);
        await token.assertSubBalances(alice, 500, 2000, 3000, 4000);
        await token.assertSubBalances(bob, 500, 0, 0, 0);
        await token.assertBalance(alice, 9500);
        await token.assertBalance(bob, 500);
        next();
        await token.subTransfer(alice, bob, 500, 2);
        await token.assertSubBalances(alice, 500, 1500, 3000, 4000);
        await token.assertSubBalances(bob, 500, 500, 0, 0);
        await token.assertBalance(alice, 9000);
        await token.assertBalance(bob, 1000);
        next();
        await token.subTransfer(alice, bob, 500, 3);
        await token.assertSubBalances(alice, 500, 1500, 2500, 4000);
        await token.assertSubBalances(bob, 500, 500, 500, 0);
        await token.assertBalance(alice, 8500);
        await token.assertBalance(bob, 1500);
        next();
        await token.subTransfer(alice, bob, 500, 4);
        await token.assertSubBalances(alice, 500, 1500, 2500, 3500);
        await token.assertSubBalances(bob, 500, 500, 500, 500);
        await token.assertBalance(alice, 8000);
        await token.assertBalance(bob, 2000);
      });
    });

    describe("transferFrom", () => {
      it("success", async () => {
        await token.mintRealInBalance(alice, 3000, 2);
        await token.approve(alice, bob, 1000);
        await token.transferFrom(alice, bob, 1000);
        await token.assertBalance(alice, 2000);
        await token.assertBalance(bob, 1000);
      });

      it("success: max allowance", async () => {
        await token.mintRealInBalance(alice, 3000, 2);
        await token.approve(alice, bob, U256_MAX_IN_FLOAT);
        await token.transferFrom(alice, bob, 1000);
        await token.assertBalance(alice, 2000);
        await token.assertBalance(bob, 1000);
      });

      it("not enough allowance", async () => {
        await token.mintRealInBalance(alice, 3000, 2);
        await token.approve(alice, bob, 1000);
        await expect(token.transferFrom(alice, bob, 1001)).revertedWith("ERC20: insufficient allowance");
      });
    });

    describe("subTransferFrom", () => {
      it("success", async () => {
        await token.mintAllRealAndVirtual(alice, 3000, 5000, 1000, 500);
        await token.approve(alice, bob, U64_MAX_IN_FLOAT);

        await token.subTransferFrom(alice, bob, 500, 1);
        await token.assertBalance(alice, 9000);
        await token.assertBalance(bob, 500);
        await token.assertSubBalances(alice, 2500, 5000, 1000, 500);
        await token.assertSubBalances(bob, 500, 0, 0, 0);

        await token.subTransferFrom(alice, bob, 250, 2);
        await token.assertBalance(alice, 8750);
        await token.assertBalance(bob, 750);
        await token.assertSubBalances(alice, 2500, 4750, 1000, 500);
        await token.assertSubBalances(bob, 500, 250, 0, 0);

        await token.subTransferFrom(alice, bob, 1000, 3);
        await token.assertBalance(alice, 7750);
        await token.assertBalance(bob, 1750);
        await token.assertSubBalances(alice, 2500, 4750, 0, 500);
        await token.assertSubBalances(bob, 500, 250, 1000, 0);

        await token.subTransferFrom(alice, bob, 100, 4);
        await token.assertBalance(alice, 7650);
        await token.assertBalance(bob, 1850);
        await token.assertSubBalances(alice, 2500, 4750, 0, 400);
        await token.assertSubBalances(bob, 500, 250, 1000, 100);
      });
    });
  });
});
