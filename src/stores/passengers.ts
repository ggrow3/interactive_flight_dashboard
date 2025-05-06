import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { Passenger, PassengerStatus } from '../types/passenger'
import { useFlightStore } from './flights'
import { generateMockPassengers } from '../services/mockData'

// Development mode flag
const isDev = true // Set to false in production

export const usePassengerStore = defineStore('passengers', () => {
  const passengers = ref<Passenger[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Getters
  const getPassengerById = computed(() => {
    return (id: string) => passengers.value.find(passenger => passenger.id === id)
  })
  
  const passengersByStatus = computed(() => {
    return (status: PassengerStatus) => passengers.value.filter(passenger => passenger.status === status)
  })
  
  const passengersByFlight = computed(() => {
    return (flightId: string) => passengers.value.filter(passenger => passenger.flightId === flightId)
  })
  
  // Actions
  const fetchPassengers = async (flightId?: string) => {
    try {
      loading.value = true
      error.value = null
      
      if (isDev) {
        // Use mock data in development
        console.log('Using mock passenger data')
        const flightStore = useFlightStore()
        
        // Make sure we have flights to associate with passengers
        if (flightStore.flights.length === 0) {
          await flightStore.fetchFlights()
        }
        
        const mockPassengers = generateMockPassengers(flightStore.flights)
        
        if (flightId) {
          passengers.value = mockPassengers.filter(p => p.flightId === flightId)
        } else {
          passengers.value = mockPassengers
        }
        
        return
      }
      
      const db = getFirestore()
      const passengersCollection = collection(db, 'passengers')
      
      let q = query(passengersCollection)
      
      if (flightId) {
        q = query(passengersCollection, where('flightId', '==', flightId))
      }
      
      const querySnapshot = await getDocs(q)
      passengers.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Passenger[]
      
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching passengers:', err)
    } finally {
      loading.value = false
    }
  }
  
  const updatePassenger = async (id: string, data: Partial<Passenger>) => {
    try {
      loading.value = true
      error.value = null
      
      if (isDev) {
        // Update mock data in development
        const index = passengers.value.findIndex(passenger => passenger.id === id)
        if (index !== -1) {
          passengers.value[index] = { ...passengers.value[index], ...data, updatedAt: new Date() }
        }
        return
      }
      
      const db = getFirestore()
      const passengerRef = doc(db, 'passengers', id)
      await updateDoc(passengerRef, data)
      
      // Update local state
      const index = passengers.value.findIndex(passenger => passenger.id === id)
      if (index !== -1) {
        passengers.value[index] = { ...passengers.value[index], ...data }
      }
      
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const addPassenger = async (passenger: Omit<Passenger, 'id'>) => {
    try {
      loading.value = true
      error.value = null
      
      if (isDev) {
        // Add to mock data in development
        const newPassenger = { 
          id: `mock-passenger-${passengers.value.length}`, 
          ...passenger,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Passenger
        passengers.value.push(newPassenger)
        return newPassenger
      }
      
      const db = getFirestore()
      const passengersCollection = collection(db, 'passengers')
      const docRef = await addDoc(passengersCollection, passenger)
      
      const newPassenger = { id: docRef.id, ...passenger } as Passenger
      passengers.value.push(newPassenger)
      
      return newPassenger
      
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const bulkAddPassengers = async (passengersToAdd: Omit<Passenger, 'id'>[]) => {
    try {
      loading.value = true
      error.value = null
      
      if (isDev) {
        // Add to mock data in development
        const newPassengers = passengersToAdd.map((passenger, index) => {
          return { 
            id: `mock-passenger-bulk-${index}`, 
            ...passenger,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Passenger
        })
        
        passengers.value = [...passengers.value, ...newPassengers]
        return newPassengers
      }
      
      const db = getFirestore()
      const passengersCollection = collection(db, 'passengers')
      
      const newPassengers = await Promise.all(
        passengersToAdd.map(async (passenger) => {
          const docRef = await addDoc(passengersCollection, passenger)
          return { id: docRef.id, ...passenger } as Passenger
        })
      )
      
      // Update local state
      passengers.value = [...passengers.value, ...newPassengers]
      
      return newPassengers
      
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  return {
    passengers,
    loading,
    error,
    getPassengerById,
    passengersByStatus,
    passengersByFlight,
    fetchPassengers,
    updatePassenger,
    addPassenger,
    bulkAddPassengers
  }
})