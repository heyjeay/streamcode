<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * The site's background: a night sky in Catppuccin colours with faint, syntax-coloured code
 * drifting slowly upward through it. One canvas, one animation frame loop. It pauses while the
 * tab is hidden, draws a single still frame for prefers-reduced-motion, and releases everything
 * on unmount.
 */
const debug = false
const log = (...a: unknown[]) => { if (debug) console.log('[CodeSky]', ...a) }

const canvas = ref<HTMLCanvasElement | null>(null)

const TOKENS = [
  'local', 'function', 'end', 'return', 'if', 'then', 'const', '=>', '{ }', '( )', '[ ]', '==', '~=',
  'vector3', 'exports', 'Config', 'true', 'false', 'nil', 'async', 'await', 'import', '</>', '#', '//', '--',
  'player', 'src', 'emit', 'onTick', '0.5', '42', "'easy'", 'self', 'for', 'while', 'let',
]
const COLOURS = ['#cba6f7', '#89b4fa', '#a6e3a1', '#fab387', '#f9e2af', '#94e2d5', '#f5c2e7', '#b4befe']

interface Star { x: number; y: number; r: number; phase: number; speed: number }
interface Glyph { x: number; y: number; text: string; colour: string; size: number; vy: number; alpha: number; drift: number }

let ctx: CanvasRenderingContext2D | null = null
let stars: Star[] = []
let glyphs: Glyph[] = []
let w = 0
let h = 0
let dpr = 1
let raf = 0
let last = 0
let still = false
let motionQuery: MediaQueryList | null = null

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function makeGlyph(anywhere: boolean): Glyph {
  const size = rand(11, 20)
  return {
    x: rand(0, w),
    y: anywhere ? rand(0, h) : h + rand(10, 80),
    text: TOKENS[Math.floor(Math.random() * TOKENS.length)],
    colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    size,
    vy: rand(6, 16) * (size / 16), // bigger is nearer, and nearer moves faster
    alpha: rand(0.06, 0.2),
    drift: rand(-3, 3),
  }
}

function resize() {
  if (!canvas.value || !ctx) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = window.innerWidth
  h = window.innerHeight
  canvas.value.width = Math.round(w * dpr)
  canvas.value.height = Math.round(h * dpr)
  canvas.value.style.width = w + 'px'
  canvas.value.style.height = h + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const area = w * h
  stars = Array.from({ length: Math.round(area / 5200) }, () => ({
    x: rand(0, w), y: rand(0, h), r: rand(0.3, 1.3), phase: rand(0, Math.PI * 2), speed: rand(0.4, 1.4),
  }))
  glyphs = Array.from({ length: Math.round(Math.min(70, area / 26000)) }, () => makeGlyph(true))
  log('resize', w, h, stars.length, 'stars', glyphs.length, 'glyphs')
  if (still) draw(0, 0)
}

function draw(t: number, dt: number) {
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  for (const s of stars) {
    const a = 0.35 + 0.45 * Math.sin(s.phase + t * 0.001 * s.speed)
    ctx.globalAlpha = Math.max(0.05, a)
    ctx.fillStyle = '#cdd6f4'
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.textBaseline = 'middle'
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i]
    g.y -= g.vy * dt
    g.x += g.drift * dt
    if (g.y < -40) glyphs[i] = makeGlyph(false)
    // fade in from the bottom and out towards the top
    const edge = Math.min(1, (h - g.y) / 160, Math.max(0, g.y) / 220)
    ctx.globalAlpha = g.alpha * Math.max(0, edge)
    ctx.fillStyle = g.colour
    ctx.font = `500 ${g.size}px 'JetBrains Mono Variable', Consolas, monospace`
    ctx.fillText(g.text, g.x, g.y)
  }
  ctx.globalAlpha = 1
}

function frame(t: number) {
  const dt = last ? Math.min(0.05, (t - last) / 1000) : 0
  last = t
  draw(t, dt)
  raf = requestAnimationFrame(frame)
}

function start() {
  if (still || raf) return
  last = 0
  raf = requestAnimationFrame(frame)
}

function stop() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

function onVisibility() {
  if (document.hidden) stop()
  else start()
}

function onMotionChange() {
  still = !!motionQuery?.matches
  if (still) { stop(); draw(0, 0) } else start()
}

onMounted(() => {
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  still = motionQuery.matches
  resize()
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', onVisibility)
  motionQuery.addEventListener('change', onMotionChange)
  if (still) draw(0, 0)
  else start()
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', onVisibility)
  motionQuery?.removeEventListener('change', onMotionChange)
  stars = []
  glyphs = []
  ctx = null
})
</script>

<template>
  <div class="fixed inset-0 -z-20 bg-[radial-gradient(ellipse_at_top,#2a1f4d_0%,#11111b_55%,#0b0b14_100%)]">
    <div class="absolute -left-40 top-1/3 h-[32rem] w-[32rem] rounded-full bg-indigo-600/15 blur-3xl" />
    <div class="absolute -right-32 top-10 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/10 blur-3xl" />
    <canvas ref="canvas" class="absolute inset-0" aria-hidden="true" />
  </div>
</template>
