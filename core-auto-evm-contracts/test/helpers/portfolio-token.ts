import {expect} from "chai";
import {ethers} from "hardhat";
import {ContractTransactionResponse} from "ethers";
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";

import {Actors} from "./actors";
import {PortfolioTokenWithPublicGetters, TestPoolForRewards, TestToken} from "../../typechain";
import {
  Addressable,
  addressFromAddressable, assertPoolIndex,
  FloatNumber,
  floatToInt,
  floatToSystemInt,
  Index, indexes,
  IntNumber,
  intToFloat, normalizeFloatNumber,
  SYSTEM_PRECISION,
  systemIntToFloat, toSystemPrecision,
  User
} from './utils';
import {WrappedResult} from './wrapped-result';
import {log} from './logger';
import Big from 'big.js';

export class PortfolioToken {
  private static readonly TOKENS_PRECISIONS = {
    1: 6,
    2: 18,
    3: 9,
    4: 3,
  };

  private readonly portfolioToken: PortfolioTokenWithPublicGetters;
  public readonly actors: Actors;
  public readonly tokens: TestToken[];
  public readonly pools: TestPoolForRewards[];

  public get contract(): PortfolioTokenWithPublicGetters {
    return this.portfolioToken;
  }

  constructor(virtualMultiToken: PortfolioTokenWithPublicGetters, actors: Actors, tokens: TestToken[], pools: TestPoolForRewards[]) {
    this.portfolioToken = virtualMultiToken;
    this.actors = actors;
    this.tokens = tokens;
    this.pools = pools;
  }

  public static getPrecision(index: Index): number {
    return PortfolioToken.TOKENS_PRECISIONS[index];
  }

  public static async setupPoolAndToken(adminFeeShare: number, index: Index, precision?: number): Promise<[TestToken, TestPoolForRewards]> {
    precision ??= PortfolioToken.getPrecision(index as Index);
    const testToken: TestToken = (await ethers.deployContract("TestToken", [
      `Test${index}`,
      `TST${index}`,
      ethers.parseUnits("3000000000", precision),
      precision,
    ])) as any;
    const testPool: TestPoolForRewards = (await ethers.deployContract("TestPoolForRewards", [testToken.target])) as any;
    await testPool.setAdminFeeShare(adminFeeShare);

    return [testToken, testPool];
  }

  static async init(initBalance: string = "1000000000"): Promise<PortfolioToken> {
    const factory = await ethers.getContractFactory("PortfolioTokenWithPublicGetters");
    const portfolioTokenContract = (await factory.deploy("Core Portfolio", "$CORE")) as any;
    const actors = await Actors.init();

    const [token1, pool1] = await PortfolioToken.setupPoolAndToken(0, 1);
    const [token2, pool2] = await PortfolioToken.setupPoolAndToken(0, 2);
    const [token3, pool3] = await PortfolioToken.setupPoolAndToken(0, 3);
    const [token4, pool4] = await PortfolioToken.setupPoolAndToken(0, 4);
    const tokens = [token1, token2, token3, token4];
    const pools = [pool1, pool2, pool3, pool4];

    const portfolioToken = new PortfolioToken(portfolioTokenContract, actors, tokens, pools);

    for (const [index, token] of tokens.entries()) {
      const precision = PortfolioToken.getPrecision((index + 1) as Index);
      const initBalanceInt = ethers.parseUnits(initBalance, precision);

      await token.connect(actors.alice).approve(portfolioToken.portfolioToken.target, ethers.MaxUint256);
      await token.connect(actors.bob).approve(portfolioToken.portfolioToken.target, ethers.MaxUint256);
      await token.connect(actors.admin).approve(portfolioToken.portfolioToken.target, ethers.MaxUint256);
      await token.connect(actors.admin).approve(pools[index], ethers.MaxUint256);

      await token.transfer(actors.alice.address, initBalanceInt);
      await token.transfer(actors.bob.address, initBalanceInt);
      await token.transfer(actors.admin.address, initBalanceInt);
    }

    return portfolioToken;
  }

  async setPool(index: Index, pool: TestPoolForRewards | string) {
    if (typeof pool === "string") {
      return this.portfolioToken.setPool(index - 1, pool);
    } else {
      return this.portfolioToken.setPool(index - 1, pool.target);
    }
  }

  async activatePools(...poolIndexes: Index[]) {
    for (const index of poolIndexes) {
      await this.setPool(index, this.getPool(index));
    }
  }

  async activateFirstPools(n: number) {
    for (let index = 1; index <= n; index++) {
      assertPoolIndex(index);
      await this.setPool(index, this.getPool(index));
    }
  }

  getPools() {
    return {
      pool1: this.pools[0],
      pool2: this.pools[1],
      pool3: this.pools[2],
      pool4: this.pools[3],
    };
  }

  getPool(index: Index) {
    return this.pools[index - 1];
  }

  getTokens() {
    return {
      token1: this.tokens[0],
      token2: this.tokens[1],
      token3: this.tokens[2],
      token4: this.tokens[3],
    };
  }

  getToken(index: Index) {
    return this.tokens[index - 1];
  }

  getPoolByNumber(poolNumber: Index): { pool: TestPoolForRewards; token: TestToken; precision: number } {
    if (poolNumber > this.pools.length) {
      throw new Error(`Pool ${poolNumber} not found`);
    }

    return {
      pool: this.pools[poolNumber - 1],
      token: this.tokens[poolNumber - 1],
      precision: PortfolioToken.getPrecision(poolNumber)
    };
  }

  async totalSupply() {
    return systemIntToFloat(await this.portfolioToken.totalSupply());
  }

  async balanceOf(user: User): Promise<string> {
    return systemIntToFloat(await this.portfolioToken.balanceOf(user.address));
  }

  async subBalanceOf(user: User, index: Index) {
    return systemIntToFloat(await this.portfolioToken.subBalanceOf(user.address, index - 1));
  }

  async getEstimatedAmountOnDeposit(amount: FloatNumber, index: Index): Promise<string> {
    return systemIntToFloat(await this.portfolioToken.getEstimatedAmountOnDeposit(floatToInt(amount, PortfolioToken.getPrecision(index)), index - 1));
  }

  async assetEstimatedAmountOnDeposit(amount: FloatNumber, expectedReceiveAmount: FloatNumber, index: Index) {
    const actual = await this.getEstimatedAmountOnDeposit(amount, index)
    expect(+actual).eq(+expectedReceiveAmount);
  }

  async getWithdrawProportionAmount(user: User, amount: FloatNumber): Promise<[string, string, string, string]> {
    const result = await this.portfolioToken.getWithdrawProportionAmount(user.address, floatToSystemInt(amount));
    return [
      intToFloat(result[0], PortfolioToken.getPrecision(1)),
      intToFloat(result[1], PortfolioToken.getPrecision(2)),
      intToFloat(result[2], PortfolioToken.getPrecision(3)),
      intToFloat(result[3], PortfolioToken.getPrecision(4)),
    ];
  }

  async assertWithdrawProportionAmount(user: User, amount: FloatNumber, expectedAmounts: FloatNumber[]) {
    const actual = await this.getWithdrawProportionAmount(user, amount);
    expect(+actual[0]).eq(+expectedAmounts[0]);
    expect(+actual[1]).eq(+expectedAmounts[1]);
    expect(+actual[2]).eq(+expectedAmounts[2]);
    expect(+actual[3]).eq(+expectedAmounts[3]);
  }

  async transfer(from: User, to: User, amount: FloatNumber): Promise<ContractTransactionResponse> {
    log(`Transfer from ${this.actors.getName(from)} to ${this.actors.getName(to)} ${amount}`);
    return await this.portfolioToken.connect(from).transfer(to.address, floatToSystemInt(amount));
  }

  async subTransfer(from: User, to: User, amount: FloatNumber, index: Index): Promise<ContractTransactionResponse> {
    log(`Sub transfer from ${this.actors.getName(from)} to ${this.actors.getName(to)} ${amount} token ${index}`);
    return await this.portfolioToken.connect(from).subTransfer(to.address, floatToSystemInt(amount), index - 1);
  }

  async deposit(user: User, ...amounts: FloatNumber[]) {
    log(
      `${this.actors.getName(user)} deposit ${amounts.map(v => v || 0).join(", ")}`
    );

    const results: WrappedResult[] = [];

    for (let i = 0; i < amounts.length; i++) {
      let amount = amounts[i];
      if (!+amount) {
        continue;
      }
      const precision = PortfolioToken.getPrecision((i + 1) as Index);
      const result = await this.portfolioToken.connect(user).deposit(floatToInt(amounts[i] || "0", precision), i, 0);
      results.push(this.wrapResult(result));
    }

    return results;
  }

  async depositOnePool(user: User, amount: FloatNumber, index: Index, minVirtualAmount: FloatNumber = 0) {
    log(
      `${this.actors.getName(user)} deposit ${amount} to pool ${index}`
    );
    const precision = PortfolioToken.getPrecision(index);
    const result = await this.portfolioToken.connect(user).deposit(floatToInt(amount, precision), index - 1, floatToSystemInt(minVirtualAmount));
    return this.wrapResult(result);
  }

  async addSubRewardsAndDeposit(poolNumber: Index, amount: FloatNumber, redeposit = true) {
    log(`Adding ${amount} rewards to Pool ${poolNumber}`);
    await this.addRewards(poolNumber, amount);
    if (redeposit) {
      await this.portfolioToken.subDepositRewards(poolNumber - 1);
    }
  }

  async depositRewards(): Promise<WrappedResult> {
    log("Deposit rewards");
    const result = await this.portfolioToken.depositRewards();
    return this.wrapResult(result);
  }

  async subDepositRewards(index: Index): Promise<WrappedResult> {
    log(`Deposit rewards for pool ${index}`);
    const result = await this.portfolioToken.subDepositRewards(index - 1);
    return this.wrapResult(result);
  }

  async addRewards(poolNumber: Index, amount: FloatNumber): Promise<ContractTransactionResponse> {
    const {pool, precision} = this.getPoolByNumber(poolNumber);
    const intAmount = floatToInt(amount, precision);
    log(`Added ${amount}(${intAmount}) rewards to pool ${poolNumber}`)
    return await pool.addRewards(intAmount);
  }

  async unbalancePool(poolNumber: Index, amount: FloatNumber) {
    const {pool, precision} = this.getPoolByNumber(poolNumber);
    log(`Unbalance pool ${poolNumber}: on ${amount}`);
    log(`Before unbalance pool ${poolNumber} state: tokenBalance: ${systemIntToFloat(await pool.tokenBalance())}, vUsdBalance: ${systemIntToFloat(await pool.vUsdBalance())}`)
    if (+amount > 0) {
      await pool.swapToVUsd(this.actors.admin.address, floatToInt(amount, precision), true);
    } else {
      await pool.swapFromVUsd(this.actors.admin.address, floatToSystemInt(-amount), 0, true);
    }
    log(`After unbalance pool ${poolNumber} state: tokenBalance: tokenBalance: ${systemIntToFloat(await pool.tokenBalance())}, vUsdBalance: ${systemIntToFloat(await pool.vUsdBalance())}`)
  }

  async balancePool(poolNumber: Index) {
    log(`Balance pool ${poolNumber}`);
    const {pool} = this.getPoolByNumber(poolNumber);
    const amount = (await pool.tokenBalance() - await pool.vUsdBalance()) / 2n

    if (amount > 0n) {
      await pool.swapFromVUsd(this.actors.admin.address, amount, 0, true);
    } else {
      await pool.swapToVUsd(this.actors.admin.address, -amount, true);
    }

    log(`After balance pool ${poolNumber} state: tokenBalance: tokenBalance: ${systemIntToFloat(await pool.tokenBalance())}, vUsdBalance: ${systemIntToFloat(await pool.vUsdBalance())}`)
  }

  async withdraw(user: User, amount: FloatNumber): Promise<WrappedResult> {
    log(`${this.actors.getName(user)} withdraw ${amount}`);
    const result = await this.portfolioToken.connect(user).withdraw(floatToSystemInt(amount));
    return this.wrapResult(result);
  }

  async subWithdraw(user: User, amount: FloatNumber, index: Index): Promise<WrappedResult> {
    log(`${this.actors.getName(user)} withdraw ${amount} (index = ${index})`);
    const result = await this.portfolioToken.connect(user).subWithdraw(floatToSystemInt(amount), index - 1);
    return this.wrapResult(result);
  }

  async assertSubWithdrawResult(withdrawResult: ContractTransactionResponse, user: User, amount: FloatNumber, tokenIndex: Index) {
    const token = this.tokens[tokenIndex - 1];
    await expect(withdrawResult).changeTokenBalance(token, user.address, floatToInt(amount, PortfolioToken.getPrecision(tokenIndex)));
  }

  async assertedSubWithdraw(user: User, amount: FloatNumber, index: Index): Promise<ContractTransactionResponse> {
    const result = await this.subWithdraw(user, amount, index);
    await this.assertSubWithdrawResult(result, user, amount, index);
    return result;
  }

  async checkState(aliceBalance: FloatNumber, bobBalance: FloatNumber, poolsBalances: FloatNumber[], delta = 0) {
    await this.checkUsersState(aliceBalance, bobBalance, delta);

    for (const [index, balance] of poolsBalances.entries()) {
      await this.checkPoolState(balance, (index + 1) as Index, delta);
    }
  }

  async checkPoolState(poolBalance: FloatNumber, poolNumber: Index, delta = 0) {
    const {pool, precision} = this.getPoolByNumber(poolNumber);
    const actualPoolBalance = await pool.balanceOf(this.portfolioToken.target);
    const poolPendingRewards = await pool.pendingReward(this.portfolioToken.target);
    const poolBalanceWithRewards = actualPoolBalance + toSystemPrecision(poolPendingRewards, precision);
    log(`Pool${poolNumber} balance with rewards`, ethers.formatUnits(poolBalanceWithRewards, SYSTEM_PRECISION));

    expect(poolBalanceWithRewards).to.approximately(floatToSystemInt(poolBalance), delta, `Pool${poolNumber} balance`);
  }

  async getTokenBalance(token: TestToken, address: Addressable): Promise<string> {
    const precision = await token.decimals();
    return intToFloat(await token.balanceOf(addressFromAddressable(address)), Number(precision));
  }

  async assertTokenBalance(token: TestToken, address: Addressable, expectedBalance: FloatNumber, delta = 0) {
    if (delta == 0) {
      expect(await this.getTokenBalance(token, address)).to.equal(normalizeFloatNumber(expectedBalance));
    } else {
      expect(+await this.getTokenBalance(token, address)).to.approximately(+normalizeFloatNumber(expectedBalance), delta);
    }
  }

  async transferToken(token: TestToken, to: Addressable, amount: FloatNumber) {
    const precision = await token.decimals();
    return token.transfer(addressFromAddressable(to), floatToInt(amount, Number(precision)));
  }


  async pendingRewards(poolNumber: Index): Promise<string> {
    const {pool, precision} = this.getPoolByNumber(poolNumber);
    const poolPendingRewards = await pool.pendingReward(this.portfolioToken.target);
    return intToFloat(poolPendingRewards, precision);
  }

  async assertPendingRewards(poolNumber: Index, expectedPendingRewards: FloatNumber) {
    expect(await this.pendingRewards(poolNumber)).to.equal(normalizeFloatNumber(expectedPendingRewards));
  }

  async getRewardsAmount(poolNumber: Index): Promise<string> {
    return systemIntToFloat(await this.portfolioToken.getRewardsAmount(poolNumber - 1));
  }

  async realBalanceOf(address: Addressable) {
    const result = await this.portfolioToken.realBalanceOf(addressFromAddressable(address));
    return systemIntToFloat(result);
  }

  async realSubBalanceOf(address: Addressable, index: Index) {
    const result = await this.portfolioToken.realSubBalanceOf(addressFromAddressable(address), index - 1);
    return systemIntToFloat(result);
  }

  async realTotalSupply() {
    const result = await this.portfolioToken.realTotalSupply();
    return systemIntToFloat(result);
  }

  async realSubTotalSupply(index: Index) {
    const result = await this.portfolioToken.realSubTotalSupply(index - 1);
    return systemIntToFloat(result);
  }

  async assertRealBalanceOf(user: User, expectedBalance: FloatNumber) {
    expect(await this.realBalanceOf(user.address)).to.equal(normalizeFloatNumber(expectedBalance));
  }

  async assertRealSubBalanceOf(user: User, index: Index, expectedBalance: FloatNumber) {
    expect(await this.realSubBalanceOf(user.address, index)).to.equal(normalizeFloatNumber(expectedBalance));
  }

  async assertRealTotalSupply(expectedTotalSupply: FloatNumber) {
    expect(await this.realTotalSupply()).to.equal(normalizeFloatNumber(expectedTotalSupply));
  }

  async assertRealSubTotalSupply(expectedTotalSupply: FloatNumber, index: Index) {
    expect(await this.realSubTotalSupply(index)).to.equal(normalizeFloatNumber(expectedTotalSupply));
  }

  async checkUsersState(aliceBalance: FloatNumber, bobBalance: FloatNumber, delta = 0) {

    const actualAliceBalance = await this.portfolioToken.balanceOf(this.actors.alice.address);
    const actualBobBalance = await this.portfolioToken.balanceOf(this.actors.bob.address);
    log("Alice virtual balance", ethers.formatUnits(actualAliceBalance, SYSTEM_PRECISION));
    log("Bob virtual balance", ethers.formatUnits(actualBobBalance, SYSTEM_PRECISION));
    log("-------------------------------------------");
    expect(actualAliceBalance).to.approximately(floatToSystemInt(aliceBalance), delta, "Alice balance");
    expect(actualBobBalance).to.approximately(floatToSystemInt(bobBalance), delta, "Bob balance");
  }

  async approve(from: User, to: Addressable, amount: FloatNumber): Promise<WrappedResult> {
    const result = await this.contract.connect(from).approve(addressFromAddressable(to), floatToSystemInt(amount));
    return this.wrapResult(result);
  }

  async increaseAllowance(from: User, to: Addressable, amount: FloatNumber): Promise<WrappedResult> {
    const result = await this.contract.connect(from).increaseAllowance(addressFromAddressable(to), floatToSystemInt(amount));
    return this.wrapResult(result);
  }

  async decreaseAllowance(from: User, to: Addressable, amount: FloatNumber): Promise<WrappedResult> {
    const result = await this.contract.connect(from).decreaseAllowance(addressFromAddressable(to), floatToSystemInt(amount));
    return this.wrapResult(result);
  }

  async getAllowance(from: Addressable, to: Addressable): Promise<string> {
    const result = await this.contract.allowance(addressFromAddressable(from), addressFromAddressable(to));
    return systemIntToFloat(result);
  }

  async assertAllowance(from: Addressable, to: Addressable, expectedAllowance: FloatNumber) {
    expect(await this.getAllowance(from, to)).to.equal(normalizeFloatNumber(expectedAllowance));
  }

  async checkTokenBalancesChange(user: HardhatEthersSigner, txResponse: Promise<ContractTransactionResponse>, ...amounts: string[]) {
    for (let i = 0; i < amounts.length; i++) {
      const amount = amounts[i];
      if (!amount) {
        continue;
      }
      const {token, precision} = this.getPoolByNumber((i + 1) as Index);
      await expect(txResponse).changeTokenBalance(token, user, floatToInt(amount, precision));
    }
  }

  async assertBalanceOf(user: User, expectedSubBalance: FloatNumber, delta = 0) {
    if (delta === 0) {
      expect(systemIntToFloat(await this.portfolioToken.balanceOf(user))).to.equal(normalizeFloatNumber(expectedSubBalance));
    } else {
      expect(+systemIntToFloat(await this.portfolioToken.balanceOf(user))).to.approximately(+normalizeFloatNumber(expectedSubBalance), delta);
    }
  }

  async tokenBalanceOfSum(address: Addressable): Promise<string> {
    let sum = Big(0);
    for (const token of this.tokens) {
      sum = sum.add(Big(await this.getTokenBalance(token, address)));
    }

    return sum.toFixed();
  }

  async poolBalanceOfSum(): Promise<string> {
    let sum = Big(0);
    for (const index of indexes) {
      const {pool, token} = this.getPoolByNumber(index);
      sum = sum.add(Big(await this.getTokenBalance(token, pool)));
    }

    return sum.toFixed();
  }

  async assertSubBalanceOf(user: User, index: Index, expectedSubBalance: FloatNumber, delta = 0) {
    if (delta === 0) {
      expect(systemIntToFloat(await this.portfolioToken.subBalanceOf(user, index - 1))).to.equal(normalizeFloatNumber(expectedSubBalance));
    } else {
      expect(+systemIntToFloat(await this.portfolioToken.subBalanceOf(user, index - 1))).to.approximately(+normalizeFloatNumber(expectedSubBalance), delta);
    }
  }

  async assertTotalSupply(expectedTotalSupply: FloatNumber, delta = 0) {
    if (delta === 0) {
      expect(systemIntToFloat(await this.portfolioToken.totalSupply())).to.equal(normalizeFloatNumber(expectedTotalSupply));
    } else {
      expect(+systemIntToFloat(await this.portfolioToken.totalSupply())).to.approximately(+normalizeFloatNumber(expectedTotalSupply), delta);
    }
  }

  async subTotalSupply(index: Index): Promise<string> {
    return systemIntToFloat(await this.portfolioToken.subTotalSupply(index - 1));
  }

  async assertSubTotalSupply(expectedTotalSupply: FloatNumber, index: Index) {
    expect(systemIntToFloat(await this.portfolioToken.subTotalSupply(index - 1))).to.equal(normalizeFloatNumber(expectedTotalSupply));
  }

  public floatToIntByTokenIndex(amount: FloatNumber, index: Index): IntNumber {
    return ethers.parseUnits(amount.toString(), PortfolioToken.getPrecision(index));
  }

  public wrapResult(result: ContractTransactionResponse): WrappedResult {
    return new WrappedResult(result, this.contract);
  }
}
