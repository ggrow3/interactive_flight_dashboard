<template>
  <div class="flight-map-container">
    <div class="map-controls">
      <button class="btn btn-primary btn-sm" @click="focusOnAllFlights">
        Show All Flights
      </button>
      <div class="map-filters">
        <label class="filter-label">
          <input type="checkbox" v-model="showArrivals"> Arrivals
        </label>
        <label class="filter-label">
          <input type="checkbox" v-model="showDepartures"> Departures
        </label>
        <label class="filter-label">
          <input type="checkbox" v-model="showDelayed"> Delayed
        </label>
      </div>
    </div>
    <div ref="mapContainer" class="flight-map"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Flight } from '../../types/flight'
import { fetchRealtimeFlights } from '../../services/realtimeFlightService'

// Import marker icons to fix the broken icon issue
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

// Props
const props = defineProps<{
  flights: Flight[]
}>()

// Refs
const mapContainer = ref<HTMLElement | null>(null)
const map = ref<L.Map | null>(null)
const flightMarkers = ref<Record<string, L.Marker>>({})
const refreshInterval = ref<number | null>(null)

// State
const showArrivals = ref(true)
const showDepartures = ref(true)
const showDelayed = ref(true)

// Fix default icon issue
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

// Custom airplane icons
const createAirplaneIcon = (color: string) => {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="${color}">
      <path d="M22,16.5L19,22H5L2,16.5H7.5L8.5,22h7L16.5,16.5H22M15.5,12.5c0-0.82-0.67-1.5-1.5-1.5s-1.5,0.68-1.5,1.5
        s0.67,1.5,1.5,1.5S15.5,13.32,15.5,12.5M17.44,8.86c0.42-0.96,0.72-2.12,0.72-3.36C18.16,2.41,15.24,0,12,0
        S5.84,2.41,5.84,5.5c0,1.24,0.3,2.4,0.72,3.36L4,12l2.56,3.14C7.3,16.25,9.51,17,12,17s4.7-0.75,5.44-1.86
        L20,12L17.44,8.86z"/>
    </svg>`,
    className: 'airplane-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
}

const arrivalIcon = createAirplaneIcon('#3498db')   // Blue
const departureIcon = createAirplaneIcon('#2ecc71') // Green
const delayedIcon = createAirplaneIcon('#e74c3c')   // Red

// Computed
const filteredFlights = computed(() => {
  return props.flights.filter(flight => {
    if (flight.status !== 'in_air') return false
    
    if (!showArrivals.value && flight.flightType === 'arrival') return false
    if (!showDepartures.value && flight.flightType === 'departure') return false
    if (!showDelayed.value && flight.delayMinutes > 0) return false
    
    return flight.latitude && flight.longitude
  })
})

// Methods
const initMap = () => {
  if (mapContainer.value) {
    map.value = L.map(mapContainer.value).setView([39.8283, -98.5795], 4) // Center on US
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(map.value)
    
    // Refresh flight data every minute
    refreshInterval.value = window.setInterval(refreshFlightData, 60000)
    
    // Initial data load
    refreshFlightData()
  }
}

const refreshFlightData = async () => {
  if (!map.value) return
  
  try {
    const bounds = map.value.getBounds()
    const boundsObj = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    }
    
    // Fetch real-time data for flights in the current map view using our new service
    const activeFlights = await fetchRealtimeFlights(boundsObj)
    
    // Merge with existing flights from props - mark them with source info
    const mergedFlights = [...activeFlights, ...filteredFlights.value].map(flight => ({
      ...flight,
      // Add a source flag to differentiate between API and prop flights
      source: activeFlights.some(af => af.flightNumber === flight.flightNumber) ? 'realtime' : 'props'
    }))
    
    // Remove duplicates by flight number, preferring real-time data
    const flightMap = new Map()
    mergedFlights.forEach(flight => {
      if (!flightMap.has(flight.flightNumber) || flight.source === 'realtime') {
        flightMap.set(flight.flightNumber, flight)
      }
    })
    
    const uniqueFlights = Array.from(flightMap.values())
    updateFlightMarkers(uniqueFlights as Flight[])
  } catch (error) {
    console.error('Error refreshing flight data:', error)
    // Fallback to props data if API call fails
    updateFlightMarkers(filteredFlights.value)
  }
}

const updateFlightMarkers = (flights: Flight[]) => {
  if (!map.value) return
  
  // Remove old markers
  Object.values(flightMarkers.value).forEach(marker => {
    marker.remove()
  })
  
  flightMarkers.value = {}
  
  // Add new markers
  flights.forEach(flight => {
    if (!flight.latitude || !flight.longitude) return
    
    let icon = departureIcon
    if (flight.flightType === 'arrival') {
      icon = arrivalIcon
    }
    if (flight.delayMinutes > 0) {
      icon = delayedIcon
    }
    
    // Check if this is a real-time data flight (from our API)
    const isRealtime = (flight as any).source === 'realtime'
    
    // Create marker and add to map
    const marker = L.marker([flight.latitude, flight.longitude], { 
      icon,
      rotationAngle: flight.heading || 0,
      rotationOrigin: 'center center'
    }).addTo(map.value!)
    
    // If it's real-time data, add a pulse effect
    if (isRealtime) {
      // Add pulse effect for real-time flights
      const pulseIcon = L.divIcon({
        className: 'pulse-icon',
        html: '<div class="pulse"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
      
      // Create pulse marker and add beneath the airplane
      const pulseMarker = L.marker([flight.latitude, flight.longitude], {
        icon: pulseIcon,
        zIndexOffset: -1000 // Display beneath airplane icon
      }).addTo(map.value!)
      
      // Store reference to remove later
      flightMarkers.value[`${flight.id}-pulse`] = pulseMarker
    }
    
    // Create popup content
    const popupContent = `
      <div class="flight-popup">
        <div class="flight-popup-header">
          <strong>${flight.flightNumber}</strong> - ${flight.airline}
          ${isRealtime ? '<span class="realtime-badge">LIVE</span>' : ''}
        </div>
        <div class="flight-popup-content">
          <p><strong>From:</strong> ${flight.origin}</p>
          <p><strong>To:</strong> ${flight.destination}</p>
          <p><strong>Status:</strong> ${flight.status}</p>
          ${flight.delayMinutes > 0 ? `<p><strong>Delay:</strong> ${flight.delayMinutes} minutes</p>` : ''}
          <p><strong>Altitude:</strong> ${flight.altitude ? `${flight.altitude} ft` : 'N/A'}</p>
          <p><strong>Speed:</strong> ${flight.groundSpeed ? `${flight.groundSpeed} knots` : 'N/A'}</p>
          ${isRealtime ? `<p class="realtime-note">Live tracking data</p>` : ''}
        </div>
      </div>
    `
    
    marker.bindPopup(popupContent)
    flightMarkers.value[flight.id] = marker
  })
}

const focusOnAllFlights = () => {
  if (!map.value || Object.keys(flightMarkers.value).length === 0) return
  
  // Create a bounds object that includes all flight markers
  const bounds = L.latLngBounds(
    Object.values(flightMarkers.value).map(marker => marker.getLatLng())
  )
  
  // Fit the map to those bounds
  map.value.fitBounds(bounds, { padding: [50, 50] })
}

// Watches
watch(() => filteredFlights.value, () => {
  updateFlightMarkers(filteredFlights.value)
}, { deep: true })

watch([showArrivals, showDepartures, showDelayed], () => {
  updateFlightMarkers(filteredFlights.value)
})

// Lifecycle hooks
onMounted(() => {
  initMap()
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  
  if (map.value) {
    map.value.remove()
  }
})
</script>

<style scoped>
.flight-map-container {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.flight-map {
  height: 500px;
  width: 100%;
  border-radius: 4px;
  z-index: 0;
}

.map-controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  align-items: center;
}

.map-filters {
  display: flex;
  gap: 1rem;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

:deep(.airplane-icon) {
  background: none;
  border: none;
}

:deep(.flight-popup) {
  padding: 5px;
}

:deep(.flight-popup-header) {
  font-size: 14px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 5px;
  margin-bottom: 5px;
}

:deep(.flight-popup-content) {
  font-size: 12px;
}

:deep(.flight-popup-content p) {
  margin: 5px 0;
}

:deep(.realtime-badge) {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 5px;
  font-size: 10px;
  font-weight: bold;
  background-color: #28a745;
  color: white;
  border-radius: 10px;
}

:deep(.realtime-note) {
  color: #28a745;
  font-style: italic;
  margin-top: 8px !important;
  border-top: 1px solid #eee;
  padding-top: 5px;
}

.pulse-icon {
  background: none;
  border: none;
}

.pulse {
  border-radius: 50%;
  height: 24px;
  width: 24px;
  position: absolute;
  margin: -12px 0 0 -12px;
  transform: rotateX(55deg);
  z-index: -2;
}

.pulse:after {
  content: "";
  border-radius: 50%;
  height: 40px;
  width: 40px;
  position: absolute;
  margin: -8px 0 0 -8px;
  animation: pulsate 1.5s ease-out;
  animation-iteration-count: infinite;
  opacity: 0;
  box-shadow: 0 0 6px 3px rgba(40, 167, 69, 0.8);
  animation-delay: 1.1s;
}

@keyframes pulsate {
  0% {
    transform: scale(0.1, 0.1);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: scale(1.2, 1.2);
    opacity: 0;
  }
}
</style>