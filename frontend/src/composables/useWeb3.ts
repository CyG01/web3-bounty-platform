import { ref, onMounted } from 'vue';
import { BrowserProvider, Contract } from 'ethers';
import { useUserStore } from '../stores/userStore';
import BountyABI from '../abis/Bounty.json';
import { loadDeployment, networkNameFromChainId } from '../services/deployments';
import EthereumProvider from '@walletconnect/ethereum-provider';

const BOUNTY_CONTRACT_ADDRESS = import.meta.env.VITE_BOUNTY_CONTRACT_ADDRESS || '';
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

type ConnectMode = 'injected' | 'walletconnect' | 'auto' | 'metamask' | 'okx' | 'coinbase';

type InjectedProviderLike = {
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isCoinbaseWallet?: boolean;
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
};

// Keep ethers/wallet instances outside Vue reactivity to avoid Proxy wrapping.
let browserProvider: BrowserProvider | null = null;
let walletConnectProvider: EthereumProvider | null = null;
let activeEip1193Provider: InjectedProviderLike | EthereumProvider | null = null;

export function useWeb3() {
  const userStore = useUserStore();
  const error = ref<string>('');

  const listInjectedProviders = () => {
    const ethereumAny = window.ethereum as unknown as {
      providers?: InjectedProviderLike[];
    } & InjectedProviderLike;

    if (!ethereumAny) return [] as InjectedProviderLike[];
    const list = Array.isArray(ethereumAny.providers) ? ethereumAny.providers : [ethereumAny];
    return list;
  };

  const pickInjectedProvider = (mode: ConnectMode) => {
    const providers = listInjectedProviders();
    if (!providers.length) return null;

    if (mode === 'metamask') {
      return providers.find((p) => p.isMetaMask) || null;
    }
    if (mode === 'okx') {
      return providers.find((p) => p.isOkxWallet) || null;
    }
    if (mode === 'coinbase') {
      return providers.find((p) => p.isCoinbaseWallet) || null;
    }
    return providers[0] || null;
  };

  const initInjectedProvider = (mode: ConnectMode = 'injected') => {
    const picked = pickInjectedProvider(mode);
    if (!picked) return false;
    activeEip1193Provider = picked;
    browserProvider = null;
    return true;
  };

  const initWalletConnectProvider = async () => {
    const projectId = WALLETCONNECT_PROJECT_ID;
    if (!projectId) {
      throw new Error('WalletConnect is not configured. Please set VITE_WALLETCONNECT_PROJECT_ID.');
    }
    if (walletConnectProvider) return walletConnectProvider;

    walletConnectProvider = await EthereumProvider.init({
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
    return walletConnectProvider;
  };

  const requestRpc = async (method: string, params: unknown[] = []) => {
    if (!activeEip1193Provider?.request) throw new Error('No provider available');
    return activeEip1193Provider.request({ method, params });
  };

  const ensureBrowserProvider = () => {
    if (browserProvider) return browserProvider;
    if (!activeEip1193Provider) throw new Error('No provider available');
    browserProvider = new BrowserProvider(activeEip1193Provider as unknown as never);
    return browserProvider;
  };

  const connectWallet = async (mode: ConnectMode = 'auto') => {
    try {
      error.value = '';
      let accounts: string[] = [];

      if (mode === 'walletconnect') {
        const wc = await initWalletConnectProvider();
        await wc.enable();
        activeEip1193Provider = wc;
        browserProvider = null;
        setupEventListeners();
        accounts = (await requestRpc('eth_requestAccounts', [])) as string[];
      } else {
        const injectedMode: ConnectMode =
          mode === 'metamask' || mode === 'okx' || mode === 'coinbase' ? mode : 'injected';
        const hasInjected = initInjectedProvider(injectedMode);
        if (hasInjected) {
          accounts = (await requestRpc('eth_requestAccounts', [])) as string[];
        } else if (mode === 'auto') {
          const wc = await initWalletConnectProvider();
          await wc.enable();
          activeEip1193Provider = wc;
          browserProvider = null;
          setupEventListeners();
          accounts = (await requestRpc('eth_requestAccounts', [])) as string[];
          mode = 'walletconnect';
        } else {
          throw new Error(
            'No compatible browser wallet found. Install MetaMask/OKX/Coinbase or use WalletConnect.'
          );
        }
      }

      if (accounts.length > 0) {
        userStore.setAccount(accounts[0], mode === 'walletconnect' ? 'walletconnect' : 'injected');
        const chainIdHex = (await requestRpc('eth_chainId', [])) as string;
        const chainId = chainIdHex?.startsWith('0x')
          ? parseInt(chainIdHex, 16)
          : Number(chainIdHex);
        userStore.setChainId(chainId);
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

    if (walletConnectProvider) {
      walletConnectProvider.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          userStore.setAccount(accounts[0], 'walletconnect');
        } else {
          userStore.disconnect();
        }
      });
      walletConnectProvider.on('chainChanged', (chainIdHex: string | number) => {
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
    if (!browserProvider) initInjectedProvider();
    const currentProvider = ensureBrowserProvider();

    const chainId = userStore.chainId;
    const networkName = networkNameFromChainId(chainId);
    const deployment = networkName ? await loadDeployment(networkName) : null;
    let address = deployment?.address || BOUNTY_CONTRACT_ADDRESS;

    if (!address) throw new Error('VITE_BOUNTY_CONTRACT_ADDRESS is not configured');

    const code = await currentProvider.getCode(address);
    if (!code || code === '0x') {
      throw new Error(
        `No Bounty contract found at ${address} on chain ${chainId ?? 'unknown'}. Please switch wallet network and retry.`
      );
    }

    const signer = await currentProvider.getSigner();
    return new Contract(address, BountyABI, signer);
  };

  const getSigner = async () => {
    const currentProvider = ensureBrowserProvider();
    return currentProvider.getSigner();
  };

  const getProvider = () => {
    return ensureBrowserProvider();
  };

  const switchToSupportedChain = async () => {
    if (!activeEip1193Provider) return;
    const targetChainHex = import.meta.env.VITE_DEFAULT_CHAIN_HEX || '0xaa36a7'; // sepolia
    await requestRpc('wallet_switchEthereumChain', [{ chainId: targetChainHex }]);
  };

  const disconnectWallet = async () => {
    if (userStore.connector === 'walletconnect' && walletConnectProvider) {
      await walletConnectProvider.disconnect();
      walletConnectProvider = null;
    }
    browserProvider = null;
    activeEip1193Provider = null;
    userStore.disconnect();
  };

  onMounted(() => {
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
    hasWalletConnectConfig: Boolean(WALLETCONNECT_PROJECT_ID),
  };
}
