<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ArrowRight, Box, Download, Lock, MonitorPlay, Palette, Radio, ScanSearch, ShieldCheck, SlidersHorizontal, Zap
} from 'lucide-vue-next'
import { siDiscord, siGithub } from 'simple-icons'
import BrandIcon from '@/components/BrandIcon.vue'
import { DISCORD_URL, DOWNLOAD_URL, GITHUB_URL, MARKETPLACE_URL, OVERLAY_URL, RELEASES_URL, THEMES } from '@/config'
import shotLens from '@ext/images/zoom-lens.webp'
import shotCamera from '@ext/images/zoom-camera.webp'
import shotNeon from '@ext/images/neon-3d.webp'
import shotGlass from '@ext/images/glass-3d.webp'
import shotMinimal from '@ext/images/minimal.webp'
import shotGallery from '@ext/images/gallery.webp'
import shotLock from '@ext/images/lock.webp'

/** The Stream Code website: what it is, the real overlay running live, and how to get it. */

// ---- the live demo: the actual overlay, in its demo mode, typing Lua by itself ----
const theme = ref<string>('mocha')
const EFFECTS = [
  { id: '3d', label: '3D tilt', query: 'tilty=-18&tiltx=5&depth=14&scale=0.9' },
  { id: 'lens', label: 'Lens zoom', query: 'zoom=lens' },
  { id: 'camera', label: 'Camera zoom', query: 'zoom=camera' },
  { id: 'clean', label: 'Just the code', query: 'clean&fade=22' },
] as const
const effects = ref<Set<string>>(new Set())

function toggle(id: string) {
  const next = new Set(effects.value)
  if (next.has(id)) next.delete(id)
  else {
    // the two zooms are alternatives, not a combination
    if (id === 'lens') next.delete('camera')
    if (id === 'camera') next.delete('lens')
    next.add(id)
  }
  effects.value = next
}

const demoSrc = computed(() => {
  const extra = EFFECTS.filter((e) => effects.value.has(e.id)).map((e) => '&' + e.query).join('')
  return `${import.meta.env.BASE_URL}overlay.html?demo&backdrop&theme=${theme.value}${extra}`
})

const FEATURES = [
  { icon: Radio, title: 'Live, as you type', body: 'The file you are in, the lines around your cursor, your selection. Updated as you type, with smooth scrolling that follows you.' },
  { icon: Palette, title: 'Twelve themes', body: 'Catppuccin to match your editor, Kick green, Twitch purple, a phosphor CRT, paper, frosted glass, synthwave neon, a Mac window and more.' },
  { icon: Box, title: '3D looks', body: 'Tilt it, turn it, give it depth and a slow float. A panel that sits in your scene instead of on top of it.' },
  { icon: ScanSearch, title: 'Zoom on what you point at', body: 'Rest the mouse on a line and the overlay zooms in on it, as a magnifier lens or a camera. Start typing and it follows your cursor again.' },
  { icon: SlidersHorizontal, title: 'Everything is a setting', body: 'Theme, header, background, line numbers, font size, fade, 3D and zoom all live in VS Code settings, with a gallery page to try them on.' },
  { icon: ShieldCheck, title: 'Private by design', body: '.env files, keys and anything named secret or token are never sent. One click pauses it. Your code never leaves your PC.' },
]

const STEPS = [
  { title: 'Install the extension', body: 'Download the .vsix and use Install from VSIX in VS Code. A Code button appears in the status bar.' },
  { title: 'Add a browser source', body: `In OBS or Meld Studio, add a Browser source pointing at ${OVERLAY_URL}` },
  { title: 'Open a file and type', body: 'That is it. The overlay follows whichever VS Code window you are typing in.' },
]

const SHOTS = [
  { src: shotLens, title: 'A lens on what you point at', caption: 'Rest the mouse on a line and a magnifier shows it to chat, while the rest of the view stays put.' },
  { src: shotCamera, title: 'Or a camera that follows you', caption: 'The whole view zooms in and pans after your cursor, smoothly, without chasing every keystroke.' },
  { src: shotNeon, title: 'Tilted, with depth', caption: 'Tilt, turn, perspective and a fake thickness, so an angled panel reads as a solid slab.' },
  { src: shotGlass, title: 'Frosted glass, angled the other way', caption: 'Every theme works with every 3D setting.' },
  { src: shotMinimal, title: 'Just the code', caption: 'No panel, no header, no numbers: the code floats over your game, and fades out at the edges if you like.' },
  { src: shotGallery, title: 'A control panel for all of it', caption: 'Every theme side by side, the 3D and zoom sliders, and a live preview. Click and it is applied.' },
  { src: shotLock, title: 'Private files stay private', caption: 'Open a .env or a credentials file and the overlay shows a lock instead of its contents.' },
]
const active = ref(0)
</script>

<template>
  <main>
    <!-- Hero -->
    <section class="mx-auto max-w-6xl px-5 pb-16 pt-10 text-center sm:pt-16">
      <p class="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-white/[.06] px-4 py-1.5 text-sm text-white/70 ring-1 ring-white/10 backdrop-blur-md">
        <MonitorPlay :size="15" class="text-sky-300" /> A VS Code extension for streamers who code
      </p>
      <h1 class="mx-auto max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
        Your code, live on stream.
      </h1>
      <p class="mx-auto mt-6 max-w-xl text-lg text-white/75 sm:text-xl">
        Show viewers the code you're writing: big, sharp and beautifully themed. Not a blurry capture of your editor.
      </p>
      <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
        <a
          :href="DOWNLOAD_URL"
          class="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-medium text-neutral-900 shadow-lg transition hover:bg-white/85"
        >
          <Download :size="18" /> Download for VS Code
        </a>
        <a
          v-if="MARKETPLACE_URL"
          :href="MARKETPLACE_URL"
          class="flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 font-medium text-white shadow-lg transition hover:bg-sky-400"
        >
          Get it on the Marketplace <ArrowRight :size="18" />
        </a>
        <span v-else class="flex items-center gap-2 rounded-full px-5 py-3 text-sm text-white/60 ring-1 ring-white/15">
          VS Code Marketplace: coming soon
        </span>
      </div>
      <p class="mt-4 text-sm text-white/50">
        Free and open source. Works with OBS, Meld Studio and anything with a browser source.
      </p>

      <!-- The real overlay, running right here in demo mode. -->
      <div id="themes" class="relative mx-auto mt-14 max-w-5xl scroll-mt-6">
        <div class="absolute -inset-6 -z-10 rounded-[2rem] bg-indigo-500/20 blur-3xl" />
        <div class="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15">
          <div class="flex items-center gap-1.5 bg-neutral-900/90 px-4 py-2.5">
            <span class="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span class="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span class="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span class="ml-3 rounded-md bg-white/10 px-3 py-0.5 font-mono text-xs text-white/50">Browser source · {{ OVERLAY_URL }}</span>
            <span class="ml-auto flex items-center gap-1.5 text-xs text-white/45"><span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> live demo</span>
          </div>
          <div class="relative aspect-[16/9] bg-[#11111b]">
            <iframe
              :key="demoSrc"
              :src="demoSrc"
              title="The Stream Code overlay, typing Lua by itself"
              class="absolute inset-0 h-full w-full border-0"
              loading="lazy"
            />
          </div>
        </div>

        <div class="mt-6 flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Theme">
          <button
            v-for="t in THEMES"
            :key="t.id"
            role="radio"
            :aria-checked="theme === t.id"
            class="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm ring-1 transition"
            :class="theme === t.id ? 'bg-white text-neutral-900 ring-white' : 'bg-white/[.06] text-white/75 ring-white/10 hover:bg-white/10 hover:text-white'"
            @click="theme = t.id"
          >
            <span class="h-2.5 w-2.5 rounded-full ring-1 ring-black/20" :style="{ background: t.swatch }" />
            {{ t.label }}
          </button>
        </div>
        <div class="mt-3 flex flex-wrap justify-center gap-2">
          <button
            v-for="e in EFFECTS"
            :key="e.id"
            :aria-pressed="effects.has(e.id)"
            class="rounded-full px-3.5 py-1.5 text-sm ring-1 transition"
            :class="effects.has(e.id) ? 'bg-sky-500 text-white ring-sky-400' : 'text-white/65 ring-white/15 hover:bg-white/10 hover:text-white'"
            @click="toggle(e.id)"
          >
            {{ e.label }}
          </button>
        </div>
        <p class="mt-3 text-xs text-white/45">This is the actual overlay running in your browser, typing by itself. On stream it shows your code.</p>
      </div>
    </section>

    <!-- How it works -->
    <section id="how" class="mx-auto max-w-5xl scroll-mt-6 px-5 pb-4">
      <h2 class="text-center text-3xl font-bold sm:text-4xl">On screen in a minute</h2>
      <ol class="mt-10 grid gap-4 sm:grid-cols-3">
        <li
          v-for="(step, i) in STEPS"
          :key="step.title"
          class="rounded-2xl bg-white/[.06] p-6 ring-1 ring-white/10 backdrop-blur-md"
        >
          <span class="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-bold text-neutral-900">{{ i + 1 }}</span>
          <h3 class="mt-4 text-lg font-semibold">{{ step.title }}</h3>
          <p class="mt-1.5 break-words text-sm leading-relaxed text-white/65">{{ step.body }}</p>
        </li>
      </ol>
      <div class="mt-8 text-center">
        <RouterLink :to="{ name: 'guide' }" class="inline-flex items-center gap-1.5 text-sm text-sky-300 transition hover:text-sky-200">
          Full setup guide and every setting <ArrowRight :size="15" />
        </RouterLink>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="mx-auto max-w-6xl scroll-mt-6 px-5 py-16">
      <h2 class="text-center text-3xl font-bold sm:text-4xl">Made for coding on stream</h2>
      <p class="mx-auto mt-3 max-w-lg text-center text-white/65">
        No tabs, sidebars, minimap or squiggles. Just your code, readable at stream size.
      </p>
      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="feature in FEATURES"
          :key="feature.title"
          class="rounded-2xl bg-white/[.06] p-6 ring-1 ring-white/10 backdrop-blur-md"
        >
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-sky-300">
            <component :is="feature.icon" :size="20" />
          </span>
          <h3 class="mt-4 text-lg font-semibold">{{ feature.title }}</h3>
          <p class="mt-1.5 text-sm leading-relaxed text-white/65">{{ feature.body }}</p>
        </div>
      </div>
    </section>

    <!-- Screenshots -->
    <section id="look" class="mx-auto max-w-6xl scroll-mt-6 px-5 py-16">
      <h2 class="text-center text-3xl font-bold sm:text-4xl">A closer look</h2>
      <div class="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_2fr]">
        <div class="space-y-2" role="tablist" aria-label="Screenshots">
          <button
            v-for="(shot, i) in SHOTS"
            :key="shot.title"
            role="tab"
            :aria-selected="active === i"
            class="block w-full rounded-xl p-4 text-left ring-1 transition"
            :class="active === i ? 'bg-white/10 ring-white/30' : 'ring-transparent hover:bg-white/5'"
            @click="active = i"
          >
            <span class="block font-semibold">{{ shot.title }}</span>
            <span class="mt-1 block text-sm text-white/60">{{ shot.caption }}</span>
          </button>
        </div>
        <div class="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15 lg:sticky lg:top-6">
          <Transition name="fade" mode="out-in">
            <img :key="active" :src="SHOTS[active].src" :alt="SHOTS[active].title" class="block w-full">
          </Transition>
        </div>
      </div>
    </section>

    <!-- Privacy -->
    <section id="privacy" class="mx-auto max-w-3xl scroll-mt-6 px-5 py-16">
      <div class="rounded-2xl bg-white/[.06] p-8 ring-1 ring-white/10 backdrop-blur-md">
        <h2 class="flex items-center gap-2.5 text-2xl font-bold"><ShieldCheck :size="24" class="text-emerald-300" /> Privacy</h2>
        <div class="mt-4 space-y-3 text-white/75">
          <p>Stream Code does not collect, sell or share any data. There are no accounts, no analytics and no servers.</p>
          <p>
            The extension runs a small local server on <code class="font-mono text-sky-300">127.0.0.1</code>, only for the overlay on your own PC.
            Other websites you have open can't read your code from it or put anything on your stream.
          </p>
          <p class="flex gap-2.5">
            <Lock :size="18" class="mt-1 shrink-0 text-emerald-300" />
            <span>
              Files that look private are never sent at all: <code class="font-mono text-sky-300">.env</code> files, keys, and anything named
              secret, credential, token or password. You can add your own patterns. The status-bar button pauses everything in one click.
            </span>
          </p>
          <p>The overlay page loads its fonts and syntax colours from public CDNs. Your code is never part of those requests.</p>
        </div>
      </div>
    </section>

    <!-- Open source -->
    <section id="contribute" class="mx-auto max-w-3xl scroll-mt-6 px-5 pb-4 pt-4">
      <div class="rounded-2xl bg-white/[.06] p-8 ring-1 ring-white/10 backdrop-blur-md">
        <div class="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
          <span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-neutral-900 shadow-lg">
            <BrandIcon :path="siGithub.path" :size="30" />
          </span>
          <div class="flex-1">
            <h2 class="text-xl font-bold">Stream Code is open source (GPL-3.0). Help build it.</h2>
            <p class="mt-1 text-white/70">
              Add a theme, fix a bug or improve the overlay, and send it as a pull request. A theme is one block of colours in
              <code class="font-mono text-sky-300">stream_code.html</code>.
            </p>
            <ol class="mt-4 grid gap-2 text-left text-sm text-white/65 sm:grid-cols-3">
              <li class="rounded-lg bg-white/5 px-3 py-2"><span class="font-semibold text-white">1.</span> Fork the repo</li>
              <li class="rounded-lg bg-white/5 px-3 py-2"><span class="font-semibold text-white">2.</span> Try it with <code class="text-sky-300">?demo</code> or <code class="text-sky-300">build_vsix.py</code></li>
              <li class="rounded-lg bg-white/5 px-3 py-2"><span class="font-semibold text-white">3.</span> Open a pull request</li>
            </ol>
            <div class="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              <a
                :href="GITHUB_URL"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-medium text-neutral-900 shadow-lg transition hover:bg-white/85"
              >
                <BrandIcon :path="siGithub.path" :size="17" /> Browse the code
              </a>
              <a
                :href="`${GITHUB_URL}/issues`"
                target="_blank"
                rel="noopener noreferrer"
                class="rounded-full px-5 py-2.5 text-sm text-white/80 ring-1 ring-white/20 transition hover:bg-white/10 hover:text-white"
              >
                Report a bug or idea
              </a>
              <a
                :href="RELEASES_URL"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm text-white/80 ring-1 ring-white/20 transition hover:bg-white/10 hover:text-white"
              >
                <Zap :size="14" /> All releases
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Support -->
    <section id="community" class="mx-auto max-w-3xl scroll-mt-6 px-5 pb-6 pt-4">
      <div class="flex flex-col items-center gap-5 rounded-2xl bg-[#5865F2]/15 p-8 text-center ring-1 ring-[#5865F2]/35 backdrop-blur-md sm:flex-row sm:text-left">
        <span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#5865F2] text-white shadow-lg">
          <BrandIcon :path="siDiscord.path" :size="30" />
        </span>
        <div class="flex-1">
          <h2 class="text-xl font-bold">Need help, or have an idea?</h2>
          <p class="mt-1 text-white/70">Join the Discord for support, and to suggest the themes and features you want next.</p>
        </div>
        <a
          :href="DISCORD_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="flex shrink-0 items-center gap-2 rounded-full bg-[#5865F2] px-5 py-2.5 font-medium text-white shadow-lg transition hover:bg-[#4752c4]"
        >
          <BrandIcon :path="siDiscord.path" :size="18" /> Join the Discord
        </a>
      </div>
    </section>
  </main>
</template>
