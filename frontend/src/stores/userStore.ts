import { defineStore } from 'pinia';
import { ref } from 'vue';

const GUEST_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const GUEST_STORAGE_KEY = 'user.guest.mode';

export const useUserStore = defineStore('user', () => {
  const address = ref<string>('');
  const chainId = ref<number | null>(null);
  const isConnected = ref<boolean>(false);
  const isPending = ref<boolean>(false);
  const connector = ref<'injected' | 'walletconnect' | 'guest' | null>(null);
  const isGuest = ref<boolean>(false);

  const persistGuest = () => {
    try {
      if (isGuest.value) globalThis.localStorage?.setItem(GUEST_STORAGE_KEY, '1');
      else globalThis.localStorage?.removeItem(GUEST_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const setAccount = (
    newAddress: string,
    source: 'injected' | 'walletconnect' | 'guest' | null = connector.value
  ) => {
    address.value = newAddress;
    isConnected.value = !!newAddress;
    connector.value = newAddress ? source : null;
    isGuest.value = source === 'guest' && !!newAddress;
    persistGuest();
  };

  const setChainId = (newChainId: number) => {
    chainId.value = newChainId;
  };

  const disconnect = () => {
    address.value = '';
    chainId.value = null;
    isConnected.value = false;
    connector.value = null;
    isGuest.value = false;
    persistGuest();
  };

  const setPending = (status: boolean) => {
    isPending.value = status;
  };

  const continueAsGuest = () => {
    setAccount(GUEST_ADDRESS, 'guest');
    if (!chainId.value) chainId.value = 11155111;
    persistGuest();
  };

  const init = () => {
    try {
      if (globalThis.localStorage?.getItem(GUEST_STORAGE_KEY) === '1') {
        continueAsGuest();
      }
    } catch {
      // ignore storage errors
    }
  };

  return {
    address,
    chainId,
    isConnected,
    isPending,
    connector,
    isGuest,
    init,
    setAccount,
    setChainId,
    disconnect,
    setPending,
    continueAsGuest,
  };
});
