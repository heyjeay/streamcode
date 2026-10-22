<script setup lang="ts">
import { siDiscord, siGithub } from 'simple-icons'
import BrandIcon from '@/components/BrandIcon.vue'
import { DISCORD_URL, GITHUB_URL } from '@/config'
import icon from '@/assets/icon.png'
</script>

<template>
  <footer class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-10 text-sm text-white/45">
    <span class="flex items-center gap-2"><img :src="icon" alt="" class="h-5 w-5"> Stream Code</span>
    <span class="flex items-center gap-4">
      <a :href="GITHUB_URL" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 transition hover:text-white">
        <BrandIcon :path="siGithub.path" :size="15" /> GitHub
      </a>
      <a :href="DISCORD_URL" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 transition hover:text-white">
        <BrandIcon :path="siDiscord.path" :size="15" /> Discord
      </a>
      <span>Made by Jeay · {{ new Date().getFullYear() }}</span>
    </span>
  </footer>
</template>
