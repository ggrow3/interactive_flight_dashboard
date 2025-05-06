import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User as FirebaseUser } from 'firebase/auth'

// Support both mock and real Firebase auth
// We'll dynamically import the appropriate functions based on environment
let getAuth: () => any
let signInWithEmailAndPassword: (auth: any, email: string, password: string) => Promise<any>
let signOut: (auth: any) => Promise<void>
let onAuthStateChanged: (auth: any, callback: (user: any) => void) => () => void

// Determine if we're using mock services or real Firebase
const useMockServices = true // Should match the setting in main.ts

// Import the appropriate auth functions
if (useMockServices) {
  // We'll use dynamic imports for the mock services
  import('../services/mockAuthService').then(mockAuth => {
    getAuth = () => {
      // Use the global mock auth instance created in main.ts if available,
      // otherwise create a new one
      if (window.firebase?.auth?.getAuth) {
        return window.firebase.auth.getAuth()
      }
      return mockAuth.getMockAuth()
    }
    signInWithEmailAndPassword = mockAuth.signInWithEmailAndPassword
    signOut = mockAuth.signOut
    onAuthStateChanged = mockAuth.onAuthStateChanged
    console.log('Auth store using mock authentication')
  })
} else {
  // Import real Firebase auth
  import('firebase/auth').then(firebaseAuth => {
    getAuth = firebaseAuth.getAuth
    signInWithEmailAndPassword = firebaseAuth.signInWithEmailAndPassword
    signOut = firebaseAuth.signOut
    onAuthStateChanged = firebaseAuth.onAuthStateChanged
    console.log('Auth store using real Firebase authentication')
  })
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<FirebaseUser | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  
  const isAuthenticated = computed(() => !!user.value)
  
  // Initialize auth state
  const initAuth = () => {
    // If the auth functions aren't loaded yet, wait a short time and try again
    if (!getAuth) {
      console.log('Auth functions not loaded yet, waiting...')
      setTimeout(initAuth, 100)
      return
    }
    
    const auth = getAuth()
    onAuthStateChanged(auth, (userState: FirebaseUser | null) => {
      user.value = userState
      loading.value = false
      console.log('Auth state initialized:', userState ? 'User logged in' : 'No user')
    })
  }
  
  // Login
  const login = async (email: string, password: string) => {
    try {
      // If the auth functions aren't loaded yet, wait a short time and try again
      if (!getAuth || !signInWithEmailAndPassword) {
        console.log('Auth functions not loaded yet, waiting...')
        await new Promise(resolve => setTimeout(resolve, 100))
        return login(email, password)
      }
      
      loading.value = true
      error.value = null
      const auth = getAuth()
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      user.value = userCredential.user
      console.log('Login successful')
      return userCredential.user
    } catch (err: any) {
      console.error('Login error:', err)
      error.value = err.message || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  // Logout
  const logout = async () => {
    try {
      // If the auth functions aren't loaded yet, wait a short time and try again
      if (!getAuth || !signOut) {
        console.log('Auth functions not loaded yet, waiting...')
        await new Promise(resolve => setTimeout(resolve, 100))
        return logout()
      }
      
      loading.value = true
      error.value = null
      const auth = getAuth()
      await signOut(auth)
      user.value = null
      console.log('Logout successful')
    } catch (err: any) {
      console.error('Logout error:', err)
      error.value = err.message || 'Logout failed'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  return {
    user,
    loading,
    error,
    isAuthenticated,
    initAuth,
    login,
    logout
  }
})

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