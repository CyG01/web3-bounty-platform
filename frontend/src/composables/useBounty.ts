import { ref } from 'vue';
import { Contract, JsonRpcProvider, formatEther } from 'ethers';
import BountyABI from '../abis/Bounty.json';
import type { Bounty, BountyStatus } from '../types';
import { loadDeployment } from '../services/deployments';
import {
  fetchBountiesPageFromIndexer,
  fetchBountyFromIndexer,
  hasIndexer,
} from '../services/indexer';

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

export type UserNotification = {
  id: string;
  bountyId: number;
  blockNumber: number;
  txHash: string;
  kind: 'submission_for_my_bounty' | 'work_rejected' | 'bounty_paid';
  message: string;
  amountWei?: string;
};

export function useBounty() {
  const bounties = ref<Bounty[]>([]);
  const loading = ref(false);
  const error = ref('');
  const hasMore = ref(true);

  const pageSize = Number(import.meta.env.VITE_BOUNTIES_PAGE_SIZE || 25);
  const first =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.min(200, Math.floor(pageSize)) : 25;

  const indexerSkip = ref(0);
  const contractCursor = ref<number | null>(null);

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

  const mapRawBounty = (item: RawBounty): Bounty => {
    return {
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
  };

  const resetPaging = () => {
    indexerSkip.value = 0;
    contractCursor.value = null;
    hasMore.value = true;
  };

  const loadFirstPage = async () => {
    bounties.value = [];
    resetPaging();
    await loadNextPage();
  };

  const loadNextPage = async () => {
    if (loading.value) return;
    if (!hasMore.value) return;

    loading.value = true;
    error.value = '';

    try {
      if (hasIndexer()) {
        const page = await fetchBountiesPageFromIndexer({ first, skip: indexerSkip.value });
        bounties.value = [...bounties.value, ...page];
        indexerSkip.value += page.length;
        hasMore.value = page.length === first;
        return;
      }

      const contract = await getReadContract();
      const count: bigint = await contract.getBountyCount();
      const total = Number(count);
      if (!Number.isFinite(total) || total <= 0) {
        hasMore.value = false;
        return;
      }

      const maybePaged = contract as unknown as {
        getBountiesPaginated?: (cursor: number, size: number) => Promise<[RawBounty[], bigint]>;
      };

      if (typeof maybePaged.getBountiesPaginated === 'function') {
        const cursor = contractCursor.value ?? total;
        if (cursor <= 0) {
          hasMore.value = false;
          return;
        }

        const res = await maybePaged.getBountiesPaginated(cursor, first);
        const items: RawBounty[] = res?.[0] ?? [];
        const next: bigint = res?.[1] ?? 0n;
        bounties.value = [...bounties.value, ...items.map(mapRawBounty)];
        const nextCursor = Number(next);
        contractCursor.value = nextCursor;
        hasMore.value = items.length === first && nextCursor > 0;
        return;
      }

      // Fallback: page by ID-range to avoid fetching everything at once
      const cursor = contractCursor.value ?? total;
      if (cursor <= 0) {
        hasMore.value = false;
        return;
      }

      const start = Math.max(1, cursor - first + 1);
      const ids: number[] = [];
      for (let id = cursor; id >= start; id--) ids.push(id);

      const rawItems = await Promise.all(
        ids.map((id) => contract.getBounty(id) as Promise<RawBounty>)
      );
      bounties.value = [...bounties.value, ...rawItems.map(mapRawBounty)];
      contractCursor.value = start - 1;
      hasMore.value = start > 1;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load bounties';
    } finally {
      loading.value = false;
    }
  };

  // Compatibility wrapper: previously loaded all; now load the first page
  const loadBounties = async () => {
    await loadFirstPage();
  };

  const getBountyById = async (id: number) => {
    if (hasIndexer()) {
      const indexed = await fetchBountyFromIndexer(id);
      if (indexed) return indexed;
    }

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

  const getUserNotifications = async (userAddress: string): Promise<UserNotification[]> => {
    if (!userAddress) return [];
    const contract = await getReadContract();
    const user = userAddress.toLowerCase();

    const [submittedLogs, paidLogs, rejectedLogs] = await Promise.all([
      queryFilterPaged(contract.filters.WorkSubmitted()),
      queryFilterPaged(contract.filters.BountyPaid(null, userAddress)),
      queryFilterPaged(contract.filters.WorkRejected(null, null, userAddress)),
    ]);

    const notes: UserNotification[] = [];
    const bountyCache = new Map<number, Bounty>();

    const getBountyCached = async (bountyId: number) => {
      const cached = bountyCache.get(bountyId);
      if (cached) return cached;
      const loaded = await getBountyById(bountyId);
      bountyCache.set(bountyId, loaded);
      return loaded;
    };

    for (const log of submittedLogs as Array<{
      args?: { bountyId?: bigint; hunter?: string };
      blockNumber?: number;
      transactionHash?: string;
      index?: number;
    }>) {
      const bountyId = log.args?.bountyId ? Number(log.args.bountyId) : 0;
      const hunter = (log.args?.hunter || '').toLowerCase();
      if (!bountyId) continue;
      const b = await getBountyCached(bountyId);
      if (b.publisher.toLowerCase() !== user || hunter === user) continue;
      notes.push({
        id: `submitted_${log.transactionHash || '0x'}_${log.index ?? 0}`,
        bountyId,
        blockNumber: Number(log.blockNumber || 0),
        txHash: log.transactionHash || '',
        kind: 'submission_for_my_bounty',
        message: `Bounty #${bountyId} has a new submission.`,
      });
    }

    for (const log of paidLogs as Array<{
      args?: { bountyId?: bigint; amount?: bigint };
      blockNumber?: number;
      transactionHash?: string;
      index?: number;
    }>) {
      const bountyId = log.args?.bountyId ? Number(log.args.bountyId) : 0;
      if (!bountyId) continue;
      notes.push({
        id: `paid_${log.transactionHash || '0x'}_${log.index ?? 0}`,
        bountyId,
        blockNumber: Number(log.blockNumber || 0),
        txHash: log.transactionHash || '',
        kind: 'bounty_paid',
        message: `You were paid for bounty #${bountyId}.`,
        amountWei: log.args?.amount ? log.args.amount.toString() : '0',
      });
    }

    for (const log of rejectedLogs as Array<{
      args?: { bountyId?: bigint };
      blockNumber?: number;
      transactionHash?: string;
      index?: number;
    }>) {
      const bountyId = log.args?.bountyId ? Number(log.args.bountyId) : 0;
      if (!bountyId) continue;
      notes.push({
        id: `rejected_${log.transactionHash || '0x'}_${log.index ?? 0}`,
        bountyId,
        blockNumber: Number(log.blockNumber || 0),
        txHash: log.transactionHash || '',
        kind: 'work_rejected',
        message: `Your submission was rejected for bounty #${bountyId}.`,
      });
    }

    notes.sort((a, b) => b.blockNumber - a.blockNumber);
    return notes;
  };

  return {
    bounties,
    loading,
    error,
    loadBounties,
    loadFirstPage,
    loadNextPage,
    hasMore,
    getBountyById,
    getBountyHunters,
    getSubmission,
    getSubmittedBountyIdsByHunter,
    getUserNotifications,
  };
}
