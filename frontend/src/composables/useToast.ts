import { ref } from 'vue';

const isVisible = ref(false);
const message = ref('');
const type = ref<'success' | 'error' | 'info'>('info');
let timeoutId: ReturnType<typeof setTimeout> | undefined;

export function useToast() {
  const showToast = (
    msg: string,
    toastType: 'success' | 'error' | 'info' = 'success',
    duration = 3000
  ) => {
    if (timeoutId) clearTimeout(timeoutId);

    message.value = msg;
    type.value = toastType;
    isVisible.value = true;

    timeoutId = setTimeout(() => {
      isVisible.value = false;
    }, duration);
  };

  return {
    isVisible,
    message,
    type,
    showToast,
  };
}
