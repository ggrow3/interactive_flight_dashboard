import { getFirestore, collection, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore'
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'
import { Flight } from '../types/flight'
import { Passenger } from '../types/passenger'

// Initialize Firebase
const db = getFirestore()
const auth = getAuth()

/**
 * Check if the user is authenticated
 */
export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe()
        resolve(user)
      },
      reject
    )
  })
}

/**
 * Create a new user account
 * Only to be used by administrators
 */
export const createUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

/**
 * Get all flights for a specific date
 */
export const getFlightsByDate = async (date: Date) => {
  try {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    
    const flightsRef = collection(db, 'flights')
    const q = query(
      flightsRef,
      where('scheduledDeparture', '>=', startOfDay),
      where('scheduledDeparture', '<=', endOfDay)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Flight[]
  } catch (error) {
    console.error('Error getting flights by date:', error)
    throw error
  }
}

/**
 * Add a new flight to the database
 */
export const addFlight = async (flight: Omit<Flight, 'id'>) => {
  try {
    const flightsRef = collection(db, 'flights')
    const docRef = await addDoc(flightsRef, {
      ...flight,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    return {
      id: docRef.id,
      ...flight
    } as Flight
  } catch (error) {
    console.error('Error adding flight:', error)
    throw error
  }
}

/**
 * Update a flight in the database
 */
export const updateFlight = async (id: string, data: Partial<Flight>) => {
  try {
    const flightRef = doc(db, 'flights', id)
    await updateDoc(flightRef, {
      ...data,
      updatedAt: new Date()
    })
    
    return true
  } catch (error) {
    console.error('Error updating flight:', error)
    throw error
  }
}

/**
 * Get all passengers for a specific flight
 */
export const getPassengersByFlightId = async (flightId: string) => {
  try {
    const passengersRef = collection(db, 'passengers')
    const q = query(passengersRef, where('flightId', '==', flightId))
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Passenger[]
  } catch (error) {
    console.error('Error getting passengers by flight ID:', error)
    throw error
  }
}

/**
 * Add passengers in bulk
 */
export const addPassengers = async (passengers: Omit<Passenger, 'id'>[]) => {
  try {
    const batch = passengers.map(async (passenger) => {
      const passengersRef = collection(db, 'passengers')
      const docRef = await addDoc(passengersRef, {
        ...passenger,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      return {
        id: docRef.id,
        ...passenger
      } as Passenger
    })
    
    return await Promise.all(batch)
  } catch (error) {
    console.error('Error adding passengers:', error)
    throw error
  }
}

/**
 * Update a passenger's status
 */
export const updatePassengerStatus = async (id: string, status: string) => {
  try {
    const passengerRef = doc(db, 'passengers', id)
    await updateDoc(passengerRef, {
      status,
      updatedAt: new Date()
    })
    
    return true
  } catch (error) {
    console.error('Error updating passenger status:', error)
    throw error
  }
}