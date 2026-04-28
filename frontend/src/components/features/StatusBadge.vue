<template>
  <span class="text-xs font-semibold px-2 py-1 rounded-full border" :style="badgeStyle">
    {{ status }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BountyStatus } from '../../types';

const props = defineProps<{
  status: BountyStatus;
}>();

const badgeStyle = computed(() => {
  const base = {
    borderColor: `rgb(var(--border))`,
    backgroundColor: `rgba(var(--surface-2), 0.55)`,
    color: `rgb(var(--text))`,
  };
  if (props.status === 'OPEN') {
    return {
      ...base,
      borderColor: 'rgba(59, 130, 246, 0.35)',
      backgroundColor: 'rgba(59, 130, 246, 0.16)',
      color: 'rgb(var(--text))',
    };
  }
  if (props.status === 'WORK_SUBMITTED') {
    return {
      ...base,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      backgroundColor: 'rgba(245, 158, 11, 0.16)',
      color: 'rgb(var(--text))',
    };
  }
  if (props.status === 'COMPLETED') {
    return {
      ...base,
      borderColor: 'rgba(34, 197, 94, 0.35)',
      backgroundColor: 'rgba(34, 197, 94, 0.16)',
      color: 'rgb(var(--text))',
    };
  }
  if (props.status === 'CANCELLED') {
    return {
      ...base,
      borderColor: `rgb(var(--border))`,
      backgroundColor: `rgba(var(--surface-2), 0.35)`,
      color: `rgb(var(--muted))`,
    };
  }
  return base;
});
</script>
