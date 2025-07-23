import {task} from 'hardhat/config';
import {handleDeployResult} from './utils';

task("pt:deploy", "Deploy portfolio token contract")
  .addParam('name', 'Portfolio token name', 'Core Yield')
  .addParam('symbol', 'Portfolio token symbol', 'CYD')
  .setAction(async ({name, symbol}, hre) => {
      const Contract = await hre.ethers.getContractFactory('PortfolioToken');
      const result = await Contract.deploy(name, symbol);
      await handleDeployResult(result);
  })
