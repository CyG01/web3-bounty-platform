<template>
  <Teleport to="body">
    <!-- 1. 最外层控制固定全屏、允许滚动，并利用 Tailwind 隐藏原生滚动条 -->
    <div
      v-if="open"
      class="fixed inset-0 z-[9999] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      <!-- 2. 背景遮罩，使用 fixed 确保在滚动时依然铺满屏幕 -->
      <div class="fixed inset-0 bg-black/85 transition-opacity" @click="close" />

      <!-- 3. 居中排版容器。min-h-full 是核心：高屏时撑满居中，矮屏时被内容自然撑高防止裁切顶部 -->
      <div class="flex min-h-full items-center justify-center p-4" @click.self="close">
        <!-- 弹窗本体 -->
        <div
          class="relative w-full max-w-md rounded-2xl border p-6 ui-glow ui-shimmer-border"
          :style="panelStyle"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold" :style="titleStyle">
                {{ t('walletModal.title') }}
              </h3>
              <p class="text-sm mt-1" :style="mutedStyle">{{ t('walletModal.subtitle') }}</p>
            </div>
            <button
              class="p-2 rounded-full border transition-colors hover:bg-white/5"
              :style="iconBtnStyle"
              @click="close"
            >
              ✕
            </button>
          </div>

          <div v-if="error" class="mt-4 rounded-lg border px-4 py-3 text-sm" :style="errorBoxStyle">
            {{ error }}
          </div>

          <div class="mt-5 grid grid-cols-1 gap-3">
            <!-- MetaMask -->
            <button
              class="w-full px-5 py-4 rounded-xl border text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
              :style="cardStyle"
              @click="connect('metamask')"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold" :style="titleStyle">
                    {{ t('walletModal.metamaskOnly') }}
                  </p>
                  <p class="text-xs mt-1" :style="mutedStyle">
                    {{ t('walletModal.metamaskOnlyHint') }}
                  </p>
                </div>
                <span class="text-[11px] font-semibold px-2 py-1 rounded-full" :style="badgeStyle">
                  {{ metamaskDetected ? t('walletModal.detected') : t('walletModal.notInstalled') }}
                </span>
              </div>
            </button>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- OKX -->
              <button
                class="px-4 py-4 rounded-xl border text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
                :style="cardStyle"
                @click="connect('okx')"
              >
                <p class="text-sm font-semibold" :style="titleStyle">{{ t('walletModal.okx') }}</p>
                <p class="text-xs mt-1" :style="mutedStyle">{{ t('walletModal.okxHint') }}</p>
                <p
                  class="text-[11px] mt-3 font-semibold"
                  :style="okxDetected ? okStyle : linkStyle"
                >
                  {{ okxDetected ? t('walletModal.detected') : t('walletModal.install') }}
                </p>
              </button>

              <!-- Coinbase -->
              <button
                class="px-4 py-4 rounded-xl border text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
                :style="cardStyle"
                @click="connect('coinbase')"
              >
                <p class="text-sm font-semibold" :style="titleStyle">
                  {{ t('walletModal.coinbase') }}
                </p>
                <p class="text-xs mt-1" :style="mutedStyle">{{ t('walletModal.coinbaseHint') }}</p>
                <p
                  class="text-[11px] mt-3 font-semibold"
                  :style="coinbaseDetected ? okStyle : linkStyle"
                >
                  {{ coinbaseDetected ? t('walletModal.detected') : t('walletModal.install') }}
                </p>
              </button>
            </div>

            <!-- WalletConnect -->
            <button
              class="w-full px-5 py-4 rounded-xl border text-left transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]"
              :style="cardStyle"
              :disabled="!walletConnectReady"
              @click="connect('walletconnect')"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold" :style="titleStyle">
                    {{ t('walletModal.walletConnect') }}
                  </p>
                  <p class="text-xs mt-1" :style="mutedStyle">
                    {{
                      walletConnectReady
                        ? t('walletModal.walletConnectHint')
                        : t('walletModal.walletConnectMissingConfig')
                    }}
                  </p>
                </div>
                <span
                  class="text-[11px] font-semibold px-2 py-1 rounded-full"
                  :style="walletConnectReady ? okStyle : warnStyle"
                >
                  {{ walletConnectReady ? t('walletModal.ready') : t('walletModal.notReady') }}
                </span>
              </div>
            </button>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-3">
            <button
              class="px-4 py-2 rounded-lg border text-sm font-semibold transition-colors hover:bg-white/5"
              :style="secondaryBtnStyle"
              @click="continueAsGuest"
            >
              {{ t('walletModal.guestLogin') }}
            </button>
            <button
              class="px-4 py-2 rounded-lg border text-sm font-semibold transition-colors hover:bg-white/5"
              :style="secondaryBtnStyle"
              @click="close"
            >
              {{ t('walletModal.close') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWeb3 } from '../../composables/useWeb3';
import { useUserStore } from '../../stores/userStore';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>();

const { t } = useI18n();
const { connectWallet, error, hasWalletConnectConfig } = useWeb3();
const userStore = useUserStore();
const providers = computed(() => {
  const eth = window.ethereum as unknown as { providers?: Array<Record<string, unknown>> } & Record<
    string,
    unknown
  >;
  if (!eth) return [] as Array<Record<string, unknown>>;
  return Array.isArray(eth.providers) ? eth.providers : [eth];
});
const metamaskDetected = computed(() => providers.value.some((p) => Boolean(p.isMetaMask)));
const okxDetected = computed(() => providers.value.some((p) => Boolean(p.isOkxWallet)));
const coinbaseDetected = computed(() => providers.value.some((p) => Boolean(p.isCoinbaseWallet)));
const walletConnectReady = computed(() => hasWalletConnectConfig);

const close = () => emit('update:open', false);

const METAMASK_URL = 'https://metamask.io/download/';
const OKX_URL = 'https://www.okx.com/web3';
const COINBASE_URL = 'https://www.coinbase.com/wallet';

const connect = async (mode: 'injected' | 'walletconnect' | 'metamask' | 'okx' | 'coinbase') => {
  if (mode === 'walletconnect' && !walletConnectReady.value) return;

  if (mode === 'metamask' && !metamaskDetected.value) {
    window.open(METAMASK_URL, '_blank', 'noopener,noreferrer');
    return;
  }
  if (mode === 'okx' && !okxDetected.value) {
    window.open(OKX_URL, '_blank', 'noopener,noreferrer');
    return;
  }
  if (mode === 'coinbase' && !coinbaseDetected.value) {
    window.open(COINBASE_URL, '_blank', 'noopener,noreferrer');
    return;
  }

  await connectWallet(mode);
  if (!error.value) close();
};

const continueAsGuest = () => {
  userStore.continueAsGuest();
  close();
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
  backgroundColor: `rgba(7, 7, 10, 0.96)`,
  borderColor: `rgba(99, 102, 241, 0.25)`,
}));

const cardStyle = computed(() => ({
  backgroundColor: `rgba(20, 20, 24, 0.92)`,
  borderColor: `rgba(148, 163, 184, 0.35)`,
}));

const secondaryBtnStyle = computed(() => ({
  backgroundColor: `rgba(20, 20, 24, 0.92)`,
  borderColor: `rgba(148, 163, 184, 0.35)`,
  color: `rgb(226 232 240)`,
}));

const iconBtnStyle = computed(() => ({
  backgroundColor: `rgba(20, 20, 24, 0.92)`,
  borderColor: `rgba(148, 163, 184, 0.35)`,
  color: `rgb(148 163 184)`,
}));

const errorBoxStyle = computed(() => ({
  backgroundColor: `rgba(239, 68, 68, 0.08)`,
  borderColor: `rgba(239, 68, 68, 0.35)`,
  color: `rgb(var(--danger))`,
}));

const badgeStyle = computed(() => ({
  backgroundColor: metamaskDetected.value ? `rgba(34, 197, 94, 0.16)` : `rgba(148, 163, 184, 0.16)`,
  color: metamaskDetected.value ? `rgb(74 222 128)` : `rgb(148 163 184)`,
}));

const linkStyle = computed(() => ({
  color: `rgb(129 140 248)`,
}));

const okStyle = computed(() => ({
  color: `rgb(74 222 128)`,
}));

const warnStyle = computed(() => ({
  color: `rgb(251 191 36)`,
}));
</script>
