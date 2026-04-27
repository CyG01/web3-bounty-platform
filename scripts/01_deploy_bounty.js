const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=====================================");
  console.log("🚀 Starting Bounty Deployment");
  console.log("=====================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const Bounty = await hre.ethers.getContractFactory("Bounty");
  const bounty = await Bounty.deploy();

  await bounty.waitForDeployment();
  const bountyAddress = await bounty.getAddress();

  const deployTx = bounty.deploymentTransaction();
  const receipt = deployTx ? await deployTx.wait() : null;
  const deployBlock = receipt?.blockNumber ?? 0;

  const deployment = {
    network: hre.network.name,
    address: bountyAddress,
    deployBlock,
    timestamp: Date.now(),
  };

  const root = path.join(__dirname, "..");
  const deploymentsDir = path.join(root, "deployments");
  const frontendDeploymentsDir = path.join(root, "frontend", "public", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.mkdirSync(frontendDeploymentsDir, { recursive: true });

  const outPath = path.join(deploymentsDir, `${hre.network.name}.json`);
  const outFrontendPath = path.join(frontendDeploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2) + "\n");
  fs.writeFileSync(outFrontendPath, JSON.stringify(deployment, null, 2) + "\n");

  console.log("=====================================");
  console.log("✅ Bounty Contract Deployed Successfully!");
  console.log("📍 Contract Address:", bountyAddress);
  console.log("🧱 Deploy Block:", deployBlock);
  console.log("🗂️ Deployment file:", outPath);
  console.log("=====================================");
  console.log("⚠️ NEXT STEP: Please verify your frontend/.env has:");
  console.log(`VITE_BOUNTY_CONTRACT_ADDRESS=${bountyAddress}`);
  console.log("=====================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
