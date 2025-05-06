<template>
  <div class="passenger-details">
    <div v-if="loading" class="loading">
      Loading passenger details...
    </div>
    
    <div v-else-if="!passenger" class="not-found">
      Passenger not found
    </div>
    
    <template v-else>
      <div class="passenger-details-header">
        <button @click="goBack" class="back-button">
          &larr; Back
        </button>
        
        <div class="passenger-title">
          <h1>{{ passenger.lastName }}, {{ passenger.firstName }}</h1>
          <div class="passenger-flight">
            Flight: <router-link :to="`/flights/${passenger.flightId}`">{{ passenger.flightNumber }}</router-link>
          </div>
        </div>
        
        <div class="passenger-actions">
          <button @click="showUpdateStatus = true" class="btn btn-primary">
            Update Status
          </button>
        </div>
      </div>
      
      <div class="passenger-info-grid">
        <div class="info-card">
          <div class="info-label">Status</div>
          <div class="info-value">
            <span class="badge" :class="getStatusClass(passenger.status)">
              {{ formatStatus(passenger.status) }}
            </span>
          </div>
        </div>
        
        <div class="info-card">
          <div class="info-label">Seat</div>
          <div class="info-value">{{ passenger.seatNumber || 'Not Assigned' }}</div>
        </div>
        
        <div class="info-card">
          <div class="info-label">Email</div>
          <div class="info-value">{{ passenger.email || 'Not Provided' }}</div>
        </div>
        
        <div class="info-card">
          <div class="info-label">Phone</div>
          <div class="info-value">{{ passenger.phoneNumber || 'Not Provided' }}</div>
        </div>
        
        <div class="info-card">
          <div class="info-label">Check-in Time</div>
          <div class="info-value">
            {{ passenger.checkInTime ? formatDateTime(passenger.checkInTime) : 'Not Checked In' }}
          </div>
        </div>
        
        <div class="info-card">
          <div class="info-label">Boarding Time</div>
          <div class="info-value">
            {{ passenger.boardingTime || 'Not Boarded' }}
          </div>
        </div>
      </div>
      
      <div class="baggage-section" v-if="passenger.baggage">
        <h3>Baggage</h3>
        <div class="baggage-info">
          <div class="baggage-count">{{ passenger.baggage.count }} bag{{ passenger.baggage.count !== 1 ? 's' : '' }}</div>
          <div class="baggage-status">{{ passenger.baggage.checked ? 'Checked' : 'Not Checked' }}</div>
        </div>
      </div>
      
      <div class="special-needs-section" v-if="passenger.specialNeeds && passenger.specialNeeds.length > 0">
        <h3>Special Needs</h3>
        <ul class="special-needs-list">
          <li v-for="(need, index) in passenger.specialNeeds" :key="index">
            {{ need }}
          </li>
        </ul>
      </div>
      
      <div class="connecting-flight-section" v-if="passenger.connectingFlightId">
        <h3>Connecting Flight</h3>
        <div class="connecting-flight-info">
          <div>Flight Number: {{ passenger.connectingFlightNumber }}</div>
          <router-link :to="`/flights/${passenger.connectingFlightId}`" class="btn btn-sm btn-secondary">
            View Flight
          </router-link>
        </div>
      </div>
    </template>
    
    <!-- Update status modal -->
    <div v-if="showUpdateStatus" class="update-status-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Update Passenger Status</h3>
          <button @click="showUpdateStatus = false" class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="status">New Status:</label>
            <select v-model="newStatus" id="status" class="form-control">
              <option value="booked">Booked</option>
              <option value="checked_in">Checked In</option>
              <option value="boarded">Boarded</option>
              <option value="no_show">No Show</option>
              <option value="flight_completed">Flight Completed</option>
              <option value="connecting">Connecting</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div v-if="newStatus === 'checked_in' && !passenger.checkInTime" class="form-group">
            <div class="checkbox">
              <label>
                <input type="checkbox" v-model="updateCheckInTime"> Set check-in time to now
              </label>
            </div>
          </div>
          
          <div v-if="newStatus === 'boarded' && !passenger.boardingTime" class="form-group">
            <div class="checkbox">
              <label>
                <input type="checkbox" v-model="updateBoardingTime"> Set boarding time to now
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showUpdateStatus = false" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="updatePassengerStatus" class="btn btn-primary">
            Update Status
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format } from 'date-fns'
import { usePassengerStore } from '../stores/passengers'
import { PassengerStatus } from '../types/passenger'

const route = useRoute()
const router = useRouter()
const passengersStore = usePassengerStore()

// State
const passengerId = computed(() => route.params.passengerId as string)
const loading = ref(true)
const showUpdateStatus = ref(false)
const newStatus = ref<PassengerStatus>('booked')
const updateCheckInTime = ref(true)
const updateBoardingTime = ref(true)

// Computed
const passenger = computed(() => {
  // Correctly use the getter function without accessing .value
  return passengersStore.getPassengerById(passengerId.value)
})

// Methods
const loadPassengerData = async () => {
  try {
    loading.value = true
    
    // We need to fetch all passengers if the store is empty
    if (passengersStore.passengers.length === 0) {
      await passengersStore.fetchPassengers()
    }
    
    // If we still can't find the passenger, try to fetch it directly
    if (!passenger.value && passengerId.value) {
      // Fetch individual passenger (implementation would depend on your API)
      // This is a placeholder for a direct fetch if needed
    }
    
    if (passenger.value) {
      newStatus.value = passenger.value.status
    }
  } catch (error) {
    console.error('Error loading passenger data:', error)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

const formatDateTime = (dateString: Date) => {
  const date = new Date(dateString)
  return format(date, 'MMM d, yyyy HH:mm')
}

const formatStatus = (status: PassengerStatus) => {
  switch (status) {
    case 'booked': return 'Booked'
    case 'checked_in': return 'Checked In'
    case 'boarded': return 'Boarded'
    case 'no_show': return 'No Show'
    case 'flight_completed': return 'Flight Completed'
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

const updatePassengerStatus = async () => {
  if (!passenger.value) return
  
  try {
    const updates: any = {
      status: newStatus.value,
      updatedAt: new Date()
    }
    
    // Add check-in time if needed
    if (newStatus.value === 'checked_in' && updateCheckInTime.value && !passenger.value.checkInTime) {
      updates.checkInTime = new Date()
    }
    
    // Add boarding time if needed
    if (newStatus.value === 'boarded' && updateBoardingTime.value && !passenger.value.boardingTime) {
      updates.boardingTime = format(new Date(), 'HH:mm')
    }
    
    await passengersStore.updatePassenger(passengerId.value, updates)
    showUpdateStatus.value = false
    
  } catch (error) {
    console.error('Error updating passenger status:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadPassengerData()
})
</script>

<style scoped>
.passenger-details {
  padding: 1.5rem;
}

.loading, .not-found {
  text-align: center;
  padding: 2rem;
  color: var(--gray-color);
}

.passenger-details-header {
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

.passenger-title {
  text-align: center;
}

.passenger-flight {
  color: var(--gray-color);
  margin-top: 0.5rem;
}

.passenger-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.info-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
}

.info-label {
  font-weight: bold;
  color: var(--gray-color);
  margin-bottom: 0.5rem;
}

.info-value {
  font-size: 1.1rem;
}

.baggage-section,
.special-needs-section,
.connecting-flight-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.baggage-info,
.connecting-flight-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.baggage-count {
  font-size: 1.1rem;
  font-weight: bold;
}

.special-needs-list {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-top: 0.5rem;
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

/* Modal Styles */
.update-status-modal {
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

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 1rem;
}

.modal-footer {
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

.form-group {
  margin-bottom: 1rem;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .passenger-details-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .passenger-title {
    text-align: left;
  }
  
  .baggage-info,
  .connecting-flight-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>