<template>
  <article class="rounded-xl border p-5 shadow-sm space-y-3" :style="cardStyle">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h2 class="text-lg font-semibold truncate" :style="titleStyle">
          #{{ props.bounty.id }} - {{ props.bounty.title }}
        </h2>
        <p class="text-xs flex items-center gap-2 min-w-0" :style="mutedStyle">
          <span>{{ t('common.publisher') }}:</span>
          <AddressBadge :address="props.bounty.publisher" />
        </p>
      </div>
      <StatusBadge :status="props.bounty.status" />
    </div>

    <p class="text-sm break-all" :style="textStyle">
      <span class="font-medium">{{ t('common.description') }}:</span>
      {{ props.bounty.descriptionURI }}
    </p>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
      <div class="rounded-lg px-3 py-2" :style="metricStyle">
        <p :style="mutedStyle">{{ t('common.reward') }}</p>
        <p class="font-semibold break-all" :style="titleStyle">{{ props.rewardText }}</p>
      </div>
      <div class="rounded-lg px-3 py-2" :style="metricStyle">
        <p :style="mutedStyle">{{ t('common.deadline') }}</p>
        <p class="font-semibold" :style="titleStyle">{{ formatDate(props.bounty.deadline) }}</p>
      </div>
      <div class="rounded-lg px-3 py-2" :style="metricStyle">
        <p :style="mutedStyle">{{ t('common.winner') }}</p>
        <p class="font-semibold min-w-0" :style="titleStyle">
          <span v-if="props.bounty.successfulHunter === zeroAddress">-</span>
          <AddressBadge v-else :address="props.bounty.successfulHunter" />
        </p>
      </div>
    </div>

    <div class="pt-2 flex items-center justify-between gap-3">
      <slot name="left" />
      <slot name="actions">
        <router-link
          :to="`/bounties/${props.bounty.id}`"
          class="px-4 py-2 rounded-lg text-white text-sm font-semibold"
          :style="primaryBtnStyle"
        >
          {{ t('common.viewAction') }}
        </router-link>
      </slot>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Bounty } from '../../types';
import StatusBadge from './StatusBadge.vue';
import { ZERO_ADDRESS } from '../../utils/token';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AddressBadge from '../common/AddressBadge.vue';

const props = defineProps<{
  bounty: Bounty;
  rewardText: string;
}>();

const zeroAddress = ZERO_ADDRESS;
const formatDate = (unix: number) => new Date(unix * 1000).toLocaleString();

const { t } = useI18n();

const cardStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.75)`,
  borderColor: `rgb(var(--border))`,
}));

const metricStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface-2), 0.55)`,
}));

const titleStyle = computed(() => ({
  color: `rgb(var(--text))`,
}));

const textStyle = computed(() => ({
  color: `rgb(var(--text))`,
}));

const mutedStyle = computed(() => ({
  color: `rgb(var(--muted))`,
}));

const primaryBtnStyle = computed(() => ({
  background: `linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--primary-2)) 100%)`,
}));
</script>
