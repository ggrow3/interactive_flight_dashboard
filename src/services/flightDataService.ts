import axios from 'axios'
import { Flight, FlightStatus } from '../types/flight'

// This service integrates with FlightAware or FlightRadar24 API
// You'll need to replace these placeholder API details with your actual API credentials

// FlightAware API base URL and key
const FLIGHTAWARE_API_BASE = import.meta.env.VITE_FLIGHTAWARE_API_BASE || 'https://aeroapi.flightaware.com/aeroapi'
const FLIGHTAWARE_API_KEY = import.meta.env.VITE_FLIGHTAWARE_API_KEY

// FlightRadar24 API base URL and key (if using FlightRadar24 instead)
const FLIGHTRADAR_API_BASE = import.meta.env.VITE_FLIGHTRADAR_API_BASE
const FLIGHTRADAR_API_KEY = import.meta.env.VITE_FLIGHTRADAR_API_KEY

// Determine which API to use based on configuration
const API_PROVIDER = import.meta.env.VITE_FLIGHT_API_PROVIDER || 'flightaware'

// Helper to map external API status to our internal FlightStatus
const mapFlightStatus = (externalStatus: string): FlightStatus => {
  // FlightAware status mapping
  if (API_PROVIDER === 'flightaware') {
    switch (externalStatus) {
      case 'scheduled': return 'scheduled'
      case 'active': return 'in_air'
      case 'landed': return 'landed'
      case 'cancelled': return 'cancelled'
      case 'diverted': return 'delayed'
      case 'taxiing': return 'taxiing'
      default: return 'scheduled'
    }
  } 
  // FlightRadar24 status mapping (adjust based on actual API)
  else {
    switch (externalStatus) {
      case 'scheduled': return 'scheduled'
      case 'en-route': return 'in_air'
      case 'landed': return 'landed'
      case 'cancelled': return 'cancelled'
      default: return 'scheduled'
    }
  }
}

/**
 * Fetch flight data from FlightAware or FlightRadar24
 * @param flightNumber The flight number to search for
 * @returns Promise with flight data
 */
export const fetchFlightData = async (flightNumber: string): Promise<Partial<Flight> | null> => {
  try {
    let response
    
    if (API_PROVIDER === 'flightaware') {
      // FlightAware API
      response = await axios.get(`${FLIGHTAWARE_API_BASE}/flights/${flightNumber}`, {
        headers: {
          'x-apikey': FLIGHTAWARE_API_KEY
        }
      })
      
      if (!response.data || !response.data.flights || response.data.flights.length === 0) {
        return null
      }
      
      const flightData = response.data.flights[0]
      
      return {
        status: mapFlightStatus(flightData.status),
        actualDeparture: flightData.departure_time ? new Date(flightData.departure_time.scheduled) : undefined,
        actualArrival: flightData.arrival_time ? new Date(flightData.arrival_time.scheduled) : undefined,
        delayMinutes: flightData.arrival_delay || 0,
        latitude: flightData.last_position?.latitude,
        longitude: flightData.last_position?.longitude,
        altitude: flightData.last_position?.altitude,
        groundSpeed: flightData.last_position?.groundspeed,
        heading: flightData.last_position?.heading,
        gate: flightData.arrival_gate,
        terminal: flightData.arrival_terminal,
        updatedAt: new Date()
      }
    } else {
      // FlightRadar24 API (implementation details will depend on their API)
      response = await axios.get(`${FLIGHTRADAR_API_BASE}/flights/${flightNumber}`, {
        headers: {
          'Authorization': `Bearer ${FLIGHTRADAR_API_KEY}`
        }
      })
      
      // Format the response based on FlightRadar24's API structure
      const flightData = response.data
      
      return {
        status: mapFlightStatus(flightData.status),
        actualDeparture: flightData.departure?.time ? new Date(flightData.departure.time) : undefined,
        actualArrival: flightData.arrival?.time ? new Date(flightData.arrival.time) : undefined,
        delayMinutes: flightData.arrival?.delay || 0,
        latitude: flightData.position?.latitude,
        longitude: flightData.position?.longitude,
        altitude: flightData.position?.altitude,
        groundSpeed: flightData.position?.speed,
        heading: flightData.position?.heading,
        gate: flightData.arrival?.gate,
        terminal: flightData.arrival?.terminal,
        updatedAt: new Date()
      }
    }
  } catch (error) {
    console.error('Error fetching flight data:', error)
    return null
  }
}

/**
 * Fetch all active flights in a specified area
 * Useful for displaying a live map of flights
 */
export const fetchActiveFlights = async (
  bounds: { north: number, south: number, east: number, west: number }
): Promise<Partial<Flight>[]> => {
  try {
    let response
    
    if (API_PROVIDER === 'flightaware') {
      // FlightAware API
      response = await axios.get(`${FLIGHTAWARE_API_BASE}/flights/search`, {
        headers: {
          'x-apikey': FLIGHTAWARE_API_KEY
        },
        params: {
          query: `{inAir true} {box ${bounds.south} ${bounds.west} ${bounds.north} ${bounds.east}}`
        }
      })
      
      if (!response.data || !response.data.flights) {
        return []
      }
      
      return response.data.flights.map((flight: any) => ({
        flightNumber: flight.ident,
        airline: flight.operator,
        origin: flight.origin.code,
        destination: flight.destination.code,
        status: mapFlightStatus(flight.status),
        latitude: flight.last_position?.latitude,
        longitude: flight.last_position?.longitude,
        altitude: flight.last_position?.altitude,
        groundSpeed: flight.last_position?.groundspeed,
        heading: flight.last_position?.heading,
        aircraft: flight.aircraft_type,
        updatedAt: new Date()
      }))
    } else {
      // FlightRadar24 API
      response = await axios.get(`${FLIGHTRADAR_API_BASE}/flights`, {
        headers: {
          'Authorization': `Bearer ${FLIGHTRADAR_API_KEY}`
        },
        params: {
          bounds: `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
        }
      })
      
      // Format the response based on FlightRadar24's API structure
      return Object.values(response.data).map((flight: any) => ({
        flightNumber: flight.callsign,
        airline: flight.airline,
        origin: flight.origin,
        destination: flight.destination,
        status: 'in_air' as FlightStatus,
        latitude: flight.lat,
        longitude: flight.lon,
        altitude: flight.altitude,
        groundSpeed: flight.speed,
        heading: flight.heading,
        aircraft: flight.aircraft,
        updatedAt: new Date()
      }))
    }
  } catch (error) {
    console.error('Error fetching active flights:', error)
    return []
  }
}

/**
 * Fetch airport information including delays
 */
export const fetchAirportInformation = async (airportCode: string) => {
  try {
    let response
    
    if (API_PROVIDER === 'flightaware') {
      // FlightAware API
      response = await axios.get(`${FLIGHTAWARE_API_BASE}/airports/${airportCode}`, {
        headers: {
          'x-apikey': FLIGHTAWARE_API_KEY
        }
      })
      
      return {
        name: response.data.name,
        city: response.data.city,
        country: response.data.country,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        delay: response.data.delay_index,
        weather: response.data.weather
      }
    } else {
      // FlightRadar24 API
      response = await axios.get(`${FLIGHTRADAR_API_BASE}/airports/${airportCode}`, {
        headers: {
          'Authorization': `Bearer ${FLIGHTRADAR_API_KEY}`
        }
      })
      
      return {
        name: response.data.name,
        city: response.data.city,
        country: response.data.country,
        latitude: response.data.lat,
        longitude: response.data.lon,
        delay: response.data.delay,
        weather: response.data.weather
      }
    }
  } catch (error) {
    console.error(`Error fetching airport information for ${airportCode}:`, error)
    return null
  }
}