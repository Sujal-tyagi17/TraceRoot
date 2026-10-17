// Deploys TraceRoot to a TESTNET and writes deployments/<network>.json
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

const ALLOWED = { amoy: 80002, sepolia: 11155111, hardhat: 31337, localhost: 31337 };

async function main() {
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  if (!(network.name in ALLOWED) || ALLOWED[network.name] !== chainId) {
    throw new Error(`Refusing to deploy: ${network.name} (chain ${chainId}) is not an allowed testnet`);
  }
  const [deployer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer ${deployer.address} | balance ${ethers.formatEther(bal)} | chain ${chainId}`);
  if (bal === 0n) throw new Error("Deployer has no testnet funds. Use a faucet first.");

  const admin = process.env.ADMIN_ADDRESS || deployer.address;
  const c = await ethers.deployContract("TraceRoot", [admin]);
  const tx = c.deploymentTransaction();
  await c.waitForDeployment();
  const local = network.name === "hardhat" || network.name === "localhost";
  const rc = await tx.wait(local ? 1 : 2);

  const manifest = {
    network: network.name,
    chainId,
    contract: "TraceRoot",
    address: await c.getAddress(),
    admin,
    deployTx: tx.hash,
    blockNumber: rc.blockNumber,
    deployedAt: new Date().toISOString(),
  };
  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
  console.log("Deployed:", manifest);

  // Copy ABI + address into the web app
  const art = require("../artifacts/contracts/TraceRoot.sol/TraceRoot.json");
  const webDir = path.join(__dirname, "..", "..", "web", "src", "lib", "contract");
  fs.mkdirSync(webDir, { recursive: true });
  fs.writeFileSync(path.join(webDir, "abi.json"), JSON.stringify(art.abi, null, 2));
  fs.writeFileSync(path.join(webDir, `deployment.${network.name}.json`), JSON.stringify(manifest, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
