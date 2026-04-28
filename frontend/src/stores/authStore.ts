import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { SiweSession } from '../services/siwe';
import { signInWithEthereum } from '../services/siwe';

const STORAGE_KEY = 'auth.siwe.session';

export const useAuthStore = defineStore('auth', () => {
  const session = ref<SiweSession | null>(null);

  const isAuthenticated = computed(() => {
    if (!session.value) return false;
    return Boolean(session.value.signature);
  });

  const init = () => {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      session.value = raw ? (JSON.parse(raw) as SiweSession) : null;
    } catch {
      session.value = null;
    }
  };

  const persist = () => {
    try {
      if (!session.value) globalThis.localStorage?.removeItem(STORAGE_KEY);
      else globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(session.value));
    } catch {
      // ignore storage errors
    }
  };

  const signIn = async (provider: unknown, opts: { address: string; chainId: number }) => {
    const next = await signInWithEthereum(provider, opts);
    session.value = next;
    persist();
    return next;
  };

  const signOut = () => {
    session.value = null;
    persist();
  };

  return {
    session,
    isAuthenticated,
    init,
    signIn,
    signOut,
  };
});
