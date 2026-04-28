const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

describe('Bounty Unit Tests (Comprehensive Matrix)', function () {
  let bounty;
  let mockToken;
  let owner, publisher, hunter, maliciousActor;
  let mockTokenAddr, bountyAddr;

  const REWARD = ethers.parseEther('10');

  beforeEach(async function () {
    [owner, publisher, hunter, maliciousActor] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory('MockERC20');
    mockToken = await MockERC20.deploy('Mock ERC20', 'MTK');
    mockTokenAddr = mockToken.target || mockToken.address;

    await mockToken.mint(publisher.address, ethers.parseEther('1000'));
    await mockToken.mint(maliciousActor.address, ethers.parseEther('1000'));

    const Bounty = await ethers.getContractFactory('Bounty');
    bounty = await Bounty.deploy();
    bountyAddr = bounty.target || bounty.address;

    await mockToken.connect(publisher).approve(bountyAddr, ethers.parseEther('1000'));
  });

  describe('1. createBounty (创建任务分支)', function () {
    it('Should fail if title is empty', async function () {
      const deadline = (await time.latest()) + 3600;
      await expect(
        bounty.connect(publisher).createBounty('', 'ipfs://uri', mockTokenAddr, REWARD, deadline)
      ).to.be.revertedWith('Title cannot be empty');
    });

    it('Should fail if reward is zero', async function () {
      const deadline = (await time.latest()) + 3600;
      await expect(
        bounty.connect(publisher).createBounty('Title', 'ipfs://uri', mockTokenAddr, 0, deadline)
      ).to.be.revertedWith('Reward must be greater than zero');
    });

    it('Should fail if reward is below minimum', async function () {
      const deadline = (await time.latest()) + 3600;
      await expect(
        bounty.connect(publisher).createBounty('Title', 'ipfs://uri', mockTokenAddr, 10n ** 14n, deadline)
      ).to.be.revertedWith('Reward below minimum');
    });

    it('Should fail if deadline is in the past', async function () {
      const pastDeadline = (await time.latest()) - 100;
      await expect(
        bounty
          .connect(publisher)
          .createBounty('Title', 'ipfs://uri', mockTokenAddr, REWARD, pastDeadline)
      ).to.be.revertedWith('Deadline must be in the future');
    });

    it('Should support native ETH bounty creation', async function () {
      const deadline = (await time.latest()) + 3600;
      await expect(
        bounty
          .connect(publisher)
          .createBounty('ETH Bounty', 'ipfs://uri', ethers.ZeroAddress, REWARD, deadline, {
            value: REWARD,
          })
      )
        .to.emit(bounty, 'BountyCreated')
        .withArgs(1, publisher.address, ethers.ZeroAddress, REWARD);

      expect(await ethers.provider.getBalance(bountyAddr)).to.equal(REWARD);
    });

    it('Should fail ETH creation if msg.value mismatches reward', async function () {
      const deadline = (await time.latest()) + 3600;
      await expect(
        bounty
          .connect(publisher)
          .createBounty('ETH Bounty', 'ipfs://uri', ethers.ZeroAddress, REWARD, deadline, {
            value: ethers.parseEther('5'),
          })
      ).to.be.revertedWith('Incorrect ETH amount sent');
    });

    it('Should fail ERC20 creation if ETH is attached', async function () {
      const deadline = (await time.latest()) + 3600;
      await expect(
        bounty
          .connect(publisher)
          .createBounty('ERC20 Bounty', 'ipfs://uri', mockTokenAddr, REWARD, deadline, {
            value: ethers.parseEther('1'),
          })
      ).to.be.revertedWith('Do not send ETH for ERC20 bounty');
    });
  });

  describe('2. submitWork (提交成果分支)', function () {
    let bountyId;

    beforeEach(async function () {
      const deadline = (await time.latest()) + 86400;
      await bounty.connect(publisher).createBounty('Title', 'uri', mockTokenAddr, REWARD, deadline);
      bountyId = 1;
    });

    it('Should fail if bounty does not exist', async function () {
      await expect(bounty.connect(hunter).submitWork(999, 'ipfs://proof')).to.be.revertedWith(
        'Bounty does not exist'
      );
    });

    it('Should fail if publisher tries to submit', async function () {
      await expect(bounty.connect(publisher).submitWork(bountyId, 'ipfs://proof')).to.be.revertedWith(
        'Publisher cannot submit work'
      );
    });

    it('Should fail if deadline has passed', async function () {
      await time.increase(86400 + 10);
      await expect(bounty.connect(hunter).submitWork(bountyId, 'ipfs://proof')).to.be.revertedWith(
        'Bounty deadline has passed'
      );
    });

    it('Should prevent double submission from same hunter', async function () {
      await bounty.connect(hunter).submitWork(bountyId, 'ipfs://proof1');
      await expect(bounty.connect(hunter).submitWork(bountyId, 'ipfs://proof2')).to.be.revertedWith(
        'Work already submitted'
      );
    });

    it('Should allow multiple different hunters to submit', async function () {
      await bounty.connect(hunter).submitWork(bountyId, 'ipfs://proof1');
      await bounty.connect(maliciousActor).submitWork(bountyId, 'ipfs://proof2');

      const hunters = await bounty.getBountyHunters(bountyId);
      expect(hunters.length).to.equal(2);
      expect(hunters[0]).to.equal(hunter.address);
      expect(hunters[1]).to.equal(maliciousActor.address);
    });
  });

  describe('3. approveWork & cancelBounty (审核与取消分支)', function () {
    let bountyIdERC20, bountyIdETH;

    beforeEach(async function () {
      const deadline = (await time.latest()) + 86400;
      await bounty.connect(publisher).createBounty('ERC20', 'uri', mockTokenAddr, REWARD, deadline);
      bountyIdERC20 = 1;

      await bounty
        .connect(publisher)
        .createBounty('ETH', 'uri', ethers.ZeroAddress, REWARD, deadline, { value: REWARD });
      bountyIdETH = 2;
    });

    it("Should reject non-publisher approving work", async function () {
      await bounty.connect(hunter).submitWork(bountyIdERC20, 'proof');
      await expect(
        bounty.connect(maliciousActor).approveWork(bountyIdERC20, hunter.address)
      ).to.be.revertedWith('Not the publisher');
    });

    it("Should reject approving a hunter who hasn't submitted", async function () {
      await expect(bounty.connect(publisher).approveWork(bountyIdERC20, hunter.address)).to.be.revertedWith(
        'No work submitted yet'
      );

      await bounty.connect(hunter).submitWork(bountyIdERC20, 'proof');
      await expect(
        bounty.connect(publisher).approveWork(bountyIdERC20, maliciousActor.address)
      ).to.be.revertedWith('This hunter did not submit work');
    });

    it('Should correctly pay out ETH to hunter', async function () {
      await bounty.connect(hunter).submitWork(bountyIdETH, 'proof');

      const balBefore = await ethers.provider.getBalance(hunter.address);
      await bounty.connect(publisher).approveWork(bountyIdETH, hunter.address);
      const balAfter = await ethers.provider.getBalance(hunter.address);

      expect(balAfter - balBefore).to.equal(REWARD);
    });

    it('Should allow publisher to cancel and refund ERC20', async function () {
      const balBefore = await mockToken.balanceOf(publisher.address);
      await bounty.connect(publisher).cancelBounty(bountyIdERC20);
      const balAfter = await mockToken.balanceOf(publisher.address);

      expect(balAfter - balBefore).to.equal(REWARD);

      const bData = await bounty.getBounty(bountyIdERC20);
      expect(bData.status).to.equal(3);
    });

    it('Should allow publisher to cancel and refund ETH', async function () {
      const balBefore = await ethers.provider.getBalance(publisher.address);

      const tx = await bounty.connect(publisher).cancelBounty(bountyIdETH);
      const receipt = await tx.wait();
      const gasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? tx.gasPrice ?? 0n;
      const gasCost = receipt.gasUsed * gasPrice;

      const balAfter = await ethers.provider.getBalance(publisher.address);
      expect(balAfter + gasCost - balBefore).to.equal(REWARD);
    });

    it('Should not allow cancellation after completion', async function () {
      await bounty.connect(hunter).submitWork(bountyIdERC20, 'proof');
      await bounty.connect(publisher).approveWork(bountyIdERC20, hunter.address);

      await expect(bounty.connect(publisher).cancelBounty(bountyIdERC20)).to.be.revertedWith(
        'Cannot cancel at this stage'
      );
    });
  });

  describe('4. Security & Admin (安全与权限控制)', function () {
    it('Should allow owner to pause and unpause', async function () {
      await bounty.connect(owner).pause();

      const deadline = (await time.latest()) + 3600;
      await expect(
        bounty.connect(publisher).createBounty('T', 'U', mockTokenAddr, REWARD, deadline)
      ).to.be.reverted;

      await bounty.connect(owner).unpause();
      await expect(
        bounty.connect(publisher).createBounty('T', 'U', mockTokenAddr, REWARD, deadline)
      ).to.emit(bounty, 'BountyCreated');
    });

    it('Should prevent non-owner from pausing', async function () {
      await expect(bounty.connect(maliciousActor).pause()).to.be.reverted;
    });

    it('Should allow owner to update minimum reward', async function () {
      await expect(bounty.connect(owner).setMinimumReward(2n * 10n ** 15n))
        .to.emit(bounty, 'MinimumRewardUpdated')
        .withArgs(10n ** 15n, 2n * 10n ** 15n);
      expect(await bounty.minimumReward()).to.equal(2n * 10n ** 15n);
    });
  });
});
