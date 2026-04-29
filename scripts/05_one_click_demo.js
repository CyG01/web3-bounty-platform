const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const DEFAULT_HARDHAT_MNEMONIC = "test test test test test test test test test test test junk";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
}

function updateFrontendEnv(address) {
  const envPath = path.join(__dirname, "..", "frontend", ".env");
  const lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").split(/\r?\n/) : [];
  const next = [];
  let seenAddress = false;
  let seenNetwork = false;
  let seenRpc = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("VITE_BOUNTY_CONTRACT_ADDRESS=")) {
      next.push(`VITE_BOUNTY_CONTRACT_ADDRESS=${address}`);
      seenAddress = true;
      continue;
    }
    if (line.startsWith("VITE_NETWORK_NAME=")) {
      next.push("VITE_NETWORK_NAME=localhost");
      seenNetwork = true;
      continue;
    }
    if (line.startsWith("VITE_RPC_URL=")) {
      next.push("VITE_RPC_URL=http://127.0.0.1:8545");
      seenRpc = true;
      continue;
    }
    next.push(rawLine);
  }

  if (!seenAddress) next.push(`VITE_BOUNTY_CONTRACT_ADDRESS=${address}`);
  if (!seenNetwork) next.push("VITE_NETWORK_NAME=localhost");
  if (!seenRpc) next.push("VITE_RPC_URL=http://127.0.0.1:8545");

  fs.writeFileSync(envPath, next.join("\n").replace(/\n+$/, "\n"));
}

async function syncAbiToFrontend() {
  const root = path.join(__dirname, "..");
  const src = path.join(root, "artifacts", "contracts", "core", "Bounty.sol", "Bounty.json");
  const dist = path.join(root, "frontend", "src", "abis", "Bounty.json");
  const artifact = JSON.parse(fs.readFileSync(src, "utf8"));
  fs.writeFileSync(dist, JSON.stringify(artifact.abi, null, 2) + "\n");
}

async function deployCoreContracts() {
  const Bounty = await hre.ethers.getContractFactory("Bounty");
  const bounty = await Bounty.deploy();
  await bounty.waitForDeployment();
  const bountyAddress = await bounty.getAddress();
  const deployTx = bounty.deploymentTransaction();
  const deployReceipt = deployTx ? await deployTx.wait() : null;
  const deployBlock = deployReceipt?.blockNumber ?? 0;

  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const mock = await MockERC20.deploy("Demo USD", "dUSD");
  await mock.waitForDeployment();
  const mockAddress = await mock.getAddress();

  return { bounty, bountyAddress, deployBlock, mock, mockAddress };
}

async function seedDemoData(ctx) {
  const { bounty, mock } = ctx;
  const [owner, publisherA, publisherB, hunterA, hunterB, reviewer] = await hre.ethers.getSigners();
  const now = Math.floor(Date.now() / 1000);
  const day = 24 * 60 * 60;

  const mintAmount = hre.ethers.parseEther("50000");
  await (await mock.mint(publisherA.address, mintAmount)).wait();
  await (await mock.mint(publisherB.address, mintAmount)).wait();
  await (await mock.mint(hunterA.address, mintAmount)).wait();
  await (await mock.mint(hunterB.address, mintAmount)).wait();

  await (await bounty.connect(owner).setMinimumReward(hre.ethers.parseEther("0.01"))).wait();

  async function createEthBounty(signer, title, amountEth, daysAhead, uri) {
    const reward = hre.ethers.parseEther(amountEth);
    const tx = await bounty
      .connect(signer)
      .createBounty(title, uri, hre.ethers.ZeroAddress, reward, now + daysAhead * day, { value: reward });
    const receipt = await tx.wait();
    const log = receipt.logs
      .map((l) => {
        try {
          return bounty.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "BountyCreated");
    return Number(log.args.bountyId);
  }

  async function createTokenBounty(signer, title, amount, daysAhead, uri) {
    const reward = hre.ethers.parseEther(amount);
    await (await mock.connect(signer).approve(await bounty.getAddress(), reward)).wait();
    const tx = await bounty
      .connect(signer)
      .createBounty(title, uri, await mock.getAddress(), reward, now + daysAhead * day);
    const receipt = await tx.wait();
    const log = receipt.logs
      .map((l) => {
        try {
          return bounty.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "BountyCreated");
    return Number(log.args.bountyId);
  }

  // Create realistic demo tasks
  const b1 = await createEthBounty(
    publisherA,
    "Refactor notification bell to support pagination",
    "0.8",
    9,
    "https://github.com/demo-org/web3bounty/issues/101"
  );
  const b2 = await createEthBounty(
    publisherA,
    "Write E2E tests for wallet connect flows",
    "1.2",
    12,
    "https://github.com/demo-org/web3bounty/issues/118"
  );
  const b3 = await createTokenBounty(
    publisherB,
    "Build analytics chart for bounty conversion funnel",
    "650",
    14,
    "https://github.com/demo-org/web3bounty/issues/126"
  );
  const b4 = await createTokenBounty(
    publisherB,
    "Implement markdown attachment preview in detail page",
    "420",
    10,
    "https://github.com/demo-org/web3bounty/issues/132"
  );
  const b5 = await createEthBounty(
    reviewer,
    "Migrate deployment docs to runbook format",
    "0.35",
    7,
    "https://github.com/demo-org/web3bounty/issues/140"
  );
  const b6 = await createEthBounty(
    reviewer,
    "Optimize bounty list query strategy for large datasets",
    "0.5",
    8,
    "https://github.com/demo-org/web3bounty/issues/146"
  );

  // Status transitions for richer demos
  await (await bounty.connect(hunterA).submitWork(b1, "ipfs://demo/submissions/b1-hunterA-v1")).wait();
  await (await bounty.connect(publisherA).approveWork(b1, hunterA.address)).wait(); // COMPLETED

  await (await bounty.connect(hunterB).submitWork(b2, "ipfs://demo/submissions/b2-hunterB-v1")).wait(); // WORK_SUBMITTED

  await (await bounty.connect(hunterA).submitWork(b3, "ipfs://demo/submissions/b3-hunterA-v1")).wait();
  await (await bounty.connect(hunterB).submitWork(b3, "ipfs://demo/submissions/b3-hunterB-v1")).wait();
  await (await bounty.connect(publisherB).rejectWork(b3, hunterB.address)).wait(); // still WORK_SUBMITTED

  await (await bounty.connect(hunterB).submitWork(b4, "ipfs://demo/submissions/b4-hunterB-v1")).wait();
  await (await bounty.connect(publisherB).approveWork(b4, hunterB.address)).wait(); // COMPLETED

  await (await bounty.connect(reviewer).cancelBounty(b5)).wait(); // CANCELLED

  await (await bounty.connect(hunterA).submitWork(b6, "ipfs://demo/submissions/b6-hunterA-v1")).wait();
  await (await bounty.connect(reviewer).rejectWork(b6, hunterA.address)).wait(); // back to OPEN

  return {
    users: {
      owner: owner.address,
      publisherA: publisherA.address,
      publisherB: publisherB.address,
      hunterA: hunterA.address,
      hunterB: hunterB.address,
      reviewer: reviewer.address,
    },
    bountyIds: { b1, b2, b3, b4, b5, b6 },
  };
}

async function main() {
  console.log("=====================================");
  console.log("🎬 One-click demo bootstrap");
  console.log("=====================================");

  const root = path.join(__dirname, "..");
  const deploymentsDir = path.join(root, "deployments");
  const frontendDeploymentsDir = path.join(root, "frontend", "public", "deployments");
  const demoDir = path.join(root, "demo-data");
  ensureDir(deploymentsDir);
  ensureDir(frontendDeploymentsDir);
  ensureDir(demoDir);

  const contracts = await deployCoreContracts();
  const seeded = await seedDemoData(contracts);

  const deployment = {
    network: hre.network.name,
    address: contracts.bountyAddress,
    deployBlock: contracts.deployBlock,
    timestamp: Date.now(),
  };
  writeJson(path.join(deploymentsDir, `${hre.network.name}.json`), deployment);
  writeJson(path.join(frontendDeploymentsDir, `${hre.network.name}.json`), deployment);

  updateFrontendEnv(contracts.bountyAddress);
  await syncAbiToFrontend();

  const report = {
    generatedAt: new Date().toISOString(),
    network: hre.network.name,
    rpcUrl: "http://127.0.0.1:8545",
    bountyContract: contracts.bountyAddress,
    demoToken: {
      symbol: "dUSD",
      address: contracts.mockAddress,
      decimals: 18,
    },
    demoMnemonic: DEFAULT_HARDHAT_MNEMONIC,
    accounts: seeded.users,
    seededBounties: seeded.bountyIds,
    notes: [
      "Import mnemonic into MetaMask (or any wallet) and switch to localhost:8545 / chainId 31337.",
      "Profile page is address-scoped: different demo roles show different published/participated lists.",
      "Bounty statuses seeded: OPEN, WORK_SUBMITTED, COMPLETED, CANCELLED.",
    ],
  };
  writeJson(path.join(demoDir, "demo-report.json"), report);

  console.log("✅ Bootstrap complete");
  console.log("Bounty Contract:", contracts.bountyAddress);
  console.log("Demo Token (dUSD):", contracts.mockAddress);
  console.log("Demo Report:", path.join("demo-data", "demo-report.json"));
  console.log("=====================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
