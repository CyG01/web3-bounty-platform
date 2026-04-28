<template>
  <div class="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div class="md:flex md:items-center md:justify-between mb-8">
      <div class="min-w-0 flex-1">
        <h2 class="text-3xl font-extrabold sm:text-4xl sm:tracking-tight" :style="titleStyle">
          {{ t('create.title') }}
        </h2>
        <p class="mt-2 text-lg" :style="mutedStyle">
          {{ t('create.subtitle') }}
        </p>
      </div>
    </div>

    <div
      v-if="!userStore.isConnected"
      class="border-l-4 p-4 mb-6 rounded-r-md ui-glow"
      :style="warningStyle"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <svg
            class="h-5 w-5 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium" :style="warningTextStyle">
            {{ t('create.connectHint') }}
          </p>
        </div>
      </div>
    </div>

    <form
      class="space-y-6 px-4 py-6 sm:rounded-xl sm:p-8 ui-glow ui-shimmer-border"
      :style="panelStyle"
      :class="{
        'opacity-60 pointer-events-none grayscale-[30%]': !userStore.isConnected || isSubmitting,
      }"
      @submit.prevent="submitBounty"
    >
      <div>
        <label class="block text-sm font-semibold" :style="labelStyle">{{ t('create.taskTitle') }}</label>
        <div class="mt-2">
          <input
            v-model="form.title"
            type="text"
            required
            class="block w-full rounded-lg shadow-sm sm:text-sm py-3 px-4 border transition-colors"
            :style="inputStyle"
            :placeholder="t('create.taskTitlePlaceholder')"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-semibold" :style="labelStyle">{{ t('create.descUri') }}</label>
        <div class="mt-2">
          <input
            v-model="form.descURI"
            type="text"
            :required="!autoUploadDesc"
            class="block w-full rounded-lg shadow-sm sm:text-sm py-3 px-4 border transition-colors"
            :style="inputStyle"
            :placeholder="t('create.descUriPlaceholder')"
          />
        </div>
        <p class="mt-2 text-xs" :style="mutedStyle">
          {{ t('create.descUriHint') }}
        </p>
      </div>

      <div class="rounded-lg border p-4 space-y-3" :style="subPanelStyle">
        <div class="flex items-center justify-between gap-3">
          <label class="text-sm font-semibold" :style="titleStyle">{{ t('create.autoUploadTitle') }}</label>
          <input v-model="autoUploadDesc" type="checkbox" class="h-4 w-4" />
        </div>
        <textarea
          v-model="form.markdown"
          rows="8"
          class="block w-full rounded-lg shadow-sm sm:text-sm py-3 px-4 border transition-colors"
          :style="inputStyle"
          :placeholder="t('create.markdownPlaceholder')"
        />
        <p class="text-xs" :style="mutedStyle">
          {{ t('create.autoUploadHint') }}
        </p>
      </div>

      <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-semibold" :style="labelStyle">{{ t('create.tokenType') }}</label>
          <div class="mt-2">
            <select
              v-model="form.tokenType"
              class="block w-full rounded-lg shadow-sm sm:text-sm py-3 px-4 border transition-colors"
              :style="inputStyle"
            >
              <option value="ETH">{{ t('create.nativeEth') }}</option>
              <option value="ERC20">{{ t('create.erc20Token') }}</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold" :style="labelStyle">{{ t('create.rewardAmount') }}</label>
          <div class="mt-2 relative rounded-lg shadow-sm">
            <input
              v-model="form.reward"
              type="number"
              step="0.0001"
              min="0.0001"
              required
              class="block w-full rounded-lg sm:text-sm py-3 px-4 border transition-colors"
              :style="inputStyle"
              placeholder="0.1"
            />
          </div>
          <p v-if="form.tokenType === 'ERC20'" class="mt-2 text-xs break-all" :style="mutedStyle">
            {{ t('create.currentToken') }}: {{ tokenSymbol ? tokenSymbol : form.tokenAddress || '-' }}
          </p>
        </div>
      </div>

      <div v-if="form.tokenType === 'ERC20'">
        <label class="block text-sm font-semibold" :style="labelStyle">{{ t('create.erc20Address') }}</label>
        <div class="mt-2">
          <input
            v-model="form.tokenAddress"
            type="text"
            required
            class="block w-full rounded-lg shadow-sm sm:text-sm py-3 px-4 border transition-colors"
            :style="inputStyle"
            placeholder="0x..."
          />
        </div>
        <p class="mt-2 text-xs" :style="mutedStyle">
          {{ t('create.erc20Hint') }}
        </p>
      </div>

      <div>
        <label class="block text-sm font-semibold" :style="labelStyle">{{ t('create.deadline') }}</label>
        <div class="mt-2">
          <input
            v-model="form.deadline"
            type="datetime-local"
            required
            class="block w-full rounded-lg shadow-sm sm:text-sm py-3 px-4 border transition-colors"
            :style="inputStyle"
          />
        </div>
      </div>

      <div class="pt-6 border-t mt-8 flex items-center justify-end" :style="dividerStyle">
        <span v-if="errorMsg" class="text-red-500 text-sm mr-4 font-medium">{{ errorMsg }}</span>
        <span v-if="txHash" class="text-green-600 text-sm mr-4 font-medium"
          >{{ t('create.txSent') }}: {{ shortenTx(txHash) }}</span
        >

        <button
          type="submit"
          :disabled="!userStore.isConnected || isSubmitting"
          class="inline-flex justify-center items-center py-3 px-6 border border-transparent shadow-md text-sm font-bold rounded-lg text-white transition-all duration-200 disabled:bg-gray-400 hover:scale-[1.01] active:scale-[0.99]"
          :style="primaryBtnStyle"
        >
          <svg
            v-if="isSubmitting"
            class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {{ isSubmitting ? t('create.confirming') : t('create.submit') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { Contract, ethers } from 'ethers';
import { useWeb3 } from '../composables/useWeb3';
import { useToast } from '../composables/useToast';
import ERC20ABI from '../abis/ERC20.json';
import { uploadToIpfs } from '../services/ipfs';
import { useI18n } from 'vue-i18n';

const userStore = useUserStore();
const { getBountyContract, getSigner } = useWeb3();
const router = useRouter();
const { showToast } = useToast();
const { t } = useI18n();

const titleStyle = computed(() => ({
  color: `rgb(var(--text))`,
}));

const labelStyle = computed(() => ({
  color: `rgb(var(--text))`,
}));

const mutedStyle = computed(() => ({
  color: `rgb(var(--muted))`,
}));

const panelStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.75)`,
  borderColor: `rgb(var(--border))`,
  borderWidth: '1px',
}));

const subPanelStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface-2), 0.45)`,
  borderColor: `rgba(var(--primary), 0.20)`,
}));

const inputStyle = computed(() => ({
  backgroundColor: `rgba(var(--surface), 0.65)`,
  borderColor: `rgb(var(--border))`,
  color: `rgb(var(--text))`,
}));

const dividerStyle = computed(() => ({
  borderColor: `rgb(var(--border))`,
}));

const primaryBtnStyle = computed(() => ({
  background: `linear-gradient(135deg, rgb(var(--primary)) 0%, rgb(var(--primary-2)) 100%)`,
}));

const warningStyle = computed(() => ({
  backgroundColor: 'rgba(245, 158, 11, 0.14)',
  borderLeftColor: 'rgba(245, 158, 11, 0.65)',
}));

const warningTextStyle = computed(() => ({
  color: `rgb(var(--text))`,
}));

const isSubmitting = ref(false);
const errorMsg = ref('');
const txHash = ref('');

const tokenSymbol = ref('');
const tokenDecimals = ref<number>(18);
const minimumRewardWei = ref<bigint>(0n);
const autoUploadDesc = ref(true);

const form = reactive({
  title: '',
  descURI: '',
  markdown: '',
  tokenType: 'ETH' as 'ETH' | 'ERC20',
  tokenAddress: '',
  reward: '',
  deadline: '',
});

const getTokenContract = async () => {
  if (!form.tokenAddress) throw new Error('Token address is required');
  if (!ethers.isAddress(form.tokenAddress)) throw new Error('Invalid token address');
  const signer = await getSigner();
  return new Contract(form.tokenAddress, ERC20ABI, signer);
};

const ensureAllowance = async (token: Contract, spender: string, amount: bigint) => {
  const owner = userStore.address;
  if (!owner) throw new Error('Wallet not connected');

  const current: bigint = await token.allowance(owner, spender);
  if (current >= amount) return;

  // USDT-like tokens require allowance to be zero before setting a new one
  if (current > 0n) {
    const tx0 = await token.approve(spender, 0);
    txHash.value = tx0.hash;
    await tx0.wait();
  }

  const tx = await token.approve(spender, amount);
  txHash.value = tx.hash;
  await tx.wait();
};

const loadTokenMeta = async () => {
  tokenSymbol.value = '';
  tokenDecimals.value = 18;
  if (form.tokenType !== 'ERC20') return;
  if (!form.tokenAddress || !ethers.isAddress(form.tokenAddress)) return;

  try {
    const token = await getTokenContract();
    const [sym, dec] = await Promise.all([token.symbol(), token.decimals()]);
    tokenSymbol.value = sym;
    tokenDecimals.value = Number(dec);
  } catch {
    tokenSymbol.value = '';
    tokenDecimals.value = 18;
  }
};

watch(
  () => [form.tokenType, form.tokenAddress],
  () => {
    loadTokenMeta();
  }
);

const shortenTx = (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`;

const submitBounty = async () => {
  if (!userStore.isConnected) return;

  errorMsg.value = '';
  txHash.value = '';
  isSubmitting.value = true;

  try {
    const contract = await getBountyContract();
    minimumRewardWei.value = await contract.minimumReward();

    if (autoUploadDesc.value && form.markdown.trim().length > 0) {
      showToast(t('create.uploading'), 'info');
      const uploaded = await uploadToIpfs({
        title: form.title || 'Bounty details',
        markdown: form.markdown,
      });
      form.descURI = uploaded.uri;
    }
    if (!form.descURI.trim()) {
      throw new Error('Description URI is required (or provide markdown for auto upload)');
    }

    const bountyContractAddress = import.meta.env.VITE_BOUNTY_CONTRACT_ADDRESS || '';
    if (!bountyContractAddress) {
      throw new Error('VITE_BOUNTY_CONTRACT_ADDRESS is not configured');
    }

    const isERC20 = form.tokenType === 'ERC20';
    const tokenAddress = isERC20 ? form.tokenAddress : ethers.ZeroAddress;
    if (isERC20 && (!tokenAddress || !ethers.isAddress(tokenAddress))) {
      throw new Error('Invalid ERC20 token address');
    }

    const parsedReward = isERC20
      ? ethers.parseUnits(form.reward.toString(), tokenDecimals.value)
      : ethers.parseEther(form.reward.toString());
    if (minimumRewardWei.value > 0n && parsedReward < minimumRewardWei.value) {
      throw new Error(
        `Reward is below minimum: ${minimumRewardWei.value.toString()} wei-equivalent`
      );
    }
    const deadlineTimestamp = Math.floor(new Date(form.deadline).getTime() / 1000);

    // Validate against chain time instead of local device clock
    const signer = await getSigner();
    const latestBlock = await signer.provider?.getBlock('latest');
    const chainNow = Number(latestBlock?.timestamp || 0);

    if (deadlineTimestamp <= chainNow) {
      throw new Error('Deadline must be in the future');
    }

    if (isERC20) {
      const token = await getTokenContract();
      await ensureAllowance(token, bountyContractAddress, parsedReward);
      showToast(t('create.creating'), 'info');

      const tx = await contract.createBounty(
        form.title,
        form.descURI,
        tokenAddress,
        parsedReward,
        deadlineTimestamp
      );
      txHash.value = tx.hash;
      const receipt = await tx.wait();
      console.log('Transaction Confirmed:', receipt);
    } else {
      const tx = await contract.createBounty(
        form.title,
        form.descURI,
        tokenAddress,
        parsedReward,
        deadlineTimestamp,
        { value: parsedReward }
      );

      txHash.value = tx.hash;
      const receipt = await tx.wait();
      console.log('Transaction Confirmed:', receipt);
    }

    form.title = '';
    form.descURI = '';
    form.markdown = '';
    form.tokenAddress = '';
    form.reward = '';
    form.deadline = '';
    showToast(t('create.success'), 'success');
    setTimeout(() => {
      router.push('/bounties');
    }, 1500);
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null) {
      const maybeErr = err as { info?: { error?: { message?: string } }; message?: string };
      errorMsg.value =
        maybeErr.info?.error?.message || maybeErr.message || 'Transaction failed or rejected.';
    } else {
      errorMsg.value = 'Transaction failed or rejected.';
    }
    showToast(t('create.fail'), 'error');
    console.error('Error creating bounty:', err);
  } finally {
    isSubmitting.value = false;
  }
};
</script>
