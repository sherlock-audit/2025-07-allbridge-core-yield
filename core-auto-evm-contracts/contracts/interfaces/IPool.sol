// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IPool {
    function tokenBalance() external view returns (uint);
    function vUsdBalance() external view returns (uint);
    function d() external view returns (uint);
    function getY(uint x) external view returns (uint);
    function accRewardPerShareP() external view returns (uint);
    function userRewardDebt(address user) external view returns (uint);
    function token() external view returns (ERC20);
    function balanceOf(address user) external view returns (uint);
    function decimals() external pure returns (uint8);
    function pendingReward(address user) external view returns (uint);
    function deposit(uint amount) external;
    function claimRewards() external;
    function withdraw(uint amountLp) external;
    function canDeposit() external view returns (uint);
    function canWithdraw() external view returns (uint);
}
