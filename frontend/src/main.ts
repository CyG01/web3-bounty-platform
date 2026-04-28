import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useToast } from './composables/useToast';
import { humanizeWeb3Error } from './utils/errors';

const app = createApp(App);
app.use(createPinia());
app.use(router);

app.config.errorHandler = (err) => {
  const { showToast } = useToast();
  showToast(humanizeWeb3Error(err), 'error', 5000);
};

window.addEventListener('unhandledrejection', (event) => {
  const { showToast } = useToast();
  showToast(humanizeWeb3Error(event.reason), 'error', 5000);
});

app.mount('#app');
