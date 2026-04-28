import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useUserStore } from './userStore';

export type UserProfile = {
  nickname: string;
  avatarUrl: string;
  email: string;
};

function storageKey(address: string) {
  return `profile:${address.toLowerCase()}`;
}

const emptyProfile = (): UserProfile => ({ nickname: '', avatarUrl: '', email: '' });

export const useProfileStore = defineStore('profile', () => {
  const userStore = useUserStore();
  const profile = ref<UserProfile>(emptyProfile());

  const isReady = computed(() => Boolean(userStore.address));

  const load = () => {
    const addr = userStore.address;
    if (!addr) {
      profile.value = emptyProfile();
      return;
    }

    try {
      const raw = globalThis.localStorage?.getItem(storageKey(addr));
      const parsed = raw ? (JSON.parse(raw) as Partial<UserProfile>) : {};
      profile.value = {
        nickname: String(parsed.nickname || ''),
        avatarUrl: String(parsed.avatarUrl || ''),
        email: String(parsed.email || ''),
      };
    } catch {
      profile.value = emptyProfile();
    }
  };

  const save = () => {
    const addr = userStore.address;
    if (!addr) return;
    try {
      globalThis.localStorage?.setItem(storageKey(addr), JSON.stringify(profile.value));
    } catch {
      // ignore storage errors
    }
  };

  const reset = () => {
    profile.value = emptyProfile();
    save();
  };

  return {
    profile,
    isReady,
    load,
    save,
    reset,
  };
});
