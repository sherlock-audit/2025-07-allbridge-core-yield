import {task} from 'hardhat/config';
import {handleTransactionResult} from './utils';
import {PortfolioToken} from '../typechain';

task("pt:transfer-ownership", "Transfer ownership")
  .addParam('pt', 'Portfolio token address')
  .addParam('newOwner', 'New owner')
  .setAction(async ({pt, newOwner}, hre) => {
      const contract: PortfolioToken = await hre.ethers.getContractAt('PortfolioToken', pt) as any;
      const result = await contract.transferOwnership(newOwner);
      await handleTransactionResult(result);
  })
