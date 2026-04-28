<template>
  <div class="relative">
    <button
      class="relative p-2 rounded-full transition-colors border"
      :style="iconBtnStyle"
      :title="t('notifications.title')"
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
      class="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-xl shadow-xl z-50 ui-glow ui-shimmer-border"
      :style="panelStyle"
    >
      <div class="px-4 py-3 border-b flex items-center justify-between" :style="dividerStyle">
        <p class="text-sm font-semibold" :style="titleStyle">{{ t('notifications.title') }}</p>
        <button class="text-xs font-semibold" :style="linkStyle" @click="refresh">
          {{ t('common.refresh') }}
        </button>
      </div>

      <div v-if="loading" class="p-4 space-y-3">
        <div v-for="i in 3" :key="i" class="h-12 rounded animate-pulse" :style="skeletonStyle" />
      </div>
      <div v-else-if="items.length === 0" class="p-4 text-sm" :style="mutedStyle">
        {{ t('notifications.empty') }}
      </div>

      <div v-else>
        <component
          :is="n.to ? 'router-link' : 'div'"
          v-for="n in items"
          :key="n.id"
          :to="n.to"
          class="block px-4 py-3 border-b last:border-b-0 hover:-translate-y-0.5 transition-transform duration-200"
          :style="itemStyle"
        >
          <p class="text-sm" :style="textStyle">{{ n.message }}</p>
          <p class="text-xs mt-1" :style="mutedStyle">Bounty #{{ n.bountyId }}</p>
        </component>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { useBounty, type UserNotification } from '../../composables/useBounty';
import { useI18n } from 'vue-i18n';
import { fetchComments } from '../../services/comments';
import type { Bounty } from '../../types';

const userStore = useUserStore();
const { getUserNotifications, loadFirstPage, loadNextPage, hasMore, bounties } = useBounty();
const { t } = useI18n();

const open = ref(false);
const loading = ref(false);
type InboxNotification = UserNotification & { to?: string };

const items = ref<InboxNotification[]>([]);
const seenIds = ref<Set<string>>(new Set());
let timer: ReturnType<typeof globalThis.setInterval> | undefined;

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
  backgroundColor: `rgba(var(--surface), 0.92)`,
  borderColor: `rgb(var(--border))`,
  borderWidth: '1px',
}));

const dividerStyle = computed(() => ({
  borderColor: `rgb(var(--border))`,
}));

const itemStyle = computed(() => ({
  borderColor: `rgb(var(--border))`,
}));

const skeletonStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface-2), 0.55)`,
}));

const iconBtnStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.55)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--muted))`,
}));

const linkStyle = computed(() => ({
  color: `rgb(var(--primary))`,
}));

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
    const [chainNotes, extraNotes] = await Promise.all([
      getUserNotifications(userStore.address),
      loadDerivedNotifications(),
    ]);
    items.value = [...chainNotes, ...extraNotes].sort((a, b) => b.blockNumber - a.blockNumber);
  } finally {
    loading.value = false;
  }
};

const loadPublishedBounties = async () => {
  await loadFirstPage();
  let guard = 0;
  while (hasMore.value && guard < 10) {
    guard += 1;
    await loadNextPage();
  }
  const me = userStore.address.toLowerCase();
  return bounties.value.filter((b) => b.publisher.toLowerCase() === me);
};

const buildExpiryNotifications = (published: Bounty[]) => {
  const nowSec = Math.floor(Date.now() / 1000);
  const horizonSec = nowSec + 24 * 60 * 60;
  return published
    .filter(
      (b) =>
        (b.status === 'OPEN' || b.status === 'WORK_SUBMITTED') &&
        b.deadline > nowSec &&
        b.deadline <= horizonSec
    )
    .map(
      (b) =>
        ({
          id: `expiring_${b.id}_${b.deadline}`,
          bountyId: b.id,
          blockNumber: b.deadline,
          txHash: '',
          kind: 'submission_for_my_bounty',
          message: t('notifications.bountyExpiring', { id: b.id }),
          to: `/bounties/${b.id}`,
        }) satisfies InboxNotification
    );
};

const buildCommentNotifications = async (published: Bounty[]) => {
  const out: InboxNotification[] = [];
  for (const bounty of published.slice(0, 20)) {
    try {
      const comments = await fetchComments(bounty.id);
      const latestOther = comments.find(
        (comment) => comment.author.toLowerCase() !== userStore.address.toLowerCase()
      );
      if (!latestOther) continue;
      out.push({
        id: `comment_${bounty.id}_${latestOther.id}`,
        bountyId: bounty.id,
        blockNumber: Math.floor(latestOther.createdAt / 1000),
        txHash: '',
        kind: 'submission_for_my_bounty',
        message: t('notifications.newComment', { id: bounty.id }),
        to: `/bounties/${bounty.id}`,
      });
    } catch {
      // ignore comment fetch failures
    }
  }
  return out;
};

const loadDerivedNotifications = async () => {
  const published = await loadPublishedBounties();
  const [commentNotes] = await Promise.all([buildCommentNotifications(published)]);
  return [...buildExpiryNotifications(published), ...commentNotes];
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
  }, 60000);
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
