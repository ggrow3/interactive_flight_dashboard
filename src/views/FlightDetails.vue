<template>
  <div class="flight-details">
    <div v-if="loading" class="loading">
      Loading flight details...
    </div>
    
    <div v-else-if="!flight" class="not-found">
      Flight not found
    </div>
    
    <template v-else>
      <div class="flight-details-header">
        <button @click="goBack" class="back-button">
          &larr; Back
        </button>
        
        <div class="flight-title">
          <h1>{{ flight.flightNumber }} - {{ flight.airline }}</h1>
          <div class="flight-route">
            {{ flight.origin }} &rarr; {{ flight.destination }}
          </div>
        </div>
        
        <div class="flight-actions">
          <!-- Real-time tracking toggle button -->
          <button 
            v-if="flightStatus?.canTrack" 
            @click="toggleRealtimeTracking" 
            class="btn" 
            :class="isTracking ? 'btn-success' : 'btn-secondary'"
            :title="isTracking ? 'Stop real-time tracking' : 'Start real-time tracking'"
          >
            <span v-if="isTracking">
              <span class="live-indicator"></span> Live
            </span>
            <span v-else>Start Live Tracking</span>
          </button>
          
          <!-- Manual refresh button (hidden during live tracking) -->
          <button 
            v-if="!isTracking" 
            @click="refreshFlightData" 
            class="btn btn-primary"
          >
            Refresh Data
          </button>
        </div>
      </div>
      
      <!-- Live tracking status indicator if active -->
      <div v-if="isTracking" class="realtime-status">
        <div class="realtime-indicator">
          <span class="live-dot"></span> Live tracking active
        </div>
        <div class="last-update">
          Last update: {{ lastUpdatedFormatted }}
        </div>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>
      
      <div class="status-card-container">
        <div class="status-card">
          <div class="status-label">Status</div>
          <div class="status-value">
            <span class="badge" :class="getStatusClass(flight.status)">
              {{ formatStatus(flight.status) }}
            </span>
            <span v-if="isTracking" class="live-tag">LIVE</span>
          </div>
        </div>
        
        <div class="status-card">
          <div class="status-label">Scheduled Departure</div>
          <div class="status-value">{{ formatDateTime(flight.scheduledDeparture) }}</div>
          <div v-if="flight.actualDeparture" class="status-subvalue">
            Actual: {{ formatDateTime(flight.actualDeparture) }}
          </div>
        </div>
        
        <div class="status-card">
          <div class="status-label">Scheduled Arrival</div>
          <div class="status-value">{{ formatDateTime(flight.scheduledArrival) }}</div>
          <div v-if="flight.actualArrival" class="status-subvalue">
            Actual: {{ formatDateTime(flight.actualArrival) }}
          </div>
        </div>
        
        <div class="status-card">
          <div class="status-label">Terminal/Gate</div>
          <div class="status-value">
            {{ flight.terminal ? `Terminal ${flight.terminal}` : 'TBD' }}
          </div>
          <div class="status-subvalue">
            {{ flight.gate ? `Gate ${flight.gate}` : 'TBD' }}
          </div>
        </div>
      </div>
      
      <div v-if="flight.inboundFlightId" class="inbound-flight-info">
        <h3>Inbound Aircraft</h3>
        <div class="inbound-status">
          <div>Flight: {{ flight.inboundFlightNumber }}</div>
          <div>Status: 
            <span class="badge" :class="getStatusClass(flight.inboundFlightStatus || 'scheduled')">
              {{ formatStatus(flight.inboundFlightStatus || 'scheduled') }}
            </span>
          </div>
          <router-link :to="`/flights/${flight.inboundFlightId}`" class="btn btn-sm btn-secondary">
            View Inbound Flight
          </router-link>
        </div>
      </div>
      
      <div v-if="flight.status === 'in_air'" class="flight-position-info">
        <h3>Current Position</h3>
        <div class="position-details">
          <div class="position-item">
            <div class="position-label">Altitude</div>
            <div class="position-value">{{ flight.altitude ? `${flight.altitude} ft` : 'N/A' }}</div>
          </div>
          <div class="position-item">
            <div class="position-label">Ground Speed</div>
            <div class="position-value">{{ flight.groundSpeed ? `${flight.groundSpeed} knots` : 'N/A' }}</div>
          </div>
          <div class="position-item">
            <div class="position-label">Heading</div>
            <div class="position-value">{{ flight.heading ? `${flight.heading}°` : 'N/A' }}</div>
          </div>
          <div class="position-item">
            <div class="position-label">Last Updated</div>
            <div class="position-value">{{ formatDateTime(flight.updatedAt) }}</div>
          </div>
        </div>
        <div class="flight-position-map">
          <flight-map :flights="[flight]" />
        </div>
      </div>
      
      <div class="passenger-section">
        <div class="passenger-header">
          <h3>Passengers</h3>
          <div class="passenger-summary">
            <div class="passenger-stat">
              <div class="stat-label">Total</div>
              <div class="stat-value">{{ flight.totalPassengers }}</div>
            </div>
            <div class="passenger-stat">
              <div class="stat-label">Checked In</div>
              <div class="stat-value">{{ flight.checkedInPassengers }}</div>
            </div>
            <div class="passenger-stat">
              <div class="stat-label">Boarded</div>
              <div class="stat-value">{{ flight.boardedPassengers }}</div>
            </div>
            <button @click="showPassengerUpload = true" class="btn btn-primary">
              Upload Passenger List
            </button>
          </div>
        </div>
        
        <!-- Passenger list -->
        <passenger-list 
          :flight-id="flight.id"
          :loading="passengersStore.loading"
        />
        
        <!-- Passenger upload modal -->
        <passenger-upload-modal 
          v-if="showPassengerUpload"
          :flight-id="flight.id"
          :flight-number="flight.flightNumber"
          @close="showPassengerUpload = false"
          @uploaded="onPassengersUploaded"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format } from 'date-fns'
import { useFlightStore } from '../stores/flights'
import { usePassengerStore } from '../stores/passengers'
import { FlightStatus } from '../types/flight'
import FlightMap from '../components/flights/FlightMap.vue'
import PassengerList from '../components/passengers/PassengerList.vue'
import PassengerUploadModal from '../components/passengers/PassengerUploadModal.vue'
import { 
  startTrackingFlight, 
  stopTrackingFlight, 
  useRealtimeFlightData 
} from '../services/realtimeFlightService'

const route = useRoute()
const router = useRouter()
const flightsStore = useFlightStore()
const passengersStore = usePassengerStore()

// State
const flightId = computed(() => route.params.flightId as string)
const loading = ref(true)
const showPassengerUpload = ref(false)
const realtimeEnabled = ref(true)
const updateInterval = ref(60) // seconds
const isTracking = ref(false)

// Get realtime data state
const { lastUpdated, errorMessage } = useRealtimeFlightData()

// Computed
const flight = computed(() => {
  // Correctly use the getter function without accessing .value
  return flightsStore.getFlightById(flightId.value)
})

const lastUpdatedFormatted = computed(() => {
  if (!lastUpdated.value) return 'Not updated yet'
  return format(lastUpdated.value, 'MMM d, yyyy HH:mm:ss')
})

const flightStatus = computed(() => {
  if (!flight.value) return null
  
  // Determine if flight should have real-time tracking based on status
  return {
    status: flight.value.status,
    canTrack: ['scheduled', 'boarding', 'departed', 'in_air', 'delayed'].includes(flight.value.status),
    isActive: ['in_air', 'departed'].includes(flight.value.status),
    isLive: isTracking.value
  }
})

// Methods
const loadFlightData = async () => {
  try {
    loading.value = true
    
    // Use the specific method to fetch flight by ID, which preserves IDs
    const flightData = await flightsStore.fetchFlightById(flightId.value)
    
    if (flightData) {
      console.log(`Successfully fetched flight ${flightId.value}`)
      
      // Load passengers for this flight
      await passengersStore.fetchPassengers(flightData.id)
      
      // If real-time tracking is enabled and the flight is active, start tracking it
      if (realtimeEnabled.value && flightStatus.value?.canTrack) {
        startRealtimeTracking()
      }
    } else {
      console.error(`Flight with ID ${flightId.value} not found`)
      // If flight not found in cache or by specific ID, try loading all flights as a fallback
      await flightsStore.fetchFlights(undefined, true) // Force refresh
    }
  } catch (error) {
    console.error('Error loading flight data:', error)
  } finally {
    loading.value = false
  }
}

const refreshFlightData = async () => {
  if (isTracking.value) {
    // If we're already tracking, just wait for the next update
    console.log('Flight is already being tracked in real-time')
  } else {
    // Otherwise, do a manual refresh
    await loadFlightData()
  }
}

const startRealtimeTracking = async () => {
  if (!flight.value) return
  
  try {
    await startTrackingFlight(flightId.value, updateInterval.value)
    isTracking.value = true
    console.log(`Started real-time tracking for flight ${flight.value.flightNumber}`)
  } catch (error) {
    console.error('Failed to start real-time tracking:', error)
  }
}

const stopRealtimeTracking = () => {
  if (!flight.value) return
  
  stopTrackingFlight(flightId.value)
  isTracking.value = false
  console.log(`Stopped real-time tracking for flight ${flight.value.flightNumber}`)
}

const toggleRealtimeTracking = () => {
  if (isTracking.value) {
    stopRealtimeTracking()
  } else {
    startRealtimeTracking()
  }
}

const goBack = () => {
  router.back()
}

const formatDateTime = (dateString: Date) => {
  const date = new Date(dateString)
  return format(date, 'MMM d, yyyy HH:mm')
}

const formatStatus = (status: FlightStatus) => {
  switch (status) {
    case 'scheduled': return 'Scheduled'
    case 'boarding': return 'Boarding'
    case 'departed': return 'Departed'
    case 'in_air': return 'In Air'
    case 'landing': return 'Landing'
    case 'landed': return 'Landed'
    case 'taxiing': return 'Taxiing'
    case 'arrived': return 'Arrived'
    case 'delayed': return 'Delayed'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

const getStatusClass = (status: FlightStatus) => {
  return `status-${status}`
}

const onPassengersUploaded = () => {
  showPassengerUpload.value = false
  refreshFlightData()
}

// Lifecycle hooks
onMounted(() => {
  loadFlightData()
})

onUnmounted(() => {
  // Make sure to clean up tracking when component is unmounted
  if (isTracking.value) {
    stopRealtimeTracking()
  }
})
</script>

<style scoped>
.flight-details {
  padding: 1.5rem;
}

.loading, .not-found {
  text-align: center;
  padding: 2rem;
  color: var(--gray-color);
}

.flight-details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.back-button {
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.back-button:hover {
  background-color: var(--hover-color);
}

.flight-title {
  text-align: center;
}

.flight-route {
  color: var(--gray-color);
  margin-top: 0.5rem;
}

.status-card-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.status-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
}

.status-label {
  font-weight: bold;
  color: var(--gray-color);
  margin-bottom: 0.5rem;
}

.status-value {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.status-subvalue {
  color: var(--gray-color);
  font-size: 0.9rem;
}

.badge {
  display: inline-block;
  padding: 0.25em 0.4em;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  vertical-align: baseline;
  border-radius: 0.25rem;
  color: white;
}

/* Real-time tracking styles */
.realtime-status {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.realtime-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: bold;
  color: #28a745;
}

.live-dot,
.live-indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  background-color: #28a745;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.last-update {
  color: #6c757d;
}

.live-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: bold;
  color: white;
  background-color: #28a745;
  border-radius: 12px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}

.inbound-flight-info {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.inbound-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.flight-position-info {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.position-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
}

.position-item {
  padding: 0.5rem;
}

.position-label {
  font-weight: bold;
  color: var(--gray-color);
  margin-bottom: 0.25rem;
}

.position-value {
  font-weight: bold;
}

.flight-position-map {
  height: 300px;
  margin-top: 1rem;
}

.passenger-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
}

.passenger-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.passenger-summary {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.passenger-stat {
  text-align: center;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--gray-color);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  border-radius: 0.2rem;
}

@media (max-width: 768px) {
  .flight-details-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .flight-title {
    text-align: left;
  }
  
  .flight-actions {
    width: 100%;
  }
  
  .inbound-status {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .passenger-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .passenger-summary {
    width: 100%;
    justify-content: space-between;
  }
}
</style>