import { createApp, watch } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { createAppI18n } from './i18n';
import type { SupportedLocale } from './i18n';
import { useUiStore } from './stores/uiStore';
import { useAuthStore } from './stores/authStore';
import './styles.css';
import { useToast } from './composables/useToast';
import { humanizeWeb3Error } from './utils/errors';

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);
app.use(router);

const uiStore = useUiStore(pinia);
uiStore.init();

const authStore = useAuthStore(pinia);
authStore.init();

const i18n = createAppI18n(uiStore.locale);
app.use(i18n);

watch(
  () => uiStore.locale,
  (l: SupportedLocale) => {
    i18n.global.locale.value = l;
  }
);

app.config.errorHandler = (err) => {
  const { showToast } = useToast();
  showToast(humanizeWeb3Error(err), 'error', 5000);
};

window.addEventListener('unhandledrejection', (event) => {
  const { showToast } = useToast();
  showToast(humanizeWeb3Error(event.reason), 'error', 5000);
});

app.mount('#app');
