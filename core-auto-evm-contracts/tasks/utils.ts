import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {HardhatArtifactResolver, resolveDeploymentId} from '@nomicfoundation/hardhat-ignition/helpers'
import {status} from '@nomicfoundation/ignition-core';
import {BaseContract, ContractTransactionResponse} from 'ethers';

export async function getContractAddress(hre: HardhatRuntimeEnvironment, contractName: string): Promise<string> {
  const chainIdString = await hre.network.provider.request({method: 'eth_chainId'})
  if (typeof chainIdString !== 'string') {
    throw new Error('Invalid chainId response type');
  }
  const chainId = +chainIdString;
  const dep = resolveDeploymentId(undefined, chainId);
  const statusResult = await status(`./ignition/deployments/${dep}`, new HardhatArtifactResolver(hre))
  const contractAddress = Object.values(statusResult.contracts).find(v => v.contractName === contractName)?.address;
  if (!contractAddress) {
    throw new Error('Contract address not found')
  }
  return contractAddress;
}

export async function handleDeployResult<I = BaseContract>(contract: BaseContract & { deploymentTransaction(): ContractTransactionResponse } & Omit<I, keyof BaseContract>) {
  console.log('Contract address: ', contract.target);
  console.log('Deploying transaction...:', contract.deploymentTransaction()?.hash);
  await contract.deploymentTransaction()?.wait();
  console.log('Done');
}

export async function handleTransactionResult(result: ContractTransactionResponse) {
  console.log('Sending transaction...:', result.hash);
  await result.wait();
  console.log('Done');
}
