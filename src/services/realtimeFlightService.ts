import { ref, computed } from 'vue'
import axios from 'axios'
import { Flight, FlightStatus } from '../types/flight'
import { useFlightStore } from '../stores/flights'

// Constants for all supported API providers
const AVIATION_EDGE_API_KEY = import.meta.env.VITE_AVIATION_EDGE_API_KEY || 'demo-key'
const AVIATION_EDGE_API_BASE = 'https://aviation-edge.com/v2/public'

const OPENSKY_API_BASE = 'https://opensky-network.org/api'
const OPENSKY_USERNAME = import.meta.env.VITE_OPENSKY_USERNAME
const OPENSKY_PASSWORD = import.meta.env.VITE_OPENSKY_PASSWORD

const AIRLABS_API_KEY = import.meta.env.VITE_AIRLABS_API_KEY || 'demo-key'
const AIRLABS_API_BASE = 'https://airlabs.co/api/v9'

// FlightAware API credentials
const FLIGHTAWARE_API_KEY = import.meta.env.VITE_FLIGHTAWARE_API_KEY || 'demo-key'
const FLIGHTAWARE_API_BASE = import.meta.env.VITE_FLIGHTAWARE_API_BASE || 'https://aeroapi.flightaware.com/aeroapi'

// FlightRadar24 credentials (alternative option)
const FLIGHTRADAR_API_KEY = import.meta.env.VITE_FLIGHTRADAR_API_KEY
const FLIGHTRADAR_API_BASE = import.meta.env.VITE_FLIGHTRADAR_API_BASE

// Determine which API to use based on configuration or available credentials
const API_PROVIDER = import.meta.env.VITE_REALTIME_API_PROVIDER || 
  (FLIGHTAWARE_API_KEY && FLIGHTAWARE_API_KEY !== 'demo-key' ? 'flightaware' :
   AIRLABS_API_KEY && AIRLABS_API_KEY !== 'demo-key' ? 'airlabs' : 
   OPENSKY_USERNAME ? 'opensky' : 'aviation-edge')

// State
const lastUpdated = ref<Date>(new Date())
const currentFlightCache = ref<Map<string, Flight>>(new Map())
const isConnected = ref<boolean>(false)
const errorMessage = ref<string | null>(null)
const updateIntervals = ref<Map<string, number>>(new Map())
const activeWebsocket = ref<WebSocket | null>(null)

// Helper for API authentication
const getApiCredentials = () => {
  switch (API_PROVIDER) {
    case 'opensky':
      return {
        auth: {
          username: OPENSKY_USERNAME,
          password: OPENSKY_PASSWORD
        }
      }
    case 'aviation-edge':
      return {
        params: {
          key: AVIATION_EDGE_API_KEY
        }
      }
    case 'airlabs':
      return {
        params: {
          api_key: AIRLABS_API_KEY
        }
      }
    case 'flightaware':
      return {
        headers: {
          'x-apikey': FLIGHTAWARE_API_KEY
        }
      }
    case 'flightradar24':
      return {
        headers: {
          'Authorization': `Bearer ${FLIGHTRADAR_API_KEY}`
        }
      }
    default:
      return {}
  }
}

// Helper to map external API status to our internal FlightStatus
const mapFlightStatus = (externalStatus: string, provider: string): FlightStatus => {
  if (provider === 'aviation-edge') {
    switch (externalStatus.toLowerCase()) {
      case 'en-route': 
      case 'en route': 
      case 'in air': return 'in_air'
      case 'landed': return 'landed'
      case 'scheduled': return 'scheduled'
      case 'canceled': 
      case 'cancelled': return 'cancelled'
      case 'delayed': return 'delayed'
      case 'diverted': return 'delayed'
      case 'boarding': return 'boarding'
      case 'gate open': 
      case 'gate': return 'boarding'
      case 'taxiing': return 'taxiing'
      case 'final approach': return 'landing'
      default: return 'scheduled'
    }
  } else if (provider === 'airlabs') {
    switch (externalStatus.toLowerCase()) {
      case 'en-route': return 'in_air'
      case 'landed': return 'landed'
      case 'scheduled': return 'scheduled'
      case 'active': return 'in_air'
      case 'cancelled': return 'cancelled'
      case 'incident': return 'delayed'
      case 'diverted': return 'delayed'
      case 'boarding': return 'boarding'
      default: return 'scheduled'
    }
  } else if (provider === 'flightaware') {
    // FlightAware has very detailed status codes
    switch (externalStatus.toLowerCase()) {
      case 'scheduled': return 'scheduled'
      case 'filed': return 'scheduled'
      case 'active': return 'in_air'
      case 'landed': return 'landed'
      case 'cancelled': return 'cancelled'
      case 'diverted': return 'delayed'
      case 'taxiing': return 'taxiing'
      case 'taxi': return 'taxiing'
      case 'takeoff': return 'departed'
      case 'departure': return 'departed'
      case 'enroute': return 'in_air'
      case 'descent': return 'landing'
      case 'approach': return 'landing'
      case 'arrived': return 'landed'
      case 'baggage_claim': return 'landed'
      case 'late': return 'delayed'
      case 'gate': return 'boarding'
      default: return 'scheduled'
    }
  } else if (provider === 'flightradar24') {
    // FlightRadar24 status mapping
    switch (externalStatus.toLowerCase()) {
      case 'scheduled': return 'scheduled'
      case 'en-route': return 'in_air'
      case 'landed': return 'landed'
      case 'cancelled': return 'cancelled'
      case 'unknown': return 'scheduled'
      default: return 'scheduled'
    }
  } else {
    // OpenSky doesn't provide status, so we determine it based on position data
    return 'in_air'; // Default for position-only data
  }
}

/**
 * Sets up a recurring flight data update cycle
 * @param flightId ID of flight to track
 * @param intervalSeconds Update frequency in seconds (min 30)
 */
export const startTrackingFlight = async (flightId: string, intervalSeconds: number = 60) => {
  const flightStore = useFlightStore()
  const flight = flightStore.getFlightById(flightId)
  
  if (!flight) {
    console.error(`Cannot track flight ${flightId}: flight not found`)
    return
  }
  
  // Fetch initial data
  await updateFlightData(flight.flightNumber)
  
  // Set up interval (minimum 30 seconds to avoid API rate limits)
  const safeInterval = Math.max(30, intervalSeconds) * 1000
  
  // Clear any existing interval for this flight
  if (updateIntervals.value.has(flightId)) {
    clearInterval(updateIntervals.value.get(flightId))
  }
  
  // Set new interval
  const intervalId = window.setInterval(() => {
    updateFlightData(flight.flightNumber)
  }, safeInterval)
  
  updateIntervals.value.set(flightId, intervalId)
  console.log(`Started tracking flight ${flight.flightNumber} every ${safeInterval/1000} seconds`)
}

/**
 * Stop tracking a specific flight
 */
export const stopTrackingFlight = (flightId: string) => {
  if (updateIntervals.value.has(flightId)) {
    clearInterval(updateIntervals.value.get(flightId))
    updateIntervals.value.delete(flightId)
    console.log(`Stopped tracking flight ${flightId}`)
  }
}

/**
 * Connect to WebSocket for real-time updates (when available)
 * Not all providers support WebSockets, so we fall back to polling
 */
export const connectToRealtimeUpdates = () => {
  if (API_PROVIDER !== 'airlabs') {
    console.log('Real-time WebSocket updates only available with AirLabs API')
    return
  }
  
  // Close any existing connection
  if (activeWebsocket.value) {
    activeWebsocket.value.close()
  }
  
  // Establish WebSocket connection (note: requires paid AirLabs subscription)
  try {
    const ws = new WebSocket(`wss://airlabs.co/ws/flight-updates?api_key=${AIRLABS_API_KEY}`)
    
    ws.onopen = () => {
      isConnected.value = true
      console.log('WebSocket connection established')
      
      // Subscribe to updates for all flights we're tracking
      const flightNumbers = Array.from(updateIntervals.value.keys())
      const flightStore = useFlightStore()
      
      flightNumbers.forEach(flightId => {
        const flight = flightStore.getFlightById(flightId)
        if (flight) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            flight: flight.flightNumber
          }))
        }
      })
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'flight-update' && data.flight) {
          processRealtimeUpdate(data.flight)
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      errorMessage.value = 'Connection error. Falling back to polling.'
      isConnected.value = false
    }
    
    ws.onclose = () => {
      isConnected.value = false
      console.log('WebSocket connection closed')
    }
    
    activeWebsocket.value = ws
  } catch (error) {
    console.error('Failed to connect to WebSocket:', error)
    errorMessage.value = 'Failed to connect. Falling back to polling.'
  }
}

/**
 * Process a real-time update from WebSocket
 */
const processRealtimeUpdate = (flightData: any) => {
  const flightStore = useFlightStore()
  const flightNumber = flightData.flight_iata || flightData.flight_icao
  
  if (!flightNumber) return
  
  // Find the flight in our store based on flight number
  const flight = flightStore.flights.find(f => f.flightNumber === flightNumber)
  
  if (flight) {
    const updates: Partial<Flight> = {
      status: mapFlightStatus(flightData.status || '', 'airlabs'),
      latitude: flightData.lat,
      longitude: flightData.lng,
      altitude: flightData.alt,
      groundSpeed: flightData.speed,
      heading: flightData.dir,
      updatedAt: new Date()
    }
    
    // Only include defined values
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof typeof updates] === undefined) {
        delete updates[key as keyof typeof updates]
      }
    })
    
    // Update the flight in the store
    flightStore.updateFlight(flight.id, updates)
    lastUpdated.value = new Date()
    
    // Update the cache
    if (currentFlightCache.value.has(flight.id)) {
      currentFlightCache.value.set(flight.id, { 
        ...currentFlightCache.value.get(flight.id)!, 
        ...updates 
      })
    }
  }
}

/**
 * Fetch the latest flight data from the selected API
 */
export const updateFlightData = async (flightNumber: string): Promise<Partial<Flight> | null> => {
  try {
    const flightStore = useFlightStore()
    let flightData: Partial<Flight> | null = null
    
    if (API_PROVIDER === 'flightaware') {
      // FlightAware AeroAPI
      const cleanFlightNumber = flightNumber.replace(/\s+/g, '');
      
      // First try the flights/search endpoint to get the flight ident
      const searchResponse = await axios.get(`${FLIGHTAWARE_API_BASE}/flights/search`, {
        ...getApiCredentials(),
        params: {
          query: `ident:${cleanFlightNumber}`
        }
      });
      
      if (searchResponse.data && searchResponse.data.flights && searchResponse.data.flights.length > 0) {
        const flightDetails = searchResponse.data.flights[0];
        const fa_flight_id = flightDetails.fa_flight_id;
        
        // Now get detailed info using the fa_flight_id
        const detailResponse = await axios.get(`${FLIGHTAWARE_API_BASE}/flights/${fa_flight_id}`, {
          ...getApiCredentials()
        });
        
        if (detailResponse.data) {
          const flight = detailResponse.data;
          
          // Calculate delay in minutes if available
          let delayMinutes = 0;
          if (flight.arrival_delay) {
            delayMinutes = Math.round(flight.arrival_delay / 60);
          }
          
          flightData = {
            status: mapFlightStatus(flight.status || '', 'flightaware'),
            actualDeparture: flight.actual_departure_time 
              ? new Date(flight.actual_departure_time.time) 
              : undefined,
            actualArrival: flight.actual_arrival_time 
              ? new Date(flight.actual_arrival_time.time) 
              : undefined,
            delayMinutes: delayMinutes,
            gate: flight.arrival_gate,
            terminal: flight.arrival_terminal,
            aircraft: flight.aircraft_type, 
            latitude: flight.last_position?.latitude,
            longitude: flight.last_position?.longitude,
            altitude: flight.last_position?.altitude,
            groundSpeed: flight.last_position?.groundspeed,
            heading: flight.last_position?.heading,
            updatedAt: new Date()
          };
          
          // If there's no position data but the flight is in air, try to get it from /flights/{id}/track
          if (flightData.status === 'in_air' && !flightData.latitude) {
            try {
              const trackResponse = await axios.get(
                `${FLIGHTAWARE_API_BASE}/flights/${fa_flight_id}/track`, 
                { ...getApiCredentials() }
              );
              
              if (trackResponse.data && trackResponse.data.tracks && trackResponse.data.tracks.length > 0) {
                // Get the latest position from the track
                const latestPosition = trackResponse.data.tracks[trackResponse.data.tracks.length - 1];
                
                flightData.latitude = latestPosition.latitude;
                flightData.longitude = latestPosition.longitude;
                flightData.altitude = latestPosition.altitude;
                flightData.groundSpeed = latestPosition.groundspeed;
                flightData.heading = latestPosition.heading;
              }
            } catch (trackError) {
              console.log('Failed to get track data:', trackError);
            }
          }
        }
      }
    } else if (API_PROVIDER === 'aviation-edge') {
      // Aviation Edge API
      const response = await axios.get(`${AVIATION_EDGE_API_BASE}/timetable`, {
        ...getApiCredentials(),
        params: {
          ...getApiCredentials().params,
          flight_iata: flightNumber
        }
      })
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const flight = response.data[0]
        
        flightData = {
          status: mapFlightStatus(flight.status || '', 'aviation-edge'),
          actualDeparture: flight.departure.actualTime ? new Date(flight.departure.actualTime) : undefined,
          actualArrival: flight.arrival.actualTime ? new Date(flight.arrival.actualTime) : undefined,
          delayMinutes: flight.arrival.delay || 0,
          gate: flight.arrival.gate,
          terminal: flight.arrival.terminal,
          // Aviation Edge doesn't provide position data in the timetable endpoint
          updatedAt: new Date()
        }
      }
    } else if (API_PROVIDER === 'airlabs') {
      // AirLabs API
      const response = await axios.get(`${AIRLABS_API_BASE}/flight`, {
        params: {
          ...getApiCredentials().params,
          flight_iata: flightNumber
        }
      })
      
      if (response.data && response.data.response) {
        const flight = response.data.response
        
        flightData = {
          status: mapFlightStatus(flight.status || '', 'airlabs'),
          actualDeparture: flight.dep_time ? new Date(flight.dep_time) : undefined,
          actualArrival: flight.arr_time ? new Date(flight.arr_time) : undefined,
          delayMinutes: flight.delayed || 0,
          gate: flight.arr_gate,
          terminal: flight.arr_terminal,
          latitude: flight.lat,
          longitude: flight.lng,
          altitude: flight.alt,
          groundSpeed: flight.speed,
          heading: flight.dir,
          updatedAt: new Date()
        }
      }
    } else if (API_PROVIDER === 'flightradar24') {
      // FlightRadar24 API
      const response = await axios.get(`${FLIGHTRADAR_API_BASE}/flights/${flightNumber}`, {
        ...getApiCredentials()
      });
      
      if (response.data) {
        const flight = response.data;
        
        flightData = {
          status: mapFlightStatus(flight.status || '', 'flightradar24'),
          actualDeparture: flight.departure?.time ? new Date(flight.departure.time) : undefined,
          actualArrival: flight.arrival?.time ? new Date(flight.arrival.time) : undefined,
          delayMinutes: flight.arrival?.delay || 0,
          latitude: flight.position?.latitude,
          longitude: flight.position?.longitude,
          altitude: flight.position?.altitude,
          groundSpeed: flight.position?.speed,
          heading: flight.position?.heading,
          gate: flight.arrival?.gate,
          terminal: flight.arrival?.terminal,
          updatedAt: new Date()
        }
      }
    } else {
      // OpenSky API doesn't have a direct flight number lookup
      // We need to use the all states endpoint and filter by ICAO24 or callsign
      const response = await axios.get(`${OPENSKY_API_BASE}/states/all`, {
        ...getApiCredentials()
      })
      
      if (response.data && response.data.states) {
        // Find flight by callsign (which is similar to flight number but might need conversion)
        const callsignToMatch = flightNumber.replace(/[^A-Z0-9]/g, '')
        const matchingFlight = response.data.states.find((state: any) => 
          state[1] && state[1].replace(/\s+/g, '').includes(callsignToMatch)
        )
        
        if (matchingFlight) {
          const [
            icao24, callsign, origin_country, 
            time_position, last_contact, longitude, 
            latitude, baro_altitude, on_ground, 
            velocity, heading, vertical_rate,
            _, geo_altitude, squawk, spi, position_source
          ] = matchingFlight
          
          flightData = {
            status: on_ground ? 'landed' : 'in_air',
            latitude,
            longitude,
            altitude: geo_altitude || baro_altitude,
            groundSpeed: velocity,
            heading,
            updatedAt: new Date()
          }
        }
      }
    }
    
    if (flightData) {
      // Update the flight in the store
      const flight = flightStore.flights.find(f => f.flightNumber === flightNumber)
      
      if (flight) {
        flightStore.updateFlight(flight.id, flightData)
        
        // Update cache
        currentFlightCache.value.set(flight.id, { 
          ...flight, 
          ...flightData 
        } as Flight)
        
        lastUpdated.value = new Date()
      }
    }
    
    return flightData
  } catch (error) {
    console.error(`Error updating flight data for ${flightNumber}:`, error)
    errorMessage.value = `Failed to update flight ${flightNumber}`
    return null
  }
}

/**
 * Fetch active flights within given map bounds
 */
export const fetchRealtimeFlights = async (
  bounds: { north: number, south: number, east: number, west: number }
): Promise<Partial<Flight>[]> => {
  try {
    let flights: Partial<Flight>[] = []
    
    if (API_PROVIDER === 'flightaware') {
      // FlightAware AeroAPI search with bounds
      const response = await axios.get(`${FLIGHTAWARE_API_BASE}/flights/search`, {
        ...getApiCredentials(),
        params: {
          query: `{inAir true} {box ${bounds.south} ${bounds.west} ${bounds.north} ${bounds.east}}`
        }
      });
      
      if (response.data && response.data.flights) {
        flights = response.data.flights.map((flight: any) => {
          // Determine flight type (arrival/departure) based on direction
          // This is a simplification - would need origin/destination for accuracy
          const flightType = flight.heading >= 0 && flight.heading < 180 ? 'arrival' : 'departure';
          
          return {
            id: flight.fa_flight_id, // Use FlightAware's unique ID
            flightNumber: flight.ident,
            airline: flight.operator || flight.ident.substring(0, 2),
            origin: flight.origin?.code || 'UNK',
            destination: flight.destination?.code || 'UNK',
            status: mapFlightStatus(flight.status || '', 'flightaware'),
            flightType,
            latitude: flight.last_position?.latitude,
            longitude: flight.last_position?.longitude,
            altitude: flight.last_position?.altitude,
            groundSpeed: flight.last_position?.groundspeed,
            heading: flight.last_position?.heading,
            aircraft: flight.aircraft_type,
            updatedAt: new Date()
          };
        });
      }
    } else if (API_PROVIDER === 'aviation-edge') {
      // Aviation Edge doesn't have a direct endpoint for this
      // We'd need to use multiple calls to get this data
      // For demo purposes, we'll just return mock data
      console.log('Aviation Edge API does not support area-based flight lookup')
      return []
    } else if (API_PROVIDER === 'airlabs') {
      // AirLabs API
      const response = await axios.get(`${AIRLABS_API_BASE}/flights`, {
        params: {
          ...getApiCredentials().params,
          bbox: `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
        }
      })
      
      if (response.data && response.data.response) {
        flights = response.data.response.map((flight: any) => ({
          flightNumber: flight.flight_iata || flight.flight_icao,
          airline: flight.airline_iata || flight.airline_icao,
          origin: flight.dep_iata || flight.dep_icao,
          destination: flight.arr_iata || flight.arr_icao,
          status: mapFlightStatus(flight.status || '', 'airlabs'),
          flightType: flight.dep_iata === flight.arr_iata ? 'arrival' : 'departure',
          latitude: flight.lat,
          longitude: flight.lng,
          altitude: flight.alt,
          groundSpeed: flight.speed,
          heading: flight.dir,
          aircraft: flight.aircraft_icao,
          updatedAt: new Date()
        }))
      }
    } else if (API_PROVIDER === 'flightradar24') {
      // FlightRadar24 API
      const response = await axios.get(`${FLIGHTRADAR_API_BASE}/flights`, {
        ...getApiCredentials(),
        params: {
          bounds: `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
        }
      });
      
      if (response.data) {
        // FlightRadar24 returns an object with flights keyed by their ID
        flights = Object.values(response.data).map((flight: any) => ({
          flightNumber: flight.callsign,
          airline: flight.airline,
          origin: flight.origin,
          destination: flight.destination,
          status: 'in_air' as FlightStatus, // FlightRadar24 bounds search only returns in-air flights
          flightType: flight.destination ? 'departure' : 'arrival', // Simplified logic
          latitude: flight.lat,
          longitude: flight.lon,
          altitude: flight.altitude,
          groundSpeed: flight.speed,
          heading: flight.heading,
          aircraft: flight.aircraft,
          updatedAt: new Date()
        }));
      }
    } else {
      // OpenSky API
      const response = await axios.get(`${OPENSKY_API_BASE}/states/all`, {
        ...getApiCredentials(),
        params: {
          lamin: bounds.south,
          lamax: bounds.north,
          lomin: bounds.west,
          lomax: bounds.east
        }
      })
      
      if (response.data && response.data.states) {
        flights = response.data.states.map((state: any) => {
          const [
            icao24, callsign, origin_country, 
            time_position, last_contact, longitude, 
            latitude, baro_altitude, on_ground, 
            velocity, heading, vertical_rate,
            _, geo_altitude, squawk, spi, position_source
          ] = state
          
          return {
            flightNumber: callsign,
            status: on_ground ? 'landed' : 'in_air',
            flightType: vertical_rate < 0 ? 'arrival' : 'departure',
            latitude,
            longitude,
            altitude: geo_altitude || baro_altitude,
            groundSpeed: velocity,
            heading,
            aircraft: icao24, // This is the aircraft's ICAO transponder code, not aircraft type
            updatedAt: new Date()
          }
        })
      }
    }
    
    return flights.filter(f => f.latitude && f.longitude) // Only return flights with position data
  } catch (error) {
    console.error('Error fetching active flights:', error)
    return []
  }
}

/**
 * Clean up all tracking intervals and connections
 */
export const cleanupRealtimeTracking = () => {
  // Clear all tracking intervals
  updateIntervals.value.forEach(intervalId => {
    clearInterval(intervalId)
  })
  updateIntervals.value.clear()
  
  // Close WebSocket if open
  if (activeWebsocket.value) {
    activeWebsocket.value.close()
    activeWebsocket.value = null
  }
  
  isConnected.value = false
  console.log('Cleaned up all real-time tracking')
}

// Export state for components to use
export const useRealtimeFlightData = () => {
  return {
    lastUpdated: computed(() => lastUpdated.value),
    isConnected: computed(() => isConnected.value),
    errorMessage: computed(() => errorMessage.value),
    flightCache: computed(() => currentFlightCache.value),
    trackedFlightIds: computed(() => Array.from(updateIntervals.value.keys()))
  }
}