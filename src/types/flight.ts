export type FlightStatus = 
  | 'scheduled'
  | 'boarding'
  | 'departed'
  | 'in_air'
  | 'landing'
  | 'landed'
  | 'taxiing'
  | 'arrived'
  | 'delayed'
  | 'cancelled'

export type FlightType = 'arrival' | 'departure'

export interface Flight {
  id: string
  flightNumber: string
  airline: string
  origin: string
  destination: string
  scheduledDeparture: Date
  scheduledArrival: Date
  actualDeparture?: Date
  actualArrival?: Date
  status: FlightStatus
  flightType: FlightType
  aircraft: string
  delayMinutes: number
  gate?: string
  terminal?: string
  inboundFlightId?: string // For tracking connecting flights
  inboundFlightStatus?: FlightStatus // For tracking delays of inbound aircraft
  inboundFlightNumber?: string
  totalPassengers: number
  checkedInPassengers: number
  boardedPassengers: number
  latitude?: number // Current position for in-air flights
  longitude?: number // Current position for in-air flights
  altitude?: number
  groundSpeed?: number
  heading?: number
  updatedAt: Date
  createdAt: Date
}