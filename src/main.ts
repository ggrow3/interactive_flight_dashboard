import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// Clear stored flight data if it might be corrupted
// This helps with legacy flight IDs like mock-flight-5
const clearStorageIfNeeded = () => {
  if (window.location.href.includes('?reset=true') || 
      window.location.href.includes('flights/mock-flight-')) {
    try {
      // If URL contains ?reset=true or is a legacy flight detail page,
      // clear stored flights to regenerate fresh data
      console.log('Clearing stored flight data to ensure compatibility')
      localStorage.removeItem('flight_dashboard_flights')
    } catch (e) {
      console.error('Error clearing localStorage:', e)
    }
  }
}

// Run this before app initialization
clearStorageIfNeeded()

// Create Vue application
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Use mock services in development
const USE_MOCK_SERVICES = true

// Setup authentication
if (USE_MOCK_SERVICES) {
  // Use a simpler approach for mock authentication
  import('./services/mockAuthService').then(mockAuth => {
    // Create a mock auth instance
    const auth = mockAuth.getMockAuth()
    
    // Make it globally available
    window.firebase = {
      auth: {
        getAuth: () => auth
      }
    }
    
    console.log('Using mock authentication for development')
    
    // Initialize the auth store after mock auth is ready
    import('./stores/auth').then(({ useAuthStore }) => {
      const authStore = useAuthStore()
      authStore.initAuth()
      
      // Mount the app after auth is initialized
      app.mount('#app')
      console.log('App mounted with mock authentication')
    })
  })
} else {
  // For production: Initialize Firebase
  import('firebase/app').then(({ initializeApp }) => {
    // Import auth and firestore modules
    Promise.all([
      import('firebase/auth'),
      import('firebase/firestore')
    ]).then(([firebaseAuth, firebaseFirestore]) => {
      const { getAuth } = firebaseAuth
      const { getFirestore } = firebaseFirestore
      
      // Firebase config
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      }
      
      const firebaseApp = initializeApp(firebaseConfig)
      const auth = getAuth(firebaseApp)
      const db = getFirestore(firebaseApp)
      
      console.log('Using real Firebase authentication')
      
      // Initialize the auth store after Firebase is ready
      import('./stores/auth').then(({ useAuthStore }) => {
        const authStore = useAuthStore()
        authStore.initAuth()
        
        // Mount the app after auth is initialized
        app.mount('#app')
        console.log('App mounted with Firebase authentication')
      })
    })
  })
}

// Track if the app has been mounted
let appMounted = false

// Mark app as mounted when it's mounted
const originalMount = app.mount
app.mount = function(rootContainer) {
  appMounted = true
  return originalMount.call(this, rootContainer)
} as typeof app.mount

// Fallback initialization in case something goes wrong with the dynamic imports
setTimeout(() => {
  if (!appMounted) {
    console.log('App not mounted yet, mounting as fallback')
    app.mount('#app')
  }
}, 2000)

// Add the firebase property to the Window interface
declare global {
  interface Window {
    firebase?: {
      auth: {
        getAuth: () => any
      }
    }
  }
}