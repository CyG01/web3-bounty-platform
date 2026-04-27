const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

function findAddressFromArgv(argv) {
  const re = /^0x[a-fA-F0-9]{40}$/;
  return argv.find((v) => re.test(v)) || "";
}

function findAddressFromEnvFile(envFilePath) {
  const envContent = fs.readFileSync(envFilePath, "utf8");
  const match = envContent.match(/^VITE_BOUNTY_CONTRACT_ADDRESS=(0x[a-fA-F0-9]{40})/m);
  return match && match[1] ? match[1] : "";
}

async function main() {
  console.log("=====================================");
  console.log("🔍 Auto-Verify Smart Contract on Etherscan");
  console.log("=====================================");

  const envPathLocal = path.join(__dirname, "../frontend/.env.local");
  const envPath = path.join(__dirname, "../frontend/.env");

  const targetEnvPath = fs.existsSync(envPathLocal) ? envPathLocal : fs.existsSync(envPath) ? envPath : null;

  let contractAddress = findAddressFromArgv(process.argv);

  if (!contractAddress && targetEnvPath) {
    contractAddress = findAddressFromEnvFile(targetEnvPath);
    if (contractAddress) {
      console.log(
        `� Auto-detected contract address from ${path.basename(targetEnvPath)}: ${contractAddress}`
      );
    }
  }

  if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    console.error("❌ Error: Valid Contract address not found!");
    console.log("Usage: npx hardhat run scripts/verify.js <ADDRESS> --network sepolia");
    console.log("Or ensure VITE_BOUNTY_CONTRACT_ADDRESS is set correctly in frontend/.env(.local)");
    process.exitCode = 1;
    return;
  }

  console.log(
    `⏳ Verifying contract at address: ${contractAddress} on network: ${hre.network.name}...`
  );

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.toLowerCase().includes("already verified")) {
      console.log("✅ Contract is already verified on Etherscan!");
    } else {
      console.error("❌ Verification failed:", error);
      process.exitCode = 1;
    }
  }

  console.log("=====================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
