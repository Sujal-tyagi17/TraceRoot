require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("./solc-local");

const { DEPLOYER_PRIVATE_KEY, AMOY_RPC_URL, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY } = process.env;
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true, evmVersion: "cancun" },
  },
  networks: {
    hardhat: { chainId: 31337 },
    // Testnets only. There is deliberately no mainnet entry.
    amoy: { url: AMOY_RPC_URL || "https://rpc-amoy.polygon.technology", chainId: 80002, accounts },
    sepolia: { url: SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com", chainId: 11155111, accounts },
  },
  etherscan: { apiKey: ETHERSCAN_API_KEY || "" },
  sourcify: { enabled: true },
  gasReporter: { enabled: !!process.env.REPORT_GAS },
};
