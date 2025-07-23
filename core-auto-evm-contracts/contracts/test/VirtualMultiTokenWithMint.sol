// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {VirtualMultiToken} from "../VirtualMultiToken.sol";
import {MultiToken} from "../MultiToken.sol";

contract VirtualMultiTokenWithMint is VirtualMultiToken {
    uint[4] public totalVirtualAmounts;
    constructor(string memory tokenName_, string memory tokenSymbol_) VirtualMultiToken(tokenName_, tokenSymbol_) {}

    function mintAfterTotalChanged(address account, uint amount, uint index) external {
        _mintAfterTotalChanged(account, amount, index);
    }

    function mintReal(address account, uint amount, uint index) external {
        MultiToken._mint(account, amount, index);
    }

    function burn(address account, uint amount, uint index) external {
        _burn(account, amount, index);
    }

    function _totalVirtualAmount(uint index) internal view override returns (uint) {
        return totalVirtualAmounts[index];
    }

    function setTotalVirtualAmount(uint value, uint index) external {
        totalVirtualAmounts[index] = value;
    }

    function addTotalVirtualAmount(uint value, uint index) external {
        totalVirtualAmounts[index] += value;
    }

    function realBalanceOf(address account) external view returns (uint) {
        return MultiToken.balanceOf(account);
    }

    function realSubBalanceOf(address account, uint index) external view returns (uint) {
        return MultiToken.subBalanceOf(account, index);
    }

    function realTotalSupply() external view returns (uint) {
        return MultiToken.totalSupply();
    }

    function realSubTotalSupply(uint index) external view returns (uint) {
        return MultiToken.subTotalSupply(index);
    }
}
