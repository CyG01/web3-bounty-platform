<template>
  <aside class="hidden lg:block w-72 shrink-0">
    <div class="sticky top-20 rounded-2xl border p-4 ui-glow ui-shimmer-border" :style="panelStyle">
      <div class="text-sm font-semibold" :style="titleStyle">{{ t('sidebar.quickActions') }}</div>
      <div class="mt-3 grid grid-cols-1 gap-2">
        <router-link
          to="/create"
          class="px-4 py-2 rounded-xl text-white text-sm font-semibold"
          :style="primaryBtnStyle"
        >
          {{ t('sidebar.create') }}
        </router-link>
        <router-link
          to="/bounties"
          class="px-4 py-2 rounded-xl text-sm font-semibold border"
          :style="secondaryBtnStyle"
        >
          {{ t('sidebar.explore') }}
        </router-link>
      </div>

      <div class="mt-5 text-xs" :style="mutedStyle">
        {{ t('sidebar.tip') }}
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const panelStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.7)`,
  borderColor: `rgb(var(--border))`,
}));

const titleStyle = computed(() => ({
  color: `rgb(var(--text))`,
}));

const mutedStyle = computed(() => ({
  color: `rgb(var(--muted))`,
}));

const primaryBtnStyle = computed(() => ({
  background: `linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--primary-2)) 100%)`,
}));

const secondaryBtnStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.55)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));
</script>
