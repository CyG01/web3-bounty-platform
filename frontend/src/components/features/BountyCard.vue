<template>
  <article class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <h2 class="text-lg font-semibold text-gray-900 truncate">
          #{{ props.bounty.id }} - {{ props.bounty.title }}
        </h2>
        <p class="text-xs text-gray-500 break-all">Publisher: {{ props.bounty.publisher }}</p>
      </div>
      <StatusBadge :status="props.bounty.status" />
    </div>

    <p class="text-sm text-gray-700 break-all">
      <span class="font-medium">Description:</span>
      {{ props.bounty.descriptionURI }}
    </p>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
      <div class="rounded-lg bg-gray-50 px-3 py-2">
        <p class="text-gray-500">Reward</p>
        <p class="font-semibold text-gray-900 break-all">{{ props.rewardText }}</p>
      </div>
      <div class="rounded-lg bg-gray-50 px-3 py-2">
        <p class="text-gray-500">Deadline</p>
        <p class="font-semibold text-gray-900">{{ formatDate(props.bounty.deadline) }}</p>
      </div>
      <div class="rounded-lg bg-gray-50 px-3 py-2">
        <p class="text-gray-500">Winner</p>
        <p class="font-semibold text-gray-900 break-all">
          {{ props.bounty.successfulHunter === zeroAddress ? '-' : props.bounty.successfulHunter }}
        </p>
      </div>
    </div>

    <div class="pt-2 flex items-center justify-between gap-3">
      <slot name="left" />
      <slot name="actions">
        <router-link
          :to="`/bounties/${props.bounty.id}`"
          class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
        >
          View & Action
        </router-link>
      </slot>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Bounty } from '../../types';
import StatusBadge from './StatusBadge.vue';
import { ZERO_ADDRESS } from '../../utils/token';

const props = defineProps<{
  bounty: Bounty;
  rewardText: string;
}>();

const zeroAddress = ZERO_ADDRESS;
const formatDate = (unix: number) => new Date(unix * 1000).toLocaleString();
</script>
