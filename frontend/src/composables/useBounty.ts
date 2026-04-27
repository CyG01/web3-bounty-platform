import { ref } from 'vue';
import { Contract, JsonRpcProvider, formatEther } from 'ethers';
import BountyABI from '../abis/Bounty.json';
import type { Bounty, BountyStatus } from '../types';
import { loadDeployment } from '../services/deployments';

const BOUNTY_CONTRACT_ADDRESS = import.meta.env.VITE_BOUNTY_CONTRACT_ADDRESS || '';
const RPC_URL = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';
const DEPLOY_BLOCK = Number(import.meta.env.VITE_DEPLOY_BLOCK || 0);
const EVENT_BLOCK_WINDOW = Number(import.meta.env.VITE_EVENT_BLOCK_WINDOW || 50000);

type QueryProgress = { fromBlock: number; toBlock: number; currentToBlock: number; totalRanges: number; doneRanges: number };

const statusMap: Record<number, BountyStatus> = {
  0: 'OPEN',
  1: 'WORK_SUBMITTED',
  2: 'COMPLETED',
  3: 'CANCELLED',
};

interface RawBounty {
  id: bigint;
  publisher: string;
  title: string;
  descriptionURI: string;
  rewardAmount: bigint;
  tokenAddress: string;
  deadline: bigint;
  status: number;
  successfulHunter: string;
}

export function useBounty() {
  const bounties = ref<Bounty[]>([]);
  const loading = ref(false);
  const error = ref('');

  const provider = new JsonRpcProvider(RPC_URL);

  const resolveContractAddress = async () => {
    if (BOUNTY_CONTRACT_ADDRESS) return BOUNTY_CONTRACT_ADDRESS;

    try {
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const networkName = chainId === 31337 ? 'localhost' : chainId === 11155111 ? 'sepolia' : '';
      if (!networkName) return '';
      const deployment = await loadDeployment(networkName);
      return deployment?.address || '';
    } catch {
      return '';
    }
  };

  const getReadContract = async () => {
    const address = await resolveContractAddress();
    if (!address) {
      throw new Error('VITE_BOUNTY_CONTRACT_ADDRESS is not configured');
    }

    return new Contract(address, BountyABI, provider);
  };

  const queryFilterPaged = async (
    filter: unknown,
    onProgress?: (p: QueryProgress) => void
  ) => {
    const contract = await getReadContract();
    const latest = await provider.getBlockNumber();
    const fromBlock = Number.isFinite(DEPLOY_BLOCK) && DEPLOY_BLOCK > 0 ? DEPLOY_BLOCK : 0;
    const windowSize = Number.isFinite(EVENT_BLOCK_WINDOW) && EVENT_BLOCK_WINDOW > 0 ? EVENT_BLOCK_WINDOW : 50000;

    const ranges: Array<{ from: number; to: number }> = [];
    for (let start = fromBlock; start <= latest; start += windowSize) {
      ranges.push({ from: start, to: Math.min(latest, start + windowSize - 1) });
    }

    const logs: any[] = [];
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      onProgress?.({
        fromBlock,
        toBlock: latest,
        currentToBlock: r.to,
        totalRanges: ranges.length,
        doneRanges: i,
      });
      const part = await (contract as any).queryFilter(filter as any, r.from, r.to);
      logs.push(...part);
    }

    onProgress?.({
      fromBlock,
      toBlock: latest,
      currentToBlock: latest,
      totalRanges: ranges.length,
      doneRanges: ranges.length,
    });

    return logs;
  };

  const loadBounties = async () => {
    loading.value = true;
    error.value = '';

    try {
      const contract = await getReadContract();
      const count: bigint = await contract.getBountyCount();
      const tasks: Bounty[] = [];

      for (let id = Number(count); id >= 1; id--) {
        const item: RawBounty = await contract.getBounty(id);
        tasks.push({
          id: Number(item.id),
          publisher: item.publisher,
          title: item.title,
          descriptionURI: item.descriptionURI,
          rewardAmountWei: item.rewardAmount.toString(),
          rewardAmountEth: formatEther(item.rewardAmount),
          tokenAddress: item.tokenAddress,
          deadline: Number(item.deadline),
          status: statusMap[item.status] ?? 'OPEN',
          successfulHunter: item.successfulHunter,
        });
      }

      bounties.value = tasks;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load bounties';
    } finally {
      loading.value = false;
    }
  };

  const getBountyById = async (id: number) => {
    const contract = await getReadContract();
    const item: RawBounty = await contract.getBounty(id);
    const mapped: Bounty = {
      id: Number(item.id),
      publisher: item.publisher,
      title: item.title,
      descriptionURI: item.descriptionURI,
      rewardAmountWei: item.rewardAmount.toString(),
      rewardAmountEth: formatEther(item.rewardAmount),
      tokenAddress: item.tokenAddress,
      deadline: Number(item.deadline),
      status: statusMap[item.status] ?? 'OPEN',
      successfulHunter: item.successfulHunter,
    };
    return mapped;
  };

  const getBountyHunters = async (id: number) => {
    const contract = await getReadContract();
    const hunters: string[] = await contract.getBountyHunters(id);
    return hunters;
  };

  const getSubmission = async (bountyId: number, hunter: string) => {
    const contract = await getReadContract();
    const submission = await contract.getSubmission(bountyId, hunter);
    return {
      hunter: submission.hunter as string,
      proofURI: submission.proofURI as string,
      timestamp: Number(submission.timestamp),
    };
  };

  const getSubmittedBountyIdsByHunter = async (
    hunter: string,
    opts?: { onProgress?: (p: QueryProgress) => void }
  ) => {
    const contract = await getReadContract();
    const filter = contract.filters.WorkSubmitted(null, hunter);
    const logs = await queryFilterPaged(filter, opts?.onProgress);
    const ids = Array.from(
      new Set(
        logs
          .map((l) => {
            if (!('args' in l)) return null;
            const event = l as unknown as { args?: { bountyId?: bigint } };
            return event.args?.bountyId ? Number(event.args.bountyId) : null;
          })
          .filter((v): v is number => typeof v === 'number')
      )
    );
    return ids;
  };

  return {
    bounties,
    loading,
    error,
    loadBounties,
    getBountyById,
    getBountyHunters,
    getSubmission,
    getSubmittedBountyIdsByHunter,
  };
}
