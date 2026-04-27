import { Contract, JsonRpcProvider, ethers } from 'ethers';
import ERC20ABI from '../abis/ERC20.json';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type TokenMeta = { symbol: string; decimals: number; cachedAt: number };

const CACHE_PREFIX = 'tokenMeta:';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TTL_MS = Number(import.meta.env.VITE_TOKEN_META_TTL_MS || DEFAULT_TTL_MS);

const FALLBACK_RPC_URLS = (import.meta.env.VITE_RPC_FALLBACK_URLS || '')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean);

const memoryCache: Record<string, TokenMeta> = {};
const inFlight: Record<string, Promise<TokenMeta> | undefined> = {};

let active = 0;
const queue: Array<() => void> = [];
const MAX_CONCURRENCY = Number(import.meta.env.VITE_TOKEN_META_CONCURRENCY || 3);

function runWithConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const task = () => {
      active++;
      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          active--;
          const next = queue.shift();
          if (next) next();
        });
    };

    if (active < MAX_CONCURRENCY) task();
    else queue.push(task);
  });
}

function withTimeout<T>(p: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => {
      clearTimeout(id);
      resolve(v);
    }).catch((e) => {
      clearTimeout(id);
      reject(e);
    });
  });
}

function isFresh(meta: TokenMeta) {
  if (!meta?.cachedAt) return false;
  if (!Number.isFinite(TTL_MS) || TTL_MS <= 0) return true;
  return Date.now() - meta.cachedAt < TTL_MS;
}

export function shortenHex(address: string, chars = 4) {
  if (!address) return '';
  const parsed = address.trim();
  if (parsed.length < 10) return parsed;
  return `${parsed.substring(0, chars + 2)}...${parsed.substring(parsed.length - chars)}`;
}

export function readTokenMetaCache(tokenAddress: string): TokenMeta | null {
  const key = tokenAddress.toLowerCase();
  if (memoryCache[key]) return memoryCache[key];

  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TokenMeta;
    if (!parsed?.symbol || typeof parsed.decimals !== 'number') return null;
    if (!isFresh(parsed)) return null;
    memoryCache[key] = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTokenMetaCache(tokenAddress: string, meta: TokenMeta) {
  const key = tokenAddress.toLowerCase();
  memoryCache[key] = meta;

  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(meta));
  } catch {
    // ignore storage errors
  }
}

export async function getTokenMeta(provider: JsonRpcProvider, tokenAddress: string): Promise<TokenMeta> {
  const key = tokenAddress.toLowerCase();
  const cached = readTokenMetaCache(tokenAddress);
  if (cached) return cached;

  const running = inFlight[key];
  if (running) return running;

  const task = runWithConcurrency(async () => {
    const rpcTimeout = Number(import.meta.env.VITE_RPC_TIMEOUT_MS || 8000);
    const providers = [provider, ...FALLBACK_RPC_URLS.map((u: string) => new JsonRpcProvider(u))];

    let lastErr: unknown;
    for (const p of providers) {
      try {
        const token = new Contract(tokenAddress, ERC20ABI, p);
        const [symbol, decimals] = await withTimeout(
          Promise.all([token.symbol(), token.decimals()]),
          rpcTimeout
        );
        const meta = { symbol: String(symbol), decimals: Number(decimals), cachedAt: Date.now() };
        writeTokenMetaCache(tokenAddress, meta);
        return meta;
      } catch (e) {
        lastErr = e;
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error('Failed to load token meta');
  }).finally(() => {
    delete inFlight[key];
  });

  inFlight[key] = task;
  return task;
}

export function formatTokenAmount(amountWei: string, decimals: number) {
  return ethers.formatUnits(amountWei, decimals);
}
