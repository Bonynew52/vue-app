import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import EventReservationView from '../views/EventReservationView.vue'
import LoginView from '../views/LoginView.vue'
import MenuView from '../views/MenuView.vue'
import OrderView from '../views/OrderView.vue'
import OrdersView from '../views/OrdersView.vue'
import PickupView from '../views/PickupView.vue'

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
      component: OrderView,
    },
    {
      path: '/recoger',
      name: 'pickup',
      component: PickupView,
      meta: { orderMode: 'pickup' },
    },
    {
      path: '/reservar-evento',
      name: 'eventReservation',
      component: EventReservationView,
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
