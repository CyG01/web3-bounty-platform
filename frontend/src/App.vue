<template>
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view />
    </main>
    <Toast />
  </div>
</template>

<script setup lang="ts">
import Navbar from './components/layout/Navbar.vue';
import Toast from './components/common/Toast.vue';
</script>
