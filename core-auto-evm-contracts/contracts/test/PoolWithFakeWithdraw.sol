// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "allbridge-core-evm-contracts/contracts/Pool.sol";
import {TestPoolForRewards} from "./TestPoolForRewards.sol";

contract PoolWithFakeWithdraw {
    uint8 public decimals = 3;

    ERC20 public token;
    // solhint-disable-next-line no-empty-blocks
    constructor(ERC20 token_) {
        token = token_;
    }

    function withdraw(uint amountLp) external {
        token.transfer(msg.sender, (amountLp * (10 ** (token.decimals() - 3))) / 2);
    }

    function deposit(uint amount) external {
        token.transferFrom(msg.sender, address(this), amount);
    }

    function claimRewards() external {}

    function balanceOf(address user) external returns (uint) {
        return token.balanceOf(address(this)) / (10 ** (token.decimals() - 3));
    }
}
