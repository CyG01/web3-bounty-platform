<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Bounties</h1>
        <p class="text-sm text-gray-500">Browse on-chain tasks and track their status.</p>
      </div>
      <button
        class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
        :disabled="loading"
        @click="loadBounties"
      >
        {{ loading ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <div
      v-if="tokenMetaError"
      class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      {{ tokenMetaError }}
    </div>

    <div
      v-if="!loading && bounties.length === 0"
      class="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500"
    >
      No bounty found on-chain yet. Create the first one!
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <article
        v-for="item in bounties"
        :key="item.id"
        class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">
              #{{ item.id }} - {{ item.title }}
            </h2>
            <p class="text-xs text-gray-500 break-all">Publisher: {{ item.publisher }}</p>
          </div>
          <span class="text-xs font-semibold px-2 py-1 rounded-full" :class="statusClass(item.status)">
            {{ item.status }}
          </span>
        </div>

        <p class="text-sm text-gray-700 break-all">
          <span class="font-medium">Description:</span>
          {{ item.descriptionURI }}
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div class="rounded-lg bg-gray-50 px-3 py-2">
            <p class="text-gray-500">Reward</p>
            <p class="font-semibold text-gray-900 break-all">{{ rewardDisplay(item) }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 px-3 py-2">
            <p class="text-gray-500">Deadline</p>
            <p class="font-semibold text-gray-900">{{ formatDate(item.deadline) }}</p>
          </div>
          <div class="rounded-lg bg-gray-50 px-3 py-2">
            <p class="text-gray-500">Winner</p>
            <p class="font-semibold text-gray-900 break-all">
              {{ item.successfulHunter === zeroAddress ? '-' : item.successfulHunter }}
            </p>
          </div>
        </div>

        <div class="pt-2 flex justify-end">
          <router-link
            :to="`/bounties/${item.id}`"
            class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            View & Action
          </router-link>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useBounty } from '../composables/useBounty';
import type { BountyStatus } from '../types';
import type { Bounty } from '../types';
import { JsonRpcProvider } from 'ethers';
import { formatTokenAmount, getTokenMeta, shortenHex, ZERO_ADDRESS } from '../utils/token';

const { bounties, loading, error, loadBounties } = useBounty();
const zeroAddress = ZERO_ADDRESS;

const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';
const readProvider = new JsonRpcProvider(rpcUrl);

const tokenMetaCache = reactive<Record<string, { symbol: string; decimals: number }>>({});
const tokenMetaError = ref<string>('');

const rewardDisplay = (item: Bounty) => {
  if (!item.tokenAddress || item.tokenAddress === zeroAddress) {
    return `${item.rewardAmountEth} ETH`;
  }

  const key = item.tokenAddress.toLowerCase();
  const meta = tokenMetaCache[key];
  if (!meta) {
    getTokenMeta(readProvider, item.tokenAddress)
      .then((m) => {
        tokenMetaCache[key] = m;
      })
      .catch(() => {
        tokenMetaError.value = 'Failed to load token metadata from RPC.';
      });
    return `${shortenHex(item.tokenAddress)} · ${item.rewardAmountWei} (ERC20)`;
  }

  try {
    const formatted = formatTokenAmount(item.rewardAmountWei, meta.decimals);
    return `${formatted} ${meta.symbol}`;
  } catch {
    return `${item.rewardAmountWei} ${meta.symbol}`;
  }
};

const formatDate = (unix: number) => new Date(unix * 1000).toLocaleString();

const statusClass = (status: BountyStatus) => {
  if (status === 'OPEN') return 'bg-blue-100 text-blue-700';
  if (status === 'WORK_SUBMITTED') return 'bg-amber-100 text-amber-700';
  if (status === 'COMPLETED') return 'bg-green-100 text-green-700';
  return 'bg-gray-200 text-gray-700';
};

onMounted(() => {
  loadBounties();
});
</script>
