<template>
  <transition name="toast-fade">
    <div
      v-if="isVisible"
      :class="[
        'fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl text-white font-medium z-50 flex items-center space-x-3 transition-all transform',
        type === 'success'
          ? 'bg-gradient-to-r from-green-500 to-green-600'
          : type === 'error'
            ? 'bg-gradient-to-r from-red-500 to-red-600'
            : 'bg-gradient-to-r from-indigo-500 to-indigo-600',
      ]"
    >
      <svg
        v-if="type === 'success'"
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <svg
        v-if="type === 'error'"
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <svg
        v-if="type === 'info'"
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <div class="flex flex-col">
        <span>{{ message }}</span>
        <a
          v-if="linkUrl"
          class="text-xs font-semibold underline opacity-90 hover:opacity-100"
          :href="linkUrl"
          target="_blank"
          rel="noreferrer"
        >
          {{ linkText || linkUrl }}
        </a>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useToast } from '../../composables/useToast';

const { isVisible, message, type, linkUrl, linkText } = useToast();
</script>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(1rem) scale(0.95);
}
</style>
