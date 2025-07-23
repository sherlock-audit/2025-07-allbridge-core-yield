// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../PortfolioToken.sol";

contract PortfolioTokenWithPublicGetters is PortfolioToken {
    constructor(string memory tokenName_, string memory tokenSymbol_) PortfolioToken(tokenName_, tokenSymbol_) {}

    function realBalanceOf(address account) public view returns (uint) {
        return MultiToken.balanceOf(account);
    }

    function realSubBalanceOf(address account, uint index) public view returns (uint) {
        return MultiToken.subBalanceOf(account, index);
    }

    function realTotalSupply() public view returns (uint) {
        return MultiToken.totalSupply();
    }

    function realSubTotalSupply(uint index) public view returns (uint) {
        return MultiToken.subTotalSupply(index);
    }
}
