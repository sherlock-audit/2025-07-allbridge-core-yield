import {ContractTransactionResponse} from 'ethers';
import {expect} from 'chai';
import {PortfolioToken as PortfolioTokenInterface, TestPoolForRewards, TestToken} from '../../typechain';
import {Addressable, addressFromAddressable, FloatNumber, floatToInt, floatToSystemInt, User} from './utils';

export class WrappedResult extends ContractTransactionResponse {
  constructor(result: ContractTransactionResponse, private readonly contract: PortfolioTokenInterface) {
    super(contract.interface, result.provider, result)
  }

  async expectEmitDepositedEvent(user: User, token: TestToken, amount: FloatNumber, lpAmount: FloatNumber) {
    const decimals = await token.decimals();
    await expect(this)
      .emit(this.contract, "Deposited")
      .withArgs(user.address, token.target, floatToInt(amount, Number(decimals)), floatToSystemInt(lpAmount))
    return this;
  }

  async expectEmitDepositedRewardsEvent(token: TestToken, amount: FloatNumber) {
    const decimals = await token.decimals();
    await expect(this)
      .emit(this.contract, "DepositedRewards")
      .withArgs(floatToInt(amount, Number(decimals)), token.target)
    return this
  }

  async expectEmitWithdrawnEvent(user: Addressable, token: TestToken, amount: FloatNumber, ) {
    const decimals = await token.decimals();
    await expect(this)
      .emit(this.contract, "Withdrawn")
      .withArgs(addressFromAddressable(user), token.target, floatToInt(amount, Number(decimals)))
    return this
  }

  async expectEmitApprovalEvent(from: Addressable, to: Addressable, amount: FloatNumber) {
    await expect(this)
      .emit(this.contract, "Approval")
      .withArgs(addressFromAddressable(from), addressFromAddressable(to), floatToSystemInt(amount))
    return this
  }

  async expectEmitMultiTransferEvent(from: Addressable, to: Addressable, ...amounts: FloatNumber[]) {
    const eventAmounts = new Array(4).fill(0).map((v, i) => amounts[i] ?? v).map(floatToSystemInt);
    await expect(this)
      .emit(this.contract, "MultiTransfer")
      .withArgs(addressFromAddressable(from), addressFromAddressable(to), eventAmounts)
    return this
  }

  async expectEmitVirtualTransferEvent(from: Addressable, to: Addressable, amount: FloatNumber) {
    await expect(this)
      .emit(this.contract, "Transfer")
      .withArgs(addressFromAddressable(from), addressFromAddressable(to), floatToSystemInt(amount))
    return this
  }

  async expectEmitTokenTransferEvent(from: Addressable, to: Addressable, amount: FloatNumber, token: TestToken) {
    const decimals = await token.decimals();
    await expect(this)
      .emit(token, "Transfer")
      .withArgs(addressFromAddressable(from), addressFromAddressable(to), floatToInt(amount, Number(decimals)))
    return this
  }

  async expectChangeTokenBalance(address: Addressable, token: TestToken, amount: FloatNumber) {
    const decimals = await token.decimals();
    await expect(this).changeTokenBalance(token, addressFromAddressable(address), floatToInt(amount, Number(decimals)));
    return this;
  }
}
