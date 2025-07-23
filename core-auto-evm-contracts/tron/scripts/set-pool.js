const {
  callContract
} = require('./helper');
const {getRequiredEnv} = require('../utils/env-utils');

(async function () {
  const contractAddress = getRequiredEnv('CONTRACT_ADDRESS');

  const poolIndex = 1; // Override
  const poolAddress = 'TEBGLMAn5veAaCf7defG4Ag1AZZaZLXFtN';  // Override

  const result = await callContract(
    'PortfolioToken',
      contractAddress,
    'setPool',
      poolIndex,
      poolAddress
  );
  console.log(result);
})();
