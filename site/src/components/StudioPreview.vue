<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Circle, Eye, Gamepad2, Globe, Lock, MonitorPlay, Settings, Video, Volume2
} from 'lucide-vue-next'

/**
 * The hero preview, dressed as a streaming studio: a 1080p program canvas with a game scene,
 * and the real overlay as a selected browser source in the bottom-right corner, and the docks a streamer knows
 * (scenes, sources, audio mixer, controls). Generic on purpose: no OBS or Meld branding.
 * The canvas is laid out at 1920x1080 and scaled to fit, the way a streaming app scales sources.
 */
const debug = false
const log = (...a: unknown[]) => { if (debug) console.log('[StudioPreview]', ...a) }

// ---- scenes: each one is a look for the overlay source, switched like scenes in a streaming app ----
const SCENES = [
  { id: '3d', label: '3D tilt', query: 'tilty=-16&tiltx=4&depth=14&scale=0.92&zoom=lens' },
  { id: 'lens', label: 'Lens zoom', query: 'zoom=lens' },
  { id: 'camera', label: 'Camera zoom', query: 'zoom=camera' },
] as const
const scene = ref<string>('3d')

const overlaySrc = computed(() => {
  const s = SCENES.find((x) => x.id === scene.value) ?? SCENES[0]
  // no ?backdrop and ?clean: the overlay is transparent and floats over the game, like a real browser source
  return `${import.meta.env.BASE_URL}overlay.html?demo&size=30&clean&fade=22&${s.query}`
})

// ---- scale the 1920x1080 program canvas to the space it has ----
const stageBox = ref<HTMLElement | null>(null)
const scale = ref(0.5)
let ro: ResizeObserver | null = null

// ---- a little life: the stream clock and the audio meters ----
const uptime = ref(42 * 60 + 13)
const meters = ref([0.55, 0.35])
let clock = 0
let meterTimer = 0

const hhmmss = computed(() => {
  const s = uptime.value
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':')
})

onMounted(() => {
  if (stageBox.value) {
    ro = new ResizeObserver(([entry]) => { scale.value = entry.contentRect.width / 1920; log('scale', scale.value) })
    ro.observe(stageBox.value)
  }
  clock = window.setInterval(() => { uptime.value++ }, 1000)
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    meterTimer = window.setInterval(() => {
      meters.value = [0.35 + Math.random() * 0.45, 0.15 + Math.random() * (Math.random() < 0.4 ? 0.6 : 0.15)]
    }, 140)
  }
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  clearInterval(clock)
  clearInterval(meterTimer)
})

// ---- the game scene: a night city skyline, generated once from a fixed seed ----
let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const BUILDINGS = Array.from({ length: 34 }, (_, i) => {
  const w = 40 + rnd() * 70
  const h = 120 + rnd() * 330
  return { x: i * 58 - 20 + rnd() * 20, w, h, tone: rnd() }
})
const WINDOWS = BUILDINGS.flatMap((b) => {
  const out: { x: number; y: number; on: boolean }[] = []
  for (let y = 600 - b.h + 14; y < 590; y += 18) {
    for (let x = b.x + 8; x < b.x + b.w - 10; x += 14) out.push({ x, y, on: rnd() < 0.2 })
  }
  return out
}).filter((w) => w.on)

const SOURCES = [
  { name: 'Stream Code', kind: 'Browser', icon: Globe, selected: true },
  { name: 'Game', kind: 'Game capture', icon: Gamepad2, selected: false },
]
</script>

<template>
  <div class="overflow-hidden rounded-2xl bg-[#1b1d24] text-left shadow-2xl ring-1 ring-white/15">
    <!-- window title bar -->
    <div class="flex items-center gap-1.5 border-b border-black/40 bg-[#14161b] px-4 py-2">
      <span class="h-2.5 w-2.5 rounded-full bg-white/20" />
      <span class="h-2.5 w-2.5 rounded-full bg-white/20" />
      <span class="h-2.5 w-2.5 rounded-full bg-white/20" />
      <span class="ml-3 flex min-w-0 items-center gap-1.5 truncate text-xs text-white/55"><MonitorPlay :size="13" class="shrink-0" /> Streaming studio<span class="hidden sm:inline"> · Scene: {{ SCENES.find((x) => x.id === scene)?.label }}</span></span>
      <span class="ml-auto flex shrink-0 items-center gap-1.5 rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold tracking-wider text-white">
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE {{ hhmmss }}
      </span>
    </div>

    <!-- program canvas -->
    <div class="bg-[#0d0e12] p-2 sm:p-3">
      <div ref="stageBox" class="relative aspect-video w-full overflow-hidden bg-black ring-1 ring-white/10">
        <div class="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left" :style="{ transform: `scale(${scale})` }">
          <!-- game: night city -->
          <div class="absolute inset-0 bg-[linear-gradient(180deg,#0b1030_0%,#2a1748_38%,#7a2f5a_56%,#ff8a5b_66%,#1a1020_67%,#111018_100%)]" />
          <div class="absolute left-[1300px] top-[470px] h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,#ffd08a_0%,#ff8a5b_45%,transparent_70%)] opacity-80" />
          <svg class="absolute left-0 top-[120px]" width="1920" height="620" viewBox="0 0 1920 620" aria-hidden="true">
            <rect v-for="(b, i) in BUILDINGS" :key="'b' + i" :x="b.x * 1.03" :y="600 - b.h" :width="b.w" :height="b.h + 20"
              :fill="b.tone > 0.5 ? '#151229' : '#1d1735'" />
            <rect v-for="(w, i) in WINDOWS" :key="'w' + i" :x="w.x * 1.03" :y="w.y" width="6" height="8" fill="#ffd48a" opacity="0.45" />
          </svg>
          <!-- road with perspective lines -->
          <div class="absolute bottom-0 left-0 h-[360px] w-full bg-[linear-gradient(180deg,#1a1626,#0c0b12)]" />
          <svg class="absolute bottom-0 left-0" width="1920" height="360" viewBox="0 0 1920 360" aria-hidden="true">
            <polygon points="760,0 1160,0 1760,360 160,360" fill="#22202c" />
            <line x1="960" y1="0" x2="960" y2="360" stroke="#f4d35e" stroke-width="10" stroke-dasharray="40 50" opacity="0.8" />
            <line x1="760" y1="0" x2="160" y2="360" stroke="#ffffff" stroke-width="5" opacity="0.35" />
            <line x1="1160" y1="0" x2="1760" y2="360" stroke="#ffffff" stroke-width="5" opacity="0.35" />
          </svg>
          <!-- game HUD -->
          <div class="absolute bottom-[40px] left-[40px] h-[220px] w-[220px] overflow-hidden rounded-full border-[6px] border-black/60 bg-[#2b3a2f] shadow-2xl">
            <div class="absolute left-[95px] top-0 h-full w-[24px] bg-[#55606a]" />
            <div class="absolute left-0 top-[120px] h-[20px] w-full bg-[#55606a]" />
            <div class="absolute left-[150px] top-[30px] h-[60px] w-[40px] rounded bg-[#3d5c45]" />
            <div class="absolute left-[100px] top-[100px] h-0 w-0 border-x-[10px] border-b-[22px] border-x-transparent border-b-sky-300" />
          </div>
          <div class="absolute bottom-[40px] left-[280px] w-[210px] space-y-2">
            <div class="h-[10px] rounded bg-black/50"><div class="h-full w-[82%] rounded bg-emerald-400" /></div>
            <div class="h-[10px] rounded bg-black/50"><div class="h-full w-[45%] rounded bg-sky-400" /></div>
          </div>
          <div class="absolute right-[48px] top-[36px] text-right font-mono text-[44px] font-bold tracking-wide text-emerald-300 [text-shadow:0_3px_0_#000]">$24,580</div>
          <div class="absolute right-[48px] top-[100px] flex gap-2 text-[34px] text-white/30">
            <span class="text-amber-300">★</span><span class="text-amber-300">★</span><span>★</span><span>★</span><span>★</span>
          </div>

          <!-- the Stream Code browser source, selected -->
          <div class="absolute bottom-[40px] right-[40px] h-[640px] w-[1080px]">
            <iframe
              :key="overlaySrc"
              :src="overlaySrc"
              title="The Stream Code overlay, typing Lua by itself"
              class="absolute inset-0 h-full w-full border-0 bg-transparent"
              allowtransparency="true"
              loading="lazy"
            />
            <div class="pointer-events-none absolute inset-0 outline outline-[3px] outline-[#e2453c]">
              <span v-for="p in ['-left-[9px] -top-[9px]', 'left-1/2 -top-[9px] -translate-x-1/2', '-right-[9px] -top-[9px]', '-left-[9px] top-1/2 -translate-y-1/2', '-right-[9px] top-1/2 -translate-y-1/2', '-left-[9px] -bottom-[9px]', 'left-1/2 -bottom-[9px] -translate-x-1/2', '-right-[9px] -bottom-[9px]']"
                :key="p" class="absolute h-[18px] w-[18px] bg-[#e2453c]" :class="p" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- docks -->
    <div class="grid gap-px bg-black/40 text-xs text-white/75 sm:grid-cols-2 lg:grid-cols-4">
      <section class="bg-[#1b1d24] p-3">
        <h3 class="mb-2 font-semibold text-white/50">Scenes</h3>
        <ul class="space-y-0.5" role="radiogroup" aria-label="Scene">
          <li v-for="s in SCENES" :key="s.id">
            <button
              role="radio"
              :aria-checked="scene === s.id"
              class="w-full rounded px-2 py-1 text-left transition"
              :class="scene === s.id ? 'bg-[#3b4a6b] text-white' : 'hover:bg-white/5 hover:text-white'"
              @click="scene = s.id"
            >
              {{ s.label }}
            </button>
          </li>
        </ul>
        <p class="mt-2 text-[11px] text-white/35">Click a scene to switch the look.</p>
      </section>
      <section class="bg-[#1b1d24] p-3">
        <h3 class="mb-2 font-semibold text-white/50">Sources</h3>
        <ul class="space-y-0.5">
          <li v-for="s in SOURCES" :key="s.name" class="flex items-center gap-2 rounded px-2 py-1" :class="s.selected ? 'bg-[#3b4a6b] text-white' : ''">
            <component :is="s.icon" :size="13" class="shrink-0 opacity-70" />
            <span class="truncate">{{ s.name }}</span>
            <span class="ml-auto flex shrink-0 gap-1.5 opacity-50"><Eye :size="13" /><Lock :size="13" /></span>
          </li>
        </ul>
      </section>
      <section class="bg-[#1b1d24] p-3">
        <h3 class="mb-2 font-semibold text-white/50">Audio Mixer</h3>
        <div v-for="(m, i) in meters" :key="i" class="mb-2.5">
          <div class="mb-1 flex items-center gap-1.5"><Volume2 :size="12" class="opacity-60" /> {{ i === 0 ? 'Desktop Audio' : 'Mic' }}</div>
          <div class="h-2 overflow-hidden rounded-sm bg-black/50">
            <div class="h-full rounded-sm bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 transition-[width] duration-100" :style="{ width: `${m * 100}%` }" />
          </div>
        </div>
      </section>
      <section class="bg-[#1b1d24] p-3">
        <h3 class="mb-2 font-semibold text-white/50">Controls</h3>
        <div class="space-y-1.5">
          <div class="flex items-center justify-center gap-1.5 rounded bg-red-600/90 py-1.5 font-semibold text-white"><Circle :size="10" fill="currentColor" /> Stop Streaming</div>
          <div class="flex items-center justify-center gap-1.5 rounded bg-white/10 py-1.5"><Video :size="12" /> Start Recording</div>
          <div class="flex items-center justify-center gap-1.5 rounded bg-white/10 py-1.5"><Settings :size="12" /> Settings</div>
        </div>
      </section>
    </div>
  </div>
</template>
