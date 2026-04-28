<template>
  <div
    class="rounded-xl border p-5 shadow-sm space-y-4 ui-glow ui-shimmer-border"
    :style="panelStyle"
  >
    <div class="flex items-center justify-between">
      <h3 class="text-base font-semibold" :style="titleStyle">{{ t('comments.title') }}</h3>
      <button class="text-xs font-semibold" :style="linkStyle" :disabled="loading" @click="refresh">
        {{ t('common.refresh') }}
      </button>
    </div>

    <div v-if="loading" class="text-sm" :style="mutedStyle">{{ t('common.refreshing') }}</div>

    <div v-else-if="items.length === 0" class="text-sm" :style="mutedStyle">
      {{ t('comments.empty') }}
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="c in items"
        :key="c.id"
        class="rounded-lg border px-4 py-3 space-y-1"
        :style="itemStyle"
      >
        <div class="flex items-center justify-between gap-4">
          <p class="text-xs font-semibold break-all min-w-0" :style="titleStyle">
            <AddressBadge :address="c.author" />
          </p>
          <p class="text-xs" :style="mutedStyle">{{ formatTime(c.createdAt) }}</p>
        </div>
        <p class="text-sm whitespace-pre-wrap break-words" :style="textStyle">{{ c.content }}</p>
      </div>
    </div>

    <div class="border-t pt-4 space-y-2" :style="dividerStyle">
      <div v-if="!userStore.isConnected" class="text-sm" :style="mutedStyle">
        {{ t('comments.connectHint') }}
      </div>
      <div v-else-if="requireSignIn && !authStore.isAuthenticated" class="space-y-2">
        <p class="text-sm" :style="mutedStyle">{{ t('comments.signInHint') }}</p>
        <button
          class="px-4 py-2 rounded-lg border text-sm font-semibold"
          :style="secondaryBtnStyle"
          @click="signIn"
        >
          {{ t('nav.signIn') }}
        </button>
      </div>
      <div v-else class="flex flex-col sm:flex-row gap-3">
        <textarea
          v-model="draft"
          rows="2"
          class="flex-1 block w-full rounded-lg shadow-sm sm:text-sm py-3 px-4 border transition-colors"
          :style="inputStyle"
          :placeholder="t('comments.placeholder')"
        />
        <button
          class="px-5 py-3 rounded-lg text-white text-sm font-semibold transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:bg-gray-400"
          :style="primaryBtnStyle"
          :disabled="posting || !draft.trim()"
          @click="submit"
        >
          {{ posting ? t('common.refreshing') : t('comments.submit') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import { fetchComments, postComment, type CommentItem } from '../../services/comments';
import { useToast } from '../../composables/useToast';
import { useWeb3 } from '../../composables/useWeb3';
import AddressBadge from '../common/AddressBadge.vue';

const props = defineProps<{ bountyId: number }>();

const { t } = useI18n();
const userStore = useUserStore();
const authStore = useAuthStore();
const { showToast } = useToast();
const { getProvider } = useWeb3();

const requireSignIn = Boolean(import.meta.env.VITE_COMMENTS_API_URL);

const items = ref<CommentItem[]>([]);
const loading = ref(false);
const posting = ref(false);
const draft = ref('');

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

const dividerStyle = computed(() => ({
  borderColor: `rgb(var(--border))`,
}));

const itemStyle = computed(() => ({
  borderColor: `rgb(var(--border))`,
  backgroundColor: `rgba(var(--surface-2), 0.35)`,
}));

const inputStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.65)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));

const primaryBtnStyle = computed(() => ({
  background: `linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--primary-2)) 100%)`,
}));

const secondaryBtnStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.55)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));

const linkStyle = computed(() => ({
  color: `rgb(var(--primary))`,
}));

const formatTime = (ms: number) => {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return '';
  }
};

const refresh = async () => {
  if (!props.bountyId) return;
  loading.value = true;
  try {
    items.value = await fetchComments(props.bountyId, { token: authStore.session?.token });
  } finally {
    loading.value = false;
  }
};

const submit = async () => {
  if (!userStore.isConnected) return;
  if (requireSignIn && !authStore.isAuthenticated) return;
  if (!props.bountyId) return;

  posting.value = true;
  try {
    await postComment(
      props.bountyId,
      { author: userStore.address, content: draft.value },
      { token: authStore.session?.token }
    );
    draft.value = '';
    await refresh();
  } finally {
    posting.value = false;
  }
};

const signIn = async () => {
  try {
    if (!userStore.isConnected || !userStore.address || !userStore.chainId) return;
    const provider = getProvider();
    await authStore.signIn(provider, { address: userStore.address, chainId: userStore.chainId });
    showToast(t('nav.signedIn'), 'success');
    await refresh();
  } catch (e: unknown) {
    showToast(e instanceof Error ? e.message : 'Sign in failed', 'error');
  }
};

watch(
  () => props.bountyId,
  () => {
    items.value = [];
    refresh();
  }
);

onMounted(() => {
  refresh();
});
</script>
