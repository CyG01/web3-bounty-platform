const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

describe('Bounty Core Flow Integration', function () {
  let bounty;
  let mockToken;
  let owner, publisher, hunter;

  beforeEach(async function () {
    [owner, publisher, hunter] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory('MockERC20');
    mockToken = await MockERC20.deploy('Mock ERC20', 'MTK');
    const mockTokenAddress = mockToken.target || mockToken.address;

    await mockToken.mint(publisher.address, ethers.parseEther('1000'));

    const Bounty = await ethers.getContractFactory('Bounty');
    bounty = await Bounty.deploy();
  });

  it('Should complete the full lifecycle: Create -> Submit -> Approve', async function () {
    const rewardAmount = ethers.parseEther('100');
    const mockTokenAddress = mockToken.target || mockToken.address;
    const bountyAddress = bounty.target || bounty.address;
    const deadline = (await time.latest()) + 86400;

    await mockToken.connect(publisher).approve(bountyAddress, rewardAmount);

    await expect(
      bounty.connect(publisher).createBounty(
        'Build a Vue3 DApp',
        'ipfs://QmTest123...',
        mockTokenAddress,
        rewardAmount,
        deadline
      )
    ).to.emit(bounty, 'BountyCreated');

    const bountyId = 1;

    await expect(
      bounty.connect(hunter).submitWork(bountyId, 'ipfs://QmProof456...')
    ).to.emit(bounty, 'WorkSubmitted')
      .withArgs(bountyId, hunter.address, 'ipfs://QmProof456...');

    const hunterBalanceBefore = await mockToken.balanceOf(hunter.address);

    await expect(
      bounty.connect(publisher).approveWork(bountyId, hunter.address)
    ).to.emit(bounty, 'BountyPaid')
      .withArgs(bountyId, hunter.address, rewardAmount);

    const hunterBalanceAfter = await mockToken.balanceOf(hunter.address);
    expect(hunterBalanceAfter - hunterBalanceBefore).to.equal(rewardAmount);

    const bountyData = await bounty.getBounty(bountyId);
    expect(bountyData.status).to.equal(2);
    expect(bountyData.successfulHunter).to.equal(hunter.address);
  });
});
