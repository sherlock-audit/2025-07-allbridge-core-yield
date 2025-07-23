const { callContract } = require('./helper');
const {getRequiredEnv} = require('../utils/env-utils');

(async function () {
  const contractAddress = getRequiredEnv('CONTRACT_ADDRESS');

  const result = await callContract(
    'PortfolioToken',
      contractAddress,
    'transferOwnership',
    'TVRatq56xSxNjYvgqTXjsFHg9AYWTUjiAx',
  );
  console.log(result);
})();
