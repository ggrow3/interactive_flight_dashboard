<template>
  <div class="analytics-view">
    <div class="analytics-header">
      <h1>Flight Analytics</h1>
      <div class="date-range-selector">
        <div class="date-field">
          <label for="start-date">From:</label>
          <input 
            type="date" 
            id="start-date" 
            v-model="startDate"
            @change="loadAnalyticsData"
          >
        </div>
        <div class="date-field">
          <label for="end-date">To:</label>
          <input 
            type="date" 
            id="end-date" 
            v-model="endDate"
            @change="loadAnalyticsData"
          >
        </div>
        <button @click="refreshData" class="btn btn-primary">
          Refresh Data
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading-indicator">
      Loading analytics data...
    </div>
    
    <div v-else class="analytics-content">
      <div class="analytics-summary">
        <div class="summary-card total-flights">
          <div class="summary-icon">
            <icon-flights />
          </div>
          <div class="summary-details">
            <div class="summary-value">{{ totalFlights }}</div>
            <div class="summary-label">Total Flights</div>
          </div>
        </div>
        
        <div class="summary-card total-passengers">
          <div class="summary-icon">
            <icon-passengers />
          </div>
          <div class="summary-details">
            <div class="summary-value">{{ totalPassengers }}</div>
            <div class="summary-label">Total Passengers</div>
          </div>
        </div>
        
        <div class="summary-card on-time-rate">
          <div class="summary-icon">
            <icon-performance />
          </div>
          <div class="summary-details">
            <div class="summary-value">{{ onTimeRate }}%</div>
            <div class="summary-label">On-Time Performance</div>
          </div>
        </div>
        
        <div class="summary-card avg-delay">
          <div class="summary-icon">
            <icon-delay />
          </div>
          <div class="summary-details">
            <div class="summary-value">{{ avgDelay }} min</div>
            <div class="summary-label">Average Delay</div>
          </div>
        </div>
      </div>
      
      <div class="analytics-charts">
        <div class="chart-container">
          <h3>Flight Status Distribution</h3>
          <div class="chart-wrapper">
            <pie-chart :chart-data="flightStatusChartData" />
          </div>
        </div>
        
        <div class="chart-container">
          <h3>Passenger Status Distribution</h3>
          <div class="chart-wrapper">
            <pie-chart :chart-data="passengerStatusChartData" />
          </div>
        </div>
      </div>
      
      <div class="analytics-charts">
        <div class="chart-container">
          <h3>Flights by Day</h3>
          <div class="chart-wrapper">
            <bar-chart :chart-data="flightsByDayChartData" />
          </div>
        </div>
        
        <div class="chart-container">
          <h3>Average Delay by Hour</h3>
          <div class="chart-wrapper">
            <line-chart :chart-data="delayByHourChartData" />
          </div>
        </div>
      </div>
      
      <div class="performance-table-container">
        <h3>Performance by Airline</h3>
        <table class="table performance-table">
          <thead>
            <tr>
              <th>Airline</th>
              <th>Flights</th>
              <th>On-Time %</th>
              <th>Average Delay</th>
              <th>Cancelled</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(airline, index) in airlinePerformance" :key="index">
              <td>{{ airline.name }}</td>
              <td>{{ airline.flightCount }}</td>
              <td>{{ airline.onTimePercentage }}%</td>
              <td>{{ airline.avgDelay }} min</td>
              <td>{{ airline.cancelledCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { format, subDays, parseISO } from 'date-fns'
import { useFlightStore } from '../stores/flights'
import { usePassengerStore } from '../stores/passengers'
import { Flight } from '../types/flight'
import { Passenger } from '../types/passenger'

// Chart components
const PieChart = {
  props: ['chartData'],
  template: `
    <div>
      <!-- Placeholder for a real chart component -->
      <div style="height: 250px; display: flex; align-items: center; justify-content: center; background-color: #f8f9fa; border-radius: 8px;">
        <p style="color: #6c757d;">Pie Chart Visualization</p>
      </div>
    </div>
  `
}

const BarChart = {
  props: ['chartData'],
  template: `
    <div>
      <!-- Placeholder for a real chart component -->
      <div style="height: 250px; display: flex; align-items: center; justify-content: center; background-color: #f8f9fa; border-radius: 8px;">
        <p style="color: #6c757d;">Bar Chart Visualization</p>
      </div>
    </div>
  `
}

const LineChart = {
  props: ['chartData'],
  template: `
    <div>
      <!-- Placeholder for a real chart component -->
      <div style="height: 250px; display: flex; align-items: center; justify-content: center; background-color: #f8f9fa; border-radius: 8px;">
        <p style="color: #6c757d;">Line Chart Visualization</p>
      </div>
    </div>
  `
}

// Icon components
const IconFlights = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
      <path d="M22,16.5L16.5,22H7.5L2,16.5L11,6L22,16.5M10.5,7.67V3L12,1L13.5,3V7.67L12,6L10.5,7.67Z"/>
    </svg>
  `
}

const IconPassengers = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
      <path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/>
    </svg>
  `
}

const IconPerformance = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
      <path d="M3,11H5V13H3V11M11,5H13V7H11V5M9,11H13V13H9V11M15,11H17V13H15V11M19,11H21V13H19V11M3,15H5V17H3V15M7,15H9V17H7V15M11,15H13V17H11V15M15,15H17V17H15V15M19,15H21V17H19V15M3,19H5V21H3V19M7,19H9V21H7V19M11,19H13V21H11V19M15,19H17V21H15V19M19,19H21V21H19V19M3,3H21V9H3V3M5,5V7H19V5H5Z"/>
    </svg>
  `
}

const IconDelay = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
      <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
    </svg>
  `
}

const flightStore = useFlightStore()
const passengerStore = usePassengerStore()

// State
const loading = ref(true)
const startDate = ref(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
const endDate = ref(format(new Date(), 'yyyy-MM-dd'))

// Computed properties for analytics data
const filteredFlights = computed(() => {
  const start = parseISO(startDate.value)
  const end = parseISO(endDate.value)
  end.setHours(23, 59, 59, 999) // End of day
  
  return flightStore.flights.filter(flight => {
    const flightDate = new Date(flight.scheduledDeparture)
    return flightDate >= start && flightDate <= end
  })
})

const totalFlights = computed(() => filteredFlights.value.length)

const totalPassengers = computed(() => {
  return filteredFlights.value.reduce((total, flight) => total + flight.totalPassengers, 0)
})

const onTimeFlights = computed(() => {
  return filteredFlights.value.filter(flight => flight.delayMinutes === 0).length
})

const onTimeRate = computed(() => {
  if (totalFlights.value === 0) return 0
  return Math.round((onTimeFlights.value / totalFlights.value) * 100)
})

const avgDelay = computed(() => {
  const delayedFlights = filteredFlights.value.filter(flight => flight.delayMinutes > 0)
  if (delayedFlights.length === 0) return 0
  
  const totalDelay = delayedFlights.reduce((total, flight) => total + flight.delayMinutes, 0)
  return Math.round(totalDelay / delayedFlights.length)
})

// Chart data computed properties
const flightStatusChartData = computed(() => {
  // Group flights by status
  const statusCounts: Record<string, number> = {}
  
  filteredFlights.value.forEach(flight => {
    if (!statusCounts[flight.status]) {
      statusCounts[flight.status] = 0
    }
    statusCounts[flight.status]++
  })
  
  return {
    labels: Object.keys(statusCounts).map(formatStatusLabel),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: [
        '#3498db', // Blue - in_air
        '#2ecc71', // Green - landed
        '#f39c12', // Orange - delayed
        '#e74c3c', // Red - cancelled
        '#95a5a6', // Gray - scheduled
        '#9b59b6', // Purple - boarding
        '#1abc9c', // Teal - departed
      ]
    }]
  }
})

const passengerStatusChartData = computed(() => {
  // Group passengers by status
  const statusCounts: Record<string, number> = {}
  
  passengerStore.passengers.forEach(passenger => {
    if (!statusCounts[passenger.status]) {
      statusCounts[passenger.status] = 0
    }
    statusCounts[passenger.status]++
  })
  
  return {
    labels: Object.keys(statusCounts).map(formatPassengerStatusLabel),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: [
        '#95a5a6', // Gray - booked
        '#3498db', // Blue - checked_in
        '#2ecc71', // Green - boarded
        '#e74c3c', // Red - no_show
        '#9b59b6', // Purple - flight_completed
        '#1abc9c', // Teal - connecting
        '#f39c12', // Orange - cancelled
      ]
    }]
  }
})

const flightsByDayChartData = computed(() => {
  // Group flights by day
  const daysCounts: Record<string, number> = {}
  
  filteredFlights.value.forEach(flight => {
    const day = format(new Date(flight.scheduledDeparture), 'yyyy-MM-dd')
    if (!daysCounts[day]) {
      daysCounts[day] = 0
    }
    daysCounts[day]++
  })
  
  // Sort days chronologically
  const sortedDays = Object.keys(daysCounts).sort()
  
  return {
    labels: sortedDays.map(day => format(parseISO(day), 'MMM d')),
    datasets: [{
      label: 'Number of Flights',
      data: sortedDays.map(day => daysCounts[day]),
      backgroundColor: '#3498db'
    }]
  }
})

const delayByHourChartData = computed(() => {
  // Group flights by departure hour and calculate average delay
  const hourlyDelays: Record<number, {total: number, count: number}> = {}
  
  // Initialize all hours
  for (let i = 0; i < 24; i++) {
    hourlyDelays[i] = { total: 0, count: 0 }
  }
  
  filteredFlights.value.forEach(flight => {
    const hour = new Date(flight.scheduledDeparture).getHours()
    hourlyDelays[hour].total += flight.delayMinutes
    hourlyDelays[hour].count++
  })
  
  const hours = Object.keys(hourlyDelays).map(Number).sort((a, b) => a - b)
  const avgDelays = hours.map(hour => {
    if (hourlyDelays[hour].count === 0) return 0
    return Math.round(hourlyDelays[hour].total / hourlyDelays[hour].count)
  })
  
  return {
    labels: hours.map(hour => `${hour}:00`),
    datasets: [{
      label: 'Average Delay (minutes)',
      data: avgDelays,
      borderColor: '#f39c12',
      backgroundColor: 'rgba(243, 156, 18, 0.2)',
      fill: true
    }]
  }
})

const airlinePerformance = computed(() => {
  // Group flights by airline and calculate performance metrics
  const airlines: Record<string, {
    flightCount: number,
    delayedCount: number,
    totalDelay: number,
    cancelledCount: number
  }> = {}
  
  filteredFlights.value.forEach(flight => {
    if (!airlines[flight.airline]) {
      airlines[flight.airline] = {
        flightCount: 0,
        delayedCount: 0,
        totalDelay: 0,
        cancelledCount: 0
      }
    }
    
    airlines[flight.airline].flightCount++
    
    if (flight.delayMinutes > 0) {
      airlines[flight.airline].delayedCount++
      airlines[flight.airline].totalDelay += flight.delayMinutes
    }
    
    if (flight.status === 'cancelled') {
      airlines[flight.airline].cancelledCount++
    }
  })
  
  return Object.entries(airlines).map(([name, data]) => ({
    name,
    flightCount: data.flightCount,
    onTimePercentage: Math.round(((data.flightCount - data.delayedCount) / data.flightCount) * 100),
    avgDelay: data.delayedCount ? Math.round(data.totalDelay / data.delayedCount) : 0,
    cancelledCount: data.cancelledCount
  })).sort((a, b) => b.flightCount - a.flightCount)
})

// Helper functions
const formatStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
}

const formatPassengerStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
}

// Methods
const loadAnalyticsData = async () => {
  try {
    loading.value = true
    
    // Load flights for the date range
    const start = parseISO(startDate.value)
    const end = parseISO(endDate.value)
    
    // This would need to be implemented in the flight store
    // to support fetching flights for a date range
    await flightStore.fetchFlights()
    
    // Load passengers
    await passengerStore.fetchPassengers()
  } catch (error) {
    console.error('Error loading analytics data:', error)
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadAnalyticsData()
}

// Lifecycle
onMounted(() => {
  loadAnalyticsData()
})
</script>

<style scoped>
.analytics-view {
  padding: 1.5rem;
}

.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.date-range-selector {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.date-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.loading-indicator {
  text-align: center;
  padding: 2rem;
  color: var(--gray-color);
}

.analytics-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.summary-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: white;
}

.total-flights .summary-icon {
  background-color: #3498db;
}

.total-passengers .summary-icon {
  background-color: #2ecc71;
}

.on-time-rate .summary-icon {
  background-color: #9b59b6;
}

.avg-delay .summary-icon {
  background-color: #f39c12;
}

.summary-details {
  flex: 1;
}

.summary-value {
  font-size: 2rem;
  font-weight: bold;
  line-height: 1.2;
}

.summary-label {
  color: var(--gray-color);
  font-size: 0.9rem;
}

.analytics-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.chart-container h3 {
  margin-bottom: 1rem;
  text-align: center;
  color: var(--primary-color);
}

.chart-wrapper {
  height: 250px;
}

.performance-table-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.performance-table-container h3 {
  margin-bottom: 1rem;
  text-align: center;
  color: var(--primary-color);
}

.performance-table {
  width: 100%;
  border-collapse: collapse;
}

.performance-table th {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 2px solid var(--border-color);
  font-weight: bold;
}

.performance-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .analytics-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .date-range-selector {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .date-field {
    width: 100%;
  }
  
  .analytics-charts {
    grid-template-columns: 1fr;
  }
}
</style>