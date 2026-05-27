import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import MenuView from '../views/MenuView.vue'
import OrdersView from '../views/OrdersView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/menu',
      name: 'menu',
      component: MenuView,
    },
    {
      path: '/ordenar',
      name: 'order',
      component: MenuView,
    },
    {
      path: '/ordenes',
      name: 'orders',
      component: OrdersView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
  ],
})
