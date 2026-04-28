<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Bounties</h1>
        <p class="text-sm text-gray-500">Browse on-chain tasks and track their status.</p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div class="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            v-for="t in tabs"
            :key="t.id"
            class="px-3 py-2 text-sm font-semibold rounded-md"
            :class="
              activeTab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-50'
            "
            @click="activeTab = t.id"
          >
            {{ t.label }}
            <span class="ml-1 text-xs opacity-80">({{ t.count }})</span>
          </button>
        </div>

        <select
          v-model="sortKey"
          class="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700"
        >
          <option value="deadline_asc">Deadline ↑</option>
          <option value="deadline_desc">Deadline ↓</option>
          <option value="reward_desc">Reward ↓</option>
          <option value="reward_asc">Reward ↑</option>
        </select>

        <button
          class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
          :disabled="loading"
          @click="loadBounties"
        >
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <div
      v-if="error"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ error }}
    </div>

    <div
      v-if="tokenMetaError"
      class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      {{ tokenMetaError }}
    </div>

    <div
      v-if="!loading && viewItems.length === 0"
      class="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500"
    >
      No visible bounty found. Try changing filters or create a new one.
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-4">
      <div
        v-for="i in 6"
        :key="i"
        class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3 animate-pulse"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-2 flex-1">
            <div class="h-5 w-2/3 bg-gray-200 rounded" />
            <div class="h-3 w-1/2 bg-gray-200 rounded" />
          </div>
          <div class="h-6 w-24 bg-gray-200 rounded-full" />
        </div>
        <div class="h-4 w-full bg-gray-200 rounded" />
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="h-14 bg-gray-200 rounded-lg" />
          <div class="h-14 bg-gray-200 rounded-lg" />
          <div class="h-14 bg-gray-200 rounded-lg" />
        </div>
        <div class="flex justify-end">
          <div class="h-9 w-28 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <BountyCard
        v-for="item in viewItems"
        :key="item.id"
        :bounty="item"
        :reward-text="rewardDisplay(item)"
      >
        <template #left>
          <button
            class="text-xs text-gray-500 hover:text-red-600 font-semibold"
            @click="report(item.id)"
          >
            Report spam
          </button>
        </template>
      </BountyCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useBounty } from '../composables/useBounty';
import type { Bounty } from '../types';
import { JsonRpcProvider } from 'ethers';
import { formatTokenAmount, getTokenMeta, shortenHex, ZERO_ADDRESS } from '../utils/token';
import BountyCard from '../components/features/BountyCard.vue';
import { getHiddenBountyIds, reportBounty, reportHideThreshold } from '../services/spamGuard';
import { useToast } from '../composables/useToast';

const { bounties, loading, error, loadBounties } = useBounty();
const { showToast } = useToast();
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

type TabId = 'all' | 'active' | 'completed';
const activeTab = ref<TabId>('all');
const sortKey = ref<'deadline_asc' | 'deadline_desc' | 'reward_asc' | 'reward_desc'>(
  'deadline_asc'
);
const hiddenSet = ref<Set<number>>(getHiddenBountyIds());

const filteredItems = computed(() => {
  const visible = bounties.value.filter((b) => !hiddenSet.value.has(b.id));
  if (activeTab.value === 'all') return visible;
  if (activeTab.value === 'active')
    return visible.filter((b) => b.status === 'OPEN' || b.status === 'WORK_SUBMITTED');
  return visible.filter((b) => b.status === 'COMPLETED');
});

const viewItems = computed(() => {
  const items = [...filteredItems.value];
  const rewardBig = (b: Bounty) => {
    try {
      return BigInt(b.rewardAmountWei || '0');
    } catch {
      return 0n;
    }
  };

  if (sortKey.value === 'deadline_asc') items.sort((a, b) => a.deadline - b.deadline);
  if (sortKey.value === 'deadline_desc') items.sort((a, b) => b.deadline - a.deadline);
  if (sortKey.value === 'reward_asc')
    items.sort((a, b) => (rewardBig(a) < rewardBig(b) ? -1 : rewardBig(a) > rewardBig(b) ? 1 : 0));
  if (sortKey.value === 'reward_desc')
    items.sort((a, b) => (rewardBig(a) > rewardBig(b) ? -1 : rewardBig(a) < rewardBig(b) ? 1 : 0));
  return items;
});

const tabs = computed(() => {
  const visible = bounties.value.filter((b) => !hiddenSet.value.has(b.id));
  const all = visible.length;
  const active = visible.filter((b) => b.status === 'OPEN' || b.status === 'WORK_SUBMITTED').length;
  const completed = visible.filter((b) => b.status === 'COMPLETED').length;
  return [
    { id: 'all' as const, label: 'All', count: all },
    { id: 'active' as const, label: 'In progress', count: active },
    { id: 'completed' as const, label: 'Completed', count: completed },
  ];
});

const report = (bountyId: number) => {
  const next = reportBounty(bountyId);
  hiddenSet.value = getHiddenBountyIds();
  const threshold = reportHideThreshold();
  if (next >= threshold) {
    showToast(`Bounty #${bountyId} hidden after reports.`, 'info');
  } else {
    showToast(`Reported bounty #${bountyId} (${next}/${threshold}).`, 'info');
  }
};

onMounted(() => {
  loadBounties();
});
</script>
