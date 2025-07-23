import { ethers } from "hardhat";
import { MultiUintTest } from "../typechain";
import { expect } from "chai";

const edgeBitsValue = (1n << 63n) + 1n;
// prettier-ignore
const getValueTestData = [
  { packed: 0n, expectedValues: [0n, 0n, 0n, 0n] },
  { packed: 1n, expectedValues: [1n, 0n, 0n, 0n] },
  { packed: 1n << 64n, expectedValues: [0n, 1n, 0n, 0n] },
  { packed: 1n << (64n * 2n), expectedValues: [0n, 0n, 1n, 0n] },
  { packed: 1n << (64n * 3n), expectedValues: [0n, 0n, 0n, 1n] },
  { packed: 3n, expectedValues: [3n, 0n, 0n, 0n] },
  { packed: 3n << 63n, expectedValues: [1n << 63n, 1n, 0n, 0n] },
  { packed: 3n << 64n, expectedValues: [0n, 3n, 0n, 0n] },
  { packed: 3n << (63n + 64n), expectedValues: [0n, 1n << 63n, 1n, 0n] },
  { packed: 3n << (64n * 2n), expectedValues: [0n, 0n, 3n, 0n] },
  { packed: 3n << (63n + 64n * 2n), expectedValues: [0n, 0n, 1n << 63n, 1n] },
  { packed: 3n << (64n * 3n), expectedValues: [0n, 0n, 0n, 3n] },
  { packed: (1n << (64n * 3n)) + (1n << (64n * 2n)) + (1n << 64n) + 1n, expectedValues: [1n, 1n, 1n, 1n] },
  {
    packed: (1n << 256n) - 1n,
    expectedValues: [(1n << 64n) - 1n, (1n << 64n) - 1n, (1n << 64n) - 1n, (1n << 64n) - 1n],
  },
  { packed: (1n << (64n * 3n)) + (1n << (64n * 2n)) + (1n << 64n) + 1n, expectedValues: [1n, 1n, 1n, 1n] },
  { packed: edgeBitsValue, expectedValues: [edgeBitsValue, 0n, 0n, 0n] },
  { packed: edgeBitsValue << 64n, expectedValues: [0n, edgeBitsValue, 0n, 0n] },
  { packed: edgeBitsValue << (64n * 2n), expectedValues: [0n, 0n, edgeBitsValue, 0n] },
  { packed: edgeBitsValue << (64n * 3n), expectedValues: [0n, 0n, 0n, edgeBitsValue] },
  {
    packed: (edgeBitsValue << (64n * 3n)) + (edgeBitsValue << (64n * 2n)) + (edgeBitsValue << 64n) + edgeBitsValue,
    expectedValues: [edgeBitsValue, edgeBitsValue, edgeBitsValue, edgeBitsValue],
  },
];

// prettier-ignore
const addValueTestData = [
  { packed: 0n, value: 0n, index: 0, expected: 0n },
  { packed: 0n, value: 0n, index: 1, expected: 0n },
  { packed: 0n, value: 0n, index: 2, expected: 0n },
  { packed: 0n, value: 0n, index: 3, expected: 0n },
  { packed: 0n, value: (1n << 64n) - 1n, index: 0, expected: (1n << 64n) - 1n },
  { packed: 0n, value: (1n << 64n) - 1n, index: 1, expected: (1n << 64n) - 1n },
  { packed: 0n, value: (1n << 64n) - 1n, index: 2, expected: (1n << 64n) - 1n },
  { packed: 0n, value: (1n << 64n) - 1n, index: 3, expected: (1n << 64n) - 1n },
  { packed: 0n, value: 1n, index: 0, expected: 1n },
  { packed: 0n, value: 1n, index: 1, expected: 1n },
  { packed: 0n, value: 1n, index: 2, expected: 1n },
  { packed: 0n, value: 1n, index: 3, expected: 1n },
  { packed: (1n << 256n) - 1n, value: 0n, index: 0, expected: (1n << 64n) - 1n },
  { packed: (1n << 256n) - 1n, value: 0n, index: 1, expected: (1n << 64n) - 1n },
  { packed: (1n << 256n) - 1n, value: 0n, index: 2, expected: (1n << 64n) - 1n },
  { packed: (1n << 256n) - 1n, value: 0n, index: 3, expected: (1n << 64n) - 1n },
  { packed: (((1n << 64n) - 2n) << (64n * 3n)) + (((1n << 64n) - 2n) << (64n * 2n)) + (((1n << 64n) - 2n) << 64n) + ((1n << 64n) - 2n), value: 1n, index: 0, expected: (1n << 64n) - 1n },
  { packed: (((1n << 64n) - 2n) << (64n * 3n)) + (((1n << 64n) - 2n) << (64n * 2n)) + (((1n << 64n) - 2n) << 64n) + ((1n << 64n) - 2n), value: 1n, index: 1, expected: (1n << 64n) - 1n },
  { packed: (((1n << 64n) - 2n) << (64n * 3n)) + (((1n << 64n) - 2n) << (64n * 2n)) + (((1n << 64n) - 2n) << 64n) + ((1n << 64n) - 2n), value: 1n, index: 2, expected: (1n << 64n) - 1n },
  { packed: (((1n << 64n) - 2n) << (64n * 3n)) + (((1n << 64n) - 2n) << (64n * 2n)) + (((1n << 64n) - 2n) << 64n) + ((1n << 64n) - 2n), value: 1n, index: 3, expected: (1n << 64n) - 1n },
  { packed: (4n << (64n * 3n)) + (3n << (64n * 2n)) + (2n << 64n) + 1n, value: 10n, index: 0, expected: 11n },
  { packed: (4n << (64n * 3n)) + (3n << (64n * 2n)) + (2n << 64n) + 1n, value: 10n, index: 1, expected: 12n },
  { packed: (4n << (64n * 3n)) + (3n << (64n * 2n)) + (2n << 64n) + 1n, value: 10n, index: 2, expected: 13n },
  { packed: (4n << (64n * 3n)) + (3n << (64n * 2n)) + (2n << 64n) + 1n, value: 10n, index: 3, expected: 14n },
  { packed: (4n << (64n * 3n)) + (3n << (64n * 2n)) + (2n << 64n) + 1n, value: 1n << 63n, index: 0, expected: (1n << 63n) + 1n },
  { packed: (4n << (64n * 3n)) + (3n << (64n * 2n)) + (2n << 64n) + 1n, value: 1n << 63n, index: 1, expected: (1n << 63n) + 2n },
  { packed: (4n << (64n * 3n)) + (3n << (64n * 2n)) + (2n << 64n) + 1n, value: 1n << 63n, index: 2, expected: (1n << 63n) + 3n },
  { packed: (4n << (64n * 3n)) + (3n << (64n * 2n)) + (2n << 64n) + 1n, value: 1n << 63n, index: 3, expected: (1n << 63n) + 4n },
];

// prettier-ignore
const subValueTestData = [
  { packed: 0n, value: 0n, index: 0, expected: 0n },
  { packed: 0n, value: 0n, index: 1, expected: 0n },
  { packed: 0n, value: 0n, index: 2, expected: 0n },
  { packed: 0n, value: 0n, index: 3, expected: 0n },
  { packed: 1n, value: 1n, index: 0, expected: 0n },
  { packed: 1n << 64n, value: 1n, index: 1, expected: 0n },
  { packed: 1n << (64n * 2n), value: 1n, index: 2, expected: 0n },
  { packed: 1n << (64n * 3n), value: 1n, index: 3, expected: 0n },
  { packed: (1n << 256n) - 1n, value: 0n, index: 0, expected: (1n << 64n) - 1n },
  { packed: (1n << 256n) - 1n, value: 0n, index: 1, expected: (1n << 64n) - 1n },
  { packed: (1n << 256n) - 1n, value: 0n, index: 2, expected: (1n << 64n) - 1n },
  { packed: (1n << 256n) - 1n, value: 0n, index: 3, expected: (1n << 64n) - 1n },
  { packed: (1n << 256n) - 1n, value: 1n, index: 0, expected: (1n << 64n) - 2n },
  { packed: (1n << 256n) - 1n, value: 1n, index: 1, expected: (1n << 64n) - 2n },
  { packed: (1n << 256n) - 1n, value: 1n, index: 2, expected: (1n << 64n) - 2n },
  { packed: (1n << 256n) - 1n, value: 1n, index: 3, expected: (1n << 64n) - 2n },
  { packed: (1n << 256n) - 1n, value: (1n << 64n) - 1n, index: 0, expected: 0n },
  { packed: (1n << 256n) - 1n, value: (1n << 64n) - 1n, index: 1, expected: 0n },
  { packed: (1n << 256n) - 1n, value: (1n << 64n) - 1n, index: 2, expected: 0n },
  { packed: (1n << 256n) - 1n, value: (1n << 64n) - 1n, index: 3, expected: 0n },
  { packed: (13n << (64n * 3n)) + (12n << (64n * 2n)) + (11n << 64n) + 10n, value: 1n, index: 0, expected: 9n },
  { packed: (13n << (64n * 3n)) + (12n << (64n * 2n)) + (11n << 64n) + 10n, value: 2n, index: 1, expected: 9n },
  { packed: (13n << (64n * 3n)) + (12n << (64n * 2n)) + (11n << 64n) + 10n, value: 3n, index: 2, expected: 9n },
  { packed: (13n << (64n * 3n)) + (12n << (64n * 2n)) + (11n << 64n) + 10n, value: 4n, index: 3, expected: 9n },
  { packed: (1n << 256n) - 1n, value: 1n, index: 0, expected: (1n << 64n) - 2n },
  { packed: (1n << 256n) - 1n, value: 2n, index: 1, expected: (1n << 64n) - 3n },
  { packed: (1n << 256n) - 1n, value: 3n, index: 2, expected: (1n << 64n) - 4n },
  { packed: (1n << 256n) - 1n, value: 4n, index: 3, expected: (1n << 64n) - 5n },
];

describe("MultiUint lib", function () {
  let multiUint: MultiUintTest;
  before(async function () {
    const multiUintFactory = await ethers.getContractFactory("MultiUintTest");
    multiUint = (await multiUintFactory.deploy()) as any;
  });

  describe("getValue", () => {
    it("success", async () => {
      const testData = getValueTestData;
      for (const { packed, expectedValues } of testData) {
        for (let index = 0; index < expectedValues.length; index++) {
          const expected = expectedValues[index];
          if (expected == null) {
            continue;
          }
          const value = await multiUint.getValue(packed, index);
          expect(value).to.equal(expected);
        }
      }
    });

    it("fail", async () => {
      await expect(multiUint.getValue(0, 4)).revertedWith("Index out of range");
    });
  });

  describe("getValueUnchecked", () => {
    it("success", async () => {
      for (const { packed, expectedValues } of getValueTestData) {
        for (let index = 0; index < expectedValues.length; index++) {
          const expected = expectedValues[index];
          if (expected == null) {
            continue;
          }
          const value = await multiUint.getValueUnchecked(packed, index);
          expect(value).to.equal(expected);
        }
      }
    });
  });

  describe("setValue", () => {
    it("success", async function () {
      const edgeBitsValue = (1n << 63n) + 1n;
      const testData = [
        { packed: 0n, value: 123n },
        { packed: 0n, value: edgeBitsValue },
        { packed: (1n << 256n) - 1n, value: 123n },
        { packed: (1n << 256n) - 1n, value: 0n },
        { packed: (1n << 256n) - 1n, value: edgeBitsValue },
      ].flatMap((data) => new Array(4).fill(0).map((v, i) => ({ ...data, index: i })));

      for (const { packed, index, value } of testData) {
        const newPacked = await multiUint.setValue(packed, index, value);
        for (let i = 0; i < 4; i++) {
          if (i == index) {
            expect(await multiUint.getValue(newPacked, i)).to.equal(value);
          } else {
            expect(await multiUint.getValue(newPacked, i)).to.equal(await multiUint.getValue(packed, i));
          }
        }
      }
    });

    it("fail", async function () {
      await expect(multiUint.setValue(0, 4, 0)).revertedWith("Index out of range");
      await expect(multiUint.setValue(0, 0, 1n << 64n)).revertedWith("Value overflow");
    });
  });

  describe("setValueUnchecked", () => {
    it("success", async function () {
      const edgeBitsValue = (1n << 63n) + 1n;
      const testData = [
        { packed: 0n, value: 123n },
        { packed: 0n, value: edgeBitsValue },
        { packed: (1n << 256n) - 1n, value: 123n },
        { packed: (1n << 256n) - 1n, value: 0n },
        { packed: (1n << 256n) - 1n, value: edgeBitsValue },
      ].flatMap((data) => new Array(4).fill(0).map((v, i) => ({ ...data, index: i })));

      for (const { packed, index, value } of testData) {
        const newPacked = await multiUint.setValueUnchecked(packed, index, value);
        for (let i = 0; i < 4; i++) {
          if (i == index) {
            expect(await multiUint.getValueUnchecked(newPacked, i)).to.equal(value);
          } else {
            expect(await multiUint.getValueUnchecked(newPacked, i)).to.equal(await multiUint.getValueUnchecked(packed, i));
          }
        }
      }
    });
  });

  describe("totalValue", () => {
    it("success", async function () {
      const testData = [
        { packed: 0n, expected: 0n },
        { packed: 1n, expected: 1n },
        { packed: 1n << 64n, expected: 1n },
        { packed: 1n << (64n * 2n), expected: 1n },
        { packed: 1n << (64n * 3n), expected: 1n },
        { packed: (1n << (64n * 3n)) + (2n << (64n * 2n)) + (3n << 64n) + 4n, expected: 10n },
        { packed: (1n << 256n) - 1n, expected: ((1n << 64n) - 1n) * 4n },
      ];

      for (const { packed, expected } of testData) {
        expect(await multiUint.totalValue(packed)).to.equal(expected);
      }
    });
  });

  describe("totalValue", () => {
    it("success", async function () {
      const testData = [
        { packed: 0n, expected: 0n },
        { packed: 1n, expected: 1n },
        { packed: 1n << 64n, expected: 1n },
        { packed: 1n << (64n * 2n), expected: 1n },
        { packed: 1n << (64n * 3n), expected: 1n },
        { packed: (1n << (64n * 3n)) + (2n << (64n * 2n)) + (3n << 64n) + 4n, expected: 10n },
        { packed: (1n << 256n) - 1n, expected: ((1n << 64n) - 1n) * 4n },
      ];

      for (const { packed, expected } of testData) {
        expect(await multiUint.totalValue(packed)).to.equal(expected);
      }
    });
  });

  describe("addValue", () => {
    it("success", async function () {
      for (const { packed, index, value, expected } of addValueTestData) {
        const newPacked = await multiUint.addValue(packed, index, value);
        for (let i = 0; i < 4; i++) {
          if (i == index) {
            expect(await multiUint.getValue(newPacked, i)).to.equal(expected);
          } else {
            expect(await multiUint.getValue(newPacked, i)).to.equal(await multiUint.getValue(packed, i));
          }
        }
      }
    });

    it("fail", async function () {
      await expect(multiUint.addValue(0, 4, 0)).revertedWith("Index out of range");
      await expect(multiUint.addValue(0, 0, 1n << 64n)).revertedWith("Value overflow");
      await expect(multiUint.addValue(0, 1, 1n << 64n)).revertedWith("Value overflow");
      await expect(multiUint.addValue(0, 2, 1n << 64n)).revertedWith("Value overflow");
      await expect(multiUint.addValue(0, 3, 1n << 64n)).revertedWith("Value overflow");
      await expect(multiUint.addValue((1n << 256n) - 1n, 0, 1n)).revertedWith("Value overflow");
      await expect(multiUint.addValue((1n << 256n) - 1n, 1, 1n)).revertedWith("Value overflow");
      await expect(multiUint.addValue((1n << 256n) - 1n, 2, 1n)).revertedWith("Value overflow");
      await expect(multiUint.addValue((1n << 256n) - 1n, 3, 1n)).revertedWith("Value overflow");
    });
  });

  describe("addValueUnchecked", () => {
    it("success", async function () {
      for (const { packed, index, value, expected } of addValueTestData) {
        const newPacked = await multiUint.addValueUnchecked(packed, index, value);
        for (let i = 0; i < 4; i++) {
          if (i == index) {
            expect(await multiUint.getValueUnchecked(newPacked, i)).to.equal(expected);
          } else {
            expect(await multiUint.getValueUnchecked(newPacked, i)).to.equal(await multiUint.getValueUnchecked(packed, i));
          }
        }
      }
    });
  });

  describe("subValue", () => {
    it("success", async function () {
      for (const { packed, index, value, expected } of subValueTestData) {
        const newPacked = await multiUint.subValue(packed, index, value);
        for (let i = 0; i < 4; i++) {
          if (i == index) {
            expect(await multiUint.getValue(newPacked, i)).to.equal(expected);
          } else {
            expect(await multiUint.getValue(newPacked, i)).to.equal(await multiUint.getValue(packed, i));
          }
        }
      }
    });

    it("fail", async function () {
      await expect(multiUint.subValue(0, 4, 0)).revertedWith("Index out of range");
      await expect(multiUint.subValue((1n << 256n) - 1n, 0, 1n << 64n)).revertedWith("Value overflow");
      await expect(multiUint.subValue((1n << 256n) - 1n, 1, 1n << 64n)).revertedWith("Value overflow");
      await expect(multiUint.subValue((1n << 256n) - 1n, 2, 1n << 64n)).revertedWith("Value overflow");
      await expect(multiUint.subValue((1n << 256n) - 1n, 3, 1n << 64n)).revertedWith("Value overflow");
      await expect(multiUint.subValue(0n, 0, 1n)).revertedWith("Value overflow");
      await expect(multiUint.subValue(0n, 1, 1n)).revertedWith("Value overflow");
      await expect(multiUint.subValue(0n, 2, 1n)).revertedWith("Value overflow");
      await expect(multiUint.subValue(0n, 3, 1n)).revertedWith("Value overflow");
    });
  });

  describe("subValueUnchecked", () => {
    it("success", async function () {
      for (const { packed, index, value, expected } of subValueTestData) {
        const newPacked = await multiUint.subValueUnchecked(packed, index, value);
        for (let i = 0; i < 4; i++) {
          if (i == index) {
            expect(await multiUint.getValueUnchecked(newPacked, i)).to.equal(expected);
          } else {
            expect(await multiUint.getValueUnchecked(newPacked, i)).to.equal(await multiUint.getValueUnchecked(packed, i));
          }
        }
      }
    });
  });
});
