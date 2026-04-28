import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { JsonRpcProvider } from 'ethers';
import { getTokenMeta } from '../utils/token';

type TokenMeta = { symbol: string; decimals: number; cachedAt: number };

const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';
const readProvider = new JsonRpcProvider(rpcUrl);

export const useTokenStore = defineStore('token', () => {
  const metaByAddress = reactive<Record<string, TokenMeta | undefined>>({});
  const loadingByAddress = reactive<Record<string, boolean | undefined>>({});
  const lastError = ref<string>('');

  const loadMeta = async (tokenAddress: string) => {
    const key = (tokenAddress || '').toLowerCase();
    if (!key) return null;
    if (metaByAddress[key]) return metaByAddress[key] || null;
    if (loadingByAddress[key]) return metaByAddress[key] || null;

    loadingByAddress[key] = true;
    try {
      const meta = await getTokenMeta(readProvider, tokenAddress);
      metaByAddress[key] = meta;
      return meta;
    } catch (e: unknown) {
      lastError.value = e instanceof Error ? e.message : 'Failed to load token metadata';
      return null;
    } finally {
      loadingByAddress[key] = false;
    }
  };

  return {
    metaByAddress,
    loadingByAddress,
    lastError,
    loadMeta,
  };
});
