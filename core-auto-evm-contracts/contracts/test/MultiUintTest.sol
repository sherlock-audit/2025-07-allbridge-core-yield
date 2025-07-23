// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../lib/MultiUint.sol";

contract MultiUintTest {
    using MultiUint for uint;

    function getValue(uint packed, uint index) external pure returns (uint) {
        return MultiUint.getValue(packed, index);
    }

    function getValueUnchecked(uint packed, uint index) external pure returns (uint) {
        return MultiUint.getValueUnchecked(packed, index);
    }

    function setValue(uint packed, uint index, uint value) external pure returns (uint) {
        return MultiUint.setValue(packed, index, value);
    }

    function setValueUnchecked(uint packed, uint index, uint value) external pure returns (uint) {
        return MultiUint.setValueUnchecked(packed, index, value);
    }

    function totalValue(uint packed) external pure returns (uint) {
        return MultiUint.totalValue(packed);
    }

    function addValue(uint packed, uint index, uint value) external pure returns (uint) {
        return MultiUint.addValue(packed, index, value);
    }

    function addValueUnchecked(uint packed, uint index, uint value) external pure returns (uint) {
        return MultiUint.addValueUnchecked(packed, index, value);
    }

    function subValue(uint packed, uint index, uint value) external pure returns (uint) {
        return MultiUint.subValue(packed, index, value);
    }

    function subValueUnchecked(uint packed, uint index, uint value) external pure returns (uint) {
        return MultiUint.subValueUnchecked(packed, index, value);
    }
}
