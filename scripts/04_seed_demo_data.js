const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function getBountyAddress() {
  const deploymentPath = path.join(__dirname, "..", "deployments", "localhost.json");
  const raw = fs.readFileSync(deploymentPath, "utf8");
  const json = JSON.parse(raw);
  if (!json.address) {
    throw new Error("Missing deployments/localhost.json address");
  }
  return json.address;
}

async function main() {
  console.log("=====================================");
  console.log("🌱 Seeding demo data");
  console.log("=====================================");

  const [owner, publisherA, publisherB, hunterA, hunterB] = await hre.ethers.getSigners();
  const bountyAddress = await getBountyAddress();
  const bounty = await hre.ethers.getContractAt("Bounty", bountyAddress);

  console.log("Contract:", bountyAddress);
  console.log("Owner:", owner.address);
  console.log("Publisher A:", publisherA.address);
  console.log("Publisher B:", publisherB.address);
  console.log("Hunter A:", hunterA.address);
  console.log("Hunter B:", hunterB.address);

  const now = Math.floor(Date.now() / 1000);
  const day = 24 * 60 * 60;

  const createBy = async (signer, title, rewardEth, daysAhead) => {
    const reward = hre.ethers.parseEther(rewardEth);
    const deadline = now + daysAhead * day;
    const tx = await bounty.connect(signer).createBounty(
      title,
      `ipfs://demo/${title.toLowerCase().replace(/\s+/g, "-")}`,
      hre.ethers.ZeroAddress,
      reward,
      deadline,
      { value: reward }
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((l) => {
        try {
          return bounty.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "BountyCreated");
    const bountyId = Number(event.args.bountyId);
    console.log(`Created #${bountyId} by ${signer.address} (${rewardEth} ETH): ${title}`);
    return bountyId;
  };

  const id1 = await createBy(publisherA, "Fix navbar responsive bug", "0.2", 7);
  const id2 = await createBy(publisherA, "Add dark mode toggle animation", "0.35", 10);
  const id3 = await createBy(publisherB, "Build indexer health dashboard", "0.5", 14);

  await (await bounty.connect(hunterA).submitWork(id1, "ipfs://demo/submission-1")).wait();
  await (await bounty.connect(hunterB).submitWork(id2, "ipfs://demo/submission-2")).wait();
  await (await bounty.connect(hunterA).submitWork(id3, "ipfs://demo/submission-3")).wait();
  console.log("Submitted works for demo bounties");

  await (await bounty.connect(publisherA).approveWork(id1, hunterA.address)).wait();
  await (await bounty.connect(publisherA).approveWork(id2, hunterB.address)).wait();
  console.log("Approved two submissions to generate COMPLETED state");

  console.log("=====================================");
  console.log("✅ Demo data ready");
  console.log("Use these addresses to see profile data:");
  console.log("- Publisher A (has published + completed):", publisherA.address);
  console.log("- Publisher B (has published + pending):", publisherB.address);
  console.log("- Hunter A (has participated + 1 paid):", hunterA.address);
  console.log("- Hunter B (has participated + 1 paid):", hunterB.address);
  console.log("=====================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
