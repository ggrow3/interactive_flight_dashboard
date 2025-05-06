<template>
  <div class="passengers-view">
    <div class="passengers-header">
      <h1>All Passengers</h1>
      <div class="passengers-controls">
        <div class="search-container">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search by name, email, or flight number..." 
            class="form-control search-input"
            @input="applyFilters"
          >
        </div>
        <div class="status-filter">
          <select v-model="statusFilter" class="form-control" @change="applyFilters">
            <option value="all">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="checked_in">Checked In</option>
            <option value="boarded">Boarded</option>
            <option value="no_show">No Show</option>
            <option value="flight_completed">Flight Completed</option>
            <option value="connecting">Connecting</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button @click="refreshData" class="btn btn-primary">
          Refresh
        </button>
      </div>
    </div>
    
    <div class="passengers-table-container">
      <div v-if="loading" class="loading-indicator">
        Loading passengers...
      </div>
      
      <div v-else-if="filteredPassengers.length === 0" class="no-passengers">
        No passengers found matching your criteria.
      </div>
      
      <table v-else class="table passengers-table">
        <thead>
          <tr>
            <th @click="sortBy('lastName')">
              Name 
              <sort-icon :column="'lastName'" :current-sort="sortColumn" :current-direction="sortDirection" />
            </th>
            <th @click="sortBy('flightNumber')">
              Flight
              <sort-icon :column="'flightNumber'" :current-sort="sortColumn" :current-direction="sortDirection" />
            </th>
            <th @click="sortBy('seatNumber')">
              Seat
              <sort-icon :column="'seatNumber'" :current-sort="sortColumn" :current-direction="sortDirection" />
            </th>
            <th @click="sortBy('status')">
              Status
              <sort-icon :column="'status'" :current-sort="sortColumn" :current-direction="sortDirection" />
            </th>
            <th>Contact</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="passenger in filteredPassengers" :key="passenger.id">
            <td>
              <div class="passenger-name">{{ passenger.lastName }}, {{ passenger.firstName }}</div>
            </td>
            <td>
              <router-link :to="`/flights/${passenger.flightId}`">
                {{ passenger.flightNumber }}
              </router-link>
            </td>
            <td>{{ passenger.seatNumber || 'Not Assigned' }}</td>
            <td>
              <span class="badge" :class="getStatusClass(passenger.status)">
                {{ formatStatus(passenger.status) }}
              </span>
            </td>
            <td>
              <div v-if="passenger.email">{{ passenger.email }}</div>
              <div v-if="passenger.phoneNumber">{{ passenger.phoneNumber }}</div>
            </td>
            <td>
              <router-link :to="`/passengers/${passenger.id}`" class="btn btn-sm btn-primary">
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
import { ref, computed, onMounted } from 'vue'
import { usePassengerStore } from '../stores/passengers'
import { PassengerStatus } from '../types/passenger'

// Helper component for sort icons
const SortIcon = {
  props: {
    column: String,
    currentSort: String,
    currentDirection: String
  },
  template: `
    <span class="sort-icon" v-if="column === currentSort">
      {{ currentDirection === 'asc' ? '▲' : '▼' }}
    </span>
    <span class="sort-icon-placeholder" v-else></span>
  `
}

const passengersStore = usePassengerStore()

// State
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('all')
const sortColumn = ref('lastName')
const sortDirection = ref('asc')

// Computed
const filteredPassengers = computed(() => {
  let result = [...passengersStore.passengers]
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(passenger => {
      return (
        passenger.firstName.toLowerCase().includes(query) ||
        passenger.lastName.toLowerCase().includes(query) ||
        passenger.flightNumber.toLowerCase().includes(query) ||
        (passenger.email && passenger.email.toLowerCase().includes(query)) ||
        (passenger.phoneNumber && passenger.phoneNumber.toLowerCase().includes(query)) ||
        (passenger.seatNumber && passenger.seatNumber.toLowerCase().includes(query))
      )
    })
  }
  
  // Apply status filter
  if (statusFilter.value !== 'all') {
    result = result.filter(passenger => passenger.status === statusFilter.value)
  }
  
  // Apply sorting
  result.sort((a, b) => {
    let valueA, valueB
    
    if (sortColumn.value === 'lastName') {
      valueA = `${a.lastName}, ${a.firstName}`.toLowerCase()
      valueB = `${b.lastName}, ${b.firstName}`.toLowerCase()
    } else {
      valueA = a[sortColumn.value] || ''
      valueB = b[sortColumn.value] || ''
      
      if (typeof valueA === 'string') valueA = valueA.toLowerCase()
      if (typeof valueB === 'string') valueB = valueB.toLowerCase()
    }
    
    if (valueA < valueB) return sortDirection.value === 'asc' ? -1 : 1
    if (valueA > valueB) return sortDirection.value === 'asc' ? 1 : -1
    return 0
  })
  
  return result
})

// Methods
const loadPassengers = async () => {
  try {
    loading.value = true
    await passengersStore.fetchPassengers()
  } catch (error) {
    console.error('Error loading passengers:', error)
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadPassengers()
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

const formatStatus = (status: PassengerStatus) => {
  switch (status) {
    case 'booked': return 'Booked'
    case 'checked_in': return 'Checked In'
    case 'boarded': return 'Boarded'
    case 'no_show': return 'No Show'
    case 'flight_completed': return 'Completed'
    case 'connecting': return 'Connecting'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

const getStatusClass = (status: PassengerStatus) => {
  switch (status) {
    case 'booked': return 'badge-secondary'
    case 'checked_in': return 'badge-info'
    case 'boarded': return 'badge-primary'
    case 'no_show': return 'badge-danger'
    case 'flight_completed': return 'badge-success'
    case 'connecting': return 'badge-info'
    case 'cancelled': return 'badge-danger'
    default: return 'badge-secondary'
  }
}

// Lifecycle
onMounted(() => {
  loadPassengers()
})
</script>

<style scoped>
.passengers-view {
  padding: 1.5rem;
}

.passengers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.passengers-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-container {
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
}

.passengers-table-container {
  overflow-x: auto;
}

.loading-indicator, .no-passengers {
  padding: 2rem;
  text-align: center;
  color: var(--gray-color);
}

.passengers-table {
  width: 100%;
  border-collapse: collapse;
}

.passengers-table th {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 2px solid var(--border-color);
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
}

.passengers-table th:hover {
  background-color: var(--hover-color);
}

.passengers-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

.passenger-name {
  font-weight: bold;
}

.sort-icon {
  margin-left: 0.25rem;
  display: inline-block;
  width: 1rem;
  text-align: center;
}

.sort-icon-placeholder {
  margin-left: 0.25rem;
  display: inline-block;
  width: 1rem;
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

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  border-radius: 0.2rem;
}

@media (max-width: 768px) {
  .passengers-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .passengers-controls {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>