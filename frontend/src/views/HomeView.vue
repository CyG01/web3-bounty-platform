<template>
  <section class="space-y-8">
    <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm overflow-hidden relative">
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-transparent" />
      <div class="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-3 max-w-2xl">
          <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            {{ t('home.title') }}
          </h1>
          <p class="text-gray-600 leading-7">
            {{ t('home.subtitle') }}
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <router-link
              to="/create"
              class="px-5 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              {{ t('home.ctaCreate') }}
            </router-link>
            <router-link
              to="/bounties"
              class="px-5 py-3 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {{ t('home.ctaBrowse') }}
            </router-link>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:max-w-xl">
          <div class="rounded-xl border border-gray-200 bg-white/80 p-4">
            <p class="text-xs font-semibold text-gray-500">{{ t('home.tvl') }}</p>
            <p class="text-xl font-extrabold text-gray-900 mt-1">{{ tvlEth }} ETH</p>
            <p class="text-xs text-gray-500 mt-1">{{ t('home.tvlHint') }}</p>
          </div>
          <div class="rounded-xl border border-gray-200 bg-white/80 p-4">
            <p class="text-xs font-semibold text-gray-500">{{ t('home.total') }}</p>
            <p class="text-xl font-extrabold text-gray-900 mt-1">{{ totalCount }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ t('home.totalHint') }}</p>
          </div>
          <div class="rounded-xl border border-gray-200 bg-white/80 p-4">
            <p class="text-xs font-semibold text-gray-500">{{ t('home.open') }}</p>
            <p class="text-xl font-extrabold text-gray-900 mt-1">{{ openCount }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ t('home.openHint') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold text-gray-900">{{ t('home.latestTitle') }}</h2>
        <p class="text-sm text-gray-500">{{ t('home.latestSubtitle') }}</p>
      </div>
      <router-link
        to="/bounties"
        class="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        {{ t('home.viewAll') }}
      </router-link>
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-4">
      <div
        v-for="i in 3"
        :key="i"
        class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3 animate-pulse"
      >
        <div class="h-5 w-2/3 bg-gray-200 rounded" />
        <div class="h-3 w-1/2 bg-gray-200 rounded" />
        <div class="h-4 w-full bg-gray-200 rounded" />
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="h-14 bg-gray-200 rounded-lg" />
          <div class="h-14 bg-gray-200 rounded-lg" />
          <div class="h-14 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>

    <div
      v-else-if="latestOpen.length === 0"
      class="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center"
    >
      <p class="text-gray-600">{{ t('home.empty') }}</p>
      <router-link
        to="/create"
        class="inline-flex mt-4 px-5 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
      >
        {{ t('home.ctaCreate') }}
      </router-link>
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <BountyCard
        v-for="item in latestOpen"
        :key="item.id"
        :bounty="item"
        :reward-text="rewardDisplay(item)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { JsonRpcProvider } from 'ethers';
import BountyCard from '../components/features/BountyCard.vue';
import { useBounty } from '../composables/useBounty';
import type { Bounty } from '../types';
import { formatTokenAmount, getTokenMeta, shortenHex, ZERO_ADDRESS } from '../utils/token';
import { getHiddenBountyIds } from '../services/spamGuard';
import { useI18n } from 'vue-i18n';

const { bounties, loading, loadBounties } = useBounty();
const zeroAddress = ZERO_ADDRESS;
const { t } = useI18n();

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

const totalCount = computed(() => bounties.value.length);
const hiddenSet = computed(() => getHiddenBountyIds());
const visible = computed(() => bounties.value.filter((b) => !hiddenSet.value.has(b.id)));
const openCount = computed(() => visible.value.filter((b) => b.status === 'OPEN').length);
const latestOpen = computed(() => visible.value.filter((b) => b.status === 'OPEN').slice(0, 3));

const tvlEth = computed(() => {
  const sumWei = visible.value
    .filter(
      (b) =>
        b.tokenAddress === zeroAddress && (b.status === 'OPEN' || b.status === 'WORK_SUBMITTED')
    )
    .reduce((acc, b) => {
      try {
        return acc + BigInt(b.rewardAmountWei || '0');
      } catch {
        return acc;
      }
    }, 0n);

  // Use a simple 18-decimals formatting to avoid adding deps
  const whole = sumWei / 10n ** 18n;
  const frac = sumWei % 10n ** 18n;
  const fracStr = frac.toString().padStart(18, '0').slice(0, 4);
  return `${whole.toString()}.${fracStr}`;
});

onMounted(async () => {
  await loadBounties();
});
</script>
