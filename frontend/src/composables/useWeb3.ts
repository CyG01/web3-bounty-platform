import { ref, onMounted } from 'vue';
import { BrowserProvider, Contract } from 'ethers';
import { useUserStore } from '../stores/userStore';
import BountyABI from '../abis/Bounty.json';
import { loadDeployment, networkNameFromChainId } from '../services/deployments';

const BOUNTY_CONTRACT_ADDRESS = import.meta.env.VITE_BOUNTY_CONTRACT_ADDRESS || '';

export function useWeb3() {
  const userStore = useUserStore();
  const provider = ref<BrowserProvider | null>(null);
  const error = ref<string>('');

  const initProvider = () => {
    if (window.ethereum) {
      provider.value = new BrowserProvider(window.ethereum);
    } else {
      error.value = 'Please install MetaMask or another Web3 wallet.';
    }
  };

  const connectWallet = async () => {
    try {
      error.value = '';
      if (!provider.value) initProvider();
      if (!provider.value) return;

      const accounts = await provider.value.send('eth_requestAccounts', []);
      if (accounts.length > 0) {
        userStore.setAccount(accounts[0]);
        const network = await provider.value.getNetwork();
        userStore.setChainId(Number(network.chainId));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      error.value = message;
      console.error(err);
    }
  };

  const setupEventListeners = () => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          userStore.setAccount(accounts[0]);
        } else {
          userStore.disconnect();
        }
      });

      window.ethereum.on('chainChanged', (chainIdHex: string) => {
        userStore.setChainId(Number(chainIdHex));
        window.location.reload();
      });
    }
  };

  const getBountyContract = async () => {
    if (!provider.value) initProvider();
    if (!provider.value) throw new Error('No provider available');

    let address = BOUNTY_CONTRACT_ADDRESS;
    if (!address) {
      const chainId = userStore.chainId;
      const networkName = networkNameFromChainId(chainId);
      const deployment = await loadDeployment(networkName);
      address = deployment?.address || '';
    }

    if (!address) throw new Error('VITE_BOUNTY_CONTRACT_ADDRESS is not configured');

    const signer = await provider.value.getSigner();
    return new Contract(address, BountyABI, signer);
  };

  onMounted(() => {
    initProvider();
    setupEventListeners();
  });

  return {
    connectWallet,
    getBountyContract,
    error,
  };
}
