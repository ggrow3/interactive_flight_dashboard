<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Flight Operations Dashboard</h1>
      <div class="dashboard-controls">
        <div class="date-selector">
          <label for="date">Date:</label>
          <input 
            type="date" 
            id="date" 
            v-model="selectedDate"
            @change="loadDashboardData"
          >
        </div>
        <button @click="refreshData" class="btn btn-primary">
          Refresh Data
        </button>
      </div>
    </div>
    
    <div class="dashboard-summary">
      <div class="summary-card">
        <div class="summary-title">Total Flights</div>
        <div class="summary-value">{{ flightsStore.flights.length }}</div>
        <div class="summary-details">
          <span>{{ flightsStore.inboundFlights.length }} Arrivals</span>
          <span>{{ flightsStore.outboundFlights.length }} Departures</span>
        </div>
      </div>
      
      <div class="summary-card">
        <div class="summary-title">Passengers</div>
        <div class="summary-value">{{ totalPassengers }}</div>
        <div class="summary-details">
          <span>{{ boardedPassengers }} Boarded</span>
          <span>{{ inAirPassengers }} In Air</span>
        </div>
      </div>
      
      <div class="summary-card">
        <div class="summary-title">Flight Status</div>
        <div class="summary-details status-summary">
          <div class="status-item">
            <span class="status-badge status-scheduled"></span>
            <span>{{ scheduledFlights.length }} Scheduled</span>
          </div>
          <div class="status-item">
            <span class="status-badge status-in_air"></span>
            <span>{{ inAirFlights.length }} In Air</span>
          </div>
          <div class="status-item">
            <span class="status-badge status-landed"></span>
            <span>{{ landedFlights.length }} Landed</span>
          </div>
          <div class="status-item">
            <span class="status-badge status-delayed"></span>
            <span>{{ delayedFlights.length }} Delayed</span>
          </div>
        </div>
      </div>
      
      <div class="summary-card">
        <div class="summary-title">Operational</div>
        <div class="summary-details">
          <div v-if="delayedFlights.length > 0" class="alert-item">
            <span class="alert-icon">⚠️</span>
            <span>{{ delayedFlights.length }} Delayed Flights</span>
          </div>
          <div v-if="inboundDelays.length > 0" class="alert-item">
            <span class="alert-icon">⚠️</span>
            <span>{{ inboundDelays.length }} Inbound Delays</span>
          </div>
          <div v-if="missedConnections > 0" class="alert-item">
            <span class="alert-icon">⚠️</span>
            <span>{{ missedConnections }} Missed Connections</span>
          </div>
          <div v-if="incidents > 0" class="alert-item">
            <span class="alert-icon">⚠️</span>
            <span>{{ incidents }} Incidents</span>
          </div>
          <div v-if="delayedFlights.length === 0 && inboundDelays.length === 0 && missedConnections === 0 && incidents === 0" class="all-clear">
            All Systems Normal
          </div>
        </div>
      </div>
    </div>
    
    <div class="dashboard-container">
      <div class="card">
        <div class="card-header">
          <h2>Arrivals</h2>
        </div>
        <div class="card-body">
          <flight-list 
            :flights="inboundFlightsSorted" 
            :loading="flightsStore.loading"
            flight-type="arrival"
          />
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h2>Departures</h2>
        </div>
        <div class="card-body">
          <flight-list 
            :flights="outboundFlightsSorted" 
            :loading="flightsStore.loading"
            flight-type="departure"
          />
        </div>
      </div>
    </div>
    
    <div class="dashboard-map-container">
      <div class="card">
        <div class="card-header">
          <h2>Live Flight Map</h2>
        </div>
        <div class="card-body">
          <flight-map :flights="flightsStore.flights" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { format } from 'date-fns'
import { useFlightStore } from '../stores/flights'
import { usePassengerStore } from '../stores/passengers'
import FlightList from '../components/flights/FlightList.vue'
import FlightMap from '../components/flights/FlightMap.vue'
import { FlightStatus } from '../types/flight'

const flightsStore = useFlightStore()
const passengersStore = usePassengerStore()

// State
const selectedDate = ref(format(new Date(), 'yyyy-MM-dd'))
const incidents = ref(0)
const missedConnections = ref(0)

// Computed properties
const inboundFlightsSorted = computed(() => {
  return [...flightsStore.inboundFlights].sort((a, b) => {
    return new Date(a.scheduledArrival).getTime() - new Date(b.scheduledArrival).getTime()
  })
})

const outboundFlightsSorted = computed(() => {
  return [...flightsStore.outboundFlights].sort((a, b) => {
    return new Date(a.scheduledDeparture).getTime() - new Date(b.scheduledDeparture).getTime()
  })
})

const scheduledFlights = computed(() => {
  return flightsStore.flightsByStatus('scheduled')
})

const inAirFlights = computed(() => {
  return flightsStore.flightsByStatus('in_air')
})

const landedFlights = computed(() => {
  return flightsStore.flightsByStatus('landed')
})

const delayedFlights = computed(() => {
  return flightsStore.flights.filter(flight => flight.delayMinutes > 0)
})

const inboundDelays = computed(() => {
  return flightsStore.flights.filter(flight => 
    flight.inboundFlightStatus === 'delayed' || 
    flight.inboundFlightStatus === 'in_air' && flight.inboundFlightId
  )
})

const totalPassengers = computed(() => {
  return flightsStore.flights.reduce((total, flight) => total + flight.totalPassengers, 0)
})

const boardedPassengers = computed(() => {
  return flightsStore.flights.reduce((total, flight) => total + flight.boardedPassengers, 0)
})

const inAirPassengers = computed(() => {
  return flightsStore.flights
    .filter(flight => flight.status === 'in_air')
    .reduce((total, flight) => total + flight.boardedPassengers, 0)
})

// Methods
const loadDashboardData = async () => {
  const selectedDateObj = new Date(selectedDate.value)
  await flightsStore.fetchFlights(selectedDateObj)
  
  // After loading flights, load passengers for these flights
  await passengersStore.fetchPassengers()
  
  // Simulate some incidents data
  incidents.value = Math.floor(Math.random() * 3)
  missedConnections.value = Math.floor(Math.random() * 5)
}

const refreshData = () => {
  loadDashboardData()
}

// Lifecycle hooks
onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
.dashboard {
  padding: 1.5rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.dashboard-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.date-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dashboard-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
}

.summary-title {
  font-weight: bold;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.summary-value {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.summary-details {
  display: flex;
  justify-content: space-between;
  color: var(--gray-color);
}

.status-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-badge {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--warning-color);
  margin-bottom: 0.5rem;
}

.all-clear {
  color: var(--success-color);
  font-weight: bold;
}

.dashboard-map-container {
  margin-top: 1.5rem;
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .dashboard-controls {
    width: 100%;
  }
}
</style>