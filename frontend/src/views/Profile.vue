<template>
  <section class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold" :style="titleStyle">{{ t('profile.title') }}</h1>
      <p class="text-sm" :style="mutedStyle">{{ t('profile.subtitle') }}</p>
    </div>

    <div
      v-if="!userStore.isConnected"
      class="rounded-xl border border-dashed p-8 ui-glow"
      :style="panelStyle"
    >
      <p class="text-sm" :style="mutedStyle">{{ t('profile.connectHint') }}</p>
    </div>

    <div v-else class="space-y-8">
      <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ error }}
      </div>

      <div class="rounded-xl border p-5 shadow-sm space-y-4 ui-glow ui-shimmer-border" :style="panelStyle">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold" :style="titleStyle">{{ t('profile.published') }}</h2>
          <button
            class="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:bg-gray-400"
            :style="primaryBtnStyle"
            :disabled="loading"
            @click="load"
          >
            {{ loading ? t('common.refreshing') : t('common.refresh') }}
          </button>
        </div>

        <div v-if="loading" class="text-sm" :style="mutedStyle">{{ t('profile.loading') }}</div>

        <div v-else-if="published.length === 0" class="text-sm" :style="mutedStyle">
          {{ t('profile.nonePublished') }}
        </div>

        <div v-else class="grid grid-cols-1 gap-4">
          <article
            v-for="item in published"
            :key="item.id"
            class="rounded-xl border p-5 shadow-sm space-y-3 transition-transform duration-200 hover:-translate-y-0.5"
            :style="panelStyle"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-base font-semibold" :style="titleStyle">#{{ item.id }} - {{ item.title }}</h3>
                <p class="text-xs break-all" :style="mutedStyle">
                  {{ t('common.publisher') }}: {{ item.publisher }}
                </p>
              </div>
              <StatusBadge :status="item.status" />
            </div>

            <p class="text-sm break-all" :style="textStyle">
              <span class="font-medium">{{ t('common.description') }}:</span>
              {{ item.descriptionURI }}
            </p>

            <div class="pt-2 flex justify-end">
              <router-link
                :to="`/bounties/${item.id}`"
                class="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                :style="primaryBtnStyle"
              >
                {{ t('common.viewAction') }}
              </router-link>
            </div>
          </article>
        </div>
      </div>

      <div class="rounded-xl border p-5 shadow-sm space-y-4 ui-glow ui-shimmer-border" :style="panelStyle">
        <h2 class="text-lg font-semibold" :style="titleStyle">{{ t('profile.participated') }}</h2>

        <div v-if="indexing" class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {{ t('profile.indexing') }} {{ indexingText }}
        </div>

        <div v-if="loading" class="text-sm" :style="mutedStyle">{{ t('profile.loading') }}</div>

        <div v-else-if="participated.length === 0" class="text-sm" :style="mutedStyle">
          {{ t('profile.noneSubmissions') }}
        </div>

        <div v-else class="grid grid-cols-1 gap-4">
          <article
            v-for="item in participated"
            :key="item.id"
            class="rounded-xl border p-5 shadow-sm space-y-3 transition-transform duration-200 hover:-translate-y-0.5"
            :style="panelStyle"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-base font-semibold" :style="titleStyle">#{{ item.id }} - {{ item.title }}</h3>
                <p class="text-xs break-all" :style="mutedStyle">
                  {{ t('common.publisher') }}: {{ item.publisher }}
                </p>
              </div>
              <StatusBadge :status="item.status" />
            </div>

            <p class="text-sm break-all" :style="textStyle">
              <span class="font-medium">{{ t('common.description') }}:</span>
              {{ item.descriptionURI }}
            </p>

            <div class="pt-2 flex justify-end">
              <router-link
                :to="`/bounties/${item.id}`"
                class="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                :style="primaryBtnStyle"
              >
                {{ t('common.viewAction') }}
              </router-link>
            </div>
          </article>
        </div>

        <div v-if="!loading" class="pt-2">
          <button
            class="px-4 py-2 rounded-lg border text-sm font-semibold transition-colors"
            :style="secondaryBtnStyle"
            @click="load"
          >
            {{ t('profile.retry') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useUserStore } from '../stores/userStore';
import { useBounty } from '../composables/useBounty';
import type { Bounty } from '../types';
import StatusBadge from '../components/features/StatusBadge.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const titleStyle = computed(() => ({
  color: `rgb(var(--text))`,
}));

const textStyle = computed(() => ({
  color: `rgb(var(--text))`,
}));

const mutedStyle = computed(() => ({
  color: `rgb(var(--muted))`,
}));

const panelStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.75)`,
  borderColor: `rgb(var(--border))`,
}));

const primaryBtnStyle = computed(() => ({
  background: `linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--primary-2)) 100%)`,
}));

const secondaryBtnStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.55)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));

const userStore = useUserStore();
const { bounties, loadBounties, getSubmittedBountyIdsByHunter, getBountyById } = useBounty();

const loading = ref(false);
const error = ref('');

const participated = ref<Bounty[]>([]);

const indexing = ref(false);
const indexingText = ref('');

const published = computed(() => {
  const me = userStore.address?.toLowerCase();
  if (!me) return [];
  return bounties.value.filter((b) => b.publisher.toLowerCase() === me);
});

const load = async () => {
  if (!userStore.isConnected) return;
  loading.value = true;
  error.value = '';
  indexing.value = false;
  indexingText.value = '';

  try {
    await loadBounties();

    const ids = await getSubmittedBountyIdsByHunter(userStore.address, {
      onProgress: (p) => {
        indexing.value = p.totalRanges > 1;
        indexingText.value = `${p.doneRanges}/${p.totalRanges} ranges (to block ${p.currentToBlock})`;
      },
    });
    const items = await Promise.all(ids.map((id) => getBountyById(id)));
    const unique = new Map<number, Bounty>();
    for (const b of items) unique.set(b.id, b);
    participated.value = Array.from(unique.values()).sort((a, b) => b.id - a.id);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to load profile';
  } finally {
    loading.value = false;
    indexing.value = false;
  }
};

watch(
  () => userStore.address,
  () => {
    if (userStore.isConnected) load();
  }
);

onMounted(() => {
  if (userStore.isConnected) load();
});
</script>
