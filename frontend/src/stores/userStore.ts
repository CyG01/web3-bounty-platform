import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const address = ref<string>('');
  const chainId = ref<number | null>(null);
  const isConnected = ref<boolean>(false);
  const isPending = ref<boolean>(false);

  const setAccount = (newAddress: string) => {
    address.value = newAddress;
    isConnected.value = !!newAddress;
  };

  const setChainId = (newChainId: number) => {
    chainId.value = newChainId;
  };

  const disconnect = () => {
    address.value = '';
    chainId.value = null;
    isConnected.value = false;
  };

  const setPending = (status: boolean) => {
    isPending.value = status;
  };

  return {
    address,
    chainId,
    isConnected,
    isPending,
    setAccount,
    setChainId,
    disconnect,
    setPending,
  };
});
