<template>
  <div class="relative">
    <button
      class="relative p-2 text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-full transition-colors"
      title="Notifications"
      @click="toggleOpen"
    >
      <svg
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-white border border-gray-200 rounded-xl shadow-xl z-50"
    >
      <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p class="text-sm font-semibold text-gray-900">Notifications</p>
        <button
          class="text-xs text-indigo-600 font-semibold hover:text-indigo-700"
          @click="refresh"
        >
          Refresh
        </button>
      </div>

      <div v-if="loading" class="p-4 space-y-3">
        <div v-for="i in 3" :key="i" class="h-12 rounded bg-gray-100 animate-pulse" />
      </div>
      <div v-else-if="items.length === 0" class="p-4 text-sm text-gray-500">
        No notifications yet.
      </div>

      <router-link
        v-for="n in items"
        v-else
        :key="n.id"
        :to="`/bounties/${n.bountyId}`"
        class="block px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
      >
        <p class="text-sm text-gray-800">{{ n.message }}</p>
        <p class="text-xs text-gray-400 mt-1">Bounty #{{ n.bountyId }}</p>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { useBounty, type UserNotification } from '../../composables/useBounty';

const userStore = useUserStore();
const { getUserNotifications } = useBounty();

const open = ref(false);
const loading = ref(false);
const items = ref<UserNotification[]>([]);
const seenIds = ref<Set<string>>(new Set());
let timer: ReturnType<typeof globalThis.setInterval> | undefined;

const seenKey = computed(() => `bounty_seen_notifications_${userStore.address.toLowerCase()}`);
const unreadCount = computed(() => items.value.filter((n) => !seenIds.value.has(n.id)).length);

const loadSeen = () => {
  try {
    const raw = globalThis.localStorage?.getItem(seenKey.value);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    seenIds.value = new Set(arr);
  } catch {
    seenIds.value = new Set();
  }
};

const persistSeen = () => {
  globalThis.localStorage?.setItem(seenKey.value, JSON.stringify(Array.from(seenIds.value)));
};

const markAllRead = () => {
  for (const n of items.value) {
    seenIds.value.add(n.id);
  }
  persistSeen();
};

const refresh = async () => {
  if (!userStore.isConnected || !userStore.address) return;
  loading.value = true;
  try {
    items.value = await getUserNotifications(userStore.address);
  } finally {
    loading.value = false;
  }
};

const toggleOpen = async () => {
  open.value = !open.value;
  if (open.value) {
    await refresh();
    markAllRead();
  }
};

const startPolling = () => {
  if (timer) globalThis.clearInterval(timer);
  timer = globalThis.setInterval(() => {
    refresh();
  }, 45000);
};

onMounted(() => {
  if (userStore.isConnected) {
    loadSeen();
    refresh();
    startPolling();
  }
});

watch(
  () => userStore.address,
  () => {
    items.value = [];
    if (userStore.isConnected && userStore.address) {
      loadSeen();
      refresh();
      startPolling();
    } else if (timer) {
      globalThis.clearInterval(timer);
      timer = undefined;
    }
  }
);

onBeforeUnmount(() => {
  if (timer) globalThis.clearInterval(timer);
});
</script>
