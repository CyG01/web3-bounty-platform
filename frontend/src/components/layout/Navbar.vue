<template>
  <nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center cursor-pointer" @click="$router.push('/')">
            <span
              class="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              Web3Bounty
            </span>
          </div>
          <div class="hidden sm:ml-10 sm:flex sm:space-x-8">
            <router-link
              to="/bounties"
              class="text-gray-500 hover:text-indigo-600 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-indigo-500 text-sm font-medium transition-colors"
              active-class="!text-indigo-600 !border-indigo-600"
            >
              Explore Bounties
            </router-link>
            <router-link
              to="/create"
              class="text-gray-500 hover:text-indigo-600 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-indigo-500 text-sm font-medium transition-colors"
              active-class="!text-indigo-600 !border-indigo-600"
            >
              Post a Task
            </router-link>
            <router-link
              to="/profile"
              class="text-gray-500 hover:text-indigo-600 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-indigo-500 text-sm font-medium transition-colors"
              active-class="!text-indigo-600 !border-indigo-600"
            >
              My Profile
            </router-link>
          </div>
        </div>

        <div class="flex items-center">
          <div v-if="error" class="hidden md:block text-red-500 text-sm mr-4 font-medium animate-pulse">
            {{ error }}
          </div>

          <button
            v-if="!userStore.isConnected"
            class="inline-flex items-center px-5 py-2 border border-transparent text-sm font-semibold rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-105"
            @click="connectWallet"
          >
            <svg
              class="w-4 h-4 mr-2 -ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            Connect Wallet
          </button>

          <div v-else class="flex items-center space-x-3">
            <div class="flex flex-col items-end">
              <span
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200"
              >
                <div class="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                {{ shortenAddress(userStore.address) }}
              </span>
              <span v-if="userStore.chainId" class="text-xs text-gray-400 mt-1">
                Chain ID: {{ userStore.chainId }}
              </span>
            </div>

            <button
              title="Disconnect"
              class="p-2 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-full transition-colors"
              @click="userStore.disconnect()"
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

const userStore = useUserStore();
const { connectWallet, error } = useWeb3();
</script>
