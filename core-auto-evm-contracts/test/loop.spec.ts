import {
  add,
  assertPoolIndex,
  Index,
  intToFloat,
  randomInt,
  randomChance,
  randomFloat,
  randomPercent
} from './helpers/utils';
import {PortfolioToken} from './helpers/portfolio-token';
import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';
import {log, next} from './helpers/logger';
import {VirtualMultiToken} from './helpers/virtual-multi-token';
import {expect} from 'chai';
import Big from 'big.js';

const simpleTestData = [
  {
    "pools": [1],
    "initAliceDeposit": [1],
    "initBobDeposit": [1],
    "aliceBalanceAfterDeposit": 1,
    "bobBalanceAfterDeposit": 1,
    "poolsBalancesAfterDeposit": [2],
    "bobWithdrawals": [0.25],
    "aliceBalanceAfterWithdraw": 1,
    "bobBalanceAfterWithdraw": 0.75,
    "poolsBalancesAfterWithdraw": [1.75]
  },
  {
    "pools": [1, 2],
    "initAliceDeposit": [1, 1],
    "initBobDeposit": [1, 3],
    "aliceBalanceAfterDeposit": 2,
    "bobBalanceAfterDeposit": 4,
    "poolsBalancesAfterDeposit": [2, 4],
    "bobWithdrawals": [1, 1.5],
    "aliceBalanceAfterWithdraw": 2,
    "bobBalanceAfterWithdraw": 1.5,
    "poolsBalancesAfterWithdraw": [1, 2.5]
  },
  {
    "pools": [1, 2, 3],
    "initAliceDeposit": [1, 1, 1],
    "initBobDeposit": [1, 2, 3],
    "aliceBalanceAfterDeposit": 3,
    "bobBalanceAfterDeposit": 6,
    "poolsBalancesAfterDeposit": [2, 3, 4],
    "bobWithdrawals": [1, 1.5, 2],
    "aliceBalanceAfterWithdraw": 3,
    "bobBalanceAfterWithdraw": 1.5,
    "poolsBalancesAfterWithdraw": [1, 1.5, 2]
  },
  {
    "pools": [1, 2, 3, 4],
    "initAliceDeposit": [1, 1, 1, 1],
    "initBobDeposit": [1, 2, 3, 1],
    "aliceBalanceAfterDeposit": 4,
    "bobBalanceAfterDeposit": 7,
    "poolsBalancesAfterDeposit": [2, 3, 4, 2],
    "bobWithdrawals": [1, 1.5, 2, 1],
    "aliceBalanceAfterWithdraw": 4,
    "bobBalanceAfterWithdraw": 1.5,
    "poolsBalancesAfterWithdraw": [1, 1.5, 2, 1]
  }
]

describe('PortfolioToken contract', () => {
  let portfolioToken: PortfolioToken;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  beforeEach(async () => {
    portfolioToken = await PortfolioToken.init();
    ({alice, bob} = portfolioToken.actors.getActors());
  });

  describe("Simple imbalance tests", () => {
    for (const test of simpleTestData) {
      it(`${test.pools.length} pools`, async () => {
        await portfolioToken.activatePools(...test.pools as Index[]);

        await portfolioToken.deposit(alice, ...test.initAliceDeposit);
        await portfolioToken.deposit(bob, ...test.initBobDeposit);

        await portfolioToken.checkState(test.aliceBalanceAfterDeposit, test.bobBalanceAfterDeposit, test.poolsBalancesAfterDeposit);

        for (const [index, withdrawAmount] of test.bobWithdrawals.entries()) {
          await portfolioToken.assertedSubWithdraw(bob, withdrawAmount, index + 1 as Index);
        }

        await portfolioToken.checkState(test.aliceBalanceAfterWithdraw, test.bobBalanceAfterWithdraw, test.poolsBalancesAfterWithdraw);
      });
    }
  });
});

describe(`Random test`, function () {
  this.timeout(60000);
  const randConfigAll = {
    name: 'all',
    iteration: 100,
    initialLiquidity: 100_000,
    initUserBalance: 10000,
    chance: {
      doAddRewards: 0.25,
      doUnbalance: 0.25,
      doDeposit: 0.25,
      doSubTransfer: 0.25,
      doSubWithdraw: 0.15,
      doTransfer: 0.25,
      doWithdraw: 0.15
    },
    addRewards: {from: 1, to: 10},
    unbalance: {min: -100, max: 100},
    depositPercent: 10,
    subTransferPercent: 10,
    subWithdrawPercent: 10,
    transferPercent: 10,
    withdrawPercent: 10,
    subTotalSupplyCloseTo: 0.01,
    totalSupplyCloseTo: 0.01,
    finalCloseTo: 1
  };

  const randConfigBalanced = {
    name: 'balanced',
    iteration: 100,
    initialLiquidity: 100_000,
    initUserBalance: 10000,
    chance: {
      doAddRewards: 0.25,
      doUnbalance: 0,
      doDeposit: 0.25,
      doSubTransfer: 0.25,
      doSubWithdraw: 0.15,
      doTransfer: 0.25,
      doWithdraw: 0.15
    },
    addRewards: {from: 1, to: 10},
    unbalance: {min: -100, max: 100},
    depositPercent: 10,
    subTransferPercent: 10,
    subWithdrawPercent: 10,
    transferPercent: 10,
    withdrawPercent: 10,
    subTotalSupplyCloseTo: 0.01,
    totalSupplyCloseTo: 0.01,
    finalCloseTo: 1
  };

  const randConfigNoRewards = {
    name: 'no rewards',
    iteration: 100,
    initialLiquidity: 100_000,
    initUserBalance: 10000,
    chance: {
      doAddRewards: 0.25,
      doUnbalance: 0,
      doDeposit: 0.25,
      doSubTransfer: 0.25,
      doSubWithdraw: 0.15,
      doTransfer: 0.25,
      doWithdraw: 0.15
    },
    addRewards: {from: 1, to: 10},
    unbalance: {min: -100, max: 100},
    depositPercent: 10,
    subTransferPercent: 10,
    subWithdrawPercent: 10,
    transferPercent: 10,
    withdrawPercent: 10,
    subTotalSupplyCloseTo: 0.01,
    totalSupplyCloseTo: 0.01,
    finalCloseTo: 1
  };

  const randConfigBalancedNoRewards = {
    name: 'balanced, no rewards',
    iteration: 100,
    initialLiquidity: 100_000,
    initUserBalance: 10000,
    chance: {
      doAddRewards: 0,
      doUnbalance: 0,
      doDeposit: 0.25,
      doSubTransfer: 0.25,
      doSubWithdraw: 0.15,
      doTransfer: 0.25,
      doWithdraw: 0.15
    },
    addRewards: {from: 1, to: 10},
    unbalance: {min: -100, max: 100},
    depositPercent: 10,
    subTransferPercent: 10,
    subWithdrawPercent: 10,
    transferPercent: 10,
    withdrawPercent: 10,
    subTotalSupplyCloseTo: 0.01,
    totalSupplyCloseTo: 0.01,
    finalCloseTo: 0.2
  };
  for (const randConfig of [randConfigAll, randConfigBalanced, randConfigNoRewards, randConfigBalancedNoRewards]) {

    describe(`Random test ${randConfig.name}`, function () {
      let portfolioToken: PortfolioToken;
      let alice: HardhatEthersSigner;
      let bob: HardhatEthersSigner;
      let admin: HardhatEthersSigner;


      beforeEach(async () => {
        portfolioToken = await PortfolioToken.init(Big(randConfig.initUserBalance).toFixed());
        ({alice, bob, admin} = portfolioToken.actors.getActors());
      });


      for (let poolNumbers = 1; poolNumbers <= 4; poolNumbers++) {
        it(`Random test ${poolNumbers} pools`, async () => {
          for (let poolIndex = 1; poolIndex <= poolNumbers; poolIndex++) {
            assertPoolIndex(poolIndex);
            await portfolioToken.activatePools(poolIndex as Index);
            await portfolioToken.depositOnePool(admin, randConfig.initialLiquidity, poolIndex);
          }

          let totalAddedRewards = [0, 0, 0, 0];

          for (let i = 0; i < randConfig.iteration; i++) {
            for (const [from, to] of [[alice, bob], [bob, alice]]) {
              for (let poolIndex = 1; poolIndex <= poolNumbers; poolIndex++) {
                assertPoolIndex(poolIndex);
                const token = portfolioToken.getToken(poolIndex);
                if (randomChance(randConfig.chance.doAddRewards)) {
                  const rewards = randomFloat(randConfig.addRewards.from, randConfig.addRewards.to);
                  totalAddedRewards[poolIndex - 1] = Big(totalAddedRewards[poolIndex - 1]).add(rewards).toNumber();
                  await portfolioToken.addRewards(poolIndex, rewards)
                }
                if (randomChance(randConfig.chance.doUnbalance)) {
                  const unbalanceValue = randomFloat(randConfig.unbalance.min, randConfig.unbalance.max);
                  await portfolioToken.unbalancePool(poolIndex, unbalanceValue)
                }
                if (randomChance(randConfig.chance.doDeposit)) {
                  const balance = intToFloat(await token.balanceOf(from.address), PortfolioToken.getPrecision(poolIndex));
                  const depositValue = randomPercent(randConfig.depositPercent, balance);
                  if (+depositValue > 0) {
                    await portfolioToken.depositOnePool(from, depositValue, poolIndex)
                  }
                }
                if (randomChance(randConfig.chance.doSubTransfer)) {
                  const balance = await portfolioToken.subBalanceOf(from, poolIndex);
                  const subTransferValue = randomPercent(randConfig.subTransferPercent, balance);
                  if (+subTransferValue > 0) {
                    await portfolioToken.subTransfer(from, to, subTransferValue, poolIndex);
                  }
                }
                if (randomChance(randConfig.chance.doSubWithdraw)) {
                  const balance = await portfolioToken.subBalanceOf(from, poolIndex);
                  const subWithdrawValue = randomPercent(randConfig.subWithdrawPercent, balance);
                  if (+subWithdrawValue > 0.001) {
                    await portfolioToken.subWithdraw(from, subWithdrawValue, poolIndex);
                  }
                }
              }
              if (randomChance(randConfig.chance.doTransfer)) {
                const balance = await portfolioToken.balanceOf(from);
                const transferValue = randomPercent(randConfig.transferPercent, balance);
                if (+transferValue > 0) {
                  await portfolioToken.transfer(from, to, transferValue)
                }
              }
              if (randomChance(randConfig.chance.doWithdraw)) {
                const balance = await portfolioToken.balanceOf(from);
                const withdrawValue = randomPercent(randConfig.withdrawPercent, balance);
                if (+withdrawValue > 0.002) {
                  await portfolioToken.withdraw(from, withdrawValue);
                }
              }
            }

            for (let poolIndex = 1; poolIndex <= poolNumbers; poolIndex++) {
              assertPoolIndex(poolIndex);
              const aliceSubBalance = await portfolioToken.subBalanceOf(alice, poolIndex);
              const bobSubBalance = await portfolioToken.subBalanceOf(bob, poolIndex);
              const adminSubBalance = await portfolioToken.subBalanceOf(admin, poolIndex);
              const subTotalSupply = await portfolioToken.subTotalSupply(poolIndex);
              expect(+subTotalSupply).closeTo(+aliceSubBalance + +bobSubBalance + +adminSubBalance, randConfig.subTotalSupplyCloseTo)
            }
            const aliceBalance = await portfolioToken.balanceOf(alice);
            const bobBalance = await portfolioToken.balanceOf(bob);
            const adminBalance = await portfolioToken.balanceOf(admin);
            const totalSupply = await portfolioToken.totalSupply();
            expect(+totalSupply).closeTo(+aliceBalance + +bobBalance + +adminBalance, randConfig.totalSupplyCloseTo)
            next();
          }

          await portfolioToken.balancePool(1);
          await portfolioToken.balancePool(2);
          await portfolioToken.balancePool(3);
          await portfolioToken.balancePool(4);

          await portfolioToken.depositRewards()

          const aliceBalance = await portfolioToken.balanceOf(alice);
          const bobBalance = await portfolioToken.balanceOf(bob);
          await portfolioToken.withdraw(alice, aliceBalance);
          await portfolioToken.withdraw(bob, bobBalance);

          await portfolioToken.assertBalanceOf(alice, 0, 0.004);
          await portfolioToken.assertBalanceOf(bob, 0, 0.004);
          const {token1, token2, token3, token4} = portfolioToken.getTokens();
          let totalSum = 0;
          totalSum += +intToFloat(await token1.balanceOf(alice.address), PortfolioToken.getPrecision(1));
          totalSum += +intToFloat(await token2.balanceOf(alice.address), PortfolioToken.getPrecision(2));
          totalSum += +intToFloat(await token3.balanceOf(alice.address), PortfolioToken.getPrecision(3));
          totalSum += +intToFloat(await token4.balanceOf(alice.address), PortfolioToken.getPrecision(4));

          totalSum += +intToFloat(await token1.balanceOf(bob.address), PortfolioToken.getPrecision(1));
          totalSum += +intToFloat(await token2.balanceOf(bob.address), PortfolioToken.getPrecision(2));
          totalSum += +intToFloat(await token3.balanceOf(bob.address), PortfolioToken.getPrecision(3));
          totalSum += +intToFloat(await token4.balanceOf(bob.address), PortfolioToken.getPrecision(4));

          totalSum += (+await portfolioToken.balanceOf(admin));

          let totalExpected = randConfig.initUserBalance * 8 + randConfig.initialLiquidity * poolNumbers + totalAddedRewards[0] + totalAddedRewards[1] + totalAddedRewards[2] + totalAddedRewards[3];
          log(`Total sum: ${totalSum}; Total expected sub: ${totalExpected}`);

          expect(totalSum).lt(totalExpected);
          expect(totalSum).closeTo(totalExpected, randConfig.finalCloseTo);
        });
      }
    })
  }
})


describe("MultiToken contract", function () {
  let token: VirtualMultiToken;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  beforeEach(async function () {
    token = await VirtualMultiToken.init();
    ({alice, bob} = token.actors.getActors());
  });

  if (process.env.SKIP_RANDOM === "true") {
    return;
  }

  for (let tokens = 1; tokens <= 4; tokens++) {
    for (let i = 0; i < 100; i++) {
      const sendAmount = 1000;
      const min = Math.ceil(sendAmount / tokens);

      it(`[Transfer] random ${i} for ${tokens} tokens`, async () => {
        next();

        const realAmounts = [...new Array(tokens)].map(() => randomInt(min, sendAmount));

        await token.mintAllRealAndVirtual(alice, ...realAmounts);
        await token.transfer(alice, bob, sendAmount);
        await token.logUserState(alice);
        await token.logUserState(bob);
        await token.assertBalanceBetween(bob, sendAmount, add(sendAmount, 0.003));
      });
    }
  }
});
