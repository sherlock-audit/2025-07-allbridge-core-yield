import {task} from 'hardhat/config';
import {getContractAddress} from './utils';
import {PortfolioToken} from '../typechain';
// task action function receives the Hardhat Runtime Environment as second argument
task("pt:pool-address", "Get pool address by index")
  .addParam('index', 'Pool index')
  .setAction(async ({index}, hre) => {
    const contractAddress = await getContractAddress(hre, "PortfolioToken");
    const contract: PortfolioToken = await hre.ethers.getContractAt("PortfolioToken", contractAddress) as any;
    const result = await contract.tokens(index);
    const networkName = hre.network.name;
    console.log(`Pool ${index} address on ${networkName} is ${result}`);
  })
