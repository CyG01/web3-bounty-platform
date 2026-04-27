const fs = require('fs');
const path = require('path');

function main() {
  const root = path.resolve(__dirname, '..');
  const artifactPath = path.join(root, 'artifacts', 'contracts', 'core', 'Bounty.sol', 'Bounty.json');
  const outPath = path.join(root, 'frontend', 'src', 'abis', 'Bounty.json');

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Artifact not found at ${artifactPath}. Run \"npx hardhat compile\" first.`
    );
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  if (!artifact.abi) {
    throw new Error('Invalid artifact: missing abi field');
  }

  fs.writeFileSync(outPath, JSON.stringify(artifact.abi, null, 2) + '\n');
  console.log(`✅ Synced ABI to ${outPath}`);
}

try {
  main();
} catch (err) {
  console.error('❌ Failed to sync ABI');
  console.error(err);
  process.exitCode = 1;
}
