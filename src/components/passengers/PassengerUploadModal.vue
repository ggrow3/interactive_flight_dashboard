<template>
  <div class="passenger-upload-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Upload Passenger List</h3>
        <button @click="$emit('close')" class="close-button">&times;</button>
      </div>
      
      <div class="modal-body">
        <div v-if="!isFileUploaded">
          <p class="upload-instructions">
            Upload a CSV file with passenger information for flight <strong>{{ flightNumber }}</strong>.
          </p>
          <p class="upload-note">
            The CSV should include the following columns: firstName, lastName, email, phoneNumber, seatNumber
          </p>
          
          <div class="file-upload-container">
            <input 
              type="file" 
              id="passengerCsv" 
              accept=".csv" 
              ref="fileInput"
              @change="handleFileSelect"
              class="file-input"
            >
            <label for="passengerCsv" class="file-label">
              <span v-if="!selectedFile">Choose a CSV file</span>
              <span v-else>{{ selectedFile.name }}</span>
            </label>
          </div>
          
          <div class="mt-3" v-if="selectedFile">
            <button @click="parseAndPreview" class="btn btn-primary">
              Preview Data
            </button>
          </div>
        </div>
        
        <div v-else-if="previewData.length > 0">
          <div class="preview-header">
            <h4>Preview ({{ previewData.length }} passengers)</h4>
            <button @click="isFileUploaded = false" class="btn btn-sm btn-secondary">
              Change File
            </button>
          </div>
          
          <div class="preview-table-container">
            <table class="table preview-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Seat</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(passenger, index) in previewData.slice(0, 5)" :key="index">
                  <td>{{ passenger.lastName }}, {{ passenger.firstName }}</td>
                  <td>{{ passenger.email || passenger.phoneNumber || 'N/A' }}</td>
                  <td>{{ passenger.seatNumber || 'Not Assigned' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div v-if="previewData.length > 5" class="preview-more">
            And {{ previewData.length - 5 }} more passengers...
          </div>
        </div>
        
        <div v-if="error" class="error-message mt-3">
          {{ error }}
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="$emit('close')" class="btn btn-secondary">
          Cancel
        </button>
        <button 
          v-if="previewData.length > 0" 
          @click="uploadPassengers" 
          class="btn btn-primary ml-2"
          :disabled="uploading"
        >
          {{ uploading ? 'Uploading...' : 'Upload Passengers' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits, defineProps } from 'vue'
import { usePassengerStore } from '../../stores/passengers'
import { PassengerStatus } from '../../types/passenger'

const props = defineProps<{
  flightId: string
  flightNumber: string
}>()

const emits = defineEmits<{
  (e: 'close'): void
  (e: 'uploaded'): void
}>()

const passengersStore = usePassengerStore()

// Refs
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isFileUploaded = ref(false)
const previewData = ref<any[]>([])
const error = ref('')
const uploading = ref(false)

// Methods
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
    error.value = ''
  } else {
    selectedFile.value = null
  }
}

const parseAndPreview = () => {
  if (!selectedFile.value) return
  
  const reader = new FileReader()
  
  reader.onload = (e) => {
    try {
      const csv = e.target?.result as string
      const passengers = parseCSV(csv)
      
      if (passengers.length === 0) {
        error.value = 'No valid passenger data found in the CSV'
        return
      }
      
      // Validate required fields
      const missingFields = passengers.some(p => !p.firstName || !p.lastName)
      if (missingFields) {
        error.value = 'Some passengers are missing required fields (firstName, lastName)'
        return
      }
      
      previewData.value = passengers
      isFileUploaded.value = true
    } catch (err: any) {
      error.value = `Error parsing CSV: ${err.message}`
      console.error('Error parsing CSV:', err)
    }
  }
  
  reader.onerror = () => {
    error.value = 'Error reading the file'
  }
  
  reader.readAsText(selectedFile.value)
}

const parseCSV = (csv: string) => {
  const lines = csv.split(/\\r?\\n/)
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one passenger')
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  
  // Check for required columns
  const requiredColumns = ['firstname', 'lastname']
  const missingColumns = requiredColumns.filter(col => !headers.includes(col))
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
  }
  
  const passengers = []
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    
    const values = lines[i].split(',').map(v => v.trim())
    if (values.length !== headers.length) {
      console.warn(`Line ${i + 1} has ${values.length} values but expected ${headers.length}`)
      continue
    }
    
    const passenger: Record<string, any> = {}
    
    headers.forEach((header, index) => {
      passenger[header] = values[index]
    })
    
    passengers.push({
      firstName: passenger.firstname,
      lastName: passenger.lastname,
      email: passenger.email || null,
      phoneNumber: passenger.phonenumber || passenger.phone || null,
      seatNumber: passenger.seatnumber || passenger.seat || null
    })
  }
  
  return passengers
}

const uploadPassengers = async () => {
  if (previewData.value.length === 0) return
  
  try {
    uploading.value = true
    error.value = ''
    
    // Format data for the API
    const passengersData = previewData.value.map(passenger => ({
      firstName: passenger.firstName,
      lastName: passenger.lastName,
      email: passenger.email,
      phoneNumber: passenger.phoneNumber,
      seatNumber: passenger.seatNumber,
      flightId: props.flightId,
      flightNumber: props.flightNumber,
      status: 'booked' as PassengerStatus,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
    
    // Upload the passengers
    await passengersStore.bulkAddPassengers(passengersData)
    
    // Notify the parent
    emits('uploaded')
    
  } catch (err: any) {
    error.value = `Error uploading passengers: ${err.message}`
    console.error('Error uploading passengers:', err)
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.passenger-upload-modal {
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
  max-width: 600px;
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
  max-height: 70vh;
  overflow-y: auto;
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

.upload-instructions {
  margin-bottom: 0.5rem;
}

.upload-note {
  color: var(--gray-color);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.file-upload-container {
  position: relative;
  overflow: hidden;
  display: inline-block;
  width: 100%;
}

.file-input {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.file-label {
  display: block;
  padding: 0.75rem 1.5rem;
  background-color: var(--light-color);
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-label:hover {
  background-color: var(--hover-color);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.preview-table-container {
  overflow-x: auto;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
}

.preview-table th {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 2px solid var(--border-color);
  font-weight: bold;
}

.preview-table td {
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.preview-more {
  text-align: center;
  color: var(--gray-color);
  margin-top: 0.5rem;
  font-style: italic;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 0.75rem;
  border-radius: 4px;
}

.mt-3 {
  margin-top: 1rem;
}

.ml-2 {
  margin-left: 0.5rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  border-radius: 0.2rem;
}
</style>