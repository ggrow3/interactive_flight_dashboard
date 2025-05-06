# Interactive Flight Dashboard

A comprehensive flight management system built with Vue 3 Composition API, TypeScript, Pinia, and Firebase. This application efficiently tracks flights, delays, and passenger information in real-time by integrating with flight data providers like FlightAware, AirLabs, OpenSky Network, and Aviation Edge.

## Features

- **Real-time Flight Tracking**: Monitor arrivals, departures, delays, and in-air flights with live position updates
- **Passenger Management**: Track passenger status, check-ins, and manage passenger lists with CSV import capability
- **Interactive Flight Map**: Visualize flights in real-time with detailed flight path, altitude, and speed information
- **Operational Analytics**: Track key metrics like delays, in-air passengers, and operational efficiency
- **Secure Authentication**: Firebase authentication with role-based access control
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Offline Support**: Basic functionality works offline with cached flight and passenger data
- **Multi-Provider Support**: Integrates with multiple flight data providers for redundancy and comprehensive coverage

## Technologies Used

- **Vue 3 Composition API**: Modern, reactive UI framework
- **TypeScript**: Type-safe development experience
- **Pinia**: State management for Vue applications
- **Firebase**: Authentication, Firestore database, and hosting
- **Vite**: Fast build tooling
- **Leaflet**: Interactive mapping for flight visualization
- **Chart.js**: Data visualization for analytics
- **Axios**: API communication
- **Date-fns**: Date manipulation and time zone handling
- **WebSockets**: Real-time data synchronization for flight positions

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account (optional for production, mock services available for development)
- Flight data API access (optional, mock data available for development)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/interactive-flight-dashboard.git
   cd interactive-flight-dashboard
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create environment configuration
   
   Create a `.env.local` file in the root directory with the following variables:
   ```
   VITE_USE_MOCK_SERVICES=true  # Set to false to use real services
   VITE_FIREBASE_API_KEY=your_api_key  # Only needed if USE_MOCK_SERVICES=false
   VITE_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   
   # Flight API credentials (only needed if using real flight data)
   VITE_FLIGHT_API_PROVIDER=flightaware  # Options: flightaware, airlabs, opensky, aviationedge
   VITE_FLIGHTAWARE_API_KEY=your_flightaware_api_key
   VITE_AIRLABS_API_KEY=your_airlabs_api_key
   VITE_AVIATIONEDGE_API_KEY=your_aviation_edge_api_key
   # OpenSky doesn't require an API key for basic usage
   ```

4. Run development server
   ```bash
   npm run dev
   ```
   
   If you encounter an EPERM error, try:
   ```bash
   npm run dev -- --force
   ```

### Development Mode

The application supports a fully functional development mode without requiring any external API keys:

1. Mock authentication service provides a simulated login experience
   - Default credentials: Email: `admin@example.com` Password: `password123`
   
2. Mock flight data service provides realistic flight information
   - Includes simulated real-time position updates
   - Randomly generated flight delays and status changes

3. Local storage persistence
   - Flight and passenger data is cached in browser localStorage
   - Allows for a consistent experience across page refreshes

### Building for Production

```bash
npm run build
```

This creates a `dist` directory with production-ready optimized assets.

### Running Tests

```bash
npm run test
```

## Detailed Feature Guide

### Authentication

- **Login/Logout**: Secure Firebase authentication (or mock auth in development)
- **Persistent Sessions**: Stay logged in across browser sessions
- **Role-Based Access**: Different permission levels for staff vs. administrators

### Dashboard

- **Overview Panel**: Quick stats on active flights, delays, and passenger counts
- **Recent Activity**: Latest flight status updates and critical notifications
- **Performance Metrics**: On-time performance, passenger load factors, and operational efficiency
- **Alert System**: Visual indicators for delayed flights and boarding issues

### Flight Management

- **Flight List**: Comprehensive list with sorting and filtering options
- **Flight Details**: Detailed information including:
  - Aircraft information (type, registration, age)
  - Schedule (departure, arrival, delays)
  - Passenger manifest
  - Route information
  - Weather conditions
  
- **Real-time Tracking**: Live position updates on the map
- **Historical Data**: Access to past flights and their performance

### Interactive Flight Map

- **Live Visualization**: Real-time aircraft positions with movement
- **Flight Path Projection**: See the planned route and estimated progress
- **Weather Overlay**: Optional weather conditions display
- **Multi-flight Tracking**: Track multiple flights simultaneously
- **Detailed Flight Info**: Click on any flight for complete details
- **Map Controls**: Zoom, pan, and customize the view

### Passenger Management

- **Passenger Lists**: Complete manifest for each flight
- **CSV Import**: Bulk import passenger data via CSV upload
- **Check-in Status**: Track which passengers have checked in
- **Special Requirements**: Note special needs or VIP status
- **Search & Filter**: Quickly find specific passengers

### Analytics

- **Performance Dashboard**: Visual metrics on operational efficiency
- **Delay Analysis**: Breakdown of delay causes and trends
- **Passenger Flow**: Track passenger volumes and patterns
- **Custom Reports**: Generate and export reports for specific metrics

## Firebase Configuration

For production deployments, you'll need to set up a Firebase project with:

1. **Authentication**: Enable Email/Password authentication
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable Email/Password provider

2. **Firestore Database**: Set up a database for flight and passenger data
   - Go to Firebase Console → Firestore Database → Create database
   - Start in production mode
   - Set up security rules for proper access control

3. **Storage**: Set up storage for passenger list uploads
   - Go to Firebase Console → Storage → Get started
   - Configure security rules for file access

4. **Hosting**: Deploy your application
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Login: `firebase login`
   - Initialize: `firebase init` (select Hosting, Firestore, and Storage)
   - Deploy: `firebase deploy`

## GitHub Actions Deployment

The repository includes a GitHub Actions workflow for automated deployment to Firebase Hosting:

1. Set up repository secrets in GitHub:
   - Go to Settings → Secrets → Actions
   - Add the following secrets:
     - `FIREBASE_SERVICE_ACCOUNT`: Your Firebase service account JSON
     - `FIREBASE_PROJECT_ID`: Your Firebase project ID

2. Push to the main branch to trigger automatic deployment, or manually trigger the workflow from the Actions tab.

## Flight API Configuration

The application supports multiple flight data providers:

### FlightAware AeroAPI
- Provides comprehensive flight tracking with detailed position data
- Requires paid subscription: [FlightAware AeroAPI](https://flightaware.com/aeroapi/)

### AirLabs API
- Offers global flight tracking with good coverage
- Free tier available: [AirLabs API](https://airlabs.co/)

### OpenSky Network
- Free open-source flight tracking data
- Limited update frequency: [OpenSky Network](https://opensky-network.org/)

### Aviation Edge
- Comprehensive aviation data API
- Paid subscription: [Aviation Edge](https://aviation-edge.com/)

## Troubleshooting

### Common Issues

- **Firebase API Key Invalid**: Check that your environment variables are correctly set
- **EPERM Error with Vite**: Run with `--force` flag or clear the `.vite` cache
- **Blank Screen After Login**: Verify the authentication initialization in main.ts
- **Map Not Loading**: Ensure Leaflet CSS is properly imported
- **TypeErrors in Components**: Check the computed property usage and TypeScript interfaces

### Development Tips

- Use mock services during development by setting `VITE_USE_MOCK_SERVICES=true`
- Check browser console for detailed error messages
- Use Vue DevTools extension for debugging component state
- For large datasets, implement pagination to improve performance

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- FlightAware, AirLabs, OpenSky Network, and Aviation Edge for providing flight data APIs
- The Vue.js team for creating an amazing framework
- The open-source community for all the wonderful tools and libraries