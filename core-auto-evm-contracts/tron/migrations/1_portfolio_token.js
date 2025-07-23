const PortfolioToken = artifacts.require('PortfolioToken');
const {loadSolSource, assertDoesNotContainSafeERC20} = require('../utils/code-asserts');

module.exports = async function(deployer) {
  const source = loadSolSource('PortfolioToken');
  assertDoesNotContainSafeERC20(source);
  await deployer.deploy(PortfolioToken, "CYD", "Core Yield");
};
