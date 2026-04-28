<template>
  <span class="text-xs font-semibold px-2 py-1 rounded-full" :class="badgeClass">
    {{ status }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BountyStatus } from '../../types';

const props = defineProps<{
  status: BountyStatus;
}>();

const badgeClass = computed(() => {
  if (props.status === 'OPEN') return 'bg-blue-100 text-blue-700';
  if (props.status === 'WORK_SUBMITTED') return 'bg-amber-100 text-amber-700';
  if (props.status === 'COMPLETED') return 'bg-green-100 text-green-700';
  if (props.status === 'CANCELLED') return 'bg-gray-200 text-gray-700';
  return 'bg-gray-200 text-gray-700';
});
</script>
