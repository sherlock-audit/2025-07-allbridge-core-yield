// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPool} from "./interfaces/IPool.sol";
import {VirtualMultiToken} from "./VirtualMultiToken.sol";
import {MultiToken} from "./MultiToken.sol";
import "./lib/PoolUtils.sol";

contract PortfolioToken is Ownable, VirtualMultiToken {
    using SafeERC20 for IERC20;

    uint private constant SYSTEM_PRECISION = 3;
    uint[NUM_TOKENS] private tokensPerSystem;

    IPool[NUM_TOKENS] public pools;
    IERC20[NUM_TOKENS] public tokens;

    event Deposited(address user, address token, uint amount, uint lpAmount);
    event Withdrawn(address user, address token, uint amount);
    event DepositedRewards(uint amount, address token);

    constructor(string memory tokenName_, string memory tokenSymbol_) VirtualMultiToken(tokenName_, tokenSymbol_) {}

    /**
     * @dev Deposit tokens into the pool.
     * @param amount The amount of tokens to deposit.
     * @param index The index of the pool to deposit to.
     */
    function deposit(uint amount, uint index) external {
        require(index < NUM_TOKENS, "Index out of range");
        IERC20 token = tokens[index];
        IPool pool = pools[index];
        require(address(pool) != address(0), "No pool");
        _subDepositRewardsPoolCheck(pool, index);
        // Transfer tokens from the user to the contract
        token.safeTransferFrom(msg.sender, address(this), amount);

        // lp amount is the same as virtual token amount
        uint virtualAmountBefore = pool.balanceOf(address(this));
        // calculate sum of mint amount
        pool.deposit(amount);
        uint virtualAmountAfter = pool.balanceOf(address(this));
        uint virtualAmountDiff = virtualAmountAfter - virtualAmountBefore;
        _mintAfterTotalChanged(msg.sender, virtualAmountDiff, index);
        uint[NUM_TOKENS] memory virtualAmounts;
        virtualAmounts[index] = virtualAmountDiff;

        emit Transfer(address(0), msg.sender, virtualAmountDiff);
        emit MultiTransfer(address(0), msg.sender, virtualAmounts);
        emit Deposited(msg.sender, address(token), amount, virtualAmountDiff);
    }

    /**
     * @dev This method allows for withdrawing a certain amount from all pools in proportion
     * @param virtualAmount The amount of virtual tokens to withdraw.
     */
    function withdraw(uint virtualAmount) external {
        depositRewards();

        uint totalVirtualBalance = balanceOf(msg.sender);
        if (totalVirtualBalance == 0 || virtualAmount == 0) {
            return;
        }
        uint[NUM_TOKENS] memory virtualAmounts = [
            _withdrawIndex(virtualAmount, totalVirtualBalance, 0),
            _withdrawIndex(virtualAmount, totalVirtualBalance, 1),
            _withdrawIndex(virtualAmount, totalVirtualBalance, 2),
            _withdrawIndex(virtualAmount, totalVirtualBalance, 3)
        ];
        emit Transfer(msg.sender, address(0), virtualAmount);
        emit MultiTransfer(msg.sender, address(0), virtualAmounts);
    }

    function _withdrawIndex(
        uint virtualAmount,
        uint totalVirtualBalance,
        uint index
    ) internal returns (uint subVirtualAmount) {
        IPool pool = pools[index];
        if (address(pool) == address(0)) {
            return 0;
        }
        uint subVirtualBalance = VirtualMultiToken.subBalanceOf(msg.sender, index);
        subVirtualAmount = (virtualAmount * subVirtualBalance) / totalVirtualBalance;
        if (subVirtualAmount == 0) {
            return 0;
        }
        _subWithdraw(subVirtualAmount, pool, index);
    }

    /**
     * @dev This method allows for withdrawing a certain amount from a specific pool.
     * @param virtualAmount the number of virtual tokens to be withdrawn.
     * @param index the index identifier of the pool where the action will occur.
     */
    function subWithdraw(uint virtualAmount, uint index) external {
        subDepositRewards(index);
        if (virtualAmount == 0) {
            return;
        }
        IPool pool = pools[index];
        require(address(pool) != address(0), "No pool");
        _subWithdraw(virtualAmount, pool, index);
        uint[NUM_TOKENS] memory virtualAmounts;
        virtualAmounts[index] = virtualAmount;
        emit Transfer(msg.sender, address(0), virtualAmount);
        emit MultiTransfer(msg.sender, address(0), virtualAmounts);
    }

    function _subWithdraw(uint virtualAmount, IPool pool, uint index) private {
        // Zero amount should be checked before
        IERC20 token = tokens[index];

        VirtualMultiToken._burn(msg.sender, virtualAmount, index);
        // should withdraw equal amount to virtualAmount (lpTokenAmount)
        pool.withdraw(virtualAmount);
        uint contractBalance = token.balanceOf(address(this));
        uint amountToWithdraw = virtualAmount * tokensPerSystem[index];
        amountToWithdraw = amountToWithdraw > contractBalance ? contractBalance : amountToWithdraw;
        token.safeTransfer(msg.sender, amountToWithdraw);
        emit Withdrawn(msg.sender, address(token), amountToWithdraw);
    }

    /**
     * @dev Claim and deposit rewards form all pools
     */
    function depositRewards() public {
        subDepositRewards(0);
        subDepositRewards(1);
        subDepositRewards(2);
        subDepositRewards(3);
    }

    /**
     * @dev Claim and deposit rewards of a specified pool
     * @param index The index of the pool for which rewards are to be deposited.
     */
    function subDepositRewards(uint index) public {
        require(index < NUM_TOKENS, "Index out of range");
        IPool pool = pools[index];
        if (address(pool) == address(0)) {
            return;
        }

        _subDepositRewardsPoolCheck(pool, index);
    }

    function _subDepositRewardsPoolCheck(IPool pool, uint index) private {
        IERC20 token = tokens[index];

        pool.claimRewards();
        // deposit all contract token balance
        uint balance = token.balanceOf(address(this));
        if ((balance / tokensPerSystem[index]) > 0) {
            pool.deposit(balance);
            emit DepositedRewards(balance, address(token));
        }
    }

    /**
     * @dev This function sets up a pool for a specific index. Reverted if an existing pool is already set up at this index.
     * Only the owner of the contract can call this function.
     * @param index The index to set the pool.
     * @param pool The new pool to be set.
     */
    function setPool(uint index, IPool pool) external onlyOwner {
        require(address(pool) != address(0), "Zero pool address");
        require(index < NUM_TOKENS, "Index out of range");
        require(address(pools[index]) == address(0), "Already exists");
        require(pool.decimals() == SYSTEM_PRECISION, "Wrong pool decimals");
        pools[index] = pool;

        IERC20Metadata token = pool.token();
        require(address(token) != address(0), "Zero token address");
        tokens[index] = token;
        IERC20(token).forceApprove(address(pool), type(uint).max);

        uint tokenDecimals = token.decimals();
        require(tokenDecimals >= SYSTEM_PRECISION, "Token precision too low");
        tokensPerSystem[index] = 10 ** (tokenDecimals - SYSTEM_PRECISION);
    }

    function getWithdrawProportionAmount(
        address user,
        uint virtualAmount
    ) public view returns (uint[NUM_TOKENS] memory) {
        uint totalVirtualBalance = balanceOf(user);
        uint[NUM_TOKENS] memory amounts;
        if (totalVirtualBalance == 0 || virtualAmount == 0) {
            return amounts;
        }

        for (uint i = 0; i < NUM_TOKENS; i++) {
            uint virtualBalance = VirtualMultiToken.subBalanceOf(user, i);
            amounts[i] = ((virtualAmount * virtualBalance) / totalVirtualBalance) * tokensPerSystem[i];
        }

        return amounts;
    }

    function getEstimatedAmountOnDeposit(uint amount, uint index) public view returns (uint) {
        require(index < NUM_TOKENS, "Index out of range");
        IPool pool = pools[index];
        if (address(pool) == address(0)) {
            return 0;
        }

        uint rewardsAmountSP = getRewardsAmount(index) / tokensPerSystem[index];
        uint amountSP = amount / tokensPerSystem[index];
        require(amountSP > 0, "Amount is too small");
        uint oldD = pool.d();
        uint tokenBalance = pool.tokenBalance();
        uint vUsdBalance = pool.vUsdBalance();

        if (rewardsAmountSP > 0) {
            (tokenBalance, vUsdBalance, oldD) = PoolUtils.changeStateOnDeposit(
                tokenBalance,
                vUsdBalance,
                oldD,
                rewardsAmountSP
            );
        }
        uint newD;
        (tokenBalance, vUsdBalance, newD) = PoolUtils.changeStateOnDeposit(tokenBalance, vUsdBalance, oldD, amountSP);

        return newD > oldD ? newD - oldD : 0;
    }

    function getRewardsAmount(uint index) public view returns (uint) {
        require(index < NUM_TOKENS, "Index out of range");
        IPool pool = pools[index];
        if (address(pool) == address(0)) {
            return 0;
        }
        uint lpAmount = pool.balanceOf(address(this));
        uint rewardDebt = pool.userRewardDebt(address(this));
        return ((lpAmount * pool.accRewardPerShareP()) >> PoolUtils.P) - rewardDebt;
    }

    /**
     * @dev Override parent class's function. This function returns the total amount of virtual tokens for a specific pool.
     * @param index The index identifying the specific pool.
     * @return The total amount of virtual tokens in the specified pool.
     */
    function _totalVirtualAmount(uint index) internal view override returns (uint) {
        require(index < NUM_TOKENS, "Index out of range");
        IPool pool = pools[index];
        if (address(pool) == address(0)) {
            return 0;
        }
        return pool.balanceOf(address(this));
    }

    fallback() external payable {
        revert("Unsupported");
    }

    receive() external payable {}
}
