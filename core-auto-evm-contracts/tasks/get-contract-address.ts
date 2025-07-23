import {task} from 'hardhat/config';
import {getContractAddress} from './utils';

task("pt:contract-address", "Get deployed contract address")
  .addParam('contractName', 'Contract name', 'PortfolioToken')
  .setAction(async ({contractName}, hre) => {
    const contractAddress = await getContractAddress(hre, contractName)
    const networkName = hre.network.name;
    console.log(`${contractName} address on ${networkName} is ${contractAddress}`)
  })
