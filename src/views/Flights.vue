<template>
  <div class="flights-view">
    <div class="flights-header">
      <h1>All Flights</h1>
      <div class="flights-controls">
        <div class="date-selector">
          <label for="date">Date:</label>
          <input 
            type="date" 
            id="date" 
            v-model="selectedDate"
            @change="loadFlights"
          >
        </div>
        <div class="flight-type-filter">
          <select v-model="flightTypeFilter" class="form-control" @change="applyFilters">
            <option value="all">All Flights</option>
            <option value="arrival">Arrivals</option>
            <option value="departure">Departures</option>
          </select>
        </div>
        <div class="status-filter">
          <select v-model="statusFilter" class="form-control" @change="applyFilters">
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="boarding">Boarding</option>
            <option value="departed">Departed</option>
            <option value="in_air">In Air</option>
            <option value="landed">Landed</option>
            <option value="delayed">Delayed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button @click="refreshData" class="btn btn-primary">
          Refresh
        </button>
      </div>
    </div>
    
    <div class="search-container">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Search by flight number, airline, origin, or destination..." 
        class="form-control search-input"
        @input="applyFilters"
      >
    </div>
    
    <div class="flights-table-container">
      <div v-if="loading" class="loading-indicator">
        Loading flights...
      </div>
      
      <div v-else-if="filteredFlights.length === 0" class="no-flights">
        No flights found matching your criteria.
      </div>
      
      <table v-else class="table flights-table">
        <thead>
          <tr>
            <th @click="sortBy('flightNumber')">
              Flight # 
              <sort-icon :column="'flightNumber'" :current-sort="sortColumn" :current-direction="sortDirection" />
            </th>
            <th @click="sortBy('airline')">
              Airline
              <sort-icon :column="'airline'" :current-sort="sortColumn" :current-direction="sortDirection" />
            </th>
            <th @click="sortBy('origin')">
              Origin
              <sort-icon :column="'origin'" :current-sort="sortColumn" :current-direction="sortDirection" />
            </th>
            <th @click="sortBy('destination')">
              Destination
              <sort-icon :column="'destination'" :current-sort="sortColumn" :current-direction="sortDirection" />
            </th>
            <th @click="sortBy('scheduledDeparture')">
              Departure
              <sort-icon :column="'scheduledDeparture'" :current-sort="sortColumn" :current-direction="sortDirection" />
            </th>
            <th @click="sortBy('scheduledArrival')">
              Arrival
              <sort-icon :column="'scheduledArrival'" :current-sort="sortColumn" :current-direction="sortDirection" />
            </th>
            <th @click="sortBy('status')">
              Status
              <sort-icon :column="'status'" :current-sort="sortColumn" :current-direction="sortDirection" />
            </th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="flight in filteredFlights" :key="flight.id" :class="getRowClass(flight)">
            <td>
              {{ flight.flightNumber }}
            </td>
            <td>{{ flight.airline }}</td>
            <td>{{ flight.origin }}</td>
            <td>{{ flight.destination }}</td>
            <td>
              {{ formatTime(flight.scheduledDeparture) }}
              <div v-if="flight.delayMinutes > 0 && flight.flightType === 'departure'" class="delay-info">
                Delayed: {{ flight.delayMinutes }} min
              </div>
            </td>
            <td>
              {{ formatTime(flight.scheduledArrival) }}
              <div v-if="flight.delayMinutes > 0 && flight.flightType === 'arrival'" class="delay-info">
                Delayed: {{ flight.delayMinutes }} min
              </div>
            </td>
            <td>
              <span class="badge" :class="getStatusClass(flight.status)">
                {{ formatStatus(flight.status) }}
              </span>
            </td>
            <td>
              <router-link :to="`/flights/${flight.id}`" class="btn btn-sm btn-primary">
                View
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format } from 'date-fns'
import { useFlightStore } from '../stores/flights'
import { Flight, FlightStatus } from '../types/flight'

// Import the SortIcon component
import SortIcon from '../components/ui/SortIcon.vue'

const flightStore = useFlightStore()

// State
const loading = ref(true)
const selectedDate = ref(format(new Date(), 'yyyy-MM-dd'))
const searchQuery = ref('')
const flightTypeFilter = ref('all')
const statusFilter = ref('all')
const sortColumn = ref('scheduledDeparture')
const sortDirection = ref('asc')

// Computed properties
const filteredFlights = computed(() => {
  let result = [...flightStore.flights]
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(flight => {
      return (
        flight.flightNumber.toLowerCase().includes(query) ||
        flight.airline.toLowerCase().includes(query) ||
        flight.origin.toLowerCase().includes(query) ||
        flight.destination.toLowerCase().includes(query)
      )
    })
  }
  
  // Apply flight type filter
  if (flightTypeFilter.value !== 'all') {
    result = result.filter(flight => flight.flightType === flightTypeFilter.value)
  }
  
  // Apply status filter
  if (statusFilter.value !== 'all') {
    result = result.filter(flight => flight.status === statusFilter.value)
  }
  
  // Apply sorting
  result.sort((a, b) => {
    let valueA, valueB
    
    switch (sortColumn.value) {
      case 'scheduledDeparture':
      case 'scheduledArrival':
        valueA = new Date(a[sortColumn.value]).getTime()
        valueB = new Date(b[sortColumn.value]).getTime()
        break
      default:
        valueA = a[sortColumn.value]
        valueB = b[sortColumn.value]
    }
    
    if (valueA < valueB) return sortDirection.value === 'asc' ? -1 : 1
    if (valueA > valueB) return sortDirection.value === 'asc' ? 1 : -1
    return 0
  })
  
  return result
})

// Methods
const loadFlights = async () => {
  try {
    loading.value = true
    const selectedDateObj = new Date(selectedDate.value)
    await flightStore.fetchFlights(selectedDateObj)
  } catch (error) {
    console.error('Error loading flights:', error)
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadFlights()
}

const applyFilters = () => {
  // This function is triggered when filters change
  // The actual filtering is done in the computed property
}

const sortBy = (column: string) => {
  if (sortColumn.value === column) {
    // Toggle direction if clicking the same column
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // Default to ascending when changing columns
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

const formatTime = (dateString: Date) => {
  const date = new Date(dateString)
  return format(date, 'HH:mm')
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

const getRowClass = (flight: Flight) => {
  if (flight.status === 'cancelled') return 'cancelled-flight'
  if (flight.delayMinutes > 0) return 'delayed-flight'
  return ''
}

// Lifecycle hooks
onMounted(() => {
  loadFlights()
})

// Watch for date changes
watch(() => selectedDate.value, () => {
  loadFlights()
})
</script>

<style scoped>
.flights-view {
  padding: 1.5rem;
}

.flights-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.flights-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.date-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-container {
  margin-bottom: 1.5rem;
}

.search-input {
  max-width: 100%;
}

.flights-table-container {
  overflow-x: auto;
}

.loading-indicator, .no-flights {
  padding: 2rem;
  text-align: center;
  color: var(--gray-color);
}

.flights-table {
  width: 100%;
  border-collapse: collapse;
}

.flights-table th {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 2px solid var(--border-color);
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
}

.flights-table th:hover {
  background-color: var(--hover-color);
}

.flights-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

/* Sort icons are now styled in the SortIcon component */

.delay-info {
  color: var(--warning-color);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.cancelled-flight {
  background-color: rgba(231, 76, 60, 0.1);
}

.delayed-flight {
  background-color: rgba(243, 156, 18, 0.1);
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  border-radius: 0.2rem;
}

@media (max-width: 768px) {
  .flights-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .flights-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .date-selector {
    width: 100%;
  }
}
</style>