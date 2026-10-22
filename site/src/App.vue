<script setup lang="ts">
import CodeSky from '@/components/CodeSky.vue'
import SiteHeader from '@/layout/SiteHeader.vue'
import SiteFooter from '@/layout/SiteFooter.vue'
</script>

<template>
  <div class="relative min-h-screen overflow-x-hidden font-product text-white">
    <!-- A night sky with code drifting through it, alive behind every page. -->
    <CodeSky />
    <div class="fixed inset-0 -z-10 bg-black/25" />
    <SiteHeader />
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
    <SiteFooter />
  </div>
</template>
