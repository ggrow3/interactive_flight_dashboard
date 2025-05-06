import { Flight, FlightStatus, FlightType } from '../types/flight'
import { Passenger, PassengerStatus } from '../types/passenger'
import { addDays, addHours, format, subHours } from 'date-fns'

// Mock flight data
export const generateMockFlights = (count: number = 20): Flight[] => {
  const flights: Flight[] = []
  const now = new Date()
  const airlines = ['Delta', 'United', 'American', 'Southwest', 'JetBlue', 'British Airways', 'Lufthansa', 'Air France']
  const airports = ['JFK', 'LAX', 'ORD', 'ATL', 'DFW', 'LHR', 'CDG', 'FRA', 'HKG', 'SFO']
  const statuses: FlightStatus[] = ['scheduled', 'boarding', 'departed', 'in_air', 'landed', 'delayed', 'cancelled']
  const aircraft = ['Boeing 737', 'Boeing 747', 'Boeing 777', 'Airbus A320', 'Airbus A330', 'Airbus A380']
  
  for (let i = 0; i < count; i++) {
    const flightType: FlightType = i % 2 === 0 ? 'arrival' : 'departure'
    const origin = airports[Math.floor(Math.random() * airports.length)]
    let destination
    do {
      destination = airports[Math.floor(Math.random() * airports.length)]
    } while (destination === origin)
    
    const flightNumber = `${airlines[Math.floor(Math.random() * airlines.length)].substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 1000) + 100}`
    
    const scheduledDeparture = addHours(now, Math.floor(Math.random() * 48) - 24)
    const flightHours = 1 + Math.floor(Math.random() * 8) // 1-9 hour flight
    const scheduledArrival = addHours(scheduledDeparture, flightHours)
    
    const delayMinutes = Math.random() > 0.7 ? Math.floor(Math.random() * 120) : 0
    
    // Determine status based on scheduled times
    let status: FlightStatus
    const currentTime = now.getTime()
    const departureTime = scheduledDeparture.getTime() + (delayMinutes * 60 * 1000)
    const arrivalTime = scheduledArrival.getTime() + (delayMinutes * 60 * 1000)
    
    if (Math.random() < 0.05) {
      status = 'cancelled'
    } else if (delayMinutes > 0 && currentTime < departureTime) {
      status = 'delayed'
    } else if (currentTime < departureTime - (30 * 60 * 1000)) {
      status = 'scheduled'
    } else if (currentTime < departureTime) {
      status = 'boarding'
    } else if (currentTime < departureTime + (15 * 60 * 1000)) {
      status = 'departed'
    } else if (currentTime < arrivalTime - (15 * 60 * 1000)) {
      status = 'in_air'
    } else if (currentTime < arrivalTime) {
      status = 'landing'
    } else {
      status = 'landed'
    }
    
    // Calculate actual times based on status
    let actualDeparture, actualArrival
    if (['departed', 'in_air', 'landing', 'landed'].includes(status)) {
      actualDeparture = new Date(departureTime)
    }
    if (['landed'].includes(status)) {
      actualArrival = new Date(arrivalTime)
    }
    
    // Random passenger counts
    const totalPassengers = Math.floor(Math.random() * 150) + 50
    const checkedInPassengers = status !== 'scheduled' ? Math.floor(totalPassengers * 0.9) : Math.floor(totalPassengers * 0.5)
    const boardedPassengers = ['departed', 'in_air', 'landing', 'landed'].includes(status) 
      ? checkedInPassengers - Math.floor(Math.random() * 10)
      : 0
    
    // Randomly assign gates and terminals
    const gate = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 30)
    const terminal = String(Math.floor(Math.random() * 5) + 1)
    
    // For some flights, set an inbound flight connection
    const hasInbound = Math.random() > 0.5
    let inboundFlightId, inboundFlightStatus, inboundFlightNumber
    
    if (hasInbound) {
      inboundFlightId = `mock-inbound-${Math.floor(Math.random() * 1000)}`
      inboundFlightStatus = statuses[Math.floor(Math.random() * statuses.length)]
      inboundFlightNumber = `${airlines[Math.floor(Math.random() * airlines.length)].substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 1000) + 100}`
    }
    
    // Generate random position for in-air flights
    let latitude, longitude, altitude, groundSpeed, heading
    if (status === 'in_air') {
      latitude = Math.random() * 180 - 90
      longitude = Math.random() * 360 - 180
      altitude = Math.floor(Math.random() * 35000) + 25000
      groundSpeed = Math.floor(Math.random() * 200) + 450
      heading = Math.floor(Math.random() * 360)
    }
    
    // Create a consistent ID for this flight based on its flight number
    // This ensures the same flight always gets the same ID
    const consistency = flightNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const flightId = `mock-flight-${consistency}-${i}`
    
    flights.push({
      id: flightId,
      flightNumber,
      airline: airlines[Math.floor(Math.random() * airlines.length)],
      origin,
      destination,
      scheduledDeparture,
      scheduledArrival,
      actualDeparture,
      actualArrival,
      status,
      flightType,
      aircraft: aircraft[Math.floor(Math.random() * aircraft.length)],
      delayMinutes,
      gate,
      terminal,
      inboundFlightId,
      inboundFlightStatus,
      inboundFlightNumber,
      totalPassengers,
      checkedInPassengers,
      boardedPassengers,
      latitude,
      longitude,
      altitude,
      groundSpeed,
      heading,
      updatedAt: new Date(),
      createdAt: subHours(now, Math.floor(Math.random() * 72))
    })
  }
  
  return flights
}

// Mock passenger data
export const generateMockPassengers = (flights: Flight[]): Passenger[] => {
  const passengers: Passenger[] = []
  const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Maria', 'William', 'Linda', 'James', 'Patricia', 'Thomas', 'Jennifer', 'Charles', 'Elizabeth']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson']
  const emailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com']
  
  flights.forEach(flight => {
    // Skip cancelled flights
    if (flight.status === 'cancelled') return
    
    // Generate 5-15 passengers per flight
    const passengerCount = Math.floor(Math.random() * 10) + 5
    
    for (let i = 0; i < passengerCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomains[Math.floor(Math.random() * emailDomains.length)]}`
      const phoneNumber = `+1${Math.floor(Math.random() * 1000000000).toString().padStart(10, '0')}`
      
      // Generate seat number
      const row = Math.floor(Math.random() * 30) + 1
      const seat = String.fromCharCode(65 + Math.floor(Math.random() * 6))
      const seatNumber = `${row}${seat}`
      
      // Determine passenger status based on flight status
      let status: PassengerStatus
      if (flight.status === 'scheduled') {
        status = Math.random() > 0.2 ? 'booked' : 'checked_in'
      } else if (flight.status === 'boarding') {
        status = Math.random() > 0.5 ? 'checked_in' : 'boarded'
      } else if (['departed', 'in_air', 'landing'].includes(flight.status)) {
        status = Math.random() > 0.1 ? 'boarded' : 'no_show'
      } else if (flight.status === 'landed') {
        status = Math.random() > 0.1 ? 'flight_completed' : 'no_show'
      } else {
        status = 'booked'
      }
      
      // Generate check-in time for checked-in passengers
      let checkInTime
      if (['checked_in', 'boarded', 'flight_completed'].includes(status)) {
        checkInTime = subHours(flight.scheduledDeparture, Math.floor(Math.random() * 24) + 1)
      }
      
      // Generate boarding time for boarded passengers
      let boardingTime
      if (['boarded', 'flight_completed'].includes(status)) {
        boardingTime = format(subHours(flight.scheduledDeparture, 1), 'HH:mm')
      }
      
      // Generate baggage info
      const baggage = {
        count: Math.floor(Math.random() * 3),
        checked: Math.random() > 0.3
      }
      
      // Random chance for special needs
      const hasSpecialNeeds = Math.random() > 0.9
      const specialNeeds = hasSpecialNeeds 
        ? [['Wheelchair', 'Medical', 'Dietary Restriction', 'Assistance Required', 'Service Animal'][Math.floor(Math.random() * 5)]]
        : undefined
      
      // Random chance for connecting flight
      const hasConnection = Math.random() > 0.8
      let connectingFlightId, connectingFlightNumber
      
      if (hasConnection) {
        connectingFlightId = `mock-flight-${Math.floor(Math.random() * flights.length)}`
        connectingFlightNumber = `${['DL', 'UA', 'AA', 'WN', 'BA'][Math.floor(Math.random() * 5)]}${Math.floor(Math.random() * 1000) + 100}`
      }
      
      passengers.push({
        id: `mock-passenger-${flight.id}-${i}`,
        firstName,
        lastName,
        email,
        phoneNumber,
        flightId: flight.id,
        flightNumber: flight.flightNumber,
        seatNumber,
        status,
        checkInTime,
        boardingTime,
        specialNeeds,
        connectingFlightId,
        connectingFlightNumber,
        baggage,
        createdAt: new Date(flight.createdAt),
        updatedAt: new Date()
      })
    }
  })
  
  return passengers
}