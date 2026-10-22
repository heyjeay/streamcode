<script setup lang="ts">
/** A brand logo from simple-icons, drawn from its SVG path. */
defineProps<{ path: string; size?: number }>()
</script>

<template>
  <svg :width="size ?? 20" :height="size ?? 20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path :d="path" />
  </svg>
</template>
