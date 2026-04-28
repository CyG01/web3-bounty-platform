<template>
  <nav
    class="sticky top-0 z-50 border-b backdrop-blur supports-[backdrop-filter]:bg-opacity-60"
    :style="navStyle"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center cursor-pointer" @click="$router.push('/')">
            <span
              class="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-fuchsia-400"
            >
              Web3Bounty
            </span>
          </div>
          <div class="hidden sm:ml-10 sm:flex sm:space-x-8">
            <router-link
              to="/bounties"
              class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-semibold transition-colors"
              :style="linkStyle"
              active-class="!border-indigo-400"
            >
              {{ t('nav.explore') }}
            </router-link>
            <router-link
              to="/create"
              class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-semibold transition-colors"
              :style="linkStyle"
              active-class="!border-indigo-400"
            >
              {{ t('nav.post') }}
            </router-link>
            <router-link
              to="/profile"
              class="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-semibold transition-colors"
              :style="linkStyle"
              active-class="!border-indigo-400"
            >
              {{ t('nav.profile') }}
            </router-link>
          </div>
        </div>

        <div class="flex items-center">
          <div
            v-if="error"
            class="hidden md:block text-sm mr-4 font-semibold animate-pulse"
            :style="errorStyle"
          >
            {{ error }}
          </div>

          <div class="hidden md:flex items-center gap-2 mr-3">
            <select
              v-model="uiStore.locale"
              class="px-3 py-2 rounded-full text-sm font-semibold border"
              :style="controlStyle"
              :aria-label="t('nav.language')"
            >
              <option value="zh-CN">中文</option>
              <option value="en">English</option>
            </select>

            <select
              v-model="uiStore.theme"
              class="px-3 py-2 rounded-full text-sm font-semibold border"
              :style="controlStyle"
              :aria-label="t('nav.theme')"
            >
              <option value="light">{{ t('nav.themeLight') }}</option>
              <option value="dark">{{ t('nav.themeDark') }}</option>
              <option value="neon">{{ t('nav.themeNeon') }}</option>
            </select>
          </div>

          <div v-if="!userStore.isConnected" class="flex items-center gap-2">
            <button
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-full shadow-sm text-white"
              :style="primaryBtnStyle"
              @click="connectWallet('injected')"
            >
              {{ t('nav.browserWallet') }}
            </button>
            <button
              class="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-full shadow-sm border"
              :style="secondaryBtnStyle"
              @click="connectWallet('walletconnect')"
            >
              {{ t('nav.walletConnect') }}
            </button>
          </div>

          <div v-else class="flex items-center space-x-3">
            <NotificationBell />
            <div class="flex flex-col items-end">
              <span
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border"
                :style="connectedPillStyle"
              >
                <div class="w-2 h-2 rounded-full mr-2 animate-pulse" :style="dotStyle" />
                {{ shortenAddress(userStore.address) }}
              </span>
              <span v-if="userStore.chainId" class="text-xs mt-1" :style="mutedStyle">
                {{ t('nav.chainId') }}: {{ userStore.chainId }}
              </span>
            </div>

            <button
              title="Disconnect"
              class="p-2 rounded-full transition-colors border"
              :style="iconBtnStyle"
              @click="disconnectWallet()"
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useUserStore } from '../../stores/userStore';
import { useWeb3 } from '../../composables/useWeb3';
import { shortenAddress } from '../../utils/format';
import NotificationBell from '../features/NotificationBell.vue';
import { computed } from 'vue';
import { useUiStore } from '../../stores/uiStore';
import { useI18n } from 'vue-i18n';

const userStore = useUserStore();
const { connectWallet, disconnectWallet, error } = useWeb3();

const uiStore = useUiStore();
const { t } = useI18n();

const navStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.72)`,
  borderColor: `rgb(var(--border))`,
}));

const linkStyle = computed(() => ({
  color: `rgb(var(--muted))`,
}));

const mutedStyle = computed(() => ({
  color: `rgb(var(--muted))`,
}));

const errorStyle = computed(() => ({
  color: `rgb(var(--danger))`,
}));

const controlStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.75)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));

const primaryBtnStyle = computed(() => ({
  background: `linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--primary-2)) 100%)`,
}));

const secondaryBtnStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.75)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));

const connectedPillStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.65)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));

const dotStyle = computed(() => ({
  backgroundColor: `rgb(var(--success))`,
}));

const iconBtnStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.55)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--muted))`,
}));
</script>
