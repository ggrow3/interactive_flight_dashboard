export type PassengerStatus = 
  | 'booked'
  | 'checked_in'
  | 'boarded'
  | 'no_show'
  | 'flight_completed'
  | 'connecting'
  | 'cancelled'

export interface Passenger {
  id: string
  firstName: string
  lastName: string
  email?: string
  phoneNumber?: string
  flightId: string
  flightNumber: string
  seatNumber?: string
  status: PassengerStatus
  checkInTime?: Date
  boardingTime?: string
  specialNeeds?: string[]
  connectingFlightId?: string
  connectingFlightNumber?: string
  baggage?: {
    count: number
    checked: boolean
  }
  createdAt: Date
  updatedAt: Date
}