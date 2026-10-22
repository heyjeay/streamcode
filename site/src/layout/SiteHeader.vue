<script setup lang="ts">
import { useRoute } from 'vue-router'
import icon from '@/assets/icon.png'

const route = useRoute()
/** On the guide, the section links point back to the landing page. */
const to = (hash: string) => (route.name === 'home' ? { hash } : { name: 'home', hash })
</script>

<template>
  <header class="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
    <RouterLink :to="{ name: 'home' }" class="flex items-center gap-2.5">
      <img :src="icon" alt="" class="h-9 w-9">
      <span class="text-xl font-semibold tracking-tight">Stream Code</span>
    </RouterLink>
    <nav class="flex items-center gap-1 text-sm text-white/70">
      <RouterLink :to="to('#features')" class="hidden rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white sm:block">Features</RouterLink>
      <RouterLink :to="to('#themes')" class="hidden rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white sm:block">Themes</RouterLink>
      <RouterLink :to="to('#look')" class="hidden rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white md:block">A closer look</RouterLink>
      <RouterLink :to="to('#privacy')" class="hidden rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white md:block">Privacy</RouterLink>
      <RouterLink
        :to="{ name: 'guide' }"
        class="ml-2 rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/15 transition hover:bg-white/20"
      >
        Setup guide
      </RouterLink>
    </nav>
  </header>
</template>
