<template>
  <section class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">My Profile</h1>
      <p class="text-sm text-gray-500">Your published tasks and submissions on-chain.</p>
    </div>

    <div v-if="!userStore.isConnected" class="rounded-xl border border-dashed border-gray-300 bg-white p-8">
      <p class="text-sm text-gray-600">Connect wallet to view your profile.</p>
    </div>

    <div v-else class="space-y-8">
      <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ error }}
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Published by me</h2>
          <button
            class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
            :disabled="loading"
            @click="load"
          >
            {{ loading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>

        <div v-if="loading" class="text-sm text-gray-500">Loading...</div>

        <div v-else-if="published.length === 0" class="text-sm text-gray-500">No published bounties yet.</div>

        <div v-else class="grid grid-cols-1 gap-4">
          <article
            v-for="item in published"
            :key="item.id"
            class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-base font-semibold text-gray-900">#{{ item.id }} - {{ item.title }}</h3>
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
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">Participated by me</h2>

        <div v-if="indexing" class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Indexing on-chain history... {{ indexingText }}
        </div>

        <div v-if="loading" class="text-sm text-gray-500">Loading...</div>

        <div v-else-if="participated.length === 0" class="text-sm text-gray-500">No submissions yet.</div>

        <div v-else class="grid grid-cols-1 gap-4">
          <article
            v-for="item in participated"
            :key="item.id"
            class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-base font-semibold text-gray-900">#{{ item.id }} - {{ item.title }}</h3>
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

        <div v-if="!loading" class="pt-2">
          <button
            class="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            @click="load"
          >
            Retry / Refresh
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
import type { Bounty, BountyStatus } from '../types';

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

const statusClass = (status: BountyStatus) => {
  if (status === 'OPEN') return 'bg-blue-100 text-blue-700';
  if (status === 'WORK_SUBMITTED') return 'bg-amber-100 text-amber-700';
  if (status === 'COMPLETED') return 'bg-green-100 text-green-700';
  return 'bg-gray-200 text-gray-700';
};

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
