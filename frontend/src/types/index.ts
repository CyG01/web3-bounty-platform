export type BountyStatus = 'OPEN' | 'WORK_SUBMITTED' | 'COMPLETED' | 'CANCELLED';

export interface Bounty {
  id: number;
  publisher: string;
  title: string;
  descriptionURI: string;
  rewardAmountWei: string;
  rewardAmountEth: string;
  tokenAddress: string;
  deadline: number;
  status: BountyStatus;
  successfulHunter: string;
}
