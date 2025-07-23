const { getContract } = require('./helper');
const {getRequiredEnv} = require('../utils/env-utils');

(async function () {
  const contractAddress = getRequiredEnv('CONTRACT_ADDRESS');
  const result = await getContract('PortfolioToken', contractAddress, 'pools', 0);
  console.log(result);
})();
