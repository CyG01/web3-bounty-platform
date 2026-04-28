import { ref } from 'vue';

const isVisible = ref(false);
const message = ref('');
const type = ref<'success' | 'error' | 'info'>('info');
const linkUrl = ref<string>('');
const linkText = ref<string>('');
let timeoutId: ReturnType<typeof setTimeout> | undefined;

export function useToast() {
  const showToast = (
    msg: string,
    toastType: 'success' | 'error' | 'info' = 'success',
    duration = 3000,
    opts?: { linkUrl?: string; linkText?: string }
  ) => {
    if (timeoutId) clearTimeout(timeoutId);

    message.value = msg;
    type.value = toastType;
    linkUrl.value = opts?.linkUrl ? String(opts.linkUrl) : '';
    linkText.value = opts?.linkText ? String(opts.linkText) : '';
    isVisible.value = true;

    timeoutId = setTimeout(() => {
      isVisible.value = false;
      linkUrl.value = '';
      linkText.value = '';
    }, duration);
  };

  return {
    isVisible,
    message,
    type,
    linkUrl,
    linkText,
    showToast,
  };
}
