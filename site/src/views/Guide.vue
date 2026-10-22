<script setup lang="ts">
import { ArrowLeft, Download } from 'lucide-vue-next'
import { DISCORD_URL, DOWNLOAD_URL, OVERLAY_URL } from '@/config'

/** Setup guide: install, add to OBS, and every setting and URL option in one place. */
const SETTINGS = [
  ['theme', 'mocha', 'The overlay theme. Stream Code: Pick a theme lists them.'],
  ['showHeader', 'true', 'The file-name bar above the code.'],
  ['showBackground', 'true', 'The panel background, border and shadow. Off: the code floats over your game.'],
  ['showLineNumbers', 'true', 'Line numbers.'],
  ['wordWrap', 'true', 'Wrap long lines. Off: they slide sideways to follow the cursor.'],
  ['fontSize', '22', 'Code font size in px.'],
  ['lineHeight', '1.6', 'Line height as a multiple of the font size.'],
  ['edgeFade', '4', '% of the height that fades out at the top and at the bottom. 0 = hard edges, ~25 = the code dissolves into the game.'],
  ['tiltX / tiltY / rotate', '0', '3D: tilt forward or back, turn left or right, rotate. In degrees.'],
  ['perspective', '1200', '3D perspective distance in px. Smaller is more dramatic.'],
  ['scale', '1', 'Scale of the whole panel. Shrink it when a tilted panel is cut off at the edges.'],
  ['depth', '0', 'Fake thickness in px, so an angled panel reads as a solid slab.'],
  ['float', 'false', 'A slow hovering motion.'],
  ['opacity', '1', 'Opacity of the whole panel.'],
  ['zoom', 'off', 'camera (the whole view zooms and pans) or lens (a magnifier over the spot).'],
  ['zoomFollow', 'both', 'What the zoom follows: both (whichever moved last), mouse, or cursor.'],
  ['zoomAmount', '1.8', 'Magnification, 1.1 to 4.'],
  ['zoomOutAfter', '0', 'Quiet seconds before the zoom eases back out. 0 = stay zoomed.'],
  ['hideFiles', '.env, keys, secrets...', 'File patterns that are never sent. The overlay shows a lock card instead.'],
  ['port', '7331', 'The local port the overlay connects to.'],
  ['bufferLines', '50', 'Lines sent above and below the cursor.'],
  ['overlayPath', '(empty)', 'Serve your own copy of the overlay page, to restyle it.'],
]

const URL_OPTIONS = [
  ['?theme=kick', 'Any theme name.'],
  ['?clean', 'No header and no background: just the code.'],
  ['?header=0  ?bg=0  ?nums=0  ?wrap=0', 'Each option on its own.'],
  ['?size=26  ?lh=1.8', 'Font size and line height.'],
  ['?fade=25', 'Edge fade.'],
  ['?tilty=-20  ?tiltx=6  ?depth=14  ?scale=0.9  ?float=1', '3D.'],
  ['?zoom=lens  ?zoomfollow=mouse  ?zoomamt=2  ?zoomidle=5', 'Zoom.'],
  ['?demo', 'Canned code that types itself, to position the source in OBS.'],
  ['?gallery', 'The theme gallery and control panel.'],
]
</script>

<template>
  <main class="mx-auto max-w-4xl px-5 pb-10 pt-6">
    <RouterLink :to="{ name: 'home' }" class="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white">
      <ArrowLeft :size="15" /> Back
    </RouterLink>
    <h1 class="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Setup guide</h1>
    <p class="mt-3 text-lg text-white/70">From download to your code on stream, then every way to make it yours.</p>

    <section class="mt-10 rounded-2xl bg-white/[.06] p-8 ring-1 ring-white/10 backdrop-blur-md">
      <h2 class="text-2xl font-bold">1. Install the extension</h2>
      <ol class="mt-4 list-decimal space-y-2 pl-5 text-white/75">
        <li>
          Download <a :href="DOWNLOAD_URL" class="text-sky-300 underline-offset-2 hover:underline">stream-code.vsix</a>.
        </li>
        <li>In VS Code open the Extensions view, click the <b>...</b> menu at its top and choose <b>Install from VSIX...</b>.</li>
        <li>A <b>Code</b> item appears at the right of the status bar. Clicking it pauses and resumes broadcasting.</li>
      </ol>
      <a :href="DOWNLOAD_URL" class="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-medium text-neutral-900 shadow-lg transition hover:bg-white/85">
        <Download :size="17" /> Download the latest version
      </a>
    </section>

    <section class="mt-6 rounded-2xl bg-white/[.06] p-8 ring-1 ring-white/10 backdrop-blur-md">
      <h2 class="text-2xl font-bold">2. Add it to OBS</h2>
      <ol class="mt-4 list-decimal space-y-2 pl-5 text-white/75">
        <li>Add a <b>Browser</b> source (Meld Studio and other streaming apps have the same thing).</li>
        <li>URL: <code class="rounded bg-black/30 px-1.5 py-0.5 font-mono text-sky-300">{{ OVERLAY_URL }}</code></li>
        <li>Width and height: the space you want it to take. 900 × 560 is a good start; it shows as many lines as fit.</li>
        <li>Leave <b>Shutdown source when not visible</b> off, so it stays connected.</li>
      </ol>
      <p class="mt-4 text-sm text-white/55">
        Want to position it before you have code open? Add <code class="font-mono text-sky-300">?demo</code> to the URL for code that types itself.
      </p>
    </section>

    <section class="mt-6 rounded-2xl bg-white/[.06] p-8 ring-1 ring-white/10 backdrop-blur-md">
      <h2 class="text-2xl font-bold">3. Make it yours</h2>
      <p class="mt-3 text-white/75">
        Press <kbd class="rounded bg-black/30 px-1.5 py-0.5 font-mono text-sm">Ctrl+Shift+P</kbd> and run one of:
      </p>
      <ul class="mt-3 space-y-1.5 text-white/75">
        <li><b>Stream Code: Pick a theme</b>, a quick list of all twelve.</li>
        <li><b>Stream Code: Settings</b>, every option below on one page.</li>
        <li><b>Stream Code: Open the theme gallery / control panel</b>, every theme side by side with sliders and a live preview.</li>
      </ul>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-white/50">
            <tr><th class="py-2 pr-4 font-medium">Setting (streamCode.)</th><th class="py-2 pr-4 font-medium">Default</th><th class="py-2 font-medium">What it does</th></tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="[name, def, what] in SETTINGS" :key="name">
              <td class="whitespace-nowrap py-2 pr-4 font-mono text-sky-300">{{ name }}</td>
              <td class="whitespace-nowrap py-2 pr-4 font-mono text-white/60">{{ def }}</td>
              <td class="py-2 text-white/75">{{ what }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="mt-6 rounded-2xl bg-white/[.06] p-8 ring-1 ring-white/10 backdrop-blur-md">
      <h2 class="text-2xl font-bold">Different looks per scene</h2>
      <p class="mt-3 text-white/75">
        Options on a browser source's URL override the settings for that source only, so two scenes can use two looks.
      </p>
      <dl class="mt-4 space-y-2 text-sm">
        <div v-for="[opt, what] in URL_OPTIONS" :key="opt" class="grid gap-1 sm:grid-cols-[minmax(0,1.3fr)_1fr]">
          <dt class="break-words font-mono text-sky-300">{{ opt }}</dt>
          <dd class="text-white/70">{{ what }}</dd>
        </div>
      </dl>
    </section>

    <section class="mt-6 rounded-2xl bg-white/[.06] p-8 ring-1 ring-white/10 backdrop-blur-md">
      <h2 class="text-2xl font-bold">Good to know</h2>
      <div class="mt-4 space-y-4 text-white/75">
        <p>
          <b class="text-white">How does it know where the mouse is?</b> VS Code doesn't tell extensions. Stream Code uses the spot where
          the mouse rests over code (the moment a hover tooltip would appear) and where you click, so the zoom moves when the mouse settles,
          not on every pixel. It never adds a tooltip of its own.
        </p>
        <p>
          <b class="text-white">Several VS Code windows?</b> Fine. The first one runs the overlay; the others hand over to it while you type in them.
        </p>
        <p>
          <b class="text-white">Nothing shows up?</b> Check the <b>Code</b> item in the status bar isn't paused, open
          <code class="font-mono text-sky-300">{{ OVERLAY_URL }}?debug</code> in a browser to see the connection, and make sure the
          file isn't one of the private patterns.
        </p>
        <p>
          <b class="text-white">Still stuck?</b> Ask in the <a :href="DISCORD_URL" target="_blank" rel="noopener noreferrer" class="text-sky-300 underline-offset-2 hover:underline">Discord</a>.
        </p>
      </div>
    </section>
  </main>
</template>
