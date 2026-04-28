<template>
  <footer class="mt-16 border-t" :style="footerStyle">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="space-y-1">
          <div
            class="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-fuchsia-400"
          >
            Web3Bounty
          </div>
          <p class="text-sm" :style="mutedStyle">{{ t('footer.tagline') }}</p>
          <p class="text-xs" :style="mutedStyle">{{ t('footer.builtWith') }}</p>
        </div>

        <div class="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            class="px-4 py-2 rounded-full text-sm font-semibold border"
            :style="linkBtnStyle"
          >
            GitHub
          </a>
          <a
            href="https://walletconnect.com"
            target="_blank"
            rel="noreferrer"
            class="px-4 py-2 rounded-full text-sm font-semibold border"
            :style="linkBtnStyle"
          >
            WalletConnect
          </a>
        </div>
      </div>

      <div class="pt-8 text-xs" :style="mutedStyle">
        © {{ new Date().getFullYear() }} Web3Bounty
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const footerStyle = computed(() => ({
  borderColor: `rgb(var(--border))`,
  backgroundColor: `rgba(var(--surface), 0.6)`,
}));

const mutedStyle = computed(() => ({
  color: `rgb(var(--muted))`,
}));

const linkBtnStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.55)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));
</script>
