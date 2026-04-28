import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const address = ref<string>('');
  const chainId = ref<number | null>(null);
  const isConnected = ref<boolean>(false);
  const isPending = ref<boolean>(false);
  const connector = ref<'injected' | 'walletconnect' | null>(null);

  const setAccount = (
    newAddress: string,
    source: 'injected' | 'walletconnect' | null = connector.value
  ) => {
    address.value = newAddress;
    isConnected.value = !!newAddress;
    connector.value = newAddress ? source : null;
  };

  const setChainId = (newChainId: number) => {
    chainId.value = newChainId;
  };

  const disconnect = () => {
    address.value = '';
    chainId.value = null;
    isConnected.value = false;
    connector.value = null;
  };

  const setPending = (status: boolean) => {
    isPending.value = status;
  };

  return {
    address,
    chainId,
    isConnected,
    isPending,
    connector,
    setAccount,
    setChainId,
    disconnect,
    setPending,
  };
});
