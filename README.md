# Allbridge Core Yield contest details

- Join [Sherlock Discord](https://discord.gg/MABEWyASkp)
- Submit findings using the **Issues** page in your private contest repo (label issues as **Medium** or **High**)
- [Read for more details](https://docs.sherlock.xyz/audits/watsons)

# Q&A

### Q: On what chains are the smart contracts going to be deployed?
Celo
___

### Q: If you are integrating tokens, are you allowing only whitelisted tokens to work with the codebase or any complying with the standard? Are they assumed to have certain properties, e.g. be non-reentrant? Are there any types of [weird tokens](https://github.com/d-xo/weird-erc20) you want to integrate?
Tokens are whitelisted, only USDT token is added. 


# Audit scope

[core-auto-evm-contracts @ d79882a8a7f2793cb3f7fcb21a9b317a7639846a](https://github.com/allbridge-public/core-auto-evm-contracts/tree/d79882a8a7f2793cb3f7fcb21a9b317a7639846a)
- [core-auto-evm-contracts/contracts/MultiToken.sol](core-auto-evm-contracts/contracts/MultiToken.sol)
- [core-auto-evm-contracts/contracts/PortfolioToken.sol](core-auto-evm-contracts/contracts/PortfolioToken.sol)
- [core-auto-evm-contracts/contracts/VirtualMultiToken.sol](core-auto-evm-contracts/contracts/VirtualMultiToken.sol)
- [core-auto-evm-contracts/contracts/lib/MultiUint.sol](core-auto-evm-contracts/contracts/lib/MultiUint.sol)
- [core-auto-evm-contracts/contracts/lib/PoolUtils.sol](core-auto-evm-contracts/contracts/lib/PoolUtils.sol)


