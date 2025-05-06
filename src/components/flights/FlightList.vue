<template>
  <div class="flight-list">
    <div v-if="loading" class="loading-indicator">
      Loading flights...
    </div>
    
    <div v-else-if="flights.length === 0" class="no-flights">
      No {{ flightType === 'arrival' ? 'arrivals' : 'departures' }} scheduled for this period.
    </div>
    
    <div v-else class="flight-table-container">
      <table class="table flight-table">
        <thead>
          <tr>
            <th>Flight</th>
            <th>{{ flightType === 'arrival' ? 'Origin' : 'Destination' }}</th>
            <th>Time</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="flight in flights" :key="flight.id" :class="getRowClass(flight)">
            <td>
              <div class="flight-number">{{ flight.flightNumber }}</div>
              <div class="airline">{{ flight.airline }}</div>
            </td>
            <td>
              {{ flightType === 'arrival' ? flight.origin : flight.destination }}
              <div class="terminal-gate" v-if="flight.terminal || flight.gate">
                {{ flight.terminal ? `Terminal ${flight.terminal}` : '' }}
                {{ flight.gate ? `Gate ${flight.gate}` : '' }}
              </div>
            </td>
            <td>
              <div class="scheduled-time">
                {{ formatTime(flightType === 'arrival' ? flight.scheduledArrival : flight.scheduledDeparture) }}
              </div>
              <div v-if="flight.delayMinutes > 0" class="delay-info">
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
import { computed } from 'vue'
import { format } from 'date-fns'
import { Flight, FlightStatus } from '../../types/flight'

const props = defineProps<{
  flights: Flight[]
  loading: boolean
  flightType: 'arrival' | 'departure'
}>()

// Helper functions
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
</script>

<style scoped>
.flight-list {
  width: 100%;
}

.loading-indicator, .no-flights {
  padding: 1rem;
  text-align: center;
  color: var(--gray-color);
}

.flight-table-container {
  overflow-x: auto;
}

.flight-table {
  width: 100%;
  border-collapse: collapse;
}

.flight-table th {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 2px solid var(--border-color);
  font-weight: bold;
}

.flight-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}

.flight-number {
  font-weight: bold;
}

.airline {
  font-size: 0.85rem;
  color: var(--gray-color);
}

.terminal-gate {
  font-size: 0.85rem;
  color: var(--gray-color);
  margin-top: 0.25rem;
}

.scheduled-time {
  font-weight: bold;
}

.delay-info {
  color: var(--warning-color);
  font-size: 0.85rem;
  margin-top: 0.25rem;
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
</style>