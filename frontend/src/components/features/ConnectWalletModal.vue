<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <div class="absolute inset-0 bg-black/60" @click="close" />

    <div
      class="relative w-full max-w-md rounded-2xl border p-6 ui-glow ui-shimmer-border"
      :style="panelStyle"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold" :style="titleStyle">{{ t('walletModal.title') }}</h3>
          <p class="text-sm mt-1" :style="mutedStyle">{{ t('walletModal.subtitle') }}</p>
        </div>
        <button class="p-2 rounded-full border" :style="iconBtnStyle" @click="close">✕</button>
      </div>

      <div v-if="error" class="mt-4 rounded-lg border px-4 py-3 text-sm" :style="errorBoxStyle">
        {{ error }}
      </div>

      <div class="mt-5 grid grid-cols-1 gap-3">
        <button
          class="w-full px-5 py-4 rounded-xl border text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
          :style="cardStyle"
          @click="connect('injected')"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold" :style="titleStyle">
                {{ t('walletModal.metamask') }}
              </p>
              <p class="text-xs mt-1" :style="mutedStyle">{{ t('walletModal.metamaskHint') }}</p>
            </div>
            <span class="text-[11px] font-semibold px-2 py-1 rounded-full" :style="badgeStyle">
              {{ injectedDetected ? t('walletModal.detected') : t('walletModal.notInstalled') }}
            </span>
          </div>
        </button>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            class="px-4 py-4 rounded-xl border text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
            :style="cardStyle"
            href="https://www.okx.com/web3"
            target="_blank"
            rel="noreferrer"
          >
            <p class="text-sm font-semibold" :style="titleStyle">{{ t('walletModal.okx') }}</p>
            <p class="text-xs mt-1" :style="mutedStyle">{{ t('walletModal.okxHint') }}</p>
            <p class="text-xs mt-3 font-semibold" :style="linkStyle">
              {{ t('walletModal.install') }}
            </p>
          </a>

          <a
            class="px-4 py-4 rounded-xl border text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
            :style="cardStyle"
            href="https://www.coinbase.com/wallet"
            target="_blank"
            rel="noreferrer"
          >
            <p class="text-sm font-semibold" :style="titleStyle">{{ t('walletModal.coinbase') }}</p>
            <p class="text-xs mt-1" :style="mutedStyle">{{ t('walletModal.coinbaseHint') }}</p>
            <p class="text-xs mt-3 font-semibold" :style="linkStyle">
              {{ t('walletModal.install') }}
            </p>
          </a>
        </div>

        <button
          class="w-full px-5 py-4 rounded-xl border text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
          :style="cardStyle"
          @click="connect('walletconnect')"
        >
          <p class="text-sm font-semibold" :style="titleStyle">
            {{ t('walletModal.walletConnect') }}
          </p>
          <p class="text-xs mt-1" :style="mutedStyle">{{ t('walletModal.walletConnectHint') }}</p>
        </button>
      </div>

      <div class="mt-5 flex justify-end">
        <button
          class="px-4 py-2 rounded-lg border text-sm font-semibold"
          :style="secondaryBtnStyle"
          @click="close"
        >
          {{ t('walletModal.close') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWeb3 } from '../../composables/useWeb3';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>();

const { t } = useI18n();
const { connectWallet, error } = useWeb3();
const injectedDetected = computed(() => Boolean(window.ethereum));

const close = () => emit('update:open', false);

const connect = async (mode: 'injected' | 'walletconnect') => {
  await connectWallet(mode);
  if (!error.value) close();
};

watch(
  () => props.open,
  (v) => {
    if (!v) return;
  }
);

const titleStyle = computed(() => ({ color: `rgb(var(--text))` }));
const mutedStyle = computed(() => ({ color: `rgb(var(--muted))` }));

const panelStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.92)`,
  borderColor: `rgb(var(--border))`,
}));

const cardStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.55)`,
  borderColor: `rgb(var(--border))`,
}));

const secondaryBtnStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.55)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));

const iconBtnStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.55)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--muted))`,
}));

const errorBoxStyle = computed(() => ({
  backgroundColor: `rgba(239, 68, 68, 0.08)`,
  borderColor: `rgba(239, 68, 68, 0.35)`,
  color: `rgb(var(--danger))`,
}));

const badgeStyle = computed(() => ({
  backgroundColor: injectedDetected.value ? `rgba(34, 197, 94, 0.16)` : `rgba(148, 163, 184, 0.16)`,
  color: injectedDetected.value ? `rgb(var(--success))` : `rgb(var(--muted))`,
}));

const linkStyle = computed(() => ({
  color: `rgb(var(--primary))`,
}));
</script>
