<template>
  <section class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-[rgb(var(--text))]">{{ t('bounties.title') }}</h1>
        <p class="text-sm text-[rgb(var(--muted))]">{{ t('bounties.subtitle') }}</p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div
          class="inline-flex rounded-lg border border-[rgb(var(--border))] bg-[rgba(var(--surface),0.75)] p-1 ui-glow"
        >
          <button
            v-for="t in tabs"
            :key="t.id"
            class="px-3 py-2 text-sm font-semibold rounded-md"
            :class="
              activeTab === t.id
                ? 'bg-indigo-600 text-white'
                : 'text-[rgb(var(--text))] hover:bg-[rgba(var(--surface-2),0.5)]'
            "
            @click="activeTab = t.id"
          >
            {{ t.label }}
            <span class="ml-1 text-xs opacity-80">({{ t.count }})</span>
          </button>
        </div>

        <select
          v-model="sortKey"
          class="px-3 py-2 rounded-lg bg-[rgba(var(--surface),0.75)] border border-[rgb(var(--border))] text-sm font-semibold text-[rgb(var(--text))]"
        >
          <option value="deadline_asc">{{ t('bounties.sortDeadlineAsc') }}</option>
          <option value="deadline_desc">{{ t('bounties.sortDeadlineDesc') }}</option>
          <option value="reward_desc">{{ t('bounties.sortRewardDesc') }}</option>
          <option value="reward_asc">{{ t('bounties.sortRewardAsc') }}</option>
        </select>

        <button
          class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
          :disabled="loading"
          @click="loadBounties"
        >
          {{ loading ? t('common.refreshing') : t('common.refresh') }}
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
      class="rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgba(var(--surface),0.75)] p-8 text-center text-[rgb(var(--muted))]"
    >
      {{ t('bounties.empty') }}
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-4">
      <div
        v-for="i in 6"
        :key="i"
        class="rounded-xl border border-[rgb(var(--border))] bg-[rgba(var(--surface),0.75)] p-5 shadow-sm space-y-3 animate-pulse"
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
            class="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] font-semibold transition-colors"
            @click="report(item.id)"
          >
            {{ t('bounties.reportSpam') }}
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
import { useI18n } from 'vue-i18n';

const { bounties, loading, error, loadBounties } = useBounty();
const { showToast } = useToast();
const { t } = useI18n();
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
    { id: 'all' as const, label: t('bounties.tabAll'), count: all },
    { id: 'active' as const, label: t('bounties.tabActive'), count: active },
    { id: 'completed' as const, label: t('bounties.tabCompleted'), count: completed },
  ];
});

const report = (bountyId: number) => {
  const next = reportBounty(bountyId);
  hiddenSet.value = getHiddenBountyIds();
  const threshold = reportHideThreshold();
  if (next >= threshold) {
    showToast(t('bounties.reportHidden', { id: bountyId }), 'info');
  } else {
    showToast(t('bounties.reportedCount', { id: bountyId, next, threshold }), 'info');
  }
};

onMounted(() => {
  loadBounties();
});
</script>
