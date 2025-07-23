const PortfolioToken = artifacts.require('PortfolioToken');
const {getRequiredEnv} = require('../utils/env-utils')

module.exports = async function(deployer) {
  const contractAddress = getRequiredEnv('CONTRACT_ADDRESS');
  const portfolioToken = await PortfolioToken.at(contractAddress);
  const pools = JSON.parse(getRequiredEnv('POOLS'));

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    const txId = await portfolioToken.setPool(i, pool);
    console.log(`Set pool ${i} ts: ${txId}`);
  }
};
