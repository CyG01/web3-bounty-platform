import { ref } from 'vue';
import { Contract, JsonRpcProvider, formatEther } from 'ethers';
import BountyABI from '../abis/Bounty.json';
import type { Bounty, BountyStatus } from '../types';
import { loadDeployment } from '../services/deployments';

const BOUNTY_CONTRACT_ADDRESS = import.meta.env.VITE_BOUNTY_CONTRACT_ADDRESS || '';
const RPC_URL = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';
const DEPLOY_BLOCK = Number(import.meta.env.VITE_DEPLOY_BLOCK || 0);
const EVENT_BLOCK_WINDOW = Number(import.meta.env.VITE_EVENT_BLOCK_WINDOW || 2000);

type QueryProgress = {
  fromBlock: number;
  toBlock: number;
  currentToBlock: number;
  totalRanges: number;
  doneRanges: number;
};

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

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  type QueryFilterFn = (filter: unknown, fromBlock: number, toBlock: number) => Promise<unknown[]>;
  const queryFilter = (c: Contract) => (c as unknown as { queryFilter: QueryFilterFn }).queryFilter;

  const queryFilterPaged = async (filter: unknown, onProgress?: (p: QueryProgress) => void) => {
    const contract = await getReadContract();
    const latest = await provider.getBlockNumber();
    const fromBlock = Number.isFinite(DEPLOY_BLOCK) && DEPLOY_BLOCK > 0 ? DEPLOY_BLOCK : 0;
    let windowSize =
      Number.isFinite(EVENT_BLOCK_WINDOW) && EVENT_BLOCK_WINDOW > 0 ? EVENT_BLOCK_WINDOW : 2000;
    const minWindow = 100;

    const totalRanges = Math.max(1, Math.ceil((latest - fromBlock + 1) / windowSize));
    const logs: unknown[] = [];

    let start = fromBlock;
    let doneRanges = 0;

    while (start <= latest) {
      const end = Math.min(latest, start + windowSize - 1);

      onProgress?.({
        fromBlock,
        toBlock: latest,
        currentToBlock: end,
        totalRanges,
        doneRanges,
      });

      try {
        const part = await queryFilter(contract)(filter, start, end);
        logs.push(...part);
        doneRanges += 1;
        start = end + 1;
        await sleep(120);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const looksLikeSpanLimit =
          /block range|too many results|query returned more than|exceeds maximum|Log response size exceeded/i.test(
            msg
          );
        const looksLikeRateLimit = /rate limit|429|too many requests|timeout|ETIMEDOUT/i.test(msg);

        if (windowSize <= minWindow) {
          throw e;
        }

        windowSize = Math.max(minWindow, Math.floor(windowSize / 2));
        if (looksLikeRateLimit) {
          await sleep(800);
        } else if (looksLikeSpanLimit) {
          await sleep(200);
        } else {
          await sleep(300);
        }
      }
    }

    onProgress?.({
      fromBlock,
      toBlock: latest,
      currentToBlock: latest,
      totalRanges,
      doneRanges: totalRanges,
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
      const total = Number(count);

      // Prefer contract-side pagination to avoid RPC N+1 storms
      const maybePaged = contract as unknown as {
        getBountiesPaginated?: (cursor: number, size: number) => Promise<[RawBounty[], bigint]>;
      };

      if (typeof maybePaged.getBountiesPaginated === 'function' && total > 0) {
        let cursor = total;
        const size = 25;
        while (cursor > 0) {
          const res = await maybePaged.getBountiesPaginated(cursor, size);
          const items: RawBounty[] = res?.[0] ?? [];
          const next: bigint = res?.[1] ?? 0n;

          for (const item of items) {
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

          cursor = Number(next);
        }
      } else {
        // Fallback for older deployments
        for (let id = total; id >= 1; id--) {
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
    const logs = (await queryFilterPaged(filter, opts?.onProgress)) as Array<{
      args?: { bountyId?: bigint };
    }>;
    const ids = Array.from(
      new Set(
        logs
          .map((l) => {
            return l.args?.bountyId ? Number(l.args.bountyId) : null;
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
