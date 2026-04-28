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
          @click="loadFirstPage"
        >
          {{ loading ? t('common.refreshing') : t('common.refresh') }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <input
        v-model="search"
        type="text"
        class="px-4 py-3 rounded-lg border bg-[rgba(var(--surface),0.75)] text-sm font-medium text-[rgb(var(--text))]"
        :placeholder="t('bounties.searchPlaceholder')"
      />

      <select
        v-model="tokenType"
        class="px-3 py-3 rounded-lg bg-[rgba(var(--surface),0.75)] border border-[rgb(var(--border))] text-sm font-semibold text-[rgb(var(--text))]"
      >
        <option value="all">{{ t('bounties.tokenAll') }}</option>
        <option value="eth">{{ t('bounties.tokenEth') }}</option>
        <option value="erc20">{{ t('bounties.tokenErc20') }}</option>
      </select>

      <input
        v-model="tokenQuery"
        type="text"
        class="px-4 py-3 rounded-lg border bg-[rgba(var(--surface),0.75)] text-sm font-medium text-[rgb(var(--text))]"
        :placeholder="t('bounties.tokenQueryPlaceholder')"
      />

      <input
        v-model="tagQuery"
        type="text"
        class="px-4 py-3 rounded-lg border bg-[rgba(var(--surface),0.75)] text-sm font-medium text-[rgb(var(--text))]"
        :placeholder="t('bounties.tagPlaceholder')"
      />
    </div>

    <div v-if="tagOptions.length" class="flex flex-wrap gap-2">
      <button
        class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
        :class="!selectedTag ? 'bg-indigo-600 text-white border-indigo-600' : ''"
        :style="!selectedTag ? undefined : chipStyle"
        @click="selectedTag = ''"
      >
        {{ t('bounties.tagAll') }}
      </button>
      <button
        v-for="tag in tagOptions"
        :key="tag"
        class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
        :class="selectedTag === tag ? 'bg-indigo-600 text-white border-indigo-600' : ''"
        :style="selectedTag === tag ? undefined : chipStyle"
        @click="selectedTag = selectedTag === tag ? '' : tag"
      >
        {{ tag }}
      </button>
    </div>

    <div
      v-if="error"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ error }}
    </div>

    <EmptyState
      v-if="!loading && viewItems.length === 0"
      :title="t('bounties.empty')"
      :subtitle="t('bounties.emptyHint')"
      icon-text="?"
      :variant="selectedTag || search || tokenQuery || tagQuery ? 'search' : 'sparkles'"
    >
      <template #action>
        <router-link
          to="/create"
          class="px-5 py-3 rounded-lg text-white text-sm font-semibold transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
          :style="primaryBtnStyle"
        >
          {{ t('home.ctaCreate') }}
        </router-link>
      </template>
    </EmptyState>

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

    <div v-if="!loading && hasMore" class="flex justify-center pt-2">
      <button
        class="px-5 py-3 rounded-lg bg-[rgba(var(--surface),0.75)] border border-[rgb(var(--border))] text-sm font-semibold text-[rgb(var(--text))] hover:bg-[rgba(var(--surface-2),0.55)] ui-glow transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
        @click="loadNextPage"
      >
        {{ t('common.loadMore') }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useBounty } from '../composables/useBounty';
import type { Bounty } from '../types';
import { shortenHex, ZERO_ADDRESS } from '../utils/token';
import BountyCard from '../components/features/BountyCard.vue';
import {
  fetchHiddenBountyIdsRemote,
  getHiddenBountyIds,
  reportBounty,
  reportBountyRemote,
  reportHideThreshold,
} from '../services/spamGuard';
import { useToast } from '../composables/useToast';
import { useI18n } from 'vue-i18n';
import { useTokenStore } from '../stores/tokenStore';
import EmptyState from '../components/common/EmptyState.vue';
import { getCachedBountyTags, loadBountyTags, seedBountyTags } from '../utils/bountyTags';
import { formatDisplayAmount } from '../utils/display';

const { bounties, loading, error, loadFirstPage, loadNextPage, hasMore } = useBounty();
const { showToast } = useToast();
const { t } = useI18n();
const tokenStore = useTokenStore();
const zeroAddress = ZERO_ADDRESS;

const primaryBtnStyle = computed(() => ({
  background: `linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--primary-2)) 100%)`,
}));

const chipStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.75)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));

const rewardDisplay = (item: Bounty) => {
  if (!item.tokenAddress || item.tokenAddress === zeroAddress) {
    return `${formatDisplayAmount(item.rewardAmountWei, { decimals: 18, maxFraction: 4 })} ETH`;
  }

  const key = item.tokenAddress.toLowerCase();
  const meta = tokenStore.metaByAddress[key];
  if (!meta) {
    tokenStore.loadMeta(item.tokenAddress);
    return `${shortenHex(item.tokenAddress)} · ${item.rewardAmountWei} (ERC20)`;
  }

  try {
    const formatted = formatDisplayAmount(item.rewardAmountWei, {
      decimals: meta.decimals,
      maxFraction: 4,
    });
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
const search = ref('');
const tokenType = ref<'all' | 'eth' | 'erc20'>('all');
const tokenQuery = ref('');
const tagQuery = ref('');
const selectedTag = ref('');

const bountyTags = computed<Record<number, string[]>>(() => {
  const entries = bounties.value.map((b) => [b.id, getCachedBountyTags(b.id)]);
  return Object.fromEntries(entries);
});

const tagOptions = computed(() => {
  const normalizedQuery = tagQuery.value.trim().toLowerCase();
  const allTags = Array.from(
    new Set(
      bounties.value.flatMap((b) => {
        const cached = bountyTags.value[b.id];
        return cached?.length ? cached : seedBountyTags(b);
      })
    )
  ).sort();
  if (!normalizedQuery) return allTags;
  return allTags.filter((tag) => tag.toLowerCase().includes(normalizedQuery));
});

const filteredItems = computed(() => {
  let visible = bounties.value.filter((b) => !hiddenSet.value.has(b.id));

  if (activeTab.value === 'active') {
    visible = visible.filter((b) => b.status === 'OPEN' || b.status === 'WORK_SUBMITTED');
  } else if (activeTab.value === 'completed') {
    visible = visible.filter((b) => b.status === 'COMPLETED');
  }

  if (tokenType.value === 'eth') {
    visible = visible.filter((b) => !b.tokenAddress || b.tokenAddress === zeroAddress);
  } else if (tokenType.value === 'erc20') {
    visible = visible.filter((b) => b.tokenAddress && b.tokenAddress !== zeroAddress);
  }

  const q = search.value.trim().toLowerCase();
  if (q) {
    visible = visible.filter((b) => {
      return (
        String(b.title || '')
          .toLowerCase()
          .includes(q) ||
        String(b.descriptionURI || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }

  const tq = tokenQuery.value.trim().toLowerCase();
  if (tq) {
    visible = visible.filter((b) => {
      const addr = String(b.tokenAddress || '').toLowerCase();
      if (addr && addr.includes(tq)) return true;
      if (!addr || addr === zeroAddress) return false;
      const meta = tokenStore.metaByAddress[addr];
      const sym = String(meta?.symbol || '').toLowerCase();
      if (sym) return sym.includes(tq);
      tokenStore.loadMeta(addr);
      return false;
    });
  }

  const activeTag = selectedTag.value || '';
  const rawTagQuery = tagQuery.value.trim().toLowerCase();
  if (activeTag || rawTagQuery) {
    visible = visible.filter((b) => {
      const tags = bountyTags.value[b.id] || [];
      if (activeTag && tags.includes(activeTag)) return true;
      if (rawTagQuery && tags.some((tag) => tag.toLowerCase().includes(rawTagQuery))) return true;
      return false;
    });
  }

  return visible;
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

const report = async (bountyId: number) => {
  try {
    const threshold = reportHideThreshold();
    const { next } = await reportBountyRemote(bountyId);
    hiddenSet.value = getHiddenBountyIds();
    if (next >= threshold) {
      showToast(t('bounties.reportHidden', { id: bountyId }), 'info');
    } else {
      showToast(t('bounties.reportedCount', { id: bountyId, next, threshold }), 'info');
    }
  } catch {
    const next = reportBounty(bountyId);
    hiddenSet.value = getHiddenBountyIds();
    const threshold = reportHideThreshold();
    if (next >= threshold) {
      showToast(t('bounties.reportHidden', { id: bountyId }), 'info');
    } else {
      showToast(t('bounties.reportedCount', { id: bountyId, next, threshold }), 'info');
    }
  }
};

onMounted(async () => {
  loadFirstPage();
  try {
    const remoteHidden = await fetchHiddenBountyIdsRemote();
    if (remoteHidden.size) {
      hiddenSet.value = new Set([...hiddenSet.value, ...remoteHidden]);
    }
  } catch {
    // ignore remote spam guard failures
  }
});

watch(
  () => bounties.value.map((b) => `${b.id}:${b.descriptionURI}`).join('|'),
  () => {
    for (const bounty of bounties.value) {
      seedBountyTags(bounty);
      void loadBountyTags(bounty);
    }
  },
  { immediate: true }
);
</script>
