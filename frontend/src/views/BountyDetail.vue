<template>
  <section class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Bounty #{{ bountyId }}</h1>
        <p v-if="bounty" class="text-sm text-gray-500 break-all">
          Publisher: {{ bounty.publisher }}
        </p>
      </div>
      <router-link
        to="/bounties"
        class="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        Back
      </router-link>
    </div>

    <div
      v-if="error"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ error }}
    </div>

    <div v-if="loading" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      Loading...
    </div>

    <div
      v-else-if="bounty"
      class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{{ bounty.title }}</h2>
          <p class="text-sm text-gray-600 break-all">{{ bounty.descriptionURI }}</p>
        </div>
        <span
          class="text-xs font-semibold px-2 py-1 rounded-full"
          :class="statusClass(bounty.status)"
        >
          {{ bounty.status }}
        </span>
      </div>

      <div class="border-t border-gray-200 pt-4 space-y-3">
        <h3 class="text-base font-semibold text-gray-900">Description</h3>

        <div v-if="descLoading" class="text-sm text-gray-500">Loading description from URI...</div>
        <div
          v-else-if="descError"
          class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3"
        >
          {{ descError }}
        </div>
        <div
          v-else-if="descHtml"
          class="prose prose-sm max-w-none text-gray-800"
          v-html="descHtml"
        />
        <div v-else class="text-sm text-gray-500">
          No parsed description available. Open the URI above to view details.
        </div>

        <div v-if="desc?.images?.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <a
            v-for="img in desc.images"
            :key="img"
            :href="ipfsToHttp(img)"
            target="_blank"
            rel="noreferrer"
            class="rounded-lg border border-gray-200 overflow-hidden bg-white hover:border-gray-300"
          >
            <img :src="ipfsToHttp(img)" alt="bounty image" class="w-full h-56 object-cover" />
          </a>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div class="rounded-lg bg-gray-50 px-3 py-2">
          <p class="text-gray-500">Reward</p>
          <p class="font-semibold text-gray-900 break-all">{{ rewardLabel }}</p>
        </div>
        <div class="rounded-lg bg-gray-50 px-3 py-2">
          <p class="text-gray-500">Deadline</p>
          <p class="font-semibold text-gray-900">{{ formatDate(bounty.deadline) }}</p>
        </div>
        <div class="rounded-lg bg-gray-50 px-3 py-2">
          <p class="text-gray-500">Winner</p>
          <p class="font-semibold text-gray-900 break-all">
            {{ bounty.successfulHunter === zeroAddress ? '-' : bounty.successfulHunter }}
          </p>
        </div>
      </div>

      <div class="border-t border-gray-200 pt-4 space-y-4">
        <h3 class="text-base font-semibold text-gray-900">Submissions</h3>

        <div v-if="hunters.length === 0" class="text-sm text-gray-500">No submissions yet.</div>

        <div v-else class="space-y-3">
          <div
            v-for="item in submissions"
            :key="item.hunter"
            class="rounded-lg border border-gray-200 bg-white px-4 py-3 flex flex-col gap-2"
          >
            <div class="flex items-center justify-between gap-4">
              <p class="text-xs text-gray-500 break-all">Hunter: {{ item.hunter }}</p>
              <p class="text-xs text-gray-400">
                {{ item.timestamp ? formatDate(item.timestamp) : '-' }}
              </p>
            </div>
            <p class="text-sm text-gray-700 break-all">{{ item.proofURI || '-' }}</p>

            <button
              v-if="canApprove()"
              class="self-end px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400"
              :disabled="actionLoading"
              @click="approve(item.hunter)"
            >
              {{ actionLoading ? 'Approving...' : 'Approve & Pay' }}
            </button>
          </div>
        </div>
      </div>

      <div class="border-t border-gray-200 pt-4 space-y-3">
        <h3 class="text-base font-semibold text-gray-900">Submit your work</h3>

        <div v-if="!userStore.isConnected" class="text-sm text-gray-500">
          Connect wallet to submit.
        </div>

        <div v-else class="flex flex-col sm:flex-row gap-3">
          <input
            v-model="proofURI"
            type="text"
            class="flex-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-3 px-4 border"
            placeholder="ipfs://... or https://..."
          />
          <button
            class="px-5 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
            :disabled="actionLoading || !proofURI"
            @click="submit"
          >
            {{ actionLoading ? 'Submitting...' : 'Submit Work' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { JsonRpcProvider } from 'ethers';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useBounty } from '../composables/useBounty';
import { useWeb3 } from '../composables/useWeb3';
import { useToast } from '../composables/useToast';
import { useUserStore } from '../stores/userStore';
import type { BountyStatus } from '../types';
import { formatTokenAmount, getTokenMeta, ZERO_ADDRESS } from '../utils/token';
import { ipfsToHttp, loadBountyDescription, type BountyDescription } from '../services/ipfs';

const route = useRoute();
const bountyId = Number(route.params.id);

const { getBountyById, getBountyHunters, getSubmission } = useBounty();
const { getBountyContract } = useWeb3();
const { showToast } = useToast();
const userStore = useUserStore();

const zeroAddress = ZERO_ADDRESS;

const loading = ref(false);
const actionLoading = ref(false);
const error = ref('');

const bounty = ref<Awaited<ReturnType<typeof getBountyById>> | null>(null);
const hunters = ref<string[]>([]);
const submissions = ref<{ hunter: string; proofURI: string; timestamp: number }[]>([]);

const tokenRewardLabel = ref<string>('');

const proofURI = ref('');

const desc = ref<BountyDescription | null>(null);
const descLoading = ref(false);
const descError = ref('');
const descHtml = computed(() => {
  if (!desc.value?.markdown) return '';
  const rawHtml = marked.parse(desc.value.markdown, { breaks: true, gfm: true });
  return DOMPurify.sanitize(rawHtml as string, {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
});

const formatDate = (unix: number) => new Date(unix * 1000).toLocaleString();

const statusClass = (status: BountyStatus) => {
  if (status === 'OPEN') return 'bg-blue-100 text-blue-700';
  if (status === 'WORK_SUBMITTED') return 'bg-amber-100 text-amber-700';
  if (status === 'COMPLETED') return 'bg-green-100 text-green-700';
  return 'bg-gray-200 text-gray-700';
};

const rewardLabel = computed(() => {
  if (!bounty.value) return '-';
  if (bounty.value.tokenAddress === zeroAddress) return `${bounty.value.rewardAmountEth} ETH`;
  return tokenRewardLabel.value || `${bounty.value.rewardAmountWei} (ERC20)`;
});

const loadDetail = async () => {
  loading.value = true;
  error.value = '';

  try {
    bounty.value = await getBountyById(bountyId);
    desc.value = null;
    descError.value = '';
    if (bounty.value?.descriptionURI) {
      descLoading.value = true;
      try {
        const parsed = await loadBountyDescription(bounty.value.descriptionURI);
        desc.value = parsed;
        if (!parsed) {
          descError.value =
            'Failed to load/parse description from URI (gateway blocked or invalid JSON).';
        }
      } finally {
        descLoading.value = false;
      }
    }
    hunters.value = await getBountyHunters(bountyId);

    const items = await Promise.all(hunters.value.map((h) => getSubmission(bountyId, h)));
    submissions.value = items.sort((a, b) => b.timestamp - a.timestamp);

    if (bounty.value.tokenAddress !== zeroAddress) {
      try {
        const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';
        const provider = new JsonRpcProvider(rpcUrl);
        const meta = await getTokenMeta(provider, bounty.value.tokenAddress);
        const formatted = formatTokenAmount(bounty.value.rewardAmountWei, meta.decimals);
        tokenRewardLabel.value = `${formatted} ${meta.symbol}`;
      } catch {
        // ignore token metadata errors and keep fallback
      }
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to load bounty detail';
  } finally {
    loading.value = false;
  }
};

const canApprove = () => {
  if (!bounty.value) return false;
  if (!userStore.isConnected) return false;
  if (userStore.address.toLowerCase() !== bounty.value.publisher.toLowerCase()) return false;
  if (bounty.value.status !== 'WORK_SUBMITTED') return false;
  if (bounty.value.successfulHunter !== zeroAddress) return false;
  return true;
};

const submit = async () => {
  if (!userStore.isConnected) return;
  actionLoading.value = true;
  try {
    const contract = await getBountyContract();
    const tx = await contract.submitWork(bountyId, proofURI.value);
    await tx.wait();
    showToast('Work submitted!', 'success');
    proofURI.value = '';
    await loadDetail();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Submit failed';
    showToast(msg, 'error');
  } finally {
    actionLoading.value = false;
  }
};

const approve = async (hunter: string) => {
  actionLoading.value = true;
  try {
    const contract = await getBountyContract();
    const tx = await contract.approveWork(bountyId, hunter);
    await tx.wait();
    showToast('Approved and paid!', 'success');
    await loadDetail();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Approve failed';
    showToast(msg, 'error');
  } finally {
    actionLoading.value = false;
  }
};

onMounted(() => {
  loadDetail();
});
</script>
