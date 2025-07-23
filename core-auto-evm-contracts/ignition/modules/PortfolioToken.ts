import {buildModule} from "@nomicfoundation/hardhat-ignition/modules";
import * as hre from 'hardhat';

export default buildModule("PortfolioToken", (m) => {
  const pools = hre.network.config.pools;
  const portfolioToken = m.contract("PortfolioToken", ["Core Yield", "CYD"]);
  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    m.call(portfolioToken, "setPool", [i, pool], {id: `setPool_${i}_${pool}`});
  }
  return {portfolioToken};
});
