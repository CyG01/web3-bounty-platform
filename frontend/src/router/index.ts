import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import Bounties from '../views/Bounties.vue';
import Create from '../views/Create.vue';
import Profile from '../views/Profile.vue';
import BountyDetail from '../views/BountyDetail.vue';
import { useToast } from '../composables/useToast';
import { humanizeWeb3Error } from '../utils/errors';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/bounties', name: 'bounties', component: Bounties },
    { path: '/bounties/:id', name: 'bounty-detail', component: BountyDetail },
    { path: '/create', name: 'create', component: Create },
    { path: '/profile', name: 'profile', component: Profile },
  ],
});

router.onError((err) => {
  const { showToast } = useToast();
  showToast(humanizeWeb3Error(err), 'error', 5000);
});

export default router;
