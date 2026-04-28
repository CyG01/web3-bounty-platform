<template>
  <div class="rounded-xl border border-dashed p-8 text-center ui-glow" :style="panelStyle">
    <div
      class="relative mx-auto w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden"
      :style="iconWrapStyle"
    >
      <svg class="w-20 h-20" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <defs>
          <linearGradient
            id="emptyStateGradient"
            x1="18"
            y1="16"
            x2="98"
            y2="104"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="rgb(var(--primary))" stop-opacity="0.95" />
            <stop offset="1" stop-color="rgb(var(--primary-2))" stop-opacity="0.72" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="34" fill="url(#emptyStateGradient)" opacity="0.16" />
        <path
          v-if="variant === 'search'"
          d="M53 36a18 18 0 1 0 0 36a18 18 0 0 0 0-36Zm0 6a12 12 0 1 1 0 24a12 12 0 0 1 0-24Zm19.5 25.2l14.3 14.3"
          stroke="url(#emptyStateGradient)"
          stroke-width="8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          v-else
          d="M39 64c0-13.255 10.745-24 24-24c7.032 0 13.355 3.024 17.746 7.845M45 77h33M45 56h20m-26 21c3.546 6.88 10.714 11.6 18.986 11.6c11.87 0 21.62-9.718 21.62-21.6"
          stroke="url(#emptyStateGradient)"
          stroke-width="8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span class="absolute text-xl font-black" :style="titleStyle">{{ iconText }}</span>
    </div>
    <h3 class="mt-4 text-base font-semibold" :style="titleStyle">{{ title }}</h3>
    <p v-if="subtitle" class="mt-1 text-sm" :style="mutedStyle">{{ subtitle }}</p>
    <div v-if="$slots.action" class="mt-5 flex justify-center">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  title: string;
  subtitle?: string;
  iconText?: string;
  variant?: 'sparkles' | 'search';
}>();

const iconText = computed(() => props.iconText || '∅');

const titleStyle = computed(() => ({
  color: `rgb(var(--text))`,
}));

const mutedStyle = computed(() => ({
  color: `rgb(var(--muted))`,
}));

const panelStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.75)`,
  borderColor: `rgb(var(--border))`,
}));

const iconWrapStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface-2), 0.55)`,
  border: `1px solid rgb(var(--border))`,
}));
</script>
