import type { Bounty } from '../types';

const INDEXER_URL = import.meta.env.VITE_INDEXER_GRAPHQL_URL || '';

type GraphBounty = {
  id: string;
  bountyId: string;
  publisher: string;
  title: string;
  descriptionURI: string;
  rewardAmount: string;
  tokenAddress: string;
  deadline: string;
  status: string;
  successfulHunter: string;
  createdAt: string;
};

const statusMap: Record<string, Bounty['status']> = {
  OPEN: 'OPEN',
  WORK_SUBMITTED: 'WORK_SUBMITTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

function weiToEth(wei: string) {
  try {
    const v = BigInt(wei || '0');
    const whole = v / 10n ** 18n;
    const frac = (v % 10n ** 18n).toString().padStart(18, '0').slice(0, 6);
    return `${whole.toString()}.${frac}`;
  } catch {
    return '0';
  }
}

function mapBounty(b: GraphBounty): Bounty {
  return {
    id: Number(b.bountyId || b.id),
    publisher: b.publisher,
    title: b.title,
    descriptionURI: b.descriptionURI,
    rewardAmountWei: b.rewardAmount,
    rewardAmountEth: weiToEth(b.rewardAmount),
    tokenAddress: b.tokenAddress,
    deadline: Number(b.deadline),
    status: statusMap[b.status] || 'OPEN',
    successfulHunter: b.successfulHunter,
  };
}

async function query<T>(queryText: string, variables?: Record<string, unknown>): Promise<T> {
  if (!INDEXER_URL) throw new Error('Indexer URL not configured');
  const res = await globalThis.fetch(INDEXER_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: queryText, variables }),
  });
  if (!res.ok) throw new Error(`Indexer HTTP ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error('Indexer returned empty data');
  return json.data;
}

export function hasIndexer() {
  return Boolean(INDEXER_URL);
}

export async function fetchBountiesPageFromIndexer(opts: {
  first: number;
  skip: number;
}): Promise<Bounty[]> {
  const first = Math.max(1, Math.min(200, Math.floor(opts.first || 20)));
  const skip = Math.max(0, Math.floor(opts.skip || 0));

  const data = await query<{ bounties: GraphBounty[] }>(
    `query BountiesPage($first: Int!, $skip: Int!) {
      bounties(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
        id
        bountyId
        publisher
        title
        descriptionURI
        rewardAmount
        tokenAddress
        deadline
        status
        successfulHunter
        createdAt
      }
    }`,
    { first, skip }
  );
  return data.bounties.map(mapBounty);
}

export async function fetchBountiesFromIndexer(limit = 200): Promise<Bounty[]> {
  const data = await query<{ bounties: GraphBounty[] }>(
    `query Bounties($limit: Int!) {
      bounties(first: $limit, orderBy: createdAt, orderDirection: desc) {
        id
        bountyId
        publisher
        title
        descriptionURI
        rewardAmount
        tokenAddress
        deadline
        status
        successfulHunter
        createdAt
      }
    }`,
    { limit }
  );
  return data.bounties.map(mapBounty);
}

export async function fetchBountyFromIndexer(id: number): Promise<Bounty | null> {
  const data = await query<{ bounties: GraphBounty[] }>(
    `query BountyById($id: String!) {
      bounties(where: { bountyId: $id }, first: 1) {
        id
        bountyId
        publisher
        title
        descriptionURI
        rewardAmount
        tokenAddress
        deadline
        status
        successfulHunter
        createdAt
      }
    }`,
    { id: String(id) }
  );
  return data.bounties.length ? mapBounty(data.bounties[0]) : null;
}
