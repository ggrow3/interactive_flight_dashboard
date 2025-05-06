import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/flights',
    name: 'Flights',
    component: () => import('../views/Flights.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/flights/:flightId',
    name: 'FlightDetails',
    component: () => import('../views/FlightDetails.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/passengers',
    name: 'Passengers',
    component: () => import('../views/Passengers.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/passengers/:passengerId',
    name: 'PassengerDetails',
    component: () => import('../views/PassengerDetails.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/analytics',
    name: 'Analytics',
    component: () => import('../views/Analytics.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Determine if we're using development mode
const devMode = true // Set to true for development, false for production

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  
  // In development mode, skip authentication check
  if (devMode) {
    return next()
  }
  
  // For login page, always allow access
  if (to.path === '/login') {
    return next()
  }
  
  // For authenticated routes in production, check auth
  if (requiresAuth) {
    // Get auth state from store
    const authStore = useAuthStore()
    
    // If we're still loading auth state, wait for it
    if (authStore.loading) {
      console.log('Auth state still loading, waiting...')
      
      // Create a promise that resolves when auth state is loaded
      await new Promise<void>((resolve) => {
        const checkAuth = () => {
          if (!authStore.loading) {
            resolve()
          } else {
            setTimeout(checkAuth, 100)
          }
        }
        checkAuth()
      })
    }
    
    // Now check if user is authenticated
    if (authStore.isAuthenticated) {
      return next()
    } else {
      console.log('Not authenticated, redirecting to login')
      return next('/login')
    }
  }
  
  // Default - allow navigation
  next()
})

export default router