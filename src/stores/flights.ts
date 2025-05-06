import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { Flight, FlightStatus } from '../types/flight'
import { fetchFlightData } from '../services/flightDataService'
// Import mock data for development
import { generateMockFlights } from '../services/mockData'

// Development mode flag
const isDev = true // Set to false in production

// Storage key for caching flights
const STORAGE_KEY = 'flight_dashboard_flights'

export const useFlightStore = defineStore('flights', () => {
  // Initialize flights from localStorage if available
  const initialFlights = (() => {
    if (isDev && typeof localStorage !== 'undefined') {
      const storedFlights = localStorage.getItem(STORAGE_KEY)
      if (storedFlights) {
        try {
          // Parse dates properly from JSON
          const parsedFlights = JSON.parse(storedFlights, (key, value) => {
            // Convert date strings back to Date objects
            if (key === 'scheduledDeparture' || key === 'scheduledArrival' || 
                key === 'actualDeparture' || key === 'actualArrival' || 
                key === 'updatedAt' || key === 'createdAt') {
              return value ? new Date(value) : null
            }
            return value
          })
          
          if (Array.isArray(parsedFlights) && parsedFlights.length > 0) {
            console.log('Loaded flights from localStorage:', parsedFlights.length)
            return parsedFlights
          }
        } catch (e) {
          console.error('Error parsing stored flights:', e)
        }
      }
    }
    return []
  })()
  
  const flights = ref<Flight[]>(initialFlights)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const dataInitialized = ref(initialFlights.length > 0)
  
  // Getters
  const getFlightById = computed(() => {
    return (id: string) => flights.value.find(flight => flight.id === id)
  })
  
  const flightsByStatus = computed(() => {
    return (status: FlightStatus) => flights.value.filter(flight => flight.status === status)
  })
  
  const inboundFlights = computed(() => {
    return flights.value.filter(flight => flight.flightType === 'arrival')
  })
  
  const outboundFlights = computed(() => {
    return flights.value.filter(flight => flight.flightType === 'departure')
  })
  
  const delayedFlights = computed(() => {
    return flights.value.filter(flight => flight.delayMinutes > 0)
  })
  
  // Save flights to localStorage
  const saveFlightsToStorage = () => {
    if (isDev && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(flights.value))
      } catch (e) {
        console.error('Error saving flights to localStorage:', e)
      }
    }
  }
  
  // Actions
  const fetchFlights = async (date?: Date, force: boolean = false) => {
    try {
      // If we already have data and aren't forcing a refresh, return early
      if (dataInitialized.value && !force && flights.value.length > 0) {
        console.log('Using cached flight data')
        return
      }
      
      loading.value = true
      error.value = null
      
      if (isDev) {
        // Use mock data in development
        console.log('Generating new mock flight data')
        
        // Generate new mock data, but preserve existing flight IDs if possible
        const mockFlights = generateMockFlights(30)
        
        // If we already have flights, try to preserve the IDs for existing flights
        if (flights.value.length > 0) {
          // Create a mapping of flight numbers to existing IDs
          const existingFlightMap = new Map(
            flights.value.map(flight => [flight.flightNumber, flight.id])
          )
          
          // Update the generated flights with existing IDs where possible
          mockFlights.forEach(flight => {
            const existingId = existingFlightMap.get(flight.flightNumber)
            if (existingId) {
              flight.id = existingId
            }
          })
        }
        
        flights.value = mockFlights
        dataInitialized.value = true
        saveFlightsToStorage()
        return
      }
      
      const db = getFirestore()
      const flightsCollection = collection(db, 'flights')
      
      let q = query(flightsCollection)
      
      if (date) {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)
        
        q = query(
          flightsCollection,
          where('scheduledDeparture', '>=', startOfDay),
          where('scheduledDeparture', '<=', endOfDay)
        )
      }
      
      const querySnapshot = await getDocs(q)
      flights.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Flight[]
      
      // Fetch real-time data for each flight
      await Promise.all(
        flights.value.map(async (flight) => {
          try {
            const realTimeData = await fetchFlightData(flight.flightNumber)
            if (realTimeData) {
              // Update with real-time data
              Object.assign(flight, realTimeData)
            }
          } catch (err) {
            console.error(`Error fetching real-time data for flight ${flight.flightNumber}:`, err)
          }
        })
      )
      
      dataInitialized.value = true
      saveFlightsToStorage()
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching flights:', err)
    } finally {
      loading.value = false
    }
  }
  
  const updateFlight = async (id: string, data: Partial<Flight>) => {
    try {
      loading.value = true
      error.value = null
      
      if (isDev) {
        // Update mock data in development
        const index = flights.value.findIndex(flight => flight.id === id)
        if (index !== -1) {
          flights.value[index] = { ...flights.value[index], ...data, updatedAt: new Date() }
          saveFlightsToStorage()
        }
        return
      }
      
      const db = getFirestore()
      const flightRef = doc(db, 'flights', id)
      await updateDoc(flightRef, data)
      
      // Update local state
      const index = flights.value.findIndex(flight => flight.id === id)
      if (index !== -1) {
        flights.value[index] = { ...flights.value[index], ...data }
        saveFlightsToStorage()
      }
      
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const addFlight = async (flight: Omit<Flight, 'id'>) => {
    try {
      loading.value = true
      error.value = null
      
      if (isDev) {
        // Add to mock data in development
        const newFlight = { 
          id: `mock-flight-${Date.now()}`, // Use timestamp to ensure uniqueness
          ...flight,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Flight
        flights.value.push(newFlight)
        saveFlightsToStorage()
        return newFlight
      }
      
      const db = getFirestore()
      const flightsCollection = collection(db, 'flights')
      const docRef = await addDoc(flightsCollection, flight)
      
      const newFlight = { id: docRef.id, ...flight } as Flight
      flights.value.push(newFlight)
      saveFlightsToStorage()
      
      return newFlight
      
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  // Get a flight by ID, fetch if not found
  const fetchFlightById = async (id: string): Promise<Flight | null> => {
    try {
      // Check if we already have this flight in our store
      const existingFlight = getFlightById.value(id)
      if (existingFlight) {
        console.log(`Found flight ${id} in cache`)
        return existingFlight
      }
      
      console.log(`Flight ${id} not found in cache, attempting to fetch it`)
      
      // Special handling for legacy mock-flight IDs
      if (isDev && id.startsWith('mock-flight-') && id.split('-').length === 3) {
        const mockIndex = parseInt(id.split('-')[2])
        if (!isNaN(mockIndex)) {
          console.log(`Handling legacy ID ${id} - regenerating mock data`)
          // If this is a legacy ID like mock-flight-5, force regenerate flights
          // but first clear localStorage to ensure clean generation
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY)
          }
          
          // Regenerate flights with the same count to ensure index-based IDs match
          const newFlights = generateMockFlights(Math.max(30, mockIndex + 5))
          
          // Special handling for legacy mock IDs - create a compatibility flight
          const legacyFlight = newFlights.find(f => f.id.includes(`-${mockIndex}-`))
          
          if (legacyFlight) {
            // Create a clone with the legacy ID
            const compatFlight = { ...legacyFlight, id }
            flights.value.push(compatFlight)
            
            // Also add the new flight with consistent ID if it's not there
            if (!flights.value.some(f => f.id === legacyFlight.id)) {
              flights.value.push(legacyFlight)
            }
            
            saveFlightsToStorage()
            return compatFlight
          }
        }
      }
      
      // If not in development mode, try to fetch from Firebase
      if (!isDev) {
        loading.value = true
        const db = getFirestore()
        const flightRef = doc(db, 'flights', id)
        const flightDoc = await getDoc(flightRef)
        
        if (flightDoc.exists()) {
          const flightData = {
            id: flightDoc.id,
            ...flightDoc.data()
          } as Flight
          
          // Try to fetch real-time data for this flight
          try {
            const realTimeData = await fetchFlightData(flightData.flightNumber)
            if (realTimeData) {
              Object.assign(flightData, realTimeData)
            }
          } catch (err) {
            console.error(`Error fetching real-time data for flight ${flightData.flightNumber}:`, err)
          }
          
          // Add to our flights array if not already there
          if (!flights.value.some(f => f.id === id)) {
            flights.value.push(flightData)
            saveFlightsToStorage()
          }
          
          return flightData
        }
      }
      
      // If we're in dev mode or flight not found in Firebase, try to load all flights
      // in case it's there but we just don't have it loaded yet
      if (flights.value.length === 0 || !dataInitialized.value) {
        console.log(`Fetching all flights to find ${id}`)
        await fetchFlights(undefined, true) // Force refresh
        
        // Check again after fetching
        const foundFlight = getFlightById.value(id)
        if (foundFlight) {
          return foundFlight
        }
      }
      
      console.log(`Unable to find flight ${id}, creating a fallback flight`)
      
      // If we still can't find the flight and we're in dev mode,
      // create a fallback flight with this ID so the UI doesn't break
      if (isDev) {
        const fallbackFlight: Flight = {
          id,
          flightNumber: `FB${Math.floor(Math.random() * 1000)}`,
          airline: 'Fallback Airlines',
          origin: 'ORG',
          destination: 'DST',
          scheduledDeparture: new Date(),
          scheduledArrival: new Date(Date.now() + 2 * 60 * 60 * 1000),
          status: 'scheduled',
          flightType: 'departure',
          aircraft: 'Boeing 737',
          delayMinutes: 0,
          gate: 'A1',
          terminal: '1',
          totalPassengers: 100,
          checkedInPassengers: 50,
          boardedPassengers: 0,
          updatedAt: new Date(),
          createdAt: new Date()
        }
        
        flights.value.push(fallbackFlight)
        saveFlightsToStorage()
        return fallbackFlight
      }
      
      return null
    } catch (err: any) {
      error.value = err.message
      console.error(`Error fetching flight ${id}:`, err)
      return null
    } finally {
      loading.value = false
    }
  }
  
  // Clear all flight data (for logout)
  const clearFlights = () => {
    flights.value = []
    dataInitialized.value = false
    if (isDev && typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }
  
  return {
    flights,
    loading,
    error,
    dataInitialized,
    getFlightById,
    flightsByStatus,
    inboundFlights,
    outboundFlights,
    delayedFlights,
    fetchFlights,
    fetchFlightById,
    updateFlight,
    addFlight,
    clearFlights
  }
})