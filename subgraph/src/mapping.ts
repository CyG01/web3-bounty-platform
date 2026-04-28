import {
  BountyCreated,
  WorkSubmitted,
  WorkRejected,
  BountyPaid,
  BountyCancelled,
  Bounty as BountyContract,
} from '../../generated/Bounty/Bounty';
import { Bounty, Submission } from '../../generated/schema';
import { Address } from '@graphprotocol/graph-ts';

const ZERO = Address.fromString('0x0000000000000000000000000000000000000000');

function ensureBounty(id: string): Bounty {
  let bounty = Bounty.load(id);
  if (bounty == null) {
    bounty = new Bounty(id);
    bounty.bountyId = id;
    bounty.publisher = ZERO;
    bounty.title = '';
    bounty.descriptionURI = '';
    bounty.rewardAmount = BigInt.zero();
    bounty.tokenAddress = ZERO;
    bounty.deadline = BigInt.zero();
    bounty.status = 'OPEN';
    bounty.successfulHunter = ZERO;
    bounty.createdAt = BigInt.zero();
    bounty.updatedAt = BigInt.zero();
  }
  return bounty as Bounty;
}

export function handleBountyCreated(event: BountyCreated): void {
  const id = event.params.bountyId.toString();
  const contract = BountyContract.bind(event.address);
  const chainBounty = contract.getBounty(event.params.bountyId);

  const bounty = ensureBounty(id);
  bounty.publisher = event.params.publisher;
  bounty.title = chainBounty.title;
  bounty.descriptionURI = chainBounty.descriptionURI;
  bounty.rewardAmount = chainBounty.rewardAmount;
  bounty.tokenAddress = chainBounty.tokenAddress;
  bounty.deadline = chainBounty.deadline;
  bounty.status = 'OPEN';
  bounty.successfulHunter = chainBounty.successfulHunter;
  bounty.createdAt = event.block.timestamp;
  bounty.updatedAt = event.block.timestamp;
  bounty.save();
}

export function handleWorkSubmitted(event: WorkSubmitted): void {
  const bountyId = event.params.bountyId.toString();
  const bounty = ensureBounty(bountyId);
  bounty.status = 'WORK_SUBMITTED';
  bounty.updatedAt = event.block.timestamp;
  bounty.save();

  const submissionId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString();
  const submission = new Submission(submissionId);
  submission.bounty = bountyId;
  submission.bountyId = bountyId;
  submission.hunter = event.params.hunter;
  submission.proofURI = event.params.proofURI;
  submission.submittedAt = event.block.timestamp;
  submission.isRejected = false;
  submission.save();
}

export function handleWorkRejected(event: WorkRejected): void {
  const bountyId = event.params.bountyId.toString();
  const bounty = ensureBounty(bountyId);
  bounty.status = 'OPEN';
  bounty.updatedAt = event.block.timestamp;
  bounty.save();
}

export function handleBountyPaid(event: BountyPaid): void {
  const bountyId = event.params.bountyId.toString();
  const bounty = ensureBounty(bountyId);
  bounty.status = 'COMPLETED';
  bounty.successfulHunter = event.params.hunter;
  bounty.updatedAt = event.block.timestamp;
  bounty.save();
}

export function handleBountyCancelled(event: BountyCancelled): void {
  const bountyId = event.params.bountyId.toString();
  const bounty = ensureBounty(bountyId);
  bounty.status = 'CANCELLED';
  bounty.updatedAt = event.block.timestamp;
  bounty.save();
}

