import {HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import "hardhat-gas-reporter"
import * as dotenv from 'dotenv'

import './tasks'

const network = getNetwork();
dotenv.config({path: network ? `./env/.env.${network}` : './env/.env'});

const baseNetwork = {
  url: process.env.NODE_URL || '',
  accounts:
    process.env.PRIVATE_KEY !== undefined
      ? [process.env.PRIVATE_KEY]
      : undefined,
  timeout: 60000,
};

const config: HardhatUserConfig = {
    solidity: {
      version: "0.8.24",

      settings: {
        optimizer: {
          enabled: true,
          runs: 100_000,
        },
      },
    },

    networks: {
      amoy: {
        ...baseNetwork,
        pools: ["0x1C5c5c77e998EeD254F7Ad901Ed2948f9E51711C", "0xF2b21F01dc449d61A4e8Fa7c34d5b5626cFe9A9e", "0x1Fc5Ee4bbC1d55733480BCD0C6fF09C117dC9414"]
      },
      sepolia: {
        ...baseNetwork,
        pools: ["0x8D8B3D8140021e5fe2ed3b314F5F556610C90fAD", "0xc9623b72fDE40499e39DC119D3d722e447B621Cd", "0xcfD2805D02C01F3cF8070bBAA058A2f4ab38fD62"]
      },
      holesky: {
        ...baseNetwork,
        pools: ["0x98C94928D974DF8aFF5f17929c8783813F26594E", "0xfC795742bB0e9De8D93A47cFcb07e77E43feEd5E"]
      },
      'arbitrum-sepolia': {
        ...baseNetwork,
        pools: ["0xC735AdAcDF0F8700D00c18d9722C092d765162B9"]
      },
      nile: {
        ...baseNetwork,
        pools: ["0x2e2846cd7cdb5cbd03c8b641b1865c78680f2021", "0xc2decf68fa956317b8393e72b2c90296a6e59940"] // ["TEBGLMAn5veAaCf7defG4Ag1AZZaZLXFtN","TTjb1Q2mSeegxrqiu7h28UEfiTEycD2sWU"]
      }
    },

    gasReporter: {
      enabled: process.env.REPORT_GAS === "true",
      reportPureAndViewMethods:
        true,
    },
    typechain: {
      outDir: "typechain",
    },
    debug: false,
  }
;

function getNetwork() {
  const keyIndex = process.argv.indexOf('--network');
  if (keyIndex >= 0) {
    return process.argv[keyIndex + 1];
  }
}

export default config;
