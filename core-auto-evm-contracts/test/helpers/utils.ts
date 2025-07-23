import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';
import {BaseContract, BigNumberish, ethers, FixedNumber} from 'ethers';
import Big, {BigSource} from 'big.js';

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): string {
  return Big((Math.random() * (max - min)) + min).toFixed(3);
}

export type Index = 1 | 2 | 3 | 4;
export type User = HardhatEthersSigner;
export type FloatNumber = string | number;
export type IntNumber = bigint;
export type Addressable = User | BaseContract | string
export const indexes: Index[] = [1,2,3,4];

export const SYSTEM_PRECISION = 3;

export function firstPoolIndexes(n: number): Index[] {
  return new Array(n).fill(0).map((v, i) => i + 1 as Index)
}

export function randomChance(chance: number): boolean {
  return Math.random() < chance;
}

export function randomPercent(percent: number, amount: FloatNumber): string {
  const max = Big(amount).times(percent / 100);
  return Big(max).times(Math.random()).toFixed(3);
}

export function assertPoolIndex(index: number): asserts index is Index {
  if (index < 1 || index > 4) {
    throw new Error('Invalid pool index');
  }
}

export function normalizeFloatNumber(amount: FloatNumber): string {
  return FixedNumber.fromString(amount.toString()).toString();
}

export function floatToSystemInt(amount: FloatNumber): IntNumber {
  return ethers.parseUnits(amount.toString(), SYSTEM_PRECISION);
}

export function systemIntToFloat(amount: BigNumberish): string {
  return ethers.formatUnits(amount, SYSTEM_PRECISION);
}

export function floatToInt(amount: FloatNumber, precision: number): IntNumber {
  return ethers.parseUnits(amount.toString(), precision);
}

export function intToFloat(amount: string | bigint | number, precision: number): string {
  return ethers.formatUnits(amount.toString(), precision);
}

export function toSystemPrecision(amount: string | bigint | number, precision: number): bigint {
  return BigInt(amount) / 10n ** (BigInt(precision) - BigInt(SYSTEM_PRECISION));
}

export function add(a: BigSource, b: BigSource): number {
  return Big(a).add(b).toNumber()
}

export function sub(a: BigSource, b: BigSource): number {
  return Big(a).sub(b).toNumber()
}

export function addressFromAddressable(entity: Addressable): string {
  if (typeof entity === 'string') {
    return entity;
  } else if ('address' in entity) {
    return entity.address
  } else if (typeof entity.target === 'string'){
    return entity.target
  } else {
    throw new Error('Cannot get address from entity')
  }
}
