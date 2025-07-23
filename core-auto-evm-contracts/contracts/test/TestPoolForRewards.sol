// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "allbridge-core-evm-contracts/contracts/Pool.sol";

contract TestPoolForRewards is Pool {
    // solhint-disable-next-line no-empty-blocks
    constructor(ERC20 token) Pool(msg.sender, 20, token, 0, 0, "LP", "LP") {}

    function addRewards(uint amount) external {
        token.transferFrom(msg.sender, address(this), amount);
        _addRewards(amount);
    }
}
