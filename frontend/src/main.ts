import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { watch } from 'vue';
import './styles.css';
import { useToast } from './composables/useToast';
import { humanizeWeb3Error } from './utils/errors';
import { createAppI18n } from './i18n';
import { useUiStore } from './stores/uiStore';

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);
app.use(router);

const uiStore = useUiStore(pinia);
uiStore.init();

const i18n = createAppI18n(uiStore.locale);
app.use(i18n);

watch(
  () => uiStore.locale,
  (l) => {
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
