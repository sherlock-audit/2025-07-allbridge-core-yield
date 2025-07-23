import {task} from 'hardhat/config';
import {handleTransactionResult} from './utils';
import {PortfolioToken} from '../typechain';

task("pt:add-pool", "Add pool to portfolio token contract")
  .addParam('pt', 'Portfolio token address')
  .addParam('index', 'Pool index')
  .addParam('pool', 'Pool address')
  .setAction(async ({pt, index, pool}, hre) => {
      const contract: PortfolioToken = await hre.ethers.getContractAt('PortfolioToken', pt) as any;
      const result = await contract.setPool(index, pool);
      await handleTransactionResult(result);
  })
