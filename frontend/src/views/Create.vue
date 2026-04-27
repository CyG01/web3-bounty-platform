<template>
  <div class="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
    <div class="md:flex md:items-center md:justify-between mb-8">
      <div class="min-w-0 flex-1">
        <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl sm:tracking-tight">
          Post a New Task
        </h2>
        <p class="mt-2 text-lg text-gray-500">
          Create a bounty, deposit the reward, and let the Web3 community build for you.
        </p>
      </div>
    </div>

    <div
      v-if="!userStore.isConnected"
      class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-md"
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
          <p class="text-sm text-yellow-700 font-medium">
            Please connect your wallet in the navigation bar to post a task.
          </p>
        </div>
      </div>
    </div>

    <form
      class="space-y-6 bg-white shadow-lg border border-gray-100 px-4 py-6 sm:rounded-xl sm:p-8"
      :class="{ 'opacity-60 pointer-events-none grayscale-[30%]': !userStore.isConnected || isSubmitting }"
      @submit.prevent="submitBounty"
    >
      <div>
        <label class="block text-sm font-semibold text-gray-700">Task Title</label>
        <div class="mt-2">
          <input
            v-model="form.title"
            type="text"
            required
            class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-3 px-4 border"
            placeholder="e.g. Build a Landing Page in Vue3"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700">Description URI (IPFS / URL)</label>
        <div class="mt-2">
          <input
            v-model="form.descURI"
            type="text"
            required
            class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-3 px-4 border"
            placeholder="ipfs://... or https://github.com/..."
          />
        </div>
        <p class="mt-2 text-xs text-gray-500">
          Provide a link to a document or repository containing the detailed requirements.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-semibold text-gray-700">Token Type</label>
          <div class="mt-2">
            <select
              v-model="form.tokenType"
              class="block w-full border-gray-300 bg-white rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-3 px-4 border"
            >
              <option value="ETH">Native ETH</option>
              <option value="ERC20">ERC20 Token</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700">Reward Amount</label>
          <div class="mt-2 relative rounded-lg shadow-sm">
            <input
              v-model="form.reward"
              type="number"
              step="0.0001"
              min="0.0001"
              required
              class="block w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-3 px-4 border"
              placeholder="0.1"
            />
          </div>
          <p v-if="form.tokenType === 'ERC20'" class="mt-2 text-xs text-gray-500 break-all">
            Current token: {{ tokenSymbol ? tokenSymbol : form.tokenAddress || '-' }}
          </p>
        </div>
      </div>

      <div v-if="form.tokenType === 'ERC20'">
        <label class="block text-sm font-semibold text-gray-700">ERC20 Token Address</label>
        <div class="mt-2">
          <input
            v-model="form.tokenAddress"
            type="text"
            required
            class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-3 px-4 border"
            placeholder="0x..."
          />
        </div>
        <p class="mt-2 text-xs text-gray-500">
          Make sure this token exists on the current network and your wallet has enough balance.
        </p>
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-700">Deadline</label>
        <div class="mt-2">
          <input
            v-model="form.deadline"
            type="datetime-local"
            required
            class="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-3 px-4 border"
          />
        </div>
      </div>

      <div class="pt-6 border-t border-gray-200 mt-8 flex items-center justify-end">
        <span v-if="errorMsg" class="text-red-500 text-sm mr-4 font-medium">{{ errorMsg }}</span>
        <span v-if="txHash" class="text-green-600 text-sm mr-4 font-medium">Tx Sent: {{ shortenTx(txHash) }}</span>

        <button
          type="submit"
          :disabled="!userStore.isConnected || isSubmitting"
          class="inline-flex justify-center items-center py-3 px-6 border border-transparent shadow-md text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 transition-colors"
        >
          <svg
            v-if="isSubmitting"
            class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {{ isSubmitting ? 'Confirming on Chain...' : 'Deposit & Create Bounty' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { BrowserProvider, Contract, ethers } from 'ethers';
import { useWeb3 } from '../composables/useWeb3';
import { useToast } from '../composables/useToast';
import ERC20ABI from '../abis/ERC20.json';

const userStore = useUserStore();
const { getBountyContract } = useWeb3();
const router = useRouter();
const { showToast } = useToast();

const isSubmitting = ref(false);
const errorMsg = ref('');
const txHash = ref('');

const tokenSymbol = ref('');
const tokenDecimals = ref<number>(18);

const form = reactive({
  title: '',
  descURI: '',
  tokenType: 'ETH' as 'ETH' | 'ERC20',
  tokenAddress: '',
  reward: '',
  deadline: '',
});

const getTokenContract = async () => {
  if (!window.ethereum) throw new Error('No wallet provider found');
  if (!form.tokenAddress) throw new Error('Token address is required');
  if (!ethers.isAddress(form.tokenAddress)) throw new Error('Invalid token address');
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new Contract(form.tokenAddress, ERC20ABI, signer);
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
    if (!window.ethereum) {
      throw new Error('No wallet provider found');
    }

    const contract = await getBountyContract();

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
    const deadlineTimestamp = Math.floor(new Date(form.deadline).getTime() / 1000);

    if (deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
      throw new Error('Deadline must be in the future');
    }

    if (isERC20) {
      const token = await getTokenContract();

      const approveTx = await token.approve(bountyContractAddress, parsedReward);
      txHash.value = approveTx.hash;
      await approveTx.wait();
      showToast('Token approved. Creating bounty...', 'info');

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
    form.tokenAddress = '';
    form.reward = '';
    form.deadline = '';
    showToast('Bounty created successfully! Redirecting...', 'success');
    setTimeout(() => {
      router.push('/bounties');
    }, 1500);
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null) {
      const maybeErr = err as { info?: { error?: { message?: string } }; message?: string };
      errorMsg.value = maybeErr.info?.error?.message || maybeErr.message || 'Transaction failed or rejected.';
    } else {
      errorMsg.value = 'Transaction failed or rejected.';
    }
    showToast('Failed to create bounty', 'error');
    console.error('Error creating bounty:', err);
  } finally {
    isSubmitting.value = false;
  }
};
</script>
