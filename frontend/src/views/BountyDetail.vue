<template>
  <section class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold" :style="titleStyle">Bounty #{{ bountyId }}</h1>
        <p v-if="bounty" class="text-sm flex items-center gap-2 min-w-0" :style="mutedStyle">
          <span>{{ t('common.publisher') }}:</span>
          <AddressBadge :address="bounty.publisher" />
        </p>
      </div>
      <router-link
        to="/bounties"
        class="px-4 py-2 rounded-lg border text-sm font-semibold transition-colors"
        :style="secondaryBtnStyle"
      >
        {{ t('detail.backToList') }}
      </router-link>
    </div>

    <div
      v-if="error"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ error }}
    </div>

    <div v-if="loading" class="rounded-xl border p-5 shadow-sm ui-glow" :style="panelStyle">
      {{ t('detail.loading') }}
    </div>

    <div
      v-else-if="bounty"
      class="rounded-xl border p-5 shadow-sm space-y-4 ui-glow ui-shimmer-border"
      :style="panelStyle"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold" :style="titleStyle">{{ bounty.title }}</h2>
          <p class="text-sm break-all" :style="mutedStyle">{{ bounty.descriptionURI }}</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="canCancel()"
            class="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:bg-gray-400"
            :style="dangerBtnStyle"
            :disabled="actionLoading"
            @click="cancelBounty"
          >
            <span class="inline-flex items-center gap-2">
              <svg
                v-if="actionLoading && actionKind === 'cancel'"
                class="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  stroke-opacity="0.25"
                  stroke-width="3"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                />
              </svg>
              {{
                actionLoading && actionKind === 'cancel'
                  ? t('detail.cancelling')
                  : t('detail.cancelBounty')
              }}
            </span>
          </button>
          <button
            v-if="canManageButUnsupported()"
            class="px-4 py-2 rounded-lg text-sm font-semibold border"
            :style="secondaryBtnStyle"
            :title="t('detail.unsupportedActionHint')"
            @click="showToast(t('detail.unsupportedActionHint'), 'info')"
          >
            {{ t('detail.extendDeadline') }}
          </button>
          <button
            v-if="canManageButUnsupported()"
            class="px-4 py-2 rounded-lg text-sm font-semibold border"
            :style="secondaryBtnStyle"
            :title="t('detail.unsupportedActionHint')"
            @click="showToast(t('detail.unsupportedActionHint'), 'info')"
          >
            {{ t('detail.increaseReward') }}
          </button>
          <StatusBadge :status="bounty.status" />
        </div>
      </div>

      <div class="border-t pt-4 space-y-3" :style="dividerStyle">
        <h3 class="text-base font-semibold" :style="titleStyle">{{ t('detail.description') }}</h3>

        <div v-if="descLoading" class="text-sm" :style="mutedStyle">
          {{ t('detail.loadingDesc') }}
        </div>
        <div
          v-else-if="descError"
          class="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3"
        >
          {{ descError }}
        </div>
        <div
          v-else-if="descHtml"
          class="prose prose-sm max-w-none"
          :style="textStyle"
          v-html="descHtml"
        />
        <div v-else class="text-sm" :style="mutedStyle">
          {{ t('detail.noParsedDesc') }}
        </div>

        <div v-if="desc?.images?.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <a
            v-for="img in desc.images"
            :key="img"
            :href="ipfsToHttp(img)"
            target="_blank"
            rel="noreferrer"
            class="rounded-lg border overflow-hidden hover:-translate-y-0.5 transition-transform duration-200"
            :style="panelStyle"
          >
            <img :src="ipfsToHttp(img)" alt="bounty image" class="w-full h-56 object-cover" />
          </a>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div class="rounded-lg px-3 py-2" :style="metricStyle">
          <p :style="mutedStyle">{{ t('common.reward') }}</p>
          <p class="font-semibold break-all" :style="titleStyle">{{ rewardLabel }}</p>
        </div>
        <div class="rounded-lg px-3 py-2" :style="metricStyle">
          <p :style="mutedStyle">{{ t('common.deadline') }}</p>
          <p class="font-semibold" :style="titleStyle">{{ formatDate(bounty.deadline) }}</p>
        </div>
        <div class="rounded-lg px-3 py-2" :style="metricStyle">
          <p :style="mutedStyle">{{ t('common.winner') }}</p>
          <p class="font-semibold min-w-0" :style="titleStyle">
            <span v-if="bounty.successfulHunter === zeroAddress">-</span>
            <AddressBadge v-else :address="bounty.successfulHunter" />
          </p>
        </div>
      </div>

      <div class="border-t pt-4 space-y-4" :style="dividerStyle">
        <h3 class="text-base font-semibold" :style="titleStyle">{{ t('detail.submissions') }}</h3>

        <div v-if="hunters.length === 0" class="text-sm" :style="mutedStyle">
          {{ t('detail.noSubmissions') }}
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="item in submissions"
            :key="item.hunter"
            class="rounded-lg border px-4 py-3 flex flex-col gap-2 ui-glow"
            :style="panelStyle"
          >
            <div class="flex items-center justify-between gap-4">
              <p class="text-xs flex items-center gap-2 min-w-0" :style="mutedStyle">
                <span>Hunter:</span>
                <AddressBadge :address="item.hunter" />
              </p>
              <p class="text-xs" :style="mutedStyle">
                {{ item.timestamp ? formatDate(item.timestamp) : '-' }}
              </p>
            </div>
            <p class="text-sm break-all" :style="textStyle">{{ item.proofURI || '-' }}</p>

            <button
              v-if="canApprove()"
              class="self-end px-4 py-2 rounded-lg text-white text-sm font-semibold transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:bg-gray-400"
              :style="approveBtnStyle"
              :disabled="actionLoading"
              @click="approve(item.hunter)"
            >
              <span class="inline-flex items-center gap-2">
                <svg
                  v-if="actionLoading && actionKind === 'approve'"
                  class="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    stroke-opacity="0.25"
                    stroke-width="3"
                  />
                  <path
                    d="M21 12a9 9 0 0 0-9-9"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                  />
                </svg>
                {{
                  actionLoading && actionKind === 'approve'
                    ? t('detail.approving')
                    : t('detail.approvePay')
                }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="border-t pt-4 space-y-3" :style="dividerStyle">
        <h3 class="text-base font-semibold" :style="titleStyle">{{ t('detail.submitWork') }}</h3>

        <div v-if="!userStore.isConnected" class="text-sm" :style="mutedStyle">
          {{ t('detail.connectToSubmit') }}
        </div>

        <div v-else class="flex flex-col sm:flex-row gap-3">
          <input
            v-model="proofURI"
            type="text"
            class="flex-1 block w-full rounded-lg shadow-sm sm:text-sm py-3 px-4 border transition-colors"
            :style="inputStyle"
            placeholder="ipfs://... or https://..."
          />
          <button
            class="px-5 py-3 rounded-lg text-white text-sm font-semibold transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:bg-gray-400"
            :style="primaryBtnStyle"
            :disabled="actionLoading || !proofURI"
            @click="submit"
          >
            <span class="inline-flex items-center gap-2">
              <svg
                v-if="actionLoading && actionKind === 'submit'"
                class="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  stroke-opacity="0.25"
                  stroke-width="3"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                />
              </svg>
              {{
                actionLoading && actionKind === 'submit'
                  ? t('detail.submitting')
                  : t('detail.submitBtn')
              }}
            </span>
          </button>
        </div>
      </div>

      <div class="border-t pt-4" :style="dividerStyle">
        <CommentsSection :bounty-id="bountyId" />
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
import { getTokenMeta, ZERO_ADDRESS } from '../utils/token';
import { ipfsToHttp, loadBountyDescription, type BountyDescription } from '../services/ipfs';
import StatusBadge from '../components/features/StatusBadge.vue';
import CommentsSection from '../components/features/CommentsSection.vue';
import { useI18n } from 'vue-i18n';
import { explorerTxUrl } from '../utils/explorer';
import AddressBadge from '../components/common/AddressBadge.vue';
import { formatDisplayAmount } from '../utils/display';

const { t } = useI18n();

const titleStyle = computed(() => ({
  color: `rgb(var(--text))`,
}));

const textStyle = computed(() => ({
  color: `rgb(var(--text))`,
}));

const mutedStyle = computed(() => ({
  color: `rgb(var(--muted))`,
}));

const panelStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.75)`,
  borderColor: `rgb(var(--border))`,
}));

const metricStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface-2), 0.55)`,
}));

const dividerStyle = computed(() => ({
  borderColor: `rgb(var(--border))`,
}));

const inputStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.65)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));

const primaryBtnStyle = computed(() => ({
  background: `linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--primary-2)) 100%)`,
}));

const approveBtnStyle = computed(() => ({
  background: `linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(16, 185, 129, 0.95) 100%)`,
}));

const dangerBtnStyle = computed(() => ({
  background: `linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(244, 63, 94, 0.95) 100%)`,
}));

const secondaryBtnStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.55)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));

const route = useRoute();
const bountyId = Number(route.params.id);

const { getBountyById, getBountyHunters, getSubmission } = useBounty();
const { getBountyContract } = useWeb3();
const { showToast } = useToast();
const userStore = useUserStore();

const zeroAddress = ZERO_ADDRESS;

const loading = ref(false);
const actionLoading = ref(false);
const actionKind = ref<'submit' | 'approve' | 'cancel' | ''>('');
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

const rewardLabel = computed(() => {
  if (!bounty.value) return '-';
  if (bounty.value.tokenAddress === zeroAddress)
    return `${formatDisplayAmount(bounty.value.rewardAmountWei, { decimals: 18, maxFraction: 4 })} ETH`;
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
        const formatted = formatDisplayAmount(bounty.value.rewardAmountWei, {
          decimals: meta.decimals,
          maxFraction: 4,
        });
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
  if (userStore.isGuest) return false;
  if (userStore.address.toLowerCase() !== bounty.value.publisher.toLowerCase()) return false;
  if (bounty.value.status !== 'WORK_SUBMITTED') return false;
  if (bounty.value.successfulHunter !== zeroAddress) return false;
  return true;
};

const canCancel = () => {
  if (!bounty.value) return false;
  if (!userStore.isConnected) return false;
  if (userStore.isGuest) return false;
  if (userStore.address.toLowerCase() !== bounty.value.publisher.toLowerCase()) return false;
  return bounty.value.status === 'OPEN' || bounty.value.status === 'WORK_SUBMITTED';
};

const canManageButUnsupported = () => {
  if (!bounty.value) return false;
  if (!userStore.isConnected) return false;
  if (userStore.isGuest) return false;
  if (userStore.address.toLowerCase() !== bounty.value.publisher.toLowerCase()) return false;
  return bounty.value.status === 'OPEN' || bounty.value.status === 'WORK_SUBMITTED';
};

const cancelBounty = async () => {
  if (userStore.isGuest) {
    showToast(t('common.guestTxDisabled'), 'info');
    return;
  }
  actionKind.value = 'cancel';
  actionLoading.value = true;
  try {
    const contract = await getBountyContract();
    const tx = await contract.cancelBounty(bountyId);
    showToast(t('detail.txSent'), 'info', 8000, {
      linkUrl: explorerTxUrl(tx.hash, userStore.chainId),
      linkText: t('common.viewTx'),
    });
    await tx.wait();
    showToast(t('detail.cancelled'), 'success', 5000, {
      linkUrl: explorerTxUrl(tx.hash, userStore.chainId),
      linkText: t('common.viewTx'),
    });
    await loadDetail();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Cancel failed';
    showToast(msg, 'error');
  } finally {
    actionLoading.value = false;
    actionKind.value = '';
  }
};

const submit = async () => {
  if (!userStore.isConnected) return;
  if (userStore.isGuest) {
    showToast(t('common.guestTxDisabled'), 'info');
    return;
  }
  actionKind.value = 'submit';
  actionLoading.value = true;
  try {
    const contract = await getBountyContract();
    const tx = await contract.submitWork(bountyId, proofURI.value);
    showToast(t('detail.txSent'), 'info', 8000, {
      linkUrl: explorerTxUrl(tx.hash, userStore.chainId),
      linkText: t('common.viewTx'),
    });
    await tx.wait();
    showToast(t('detail.workSubmitted'), 'success', 5000, {
      linkUrl: explorerTxUrl(tx.hash, userStore.chainId),
      linkText: t('common.viewTx'),
    });
    proofURI.value = '';
    await loadDetail();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Submit failed';
    showToast(msg, 'error');
  } finally {
    actionLoading.value = false;
    actionKind.value = '';
  }
};

const approve = async (hunter: string) => {
  if (userStore.isGuest) {
    showToast(t('common.guestTxDisabled'), 'info');
    return;
  }
  actionKind.value = 'approve';
  actionLoading.value = true;
  try {
    const contract = await getBountyContract();
    const tx = await contract.approveWork(bountyId, hunter);
    showToast(t('detail.txSent'), 'info', 8000, {
      linkUrl: explorerTxUrl(tx.hash, userStore.chainId),
      linkText: t('common.viewTx'),
    });
    await tx.wait();
    showToast(t('detail.approvedPaid'), 'success', 5000, {
      linkUrl: explorerTxUrl(tx.hash, userStore.chainId),
      linkText: t('common.viewTx'),
    });
    await loadDetail();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Approve failed';
    showToast(msg, 'error');
  } finally {
    actionLoading.value = false;
    actionKind.value = '';
  }
};

onMounted(() => {
  loadDetail();
});
</script>
