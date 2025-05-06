<template>
  <div class="passenger-list">
    <div v-if="loading" class="loading-indicator">
      Loading passengers...
    </div>
    
    <div v-else-if="passengers.length === 0" class="no-passengers">
      No passengers found for this flight.
    </div>
    
    <div v-else class="passenger-table-container">
      <div class="passenger-filters">
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search passengers..."
            class="form-control"
          >
        </div>
        
        <div class="status-filter">
          <select v-model="statusFilter" class="form-control">
            <option value="all">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="checked_in">Checked In</option>
            <option value="boarded">Boarded</option>
            <option value="no_show">No Show</option>
            <option value="flight_completed">Flight Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      
      <table class="table passenger-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Seat</th>
            <th>Status</th>
            <th>Check-in</th>
            <th>Baggage</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="passenger in filteredPassengers" :key="passenger.id">
            <td>
              <div class="passenger-name">
                {{ passenger.lastName }}, {{ passenger.firstName }}
              </div>
              <div class="passenger-contact" v-if="passenger.email || passenger.phoneNumber">
                {{ passenger.email || passenger.phoneNumber }}
              </div>
            </td>
            <td>{{ passenger.seatNumber || 'Not Assigned' }}</td>
            <td>
              <span class="badge" :class="getStatusClass(passenger.status)">
                {{ formatStatus(passenger.status) }}
              </span>
            </td>
            <td>
              <div v-if="passenger.checkInTime">
                {{ formatTime(passenger.checkInTime) }}
              </div>
              <div v-else class="not-checked-in">
                Not checked in
              </div>
            </td>
            <td>
              <div v-if="passenger.baggage && passenger.baggage.count > 0">
                {{ passenger.baggage.count }} bag{{ passenger.baggage.count > 1 ? 's' : '' }}
                <span v-if="passenger.baggage.checked" class="baggage-checked">
                  (checked)
                </span>
              </div>
              <div v-else>None</div>
            </td>
            <td>
              <button @click="updatePassengerStatus(passenger)" class="btn btn-sm btn-primary">
                Update Status
              </button>
              <router-link :to="`/passengers/${passenger.id}`" class="btn btn-sm btn-secondary ml-1">
                Details
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Update status modal -->
    <div v-if="showStatusModal" class="status-modal">
      <div class="status-modal-content">
        <div class="status-modal-header">
          <h3>Update Passenger Status</h3>
          <button @click="showStatusModal = false" class="close-button">&times;</button>
        </div>
        <div class="status-modal-body">
          <div class="passenger-info">
            <div>{{ selectedPassenger?.lastName }}, {{ selectedPassenger?.firstName }}</div>
            <div>{{ selectedPassenger?.seatNumber || 'No seat assigned' }}</div>
          </div>
          
          <div class="form-group mt-3">
            <label for="status">New Status:</label>
            <select v-model="newStatus" id="status" class="form-control">
              <option value="booked">Booked</option>
              <option value="checked_in">Checked In</option>
              <option value="boarded">Boarded</option>
              <option value="no_show">No Show</option>
              <option value="flight_completed">Flight Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div class="status-modal-footer">
          <button @click="showStatusModal = false" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="confirmStatusUpdate" class="btn btn-primary ml-2">
            Update
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format } from 'date-fns'
import { usePassengerStore } from '../../stores/passengers'
import { Passenger, PassengerStatus } from '../../types/passenger'

const props = defineProps<{
  flightId: string
  loading: boolean
}>()

const passengersStore = usePassengerStore()

// State
const searchQuery = ref('')
const statusFilter = ref('all')
const showStatusModal = ref(false)
const selectedPassenger = ref<Passenger | null>(null)
const newStatus = ref<PassengerStatus>('booked')

// Computed
const passengers = computed(() => {
  return passengersStore.passengersByFlight(props.flightId)
})

const filteredPassengers = computed(() => {
  let result = [...passengers.value]
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(passenger => {
      return (
        passenger.firstName.toLowerCase().includes(query) ||
        passenger.lastName.toLowerCase().includes(query) ||
        (passenger.seatNumber && passenger.seatNumber.toLowerCase().includes(query)) ||
        (passenger.email && passenger.email.toLowerCase().includes(query))
      )
    })
  }
  
  // Apply status filter
  if (statusFilter.value !== 'all') {
    result = result.filter(passenger => passenger.status === statusFilter.value)
  }
  
  return result
})

// Methods
const formatTime = (dateString: Date) => {
  const date = new Date(dateString)
  return format(date, 'MMM d, yyyy HH:mm')
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

const updatePassengerStatus = (passenger: Passenger) => {
  selectedPassenger.value = passenger
  newStatus.value = passenger.status
  showStatusModal.value = true
}

const confirmStatusUpdate = async () => {
  if (!selectedPassenger.value) return
  
  try {
    await passengersStore.updatePassenger(selectedPassenger.value.id, {
      status: newStatus.value,
      updatedAt: new Date()
    })
    
    // Additional logic for check-in time
    if (newStatus.value === 'checked_in' && !selectedPassenger.value.checkInTime) {
      await passengersStore.updatePassenger(selectedPassenger.value.id, {
        checkInTime: new Date()
      })
    }
    
    showStatusModal.value = false
  } catch (error) {
    console.error('Error updating passenger status:', error)
  }
}

// Lifecycle hooks
onMounted(async () => {
  if (props.flightId && !passengersStore.passengers.length) {
    await passengersStore.fetchPassengers(props.flightId)
  }
})

// Watch for flight ID changes
watch(() => props.flightId, async (newId) => {
  if (newId) {
    await passengersStore.fetchPassengers(newId)
  }
})
</script>

<style scoped>
.passenger-list {
  width: 100%;
}

.loading-indicator, .no-passengers {
  padding: 1rem;
  text-align: center;
  color: var(--gray-color);
}

.passenger-filters {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.search-box {
  flex: 1;
  max-width: 300px;
}

.passenger-table-container {
  overflow-x: auto;
}

.passenger-table {
  width: 100%;
  border-collapse: collapse;
}

.passenger-table th {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 2px solid var(--border-color);
  font-weight: bold;
}

.passenger-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

.passenger-name {
  font-weight: bold;
}

.passenger-contact {
  font-size: 0.85rem;
  color: var(--gray-color);
}

.not-checked-in {
  color: var(--gray-color);
  font-style: italic;
}

.baggage-checked {
  color: var(--success-color);
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

.ml-1 {
  margin-left: 0.25rem;
}

.ml-2 {
  margin-left: 0.5rem;
}

.mt-3 {
  margin-top: 1rem;
}

/* Modal Styles */
.status-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.status-modal-content {
  background-color: white;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.status-modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-modal-body {
  padding: 1rem;
}

.status-modal-footer {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--gray-color);
}

.passenger-info {
  padding: 0.5rem;
  background-color: var(--light-color);
  border-radius: 4px;
}

@media (max-width: 768px) {
  .passenger-filters {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .search-box {
    max-width: 100%;
  }
}
</style>