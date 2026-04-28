<template>
  <div class="min-h-screen" :style="rootStyle">
    <div class="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <div
        class="absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full blur-3xl opacity-30"
        :style="orbStyle"
      />
      <div class="absolute inset-0" :style="gridStyle" />
    </div>

    <Navbar />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view />
    </main>
    <Footer />
    <Toast />
  </div>
</template>

<script setup lang="ts">
import Navbar from './components/layout/Navbar.vue';
import Footer from './components/layout/Footer.vue';
import Toast from './components/common/Toast.vue';
import { computed } from 'vue';
import { useUiStore } from './stores/uiStore';

const uiStore = useUiStore();

const rootStyle = computed(() => ({
  background: `rgb(var(--bg))`,
  color: `rgb(var(--text))`,
}));

const orbStyle = computed(() => ({
  background:
    uiStore.theme === 'neon'
      ? `radial-gradient(circle at 30% 30%, rgb(var(--primary)) 0%, transparent 60%), radial-gradient(circle at 70% 70%, rgb(var(--primary-2)) 0%, transparent 55%)`
      : `radial-gradient(circle at 30% 30%, rgb(var(--primary)) 0%, transparent 60%), radial-gradient(circle at 70% 70%, rgb(var(--primary-2)) 0%, transparent 55%)`,
}));

const gridStyle = computed(() => ({
  backgroundImage:
    uiStore.theme === 'neon'
      ? `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`
      : `linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)`,
  backgroundSize: '48px 48px',
  maskImage: 'radial-gradient(circle at 50% 0%, black 0%, transparent 55%)',
  WebkitMaskImage: 'radial-gradient(circle at 50% 0%, black 0%, transparent 55%)',
}));
</script>
