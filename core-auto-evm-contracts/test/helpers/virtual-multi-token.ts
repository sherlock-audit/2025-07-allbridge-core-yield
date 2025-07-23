import {VirtualMultiTokenWithMint} from "../../typechain";
import {ethers} from "hardhat";
import {Actors} from "./actors";
import {expect} from "chai";
import {log, next} from "./logger";
import {FloatNumber, floatToSystemInt, Index, systemIntToFloat, User} from './utils';

export class VirtualMultiToken {
  public readonly virtualMultiToken: VirtualMultiTokenWithMint;
  public readonly actors: Actors;

  constructor(virtualMultiToken: VirtualMultiTokenWithMint, actors: Actors, private readonly tokenNum = 3) {
    this.virtualMultiToken = virtualMultiToken;
    this.actors = actors;
  }

  static async init(): Promise<VirtualMultiToken> {
    const factory = await ethers.getContractFactory("VirtualMultiTokenWithMint");
    const virtualMultiToken = (await factory.deploy("Virtual Multi Token", "VMT")) as any;
    const actors = await Actors.init();
    return new VirtualMultiToken(virtualMultiToken, actors);
  }

  async assertBalance(user: User, expectedBalance: FloatNumber) {
    const balance = await this.virtualMultiToken.balanceOf(user.address);
    expect(balance).to.equal(
      floatToSystemInt(expectedBalance),
      `Expected ${this.actors.getName(user)} balance ${expectedBalance} but got ${systemIntToFloat(balance)}`
    );
  }

  async assertBalanceBetween(user: User, minExpectedBalance: FloatNumber, maxExpectedBalance: FloatNumber) {
    const balance = await this.virtualMultiToken.balanceOf(user.address);
    expect(balance).to.gte(
      floatToSystemInt(minExpectedBalance),
      `Expected ${this.actors.getName(user)} balance grater than or equal to ${minExpectedBalance} but got ${systemIntToFloat(balance)}`
    );

    expect(balance).to.lte(
      floatToSystemInt(maxExpectedBalance),
      `Expected ${this.actors.getName(user)} balance less than or equal to ${maxExpectedBalance} but got ${systemIntToFloat(balance)}`
    );
  }

  async assertSubBalance(user: User, index: Index, expectedBalance: FloatNumber) {
    const balance = await this.virtualMultiToken.subBalanceOf(user.address, index - 1);
    expect(balance).to.equal(
      floatToSystemInt(expectedBalance),
      `Expected ${this.actors.getName(user)} sub balance token ${index} is ${expectedBalance} but got ${systemIntToFloat(balance)}`
    );
  }

  async assertSubBalances(user: User, ...expectedBalance: FloatNumber[]) {
    for (let i = 1; i <= expectedBalance.length; i++) {
      await this.assertSubBalance(user, i as Index, expectedBalance[i - 1]);
    }
  }

  async getTotalSuply(): Promise<string> {
    return systemIntToFloat(await this.virtualMultiToken.totalSupply());
  }

  async getSubTotalSuply(index: Index): Promise<string> {
    return systemIntToFloat(await this.virtualMultiToken.subTotalSupply(index - 1));
  }

  async getRealTotalSuply(): Promise<string> {
    return systemIntToFloat(await this.virtualMultiToken.realTotalSupply());
  }

  async getRealSubTotalSuply(index: Index): Promise<string> {
    return systemIntToFloat(await this.virtualMultiToken.realSubTotalSupply(index - 1));
  }

  async assertTotalSupply(expected: FloatNumber) {
    const value = await this.virtualMultiToken.totalSupply();
    expect(value).to.equal(floatToSystemInt(expected), `Expected total supply ${expected} but got ${systemIntToFloat(value)}`);
  }

  async assertSubTotalSupply(expected: FloatNumber, index: Index) {
    const value = await this.virtualMultiToken.subTotalSupply(index - 1);
    expect(value).to.equal(
      floatToSystemInt(expected),
      `Expected sub total supply of token ${index} to be ${expected} but got ${systemIntToFloat(value)}`
    );
  }

  async assertRealTotalSupply(expected: FloatNumber) {
    const value = await this.virtualMultiToken.realTotalSupply();
    expect(value).to.equal(
      floatToSystemInt(expected),
      `Expected real total supply ${expected} but got ${systemIntToFloat(value)}`
    );
  }

  async assertRealSubTotalSupply(expected: FloatNumber, index: Index) {
    const value = await this.virtualMultiToken.realSubTotalSupply(index - 1);
    expect(value).to.equal(
      floatToSystemInt(expected),
      `Expected real sub total supply of token ${index} to be ${expected} but got ${systemIntToFloat(value)}`
    );
  }

  async assertTotalSupplies(...amounts: FloatNumber[]) {
    for (let i = 1; i <= amounts.length; i++) {
      await this.assertSubTotalSupply(amounts[i - 1], i as Index);
    }
  }

  async assertRealTotalSupplies(...amounts: FloatNumber[]) {
    for (let i = 1; i <= amounts.length; i++) {
      await this.assertRealSubTotalSupply(amounts[i - 1], i as Index);
    }
  }

  async transfer(from: User, to: User, amount: FloatNumber) {
    log(`Transfer ${amount} from ${this.actors.getName(from)} to ${this.actors.getName(to)}`);
    const result = await this.virtualMultiToken.connect(from).transfer(to.address, floatToSystemInt(amount));
    const tx = await result.wait();
    log(`Gas used: ${tx?.gasUsed}`);
    return result;
  }

  async subTransfer(from: User, to: User, amount: FloatNumber, index: Index) {
    log(`Transfer ${amount} from ${this.actors.getName(from)} to ${this.actors.getName(to)} token ${index}`);
    return await this.virtualMultiToken.connect(from).subTransfer(to.address, floatToSystemInt(amount), index - 1);
  }

  async subTransferFrom(from: User, to: User, amount: FloatNumber, index: Index) {
    log(`Transfer ${amount} from ${this.actors.getName(from)} to ${this.actors.getName(to)} (index = ${index})`);
    return await this.virtualMultiToken.connect(to).subTransferFrom(from.address, to.address, floatToSystemInt(amount), index - 1);
  }

  async transferFrom(from: User, to: User, amount: FloatNumber) {
    log(`Transfer ${amount} from ${this.actors.getName(from)} to ${this.actors.getName(to)}`);
    return await this.virtualMultiToken.connect(to).transferFrom(from.address, to.address, floatToSystemInt(amount));
  }

  async burn(from: User, amount: FloatNumber, index: Index) {
    log(`Burn ${amount} from ${this.actors.getName(from)}`);
    return await this.virtualMultiToken.burn(from.address, floatToSystemInt(amount), index - 1);
  }

  async setTotalVirtualAmount(amount: FloatNumber, index: Index) {
    log(`Set total virtual amount ${amount} for token ${index}`);
    await this.virtualMultiToken.setTotalVirtualAmount(floatToSystemInt(amount), index - 1);
  }

  async addTotalVirtualAmount(amount: FloatNumber, index: Index) {
    log(`Add total virtual amount ${amount} for token ${index}`);
    await this.virtualMultiToken.addTotalVirtualAmount(floatToSystemInt(amount), index - 1);
  }

  async addTotalVirtualAmounts(...amount: FloatNumber[]) {
    for (let i = 1; i <= amount.length; i++) {
      await this.addTotalVirtualAmount(amount[i - 1], i as Index);
    }
  }

  async approve(user: User, spender: User, amount: FloatNumber) {
    log(`${this.actors.getName(user)} approve ${amount} for ${this.actors.getName(spender)}`);
    await this.virtualMultiToken.connect(user).approve(spender.address, floatToSystemInt(amount));
  }

  async getTotalVirtualAmount(index: Index): Promise<string> {
    const amount = await this.virtualMultiToken.totalVirtualAmounts(index - 1);
    return systemIntToFloat(amount);
  }

  async mintAfterTotalChanged(to: User, amount: FloatNumber, index: Index) {
    log(`Mint ${amount} to ${this.actors.getName(to)}`);
    await this.virtualMultiToken.mintAfterTotalChanged(to.address, floatToSystemInt(amount), index - 1);
  }

  async mintAllAfterTotalChanged(to: User, ...amounts: FloatNumber[]) {
    for (let i = 1; i <= amounts.length; i++) {
      await this.mintAfterTotalChanged(to, amounts[i - 1], i as Index);
    }
  }

  async mintAllReal(to: User, ...amounts: FloatNumber[]) {
    for (let i = 1; i <= amounts.length; i++) {
      await this.mintReal(to, amounts[i - 1], i as Index);
    }
  }

  async mintRealInBalance(to: User, amount: FloatNumber, index: Index) {
    const result = await this.mintReal(to, amount, index);
    await this.addTotalVirtualAmount(amount, index);
    return result;
  }

  async mintAllRealAndVirtual(to: User, ...amounts: FloatNumber[]) {
    for (let i = 1; i <= amounts.length; i++) {
      await this.mintRealInBalance(to, amounts[i - 1], i as Index);
    }
  }

  async mintReal(to: User, amount: FloatNumber, index: Index) {
    log(`Mint real ${amount} to ${this.actors.getName(to)} for token ${index}`);
    return await this.virtualMultiToken.mintReal(to.address, floatToSystemInt(amount), index - 1);
  }

  async logUserState(user: User) {
    next();
    const userName = this.actors.getName(user);
    const realBalance = await this.virtualMultiToken.realBalanceOf(user.address);
    const balance = await this.virtualMultiToken.balanceOf(user.address);
    log(`${userName} balance: ${systemIntToFloat(balance)} (real balance: ${systemIntToFloat(realBalance)})`);
    for (let i = 0; i < this.tokenNum; i++) {
      const realSubBalance = await this.virtualMultiToken.realSubBalanceOf(user.address, i);
      const subBalance = await this.virtualMultiToken.subBalanceOf(user.address, i);
      log(`${userName} token ${i} balance: ${systemIntToFloat(subBalance)} (real balance: ${systemIntToFloat(realSubBalance)})`);
    }
    next();
  }

  async logPoolsState() {
    next();
    const realTotalSupply = await this.virtualMultiToken.realTotalSupply();
    const totalSupply = await this.virtualMultiToken.totalSupply();
    log(`Total supply: ${systemIntToFloat(totalSupply)} (real total supply: ${systemIntToFloat(realTotalSupply)})`);

    for (let i = 0; i < this.tokenNum; i++) {
      const realSubTotalSupply = await this.virtualMultiToken.realSubTotalSupply(i);
      const subTotalSupply = await this.virtualMultiToken.subTotalSupply(i);
      log(`Total supply ${i}: ${systemIntToFloat(subTotalSupply)} (real total supply: ${systemIntToFloat(realSubTotalSupply)})`);
    }
    next();
  }
}
