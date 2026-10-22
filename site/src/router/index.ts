import { createRouter, createWebHashHistory } from 'vue-router'
import Landing from '@/views/Landing.vue'

/**
 * Hash history: GitHub Pages serves one index.html and has no rewrite rules, so /#/guide
 * survives a reload where /guide would 404.
 */
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: Landing },
    { path: '/guide', name: 'guide', component: () => import('@/views/Guide.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, top: 16, behavior: 'smooth' }
    return { top: 0 }
  },
})
