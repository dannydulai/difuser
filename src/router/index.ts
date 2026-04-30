import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BuilderView from '../views/BuilderView.vue'
import ShareView from '../views/ShareView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/builder/:id', name: 'builder', component: BuilderView, props: true },
    { path: '/share', name: 'share', component: ShareView },
  ],
})

export default router
