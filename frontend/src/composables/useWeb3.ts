import { ref, onMounted } from 'vue';
import { BrowserProvider, Contract } from 'ethers';
import { useUserStore } from '../stores/userStore';
import BountyABI from '../abis/Bounty.json';
import { loadDeployment, networkNameFromChainId } from '../services/deployments';
import EthereumProvider from '@walletconnect/ethereum-provider';

const BOUNTY_CONTRACT_ADDRESS = import.meta.env.VITE_BOUNTY_CONTRACT_ADDRESS || '';

export function useWeb3() {
  const userStore = useUserStore();
  const provider = ref<BrowserProvider | null>(null);
  const wcProvider = ref<EthereumProvider | null>(null);
  const error = ref<string>('');

  const initInjectedProvider = () => {
    if (!window.ethereum) return false;
    provider.value = new BrowserProvider(window.ethereum);
    return true;
  };

  const initWalletConnectProvider = async () => {
    const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
    if (!projectId) {
      throw new Error('VITE_WALLETCONNECT_PROJECT_ID is not configured');
    }
    if (wcProvider.value) return wcProvider.value;

    wcProvider.value = await EthereumProvider.init({
      projectId,
      chains: [1, 11155111, 31337],
      showQrModal: true,
      optionalChains: [1, 11155111, 31337],
      methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData_v4'],
      events: ['chainChanged', 'accountsChanged'],
      metadata: {
        name: 'Web3Bounty',
        description: 'Decentralized bounty platform',
        url: globalThis.location?.origin || 'http://localhost:5173',
        icons: [],
      },
    });
    return wcProvider.value;
  };

  const connectWallet = async (mode: 'injected' | 'walletconnect' | 'auto' = 'auto') => {
    try {
      error.value = '';
      let accounts: string[] = [];

      if (mode === 'walletconnect') {
        const wc = await initWalletConnectProvider();
        await wc.enable();
        provider.value = new BrowserProvider(wc as unknown as never);
        setupEventListeners();
        accounts = (await provider.value.send('eth_requestAccounts', [])) as string[];
      } else {
        const hasInjected = initInjectedProvider();
        if (hasInjected && provider.value) {
          accounts = (await provider.value.send('eth_requestAccounts', [])) as string[];
        } else if (mode === 'auto') {
          const wc = await initWalletConnectProvider();
          await wc.enable();
          provider.value = new BrowserProvider(wc as unknown as never);
          setupEventListeners();
          accounts = (await provider.value.send('eth_requestAccounts', [])) as string[];
          mode = 'walletconnect';
        } else {
          throw new Error('No injected wallet found');
        }
      }

      if (accounts.length > 0) {
        userStore.setAccount(accounts[0], mode === 'walletconnect' ? 'walletconnect' : 'injected');
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
    if (window.ethereum && userStore.connector !== 'walletconnect') {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          userStore.setAccount(accounts[0], 'injected');
        } else {
          userStore.disconnect();
        }
      });

      window.ethereum.on('chainChanged', (chainIdHex: string) => {
        userStore.setChainId(parseInt(chainIdHex, 16));
        window.location.reload();
      });
    }

    if (wcProvider.value) {
      wcProvider.value.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          userStore.setAccount(accounts[0], 'walletconnect');
        } else {
          userStore.disconnect();
        }
      });
      wcProvider.value.on('chainChanged', (chainIdHex: string | number) => {
        const value =
          typeof chainIdHex === 'string'
            ? chainIdHex.startsWith('0x')
              ? parseInt(chainIdHex, 16)
              : Number(chainIdHex)
            : Number(chainIdHex);
        userStore.setChainId(value);
      });
    }
  };

  const getBountyContract = async () => {
    if (!provider.value) initInjectedProvider();
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

  const getSigner = async () => {
    if (!provider.value) throw new Error('No provider available');
    return provider.value.getSigner();
  };

  const getProvider = () => {
    if (!provider.value) throw new Error('No provider available');
    return provider.value;
  };

  const switchToSupportedChain = async () => {
    if (!provider.value) return;
    const targetChainHex = import.meta.env.VITE_DEFAULT_CHAIN_HEX || '0xaa36a7'; // sepolia
    await provider.value.send('wallet_switchEthereumChain', [{ chainId: targetChainHex }]);
  };

  const disconnectWallet = async () => {
    if (userStore.connector === 'walletconnect' && wcProvider.value) {
      await wcProvider.value.disconnect();
    }
    userStore.disconnect();
  };

  onMounted(() => {
    initInjectedProvider();
    setupEventListeners();
  });

  return {
    connectWallet,
    disconnectWallet,
    switchToSupportedChain,
    getProvider,
    getSigner,
    getBountyContract,
    error,
  };
}
