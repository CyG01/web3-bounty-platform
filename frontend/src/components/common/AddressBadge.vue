<template>
  <span class="inline-flex items-center gap-2 min-w-0">
    <span class="h-5 w-5 rounded-full border shrink-0" :style="avatarStyle" />
    <span class="truncate" :title="address">{{ compact }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatCompactAddress } from '../../utils/display';

const props = defineProps<{
  address: string;
  chars?: number;
}>();

function hashHue(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 360;
  }
  return hash;
}

const compact = computed(() => formatCompactAddress(props.address, props.chars || 4));

const avatarStyle = computed(() => {
  const hue = hashHue((props.address || '').toLowerCase());
  const hue2 = (hue + 48) % 360;
  const hue3 = (hue + 120) % 360;
  return {
    background: `radial-gradient(circle at 30% 30%, hsl(${hue} 80% 72%), hsl(${hue2} 78% 58%) 55%, hsl(${hue3} 72% 42%) 100%)`,
    borderColor: `rgba(255,255,255,0.16)`,
  };
});
</script>
