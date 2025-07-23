import {PortfolioToken} from './helpers/portfolio-token';
import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';
import {log} from './helpers/logger';
import Big from 'big.js';
import {expect} from 'chai';
import {add, firstPoolIndexes, Index, indexes, sub} from './helpers/utils';
import {TestPoolForRewards, TestToken} from '../typechain';
import {ZeroAddress} from 'ethers';

describe('deposit', () => {
  let portfolioToken: PortfolioToken;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  beforeEach(async () => {
    portfolioToken = await PortfolioToken.init();
    ({alice, bob} = portfolioToken.actors.getActors());
    await portfolioToken.activatePools(1, 2);
  });

  it('Token balance < 0.001, pending rewards = 0', async () => {
    const token = portfolioToken.getToken(2);
    const pool = portfolioToken.getPool(2)
    await portfolioToken.depositOnePool(alice, 1000, 2);
    await portfolioToken.transferToken(token, portfolioToken.contract, 0.0009);
    await portfolioToken.depositOnePool(bob, 1, 2);
    await portfolioToken.assertTokenBalance(token, pool, 1001);
    await portfolioToken.assertBalanceOf(alice, 1000);
    await portfolioToken.assertBalanceOf(bob, 1);
    await portfolioToken.assertTotalSupply(1001);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0.0009);
  });

  it('Token balance < 0, pending rewards < 0.001', async () => {
    const token = portfolioToken.getToken(2);
    const pool = portfolioToken.getPool(2)
    await portfolioToken.depositOnePool(alice, 1000, 2);
    await portfolioToken.addRewards(2, 0.0009);
    await portfolioToken.depositOnePool(bob, 1, 2);
    await portfolioToken.assertTokenBalance(token, pool, 1001);
    await portfolioToken.assertBalanceOf(alice, 1000);
    await portfolioToken.assertBalanceOf(bob, 1);
    await portfolioToken.assertTotalSupply(1001);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0.0009);
  });

  it('Token balance + pending rewards < 0.001', async () => {
    const token = portfolioToken.getToken(2);
    const pool = portfolioToken.getPool(2)
    await portfolioToken.depositOnePool(alice, 1000, 2);
    await portfolioToken.addRewards(2, 0.0001);
    await portfolioToken.transferToken(token, portfolioToken.contract, 0.0001);
    await portfolioToken.depositOnePool(bob, 1, 2);
    await portfolioToken.assertTokenBalance(token, pool, 1001);
    await portfolioToken.assertBalanceOf(alice, 1000);
    await portfolioToken.assertBalanceOf(bob, 1);
    await portfolioToken.assertTotalSupply(1001);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0.0002);
  });

  it('Token balance < 0.001, pending rewards < 0.001 but token balance + pending rewards > 0.001', async () => {
    const token = portfolioToken.getToken(2);
    const pool = portfolioToken.getPool(2)
    await portfolioToken.depositOnePool(alice, 1000, 2);
    await portfolioToken.addRewards(2, 0.0006);
    await portfolioToken.transferToken(token, portfolioToken.contract, 0.0006);
    await portfolioToken.depositOnePool(bob, 1, 2);
    await portfolioToken.assertTokenBalance(token, pool, 1001.0012);
    await portfolioToken.assertBalanceOf(alice, 1000);
    await portfolioToken.assertBalanceOf(bob, 1);
    await portfolioToken.assertTotalSupply(1001);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
  });

  it('Token balance < 0.001, pending rewards < 0.001 but token balance + pending rewards = 0.001', async () => {
    const token = portfolioToken.getToken(2);
    const pool = portfolioToken.getPool(2)
    await portfolioToken.depositOnePool(alice, 1000, 2);
    await portfolioToken.unbalancePool(2, 1500);
    await portfolioToken.addRewards(2, 0.000500);
    await portfolioToken.transferToken(token, portfolioToken.contract, 0.000500);
    await portfolioToken.depositOnePool(bob, 1, 2);
    await portfolioToken.assertTokenBalance(token, pool, 1001.001);
    await portfolioToken.assertBalanceOf(alice, 1000.022);
    await portfolioToken.assertBalanceOf(bob, 0.373);
    await portfolioToken.assertTotalSupply(1000.396);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
  });

  it('Token balance > 0.001', async () => {
    const token = portfolioToken.getToken(2);
    const pool = portfolioToken.getPool(2)
    await portfolioToken.depositOnePool(alice, 1000, 2);
    await portfolioToken.transferToken(token, portfolioToken.contract, 0.01);
    const result = await portfolioToken.depositOnePool(bob, 1, 2);
    await result.expectEmitVirtualTransferEvent(ZeroAddress, bob, 1) // minted exact amount
    await portfolioToken.assertTokenBalance(token, pool, 1001.01);
    await portfolioToken.assertBalanceOf(alice, 1000.01);
    await portfolioToken.assertBalanceOf(bob, 0.999); // bob amount a little less than deposit
    await portfolioToken.assertTotalSupply(1001.01);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
  });

  it('Pending rewards > 0.001', async () => {
    const token = portfolioToken.getToken(2);
    const pool = portfolioToken.getPool(2)
    await portfolioToken.depositOnePool(alice, 1000, 2);
    await portfolioToken.addRewards(2, 0.01);
    const result = await portfolioToken.depositOnePool(bob, 1, 2);
    await result.expectEmitVirtualTransferEvent(ZeroAddress, bob, 1) // minted exact amount
    await portfolioToken.assertTokenBalance(token, pool, 1001.01);
    await portfolioToken.assertBalanceOf(alice, 1000.01);
    await portfolioToken.assertBalanceOf(bob, 0.999); // bob amount a little less than deposit
    await portfolioToken.assertTotalSupply(1001.01);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
  });
})

describe('withdraw', () => {
  const initState = [
    [0.002],
    [1000],
    [0, 1000],
    [0.002, 0.002],
    [1000, 1000, 1000],
    [100, 1000, 10000],
    [1000, 0, 2000],
    [0, 0, 1000],
    [0.002, 0.002, 0.002, 0.002],
    [0, 0, 0, 1000],
    [0, 1000, 0, 10000],
    [100, 1000, 10000, 100000],
  ]

  let portfolioToken: PortfolioToken;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  beforeEach(async () => {
    portfolioToken = await PortfolioToken.init();
    ({alice, bob} = portfolioToken.actors.getActors());
  })

  for (const state of initState) {
    describe(`state: ${state.join()}`, () => {
      beforeEach(async () => {
        await portfolioToken.activateFirstPools(state.length);
        await portfolioToken.deposit(alice, ...state);
        await portfolioToken.deposit(bob, ...state.map(_ => 1000));
      })

      it(`Simple withdraw`, async () => {
        const balance = await portfolioToken.balanceOf(alice);
        log(`Alice balance is: ${balance}`);
        const withdrawAmount = +balance > 0.02 ? Big(balance).div(2).toFixed(3, Big.roundUp) : balance;
        const bobBalanceBefore = await portfolioToken.balanceOf(bob);
        const tokenBalanceBefore = await portfolioToken.tokenBalanceOfSum(alice);
        const totalSupplyBefore = await portfolioToken.totalSupply();
        await portfolioToken.withdraw(alice, withdrawAmount);
        await portfolioToken.assertBalanceOf(alice, Big(balance).sub(withdrawAmount).toFixed());
        await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
        const bobBalanceAfter = await portfolioToken.balanceOf(bob);
        expect(bobBalanceBefore).eq(bobBalanceAfter);
        const tokenBalanceAfter = await portfolioToken.tokenBalanceOfSum(alice);
        expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());
      });

      it(`Virtual-actual ratio 1:1`, async () => {
        const balance = await portfolioToken.balanceOf(alice);
        log(`Alice balance is: ${balance}`);
        const withdrawAmount = +balance > 0.02 ? Big(balance).div(2).toFixed(3, Big.roundUp) : balance;
        const bobBalanceBefore = await portfolioToken.balanceOf(bob);
        const tokenBalanceBefore = await portfolioToken.tokenBalanceOfSum(alice);
        const realTotalSupplyBefore = await portfolioToken.realTotalSupply();
        const totalSupplyBefore = await portfolioToken.totalSupply();
        await portfolioToken.withdraw(alice, withdrawAmount);
        await portfolioToken.assertBalanceOf(alice, Big(balance).sub(withdrawAmount).toFixed());
        await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
        await portfolioToken.assertRealTotalSupply(Big(realTotalSupplyBefore).sub(withdrawAmount).toFixed());
        const bobBalanceAfter = await portfolioToken.balanceOf(bob);
        expect(bobBalanceBefore).eq(bobBalanceAfter);
        const tokenBalanceAfter = await portfolioToken.tokenBalanceOfSum(alice);
        expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());
      });

      it(`Virtual-actual ratio > 1`, async () => {
        for (const index of firstPoolIndexes(state.length)) {
          await portfolioToken.addRewards(index, 1000);
        }
        await portfolioToken.depositRewards();
        const balance = await portfolioToken.balanceOf(alice);
        log(`Alice balance is: ${balance}`);
        const withdrawAmount = +balance > 0.02 ? Big(balance).div(2).toFixed(3, Big.roundUp) : balance;
        const bobBalanceBefore = await portfolioToken.balanceOf(bob);
        const tokenBalanceBefore = await portfolioToken.tokenBalanceOfSum(alice);
        const realTotalSupplyBefore = await portfolioToken.realTotalSupply();
        const totalSupplyBefore = await portfolioToken.totalSupply();
        await portfolioToken.withdraw(alice, withdrawAmount);
        await portfolioToken.assertBalanceOf(alice, Big(balance).sub(withdrawAmount).toFixed(), 0.002);
        await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed(), 0.002);
        const realTotalSupplyAfter = await portfolioToken.realTotalSupply();
        expect(Big(realTotalSupplyBefore).sub(realTotalSupplyAfter).toNumber()).lt(+withdrawAmount);
        console.log(bobBalanceBefore);
        const bobBalanceAfter = await portfolioToken.balanceOf(bob);
        expect(+bobBalanceAfter).gte(+bobBalanceBefore);
        await portfolioToken.assertBalanceOf(bob, bobBalanceBefore, 0.004)

        const tokenBalanceAfter = await portfolioToken.tokenBalanceOfSum(alice);
        expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toNumber()).closeTo(+withdrawAmount, 0.002);
      });

      it(`Token balance = 0, pending rewards = 0`, async () => {
        const balance = await portfolioToken.balanceOf(alice);
        log(`Alice balance is: ${balance}`);
        const withdrawAmount = +balance > 0.02 ? Big(balance).div(2).toFixed(3, Big.roundUp) : balance;
        const bobBalanceBefore = await portfolioToken.balanceOf(bob);
        const tokenBalanceBefore = await portfolioToken.tokenBalanceOfSum(alice);
        const totalSupplyBefore = await portfolioToken.totalSupply();
        await portfolioToken.withdraw(alice, withdrawAmount);
        await portfolioToken.assertBalanceOf(alice, Big(balance).sub(withdrawAmount).toFixed());
        await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
        const bobBalanceAfter = await portfolioToken.balanceOf(bob);
        expect(bobBalanceBefore).eq(bobBalanceAfter);
        const tokenBalanceAfter = await portfolioToken.tokenBalanceOfSum(alice);
        expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());

        for (const index of indexes) {
          await portfolioToken.assertTokenBalance(portfolioToken.getToken(index), portfolioToken.contract, 0)
          await portfolioToken.assertPendingRewards(index, 0);
        }
      })

      it(`Token balance < 0.001, pending rewards = 0`, async () => {
        for (const index of firstPoolIndexes(3)) { // pool 4 has 3 decimals
          await portfolioToken.transferToken(portfolioToken.getToken(index), portfolioToken.contract, 0.0009);
        }

        const balance = await portfolioToken.balanceOf(alice);
        log(`Alice balance is: ${balance}`);
        const withdrawAmount = +balance > 0.02 ? Big(balance).div(2).toFixed(3, Big.roundUp) : balance;
        const bobBalanceBefore = await portfolioToken.balanceOf(bob);
        const tokenBalanceBefore = await portfolioToken.tokenBalanceOfSum(alice);
        const totalSupplyBefore = await portfolioToken.totalSupply();
        await portfolioToken.withdraw(alice, withdrawAmount);
        await portfolioToken.assertBalanceOf(alice, Big(balance).sub(withdrawAmount).toFixed());
        await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
        const bobBalanceAfter = await portfolioToken.balanceOf(bob);
        expect(bobBalanceBefore).eq(bobBalanceAfter);
        const tokenBalanceAfter = await portfolioToken.tokenBalanceOfSum(alice);
        expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());

        for (const index of firstPoolIndexes(state.length)) {
          if (index !== 4) { // pool 4 has 3 decimals
            await portfolioToken.assertTokenBalance(portfolioToken.getToken(index), portfolioToken.contract, 0.0009) // stay the same
          }
          await portfolioToken.assertPendingRewards(index, 0);
        }
      });

      it(`Token balance < 0, pending rewards < 0.001`, async () => {
        for (const index of firstPoolIndexes(3)) {  // pool 4 has 3 decimals
          await portfolioToken.addRewards(index, 0.0009);
        }

        const balance = await portfolioToken.balanceOf(alice);
        log(`Alice balance is: ${balance}`);
        const withdrawAmount = +balance > 0.02 ? Big(balance).div(2).toFixed(3, Big.roundUp) : balance;
        const bobBalanceBefore = await portfolioToken.balanceOf(bob);
        const tokenBalanceBefore = await portfolioToken.tokenBalanceOfSum(alice);
        const totalSupplyBefore = await portfolioToken.totalSupply();
        await portfolioToken.withdraw(alice, withdrawAmount);
        await portfolioToken.assertBalanceOf(alice, Big(balance).sub(withdrawAmount).toFixed());
        await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
        const bobBalanceAfter = await portfolioToken.balanceOf(bob);
        expect(bobBalanceBefore).eq(bobBalanceAfter);
        const tokenBalanceAfter = await portfolioToken.tokenBalanceOfSum(alice);
        expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());

        for (const index of firstPoolIndexes(state.length)) {
          if (index !== 4) { // pool 4 has 3 decimals
            await portfolioToken.assertTokenBalance(portfolioToken.getToken(index), portfolioToken.contract, 0.0009, 0.0000011) // increased by pending rewards, approximate for pool with decimal 6
          }
          await portfolioToken.assertPendingRewards(index, 0);
        }
      });

      it(`Token balance + pending rewards < 0.001`, async () => {
        for (const index of firstPoolIndexes(3)) {  // pool 4 has 3 decimals
          await portfolioToken.addRewards(index, 0.0001);
          await portfolioToken.transferToken(portfolioToken.getToken(index), portfolioToken.contract, 0.0001);
        }

        const balance = await portfolioToken.balanceOf(alice);
        log(`Alice balance is: ${balance}`);
        const withdrawAmount = +balance > 0.02 ? Big(balance).div(2).toFixed(3, Big.roundUp) : balance;
        const bobBalanceBefore = await portfolioToken.balanceOf(bob);
        const tokenBalanceBefore = await portfolioToken.tokenBalanceOfSum(alice);
        const totalSupplyBefore = await portfolioToken.totalSupply();
        await portfolioToken.withdraw(alice, withdrawAmount);

        await portfolioToken.assertBalanceOf(alice, Big(balance).sub(withdrawAmount).toFixed());
        await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
        const bobBalanceAfter = await portfolioToken.balanceOf(bob);
        expect(bobBalanceBefore).eq(bobBalanceAfter);
        const tokenBalanceAfter = await portfolioToken.tokenBalanceOfSum(alice);
        expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());

        for (const index of firstPoolIndexes(state.length)) {
          if (index !== 4) { // pool 4 has 3 decimals
            await portfolioToken.assertTokenBalance(portfolioToken.getToken(index), portfolioToken.contract, 0.0002, 0.0000011) // increased by pending rewards, approximate for pool with decimal 6
          }
          await portfolioToken.assertPendingRewards(index, 0);
        }
      });

      it(`Token balance < 0.001, pending rewards < 0.001 but token balance + pending rewards > 0.001`, async () => {
        for (const index of firstPoolIndexes(3)) {  // pool 4 has 3 decimals
          await portfolioToken.addRewards(index, 0.0009);
          await portfolioToken.transferToken(portfolioToken.getToken(index), portfolioToken.contract, 0.0009);
        }

        const balance = await portfolioToken.balanceOf(alice);
        log(`Alice balance is: ${balance}`);
        const withdrawAmount = +balance > 0.02 ? Big(balance).div(2).toFixed(3, Big.roundUp) : balance;
        const bobBalanceBefore = await portfolioToken.balanceOf(bob);
        const tokenBalanceBefore = await portfolioToken.tokenBalanceOfSum(alice);
        const totalSupplyBefore = await portfolioToken.totalSupply();
        await portfolioToken.withdraw(alice, withdrawAmount);
        await portfolioToken.assertBalanceOf(alice, Big(balance).sub(withdrawAmount).toFixed());
        await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
        const bobBalanceAfter = await portfolioToken.balanceOf(bob);
        expect(bobBalanceBefore).eq(bobBalanceAfter);
        const tokenBalanceAfter = await portfolioToken.tokenBalanceOfSum(alice);
        expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());

        for (const index of firstPoolIndexes(state.length)) {
          await portfolioToken.assertTokenBalance(portfolioToken.getToken(index), portfolioToken.contract, 0)
          await portfolioToken.assertPendingRewards(index, 0);
        }
      });

      it(`Token balance > 0.001`, async () => {
        const extraTokenAmount = 10;
        for (const index of indexes) {  // pool 4 has 3 decimals
          await portfolioToken.transferToken(portfolioToken.getToken(index), portfolioToken.contract, extraTokenAmount);
        }

        const balance = await portfolioToken.balanceOf(alice);
        log(`Alice balance is: ${balance}`);
        const poolBalanceSumBefore = await portfolioToken.poolBalanceOfSum();
        const withdrawAmount = +balance > 0.02 ? Big(balance).div(2).toFixed(3, Big.roundUp) : balance;
        const bobBalanceBefore = await portfolioToken.balanceOf(bob);
        const tokenBalanceBefore = await portfolioToken.tokenBalanceOfSum(alice);
        const totalSupplyBefore = await portfolioToken.totalSupply();

        await portfolioToken.withdraw(alice, withdrawAmount);

        const poolBalanceSumAfter = await portfolioToken.poolBalanceOfSum();
        expect(Big(poolBalanceSumBefore).sub(withdrawAmount).add(extraTokenAmount * state.length).toNumber()).closeTo(Big(poolBalanceSumAfter).toNumber(), 0.003);

        if (state.reduce((a, b) => a + b) > 0.01) {
          expect(+await portfolioToken.balanceOf(alice)).gt(Big(balance).sub(withdrawAmount).toNumber());
          expect(+await portfolioToken.balanceOf(bob)).gt(+bobBalanceBefore);
        }
        expect(+await portfolioToken.totalSupply()).closeTo(Big(totalSupplyBefore).sub(withdrawAmount).add(extraTokenAmount * state.length).toNumber(), 0.003)
        const tokenBalanceAfter = await portfolioToken.tokenBalanceOfSum(alice);
        expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toNumber()).closeTo(Big(withdrawAmount).toNumber(), 0.003);

        for (const index of firstPoolIndexes(state.length)) {
          await portfolioToken.assertTokenBalance(portfolioToken.getToken(index), portfolioToken.contract, 0)
          await portfolioToken.assertPendingRewards(index, 0);
        }
      });

      it(`Pending rewards > 0.001`, async () => {
        const pendingRewards = 10;
        for (const index of firstPoolIndexes(state.length)) {
          await portfolioToken.addRewards(index, pendingRewards);
        }

        const balance = await portfolioToken.balanceOf(alice);
        log(`Alice balance is: ${balance}`);
        const poolBalanceSumBefore = await portfolioToken.poolBalanceOfSum();
        const withdrawAmount = +balance > 0.02 ? Big(balance).div(2).toFixed(3, Big.roundUp) : balance;
        const bobBalanceBefore = await portfolioToken.balanceOf(bob);
        const tokenBalanceBefore = await portfolioToken.tokenBalanceOfSum(alice);
        const totalSupplyBefore = await portfolioToken.totalSupply();

        await portfolioToken.withdraw(alice, withdrawAmount);

        const poolBalanceSumAfter = await portfolioToken.poolBalanceOfSum();
        expect(Big(poolBalanceSumBefore).sub(withdrawAmount).toNumber()).closeTo(Big(poolBalanceSumAfter).toNumber(), 0.003);

        if (state.reduce((a, b) => a + b) > 0.01) {
          expect(+await portfolioToken.balanceOf(alice)).gt(Big(balance).sub(withdrawAmount).toNumber());
          expect(+await portfolioToken.balanceOf(bob)).gt(+bobBalanceBefore);
        }
        expect(+await portfolioToken.totalSupply()).closeTo(Big(totalSupplyBefore).sub(withdrawAmount).add(pendingRewards * state.length).toNumber(), 0.008); // delta not more than 0.002 per pool
        const tokenBalanceAfter = await portfolioToken.tokenBalanceOfSum(alice);
        expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toNumber()).closeTo(Big(withdrawAmount).toNumber(), 0.003);

        for (const index of firstPoolIndexes(state.length)) {
          await portfolioToken.assertTokenBalance(portfolioToken.getToken(index), portfolioToken.contract, 0)
          await portfolioToken.assertPendingRewards(index, 0);
        }
      });

      it('Amount withdrawn larger than user CYD token balance', async () => {
        const balance = await portfolioToken.balanceOf(alice);
        await expect(portfolioToken.withdraw(alice, Big(balance).add(0.004).toFixed())).revertedWith("ERC20: burn amount exceeds balance"); // 0.001 per pool
      })
    })
  }

})

describe('subWithdraw', () => {
  let portfolioToken: PortfolioToken;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let token: TestToken;
  let pool: TestPoolForRewards;
  let anotherPool: TestPoolForRewards;
  const index: Index = 2;
  const otherIndex: Index = 1;
  let anotherToken: TestToken;
  const initBalance = 1000;
  const anotherInitBalance = 1000;
  const withdrawAmount = 500;


  beforeEach(async () => {
    portfolioToken = await PortfolioToken.init();
    ({alice, bob} = portfolioToken.actors.getActors());
    await portfolioToken.activatePools(1, index);
    ({token, pool} = portfolioToken.getPoolByNumber(index));
    ({token: anotherToken, pool: anotherPool} = portfolioToken.getPoolByNumber(otherIndex));
    await portfolioToken.deposit(alice, initBalance, anotherInitBalance)
    await portfolioToken.deposit(bob, initBalance, anotherInitBalance)
  })

  it(`Simple subWithdraw`, async () => {
    const totalBalance = await portfolioToken.balanceOf(alice);
    const bobBalanceBefore = await portfolioToken.balanceOf(bob);
    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const tokenBalanceBefore = await portfolioToken.getTokenBalance(token, alice);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    await portfolioToken.subWithdraw(alice, withdrawAmount, index);
    await portfolioToken.assertSubBalanceOf(alice, otherIndex, anotherInitBalance);
    await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(bob, bobBalanceBefore);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, Big(poolDepositBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore)
    const tokenBalanceAfter = await portfolioToken.getTokenBalance(token, alice);
    expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(alice, Big(totalBalance).sub(withdrawAmount).toFixed());
    await portfolioToken.assertSubBalanceOf(alice, index, sub(initBalance, withdrawAmount));
  });

  it(`Virtual-actual ratio 1:1`, async () => {
    const realSubTotalSupplyBefore = await portfolioToken.realSubTotalSupply(index);

    const totalBalance = await portfolioToken.balanceOf(alice);
    const bobBalanceBefore = await portfolioToken.balanceOf(bob);
    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const tokenBalanceBefore = await portfolioToken.getTokenBalance(token, alice);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    await portfolioToken.subWithdraw(alice, withdrawAmount, index);
    await portfolioToken.assertSubBalanceOf(alice, otherIndex, anotherInitBalance);
    await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(bob, bobBalanceBefore);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, Big(poolDepositBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore)
    const tokenBalanceAfter = await portfolioToken.getTokenBalance(token, alice);
    expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(alice, Big(totalBalance).sub(withdrawAmount).toFixed());
    await portfolioToken.assertSubBalanceOf(alice, index, sub(initBalance, withdrawAmount));

    const realSubTotalSupplyAfter = await portfolioToken.realSubTotalSupply(index);
    expect(Big(realSubTotalSupplyBefore).sub(realSubTotalSupplyAfter).toFixed()).eq(Big(withdrawAmount).toFixed());
  });

  it(`Virtual-actual ratio > 1`, async () => {
    await portfolioToken.addRewards(index, 1000);
    await portfolioToken.depositRewards();
    const realSubTotalSupplyBefore = await portfolioToken.realSubTotalSupply(index);

    const totalBalance = await portfolioToken.balanceOf(alice);
    const balance = await portfolioToken.subBalanceOf(alice, index);
    const bobBalanceBefore = await portfolioToken.balanceOf(bob);
    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const tokenBalanceBefore = await portfolioToken.getTokenBalance(token, alice);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    await portfolioToken.subWithdraw(alice, withdrawAmount, index);
    await portfolioToken.assertSubBalanceOf(alice, otherIndex, anotherInitBalance);
    await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(bob, bobBalanceBefore);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, Big(poolDepositBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore)
    const tokenBalanceAfter = await portfolioToken.getTokenBalance(token, alice);
    expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(alice, Big(totalBalance).sub(withdrawAmount).toFixed(), 0.001);
    await portfolioToken.assertSubBalanceOf(alice, index, sub(balance, withdrawAmount), 0.001);

    const realSubTotalSupplyAfter = await portfolioToken.realSubTotalSupply(index);
    expect(Big(realSubTotalSupplyBefore).sub(realSubTotalSupplyAfter).toNumber()).lt(Big(withdrawAmount).toNumber());
  });

  it(`Token balance = 0, pending rewards = 0`, async () => {
    const totalBalance = await portfolioToken.balanceOf(alice);
    const bobBalanceBefore = await portfolioToken.balanceOf(bob);
    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const tokenBalanceBefore = await portfolioToken.getTokenBalance(token, alice);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    await portfolioToken.subWithdraw(alice, withdrawAmount, index);
    await portfolioToken.assertSubBalanceOf(alice, otherIndex, anotherInitBalance);
    await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(bob, bobBalanceBefore);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, Big(poolDepositBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore)
    const tokenBalanceAfter = await portfolioToken.getTokenBalance(token, alice);
    expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(alice, Big(totalBalance).sub(withdrawAmount).toFixed());
    await portfolioToken.assertSubBalanceOf(alice, index, sub(initBalance, withdrawAmount));

    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0)
    await portfolioToken.assertPendingRewards(index, 0);

  })

  it(`Token balance < 0.001, pending rewards = 0`, async () => {
    await portfolioToken.transferToken(token, portfolioToken.contract, 0.0009);

    const totalBalance = await portfolioToken.balanceOf(alice);
    const bobBalanceBefore = await portfolioToken.balanceOf(bob);
    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const tokenBalanceBefore = await portfolioToken.getTokenBalance(token, alice);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    await portfolioToken.subWithdraw(alice, withdrawAmount, index);
    await portfolioToken.assertSubBalanceOf(alice, otherIndex, anotherInitBalance);
    await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(bob, bobBalanceBefore);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, Big(poolDepositBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore)
    const tokenBalanceAfter = await portfolioToken.getTokenBalance(token, alice);
    expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(alice, Big(totalBalance).sub(withdrawAmount).toFixed());
    await portfolioToken.assertSubBalanceOf(alice, index, sub(initBalance, withdrawAmount));


    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0.0009) // stay the same
    await portfolioToken.assertPendingRewards(index, 0);
  });

  it(`Token balance < 0, pending rewards < 0.001`, async () => {
    await portfolioToken.addRewards(index, 0.0009);

    const totalBalance = await portfolioToken.balanceOf(alice);
    const bobBalanceBefore = await portfolioToken.balanceOf(bob);
    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const tokenBalanceBefore = await portfolioToken.getTokenBalance(token, alice);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    await portfolioToken.subWithdraw(alice, withdrawAmount, index);
    await portfolioToken.assertSubBalanceOf(alice, otherIndex, anotherInitBalance);
    await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(bob, bobBalanceBefore);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, Big(poolDepositBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore)
    const tokenBalanceAfter = await portfolioToken.getTokenBalance(token, alice);
    expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(alice, Big(totalBalance).sub(withdrawAmount).toFixed());
    await portfolioToken.assertSubBalanceOf(alice, index, sub(initBalance, withdrawAmount));

    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0.0009) // increased by pending rewards
    await portfolioToken.assertPendingRewards(index, 0);
  });

  it(`Token balance + pending rewards < 0.001`, async () => {
    await portfolioToken.addRewards(index, 0.0001);
    await portfolioToken.transferToken(token, portfolioToken.contract, 0.0001);

    const totalBalance = await portfolioToken.balanceOf(alice);
    const bobBalanceBefore = await portfolioToken.balanceOf(bob);
    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const tokenBalanceBefore = await portfolioToken.getTokenBalance(token, alice);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    await portfolioToken.subWithdraw(alice, withdrawAmount, index);
    await portfolioToken.assertSubBalanceOf(alice, otherIndex, anotherInitBalance);
    await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(bob, bobBalanceBefore);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, Big(poolDepositBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore)
    const tokenBalanceAfter = await portfolioToken.getTokenBalance(token, alice);
    expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(alice, Big(totalBalance).sub(withdrawAmount).toFixed());
    await portfolioToken.assertSubBalanceOf(alice, index, sub(initBalance, withdrawAmount));

    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0.0002) // increased by pending rewards
    await portfolioToken.assertPendingRewards(index, 0);
  });

  it(`Token balance < 0.001, pending rewards < 0.001 but token balance + pending rewards > 0.001`, async () => {
    await portfolioToken.addRewards(index, 0.0009);
    await portfolioToken.transferToken(token, portfolioToken.contract, 0.0009);
    const depositedTokenBalanceBefore = await portfolioToken.getTokenBalance(token, pool);

    const totalBalance = await portfolioToken.balanceOf(alice);
    const bobBalanceBefore = await portfolioToken.balanceOf(bob);
    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const tokenBalanceBefore = await portfolioToken.getTokenBalance(token, alice);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    await portfolioToken.subWithdraw(alice, withdrawAmount, index);
    await portfolioToken.assertSubBalanceOf(alice, otherIndex, anotherInitBalance);
    await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(bob, bobBalanceBefore);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, Big(poolDepositBefore).sub(withdrawAmount).toFixed());
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore)
    const tokenBalanceAfter = await portfolioToken.getTokenBalance(token, alice);
    expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());
    await portfolioToken.assertBalanceOf(alice, Big(totalBalance).sub(withdrawAmount).toFixed());
    await portfolioToken.assertSubBalanceOf(alice, index, sub(initBalance, withdrawAmount));

    const depositedTokenBalanceAfter = await portfolioToken.getTokenBalance(token, pool);
    expect(Big(depositedTokenBalanceBefore).sub(depositedTokenBalanceAfter).toNumber()).closeTo(Big(withdrawAmount).toNumber(), 0.001);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0)
    await portfolioToken.assertPendingRewards(index, 0);
  });

  it(`Token balance > 0.001`, async () => {
    const extraTokenAmount = 10;
    await portfolioToken.transferToken(token, portfolioToken.contract, extraTokenAmount);
    const depositedTokenBalanceBefore = await portfolioToken.getTokenBalance(token, pool);

    const totalBalance = await portfolioToken.balanceOf(alice);
    const bobBalanceBefore = await portfolioToken.balanceOf(bob);
    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const tokenBalanceBefore = await portfolioToken.getTokenBalance(token, alice);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    await portfolioToken.subWithdraw(alice, withdrawAmount, index);
    await portfolioToken.assertSubBalanceOf(alice, otherIndex, anotherInitBalance);
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore)
    const tokenBalanceAfter = await portfolioToken.getTokenBalance(token, alice);
    expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());

    await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).add(extraTokenAmount).toFixed());
    await portfolioToken.assertSubBalanceOf(alice, index, add(sub(initBalance, withdrawAmount), extraTokenAmount / 2), 0.001);
    await portfolioToken.assertBalanceOf(alice, Big(totalBalance).sub(withdrawAmount).add(extraTokenAmount / 2).toFixed(), 0.001);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, Big(poolDepositBefore).sub(withdrawAmount).add(extraTokenAmount).toFixed());
    await portfolioToken.assertBalanceOf(bob, add(bobBalanceBefore, extraTokenAmount / 2));

    const depositedTokenBalanceAfter = await portfolioToken.getTokenBalance(token, pool);
    expect(Big(depositedTokenBalanceBefore).sub(depositedTokenBalanceAfter).add(extraTokenAmount).toNumber()).closeTo(Big(withdrawAmount).toNumber(), 0.001);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0)
    await portfolioToken.assertPendingRewards(index, 0);
  });

  it(`Pending rewards > 0.001`, async () => {
    const pendingRewards = 10;
    await portfolioToken.addRewards(index, pendingRewards);

    const depositedTokenBalanceBefore = await portfolioToken.getTokenBalance(token, pool);

    const totalBalance = await portfolioToken.balanceOf(alice);
    const bobBalanceBefore = await portfolioToken.balanceOf(bob);
    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const tokenBalanceBefore = await portfolioToken.getTokenBalance(token, alice);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    await portfolioToken.subWithdraw(alice, withdrawAmount, index);
    await portfolioToken.assertSubBalanceOf(alice, otherIndex, anotherInitBalance);
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore)
    const tokenBalanceAfter = await portfolioToken.getTokenBalance(token, alice);
    expect(Big(tokenBalanceAfter).sub(tokenBalanceBefore).toFixed()).eq(Big(withdrawAmount).toFixed());

    await portfolioToken.assertTotalSupply(Big(totalSupplyBefore).sub(withdrawAmount).add(pendingRewards).toFixed());
    await portfolioToken.assertSubBalanceOf(alice, index, add(sub(initBalance, withdrawAmount), pendingRewards / 2), 0.001);
    await portfolioToken.assertBalanceOf(alice, Big(totalBalance).sub(withdrawAmount).add(pendingRewards / 2).toFixed(), 0.001);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, Big(poolDepositBefore).sub(withdrawAmount).add(pendingRewards).toFixed());
    await portfolioToken.assertBalanceOf(bob, add(bobBalanceBefore, pendingRewards / 2));

    const depositedTokenBalanceAfter = await portfolioToken.getTokenBalance(token, pool);
    expect(Big(depositedTokenBalanceBefore).sub(depositedTokenBalanceAfter).toNumber()).closeTo(Big(withdrawAmount).toNumber(), 0.001);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0)
    await portfolioToken.assertPendingRewards(index, 0);
  });

  it('Amount withdrawn larger than user CYD token balance', async () => {
    const balance = await portfolioToken.subBalanceOf(alice, index);
    await expect(portfolioToken.subWithdraw(alice, Big(balance).add(0.001).toFixed(), index)).revertedWith("ERC20: burn amount exceeds balance");
  })

  it('Pool not initialized', async () => {
    await expect(portfolioToken.subWithdraw(alice, 0.004, 4)).revertedWith("No pool");
  })


  it('Pool out of bounds (>3)', async () => {
    await expect(portfolioToken.subWithdraw(alice, 0.004, 5 as any)).revertedWith("Index out of range");
  })
})

describe('subDepositRewards', () => {
  let portfolioToken: PortfolioToken;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let pool: TestPoolForRewards;
  let token: TestToken;
  let anotherPool: TestPoolForRewards;

  beforeEach(async () => {
    portfolioToken = await PortfolioToken.init();
    ({alice, bob} = portfolioToken.actors.getActors());
    await portfolioToken.activatePools(1, 2);
    await portfolioToken.deposit(alice, 1000, 1000);
    await portfolioToken.deposit(bob, 1000, 1000);
    ({pool, token} = portfolioToken.getPoolByNumber(2));
    ({pool: anotherPool} = portfolioToken.getPoolByNumber(1));
  })

  it(`Token balance = 0, pending rewards = 0`, async () => {
    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const poolStableBalanceBefore = await portfolioToken.getTokenBalance(token, pool);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    const aliceBalanceBefore = await portfolioToken.balanceOf(alice);
    await portfolioToken.subDepositRewards(2);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, poolDepositBefore);
    await portfolioToken.assertTokenBalance(token, pool, poolStableBalanceBefore);
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore);
    await portfolioToken.assertTotalSupply(totalSupplyBefore);
    await portfolioToken.assertBalanceOf(alice, aliceBalanceBefore);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
  });

  it(`Token balance < 0.001, pending rewards = 0`, async () => {
    await portfolioToken.transferToken(token, portfolioToken.contract, 0.0009);

    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const poolStableBalanceBefore = await portfolioToken.getTokenBalance(token, pool);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    const aliceBalanceBefore = await portfolioToken.balanceOf(alice);
    await portfolioToken.subDepositRewards(2);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, poolDepositBefore);
    await portfolioToken.assertTokenBalance(token, pool, poolStableBalanceBefore);
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore);
    await portfolioToken.assertTotalSupply(totalSupplyBefore);
    await portfolioToken.assertBalanceOf(alice, aliceBalanceBefore);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0.0009);
  });

  it(`Token balance < 0, pending rewards < 0.001`, async () => {
    await portfolioToken.addRewards(2, 0.0009);

    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const poolStableBalanceBefore = await portfolioToken.getTokenBalance(token, pool);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    const aliceBalanceBefore = await portfolioToken.balanceOf(alice);
    await portfolioToken.subDepositRewards(2);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, poolDepositBefore);
    await portfolioToken.assertTokenBalance(token, pool, sub(poolStableBalanceBefore, 0.0009)); // rewards from pool withdrawn by portfolioTokenContract but not deposited
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore);
    await portfolioToken.assertTotalSupply(totalSupplyBefore);
    await portfolioToken.assertBalanceOf(alice, aliceBalanceBefore);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0.0009);
  });

  it(`Token balance + pending rewards < 0.001`, async () => {
    await portfolioToken.transferToken(token, portfolioToken.contract, 0.0002);
    await portfolioToken.addRewards(2, 0.0002);

    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const poolStableBalanceBefore = await portfolioToken.getTokenBalance(token, pool);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    const aliceBalanceBefore = await portfolioToken.balanceOf(alice);
    await portfolioToken.subDepositRewards(2);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, poolDepositBefore);
    await portfolioToken.assertTokenBalance(token, pool, sub(poolStableBalanceBefore, 0.0002)); // rewards from pool withdrawn by portfolioTokenContract but not deposited
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore);
    await portfolioToken.assertTotalSupply(totalSupplyBefore);
    await portfolioToken.assertBalanceOf(alice, aliceBalanceBefore);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0.0004);
  });

  it(`Token balance < 0.001, pending rewards < 0.001 but token balance + pending rewards > 0.001`, async () => {
    await portfolioToken.transferToken(token, portfolioToken.contract, 0.0006);
    await portfolioToken.addRewards(2, 0.0006);

    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const poolStableBalanceBefore = await portfolioToken.getTokenBalance(token, pool);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    const aliceBalanceBefore = await portfolioToken.balanceOf(alice);
    await portfolioToken.subDepositRewards(2);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, poolDepositBefore);
    await portfolioToken.assertTokenBalance(token, pool, add(poolStableBalanceBefore, 0.0006)); //rewards from pool withdrawn and return back, so only token
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore);
    await portfolioToken.assertTotalSupply(totalSupplyBefore);
    await portfolioToken.assertBalanceOf(alice, aliceBalanceBefore);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
  });

  it(`Token balance > 0.001`, async () => {
    await portfolioToken.transferToken(token, portfolioToken.contract, 10);

    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const poolStableBalanceBefore = await portfolioToken.getTokenBalance(token, pool);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    const aliceBalanceBefore = await portfolioToken.balanceOf(alice);
    await portfolioToken.subDepositRewards(2);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, add(poolDepositBefore, 10));
    await portfolioToken.assertTokenBalance(token, pool, add(poolStableBalanceBefore, 10));
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore);
    await portfolioToken.assertTotalSupply(add(totalSupplyBefore, 10));
    await portfolioToken.assertBalanceOf(alice, add(aliceBalanceBefore, 5));
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
  });

  it(`Pending rewards > 0.001`, async () => {
    await portfolioToken.addRewards(2, 10);

    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const poolStableBalanceBefore = await portfolioToken.getTokenBalance(token, pool);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    const aliceBalanceBefore = await portfolioToken.balanceOf(alice);
    await portfolioToken.subDepositRewards(2);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, add(poolDepositBefore, 10));
    await portfolioToken.assertTokenBalance(token, pool, poolStableBalanceBefore); // balance is not increased because rewards were in the pool at the beginning
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore);
    await portfolioToken.assertTotalSupply(add(totalSupplyBefore, 10));
    await portfolioToken.assertBalanceOf(alice, add(aliceBalanceBefore, 5));
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
  });

  it(`Virtual-actual ratio > 1`, async () => {
    await portfolioToken.addRewards(2, 1000);
    await portfolioToken.depositRewards();
    await portfolioToken.addRewards(2, 10);

    const poolDepositBefore = await portfolioToken.getTokenBalance(pool, portfolioToken.contract);
    const poolStableBalanceBefore = await portfolioToken.getTokenBalance(token, pool);
    const anotherPoolDepositBefore = await portfolioToken.getTokenBalance(anotherPool, portfolioToken.contract);
    const totalSupplyBefore = await portfolioToken.totalSupply();
    const aliceBalanceBefore = await portfolioToken.balanceOf(alice);
    await portfolioToken.subDepositRewards(2);
    await portfolioToken.assertTokenBalance(pool, portfolioToken.contract, add(poolDepositBefore, 10), 0.003);
    await portfolioToken.assertTokenBalance(token, pool, poolStableBalanceBefore); // balance is not increased because rewards were in the pool at the beginning
    await portfolioToken.assertTokenBalance(anotherPool, portfolioToken.contract, anotherPoolDepositBefore);
    await portfolioToken.assertTotalSupply(add(totalSupplyBefore, 10), 0.003);
    await portfolioToken.assertBalanceOf(alice, add(aliceBalanceBefore, 5), 0.003);
    await portfolioToken.assertPendingRewards(2, 0);
    await portfolioToken.assertTokenBalance(token, portfolioToken.contract, 0);
  });

  it('Pool out of bounds (>3)', async () => {
    await expect(portfolioToken.subDepositRewards(5 as any)).revertedWith("Index out of range");
  })
});
