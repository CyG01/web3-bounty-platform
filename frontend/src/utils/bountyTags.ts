import type { Bounty } from '../types';
import { loadBountyDescription } from '../services/ipfs';

type BountyTagMeta = {
  tags: string[];
  cachedAt: number;
};

const TAG_KEYWORDS: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: 'Solidity', patterns: [/\bsolidity\b/i, /\bsmart\s*contract\b/i, /\bevm\b/i] },
  { tag: 'Frontend', patterns: [/\bfrontend\b/i, /\bui\b/i, /\bux\b/i] },
  { tag: 'Vue', patterns: [/\bvue(?:3)?\b/i, /\bnuxt\b/i] },
  { tag: 'React', patterns: [/\breact\b/i, /\bnext\.?js\b/i] },
  { tag: 'TypeScript', patterns: [/\btypescript\b/i, /\bts\b/i] },
  { tag: 'Design', patterns: [/\bdesign\b/i, /\bfigma\b/i] },
  { tag: 'Rust', patterns: [/\brust\b/i, /\banchor\b/i, /\bsolana\b/i] },
  { tag: 'Backend', patterns: [/\bbackend\b/i, /\bapi\b/i, /\bserver\b/i] },
  { tag: 'DevOps', patterns: [/\bdevops\b/i, /\bdocker\b/i, /\bk8s\b/i, /\bci\/cd\b/i] },
  { tag: 'Security', patterns: [/\bsecurity\b/i, /\baudit\b/i, /\bexploit\b/i] },
];

const metaCache: Record<number, BountyTagMeta | undefined> = {};
const inFlight: Record<number, Promise<BountyTagMeta> | undefined> = {};

function normalizeTag(tag: string) {
  return String(tag || '').trim();
}

function uniqTags(tags: string[]) {
  return Array.from(new Set(tags.map(normalizeTag).filter(Boolean)));
}

function extractTags(text: string) {
  const matched = TAG_KEYWORDS.filter((entry) =>
    entry.patterns.some((pattern) => pattern.test(text))
  ).map((entry) => entry.tag);
  return uniqTags(matched);
}

export function getCachedBountyTags(bountyId: number) {
  return metaCache[bountyId]?.tags || [];
}

export function seedBountyTags(bounty: Bounty) {
  if (!bounty?.id) return [];
  if (metaCache[bounty.id]) return metaCache[bounty.id]?.tags || [];
  const text = `${bounty.title || ''}\n${bounty.descriptionURI || ''}`;
  const tags = extractTags(text);
  metaCache[bounty.id] = { tags, cachedAt: Date.now() };
  return tags;
}

export async function loadBountyTags(bounty: Bounty) {
  if (!bounty?.id) return [] as string[];
  if (metaCache[bounty.id]) return metaCache[bounty.id]?.tags || [];
  const running = inFlight[bounty.id];
  if (running) {
    const result = await running;
    const tags = result?.tags || [];
    return tags;
  }

  const task = (async () => {
    const seeded = seedBountyTags(bounty);
    try {
      const desc = await loadBountyDescription(bounty.descriptionURI);
      const text = `${bounty.title || ''}\n${bounty.descriptionURI || ''}\n${desc?.title || ''}\n${desc?.markdown || ''}`;
      const tags = uniqTags([...seeded, ...extractTags(text)]);
      const next = { tags, cachedAt: Date.now() };
      metaCache[bounty.id] = next;
      return next;
    } catch {
      return metaCache[bounty.id] || { tags: seeded, cachedAt: Date.now() };
    } finally {
      delete inFlight[bounty.id];
    }
  })();

  inFlight[bounty.id] = task;
  const result = await task;
  return result.tags;
}
