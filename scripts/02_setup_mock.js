const hre = require("hardhat");

async function main() {
  console.log("=====================================");
  console.log("🧪 Setting up local MockERC20");
  console.log("=====================================");

  const [owner, publisher, hunter] = await hre.ethers.getSigners();
  console.log("Owner:", owner.address);
  console.log("Publisher:", publisher.address);
  console.log("Hunter:", hunter.address);

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy("Mock ERC20", "MTK");
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  const mintAmount = hre.ethers.parseEther("10000");
  await (await token.mint(publisher.address, mintAmount)).wait();
  await (await token.mint(hunter.address, mintAmount)).wait();

  console.log("=====================================");
  console.log("✅ MockERC20 deployed");
  console.log("📍 Token Address:", tokenAddress);
  console.log("🪙 Symbol: MTK (18 decimals)");
  console.log("💰 Minted to publisher/hunter:", hre.ethers.formatEther(mintAmount), "MTK");
  console.log("=====================================");
  console.log("⚠️ NEXT STEP: paste this into Create page:");
  console.log(`Token Address: ${tokenAddress}`);
  console.log("=====================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
