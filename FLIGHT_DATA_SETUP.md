# Flight Data API Integration Setup

This document explains how to set up real-time flight data integration for the Flight Dashboard application.

## Supported Data Providers

The application supports multiple flight data providers:

1. **FlightAware AeroAPI** (Recommended) - Industry-leading flight tracking with comprehensive data
2. **AirLabs API** - Full real-time tracking with WebSocket support
3. **OpenSky Network API** - Limited free tier with position data only
4. **Aviation Edge API** - Comprehensive flight data but no live position tracking
5. **FlightRadar24 API** - Visualization-focused flight tracking

## Environment Variables

Create a `.env` file in the root of the project with the following variables:

```env
# Main API selection
# Options: 'flightaware', 'airlabs', 'opensky', 'aviation-edge', 'flightradar24'
VITE_REALTIME_API_PROVIDER=flightaware

# FlightAware AeroAPI (https://flightaware.com/commercial/aeroapi/)
VITE_FLIGHTAWARE_API_KEY=your_flightaware_api_key
VITE_FLIGHTAWARE_API_BASE=https://aeroapi.flightaware.com/aeroapi

# AirLabs API (https://airlabs.co/)
VITE_AIRLABS_API_KEY=your_airlabs_api_key

# OpenSky Network API (https://opensky-network.org/)
VITE_OPENSKY_USERNAME=your_opensky_username
VITE_OPENSKY_PASSWORD=your_opensky_password

# Aviation Edge API (https://aviation-edge.com/)
VITE_AVIATION_EDGE_API_KEY=your_aviation_edge_api_key

# FlightRadar24 API
VITE_FLIGHTRADAR_API_KEY=your_flightradar_api_key
VITE_FLIGHTRADAR_API_BASE=your_flightradar_api_base

# Legacy mode - only used when no REALTIME_API_PROVIDER is set
VITE_FLIGHT_API_PROVIDER=flightaware
```

## API Registration Instructions

### FlightAware AeroAPI (Recommended)

1. Visit [FlightAware AeroAPI](https://flightaware.com/commercial/aeroapi/) and create an account
2. Select a subscription plan (various tiers available from developer to enterprise)
3. After subscribing, navigate to the AeroAPI dashboard
4. Create a new API key in your account settings
5. Copy the API key to your `.env` file as `VITE_FLIGHTAWARE_API_KEY`

FlightAware provides the most comprehensive and accurate flight tracking data available, including:
- Real-time flight positions with high update frequency
- Historical flight data and statistics
- Detailed arrival and departure information
- Gates and terminals at major airports
- Weather conditions affecting flights
- Flight status changes in real time

### AirLabs API

1. Visit [AirLabs.co](https://airlabs.co/) and create an account
2. Navigate to the API Keys section in your dashboard
3. Create a new API key
4. Copy the API key to your `.env` file as `VITE_AIRLABS_API_KEY`
5. For WebSocket support (live tracking), you'll need a paid subscription

### OpenSky Network

1. Register for a free account at [OpenSky Network](https://opensky-network.org/index.php?option=com_users&view=registration)
2. Your username and password will be used for API authentication
3. Set `VITE_OPENSKY_USERNAME` and `VITE_OPENSKY_PASSWORD` in your `.env` file
4. Note: Free tier has rate limits and limited historical data

### Aviation Edge

1. Visit [Aviation Edge](https://aviation-edge.com/) and sign up for an account
2. Subscribe to their Flight Tracker API
3. Copy your API key to the `.env` file as `VITE_AVIATION_EDGE_API_KEY`

## Features by Provider

| Feature | FlightAware | AirLabs | OpenSky | Aviation Edge | FlightRadar24 |
|---------|------------|---------|---------|---------------|---------------|
| Real-time Position | ✅ (High Accuracy) | ✅ | ✅ | ❌ | ✅ |
| Flight Status | ✅ (Detailed) | ✅ | Limited | ✅ | ✅ |
| Delay Information | ✅ | ✅ | ❌ | ✅ | ✅ |
| Gate/Terminal | ✅ | ✅ | ❌ | ✅ | Limited |
| Aircraft Type | ✅ | ✅ | ❌ | ✅ | ✅ |
| Historical Data | ✅ | Limited | Limited | ❌ | Limited |
| Weather Integration | ✅ | ❌ | ❌ | ❌ | ❌ |
| WebSocket Support | ✅ (Enterprise) | ✅ (Paid) | ❌ | ❌ | ❌ |
| Free Tier | Trial Only | Limited | ✅ | Limited | ❌ |
| Data Quality | Excellent | Good | Basic | Good | Good |
| Update Frequency | High | Medium | Low | Low | Medium |

## Development Mode

If you don't have API keys, the application will run in development mode with mock data. The real-time tracking buttons will still appear, but will use simulated data instead of connecting to external APIs.

## Troubleshooting

If you encounter issues with real-time data:

1. Check your API keys in the `.env` file
2. Verify your subscription status with the chosen provider
3. Check network requests in the browser's developer tools for error messages
4. Look for rate limit or quota issues in the console logs

## Rate Limiting Considerations

To avoid excessive API calls:

- The flight map will only update data when visible
- Individual flight tracking is limited to 30-second minimum intervals
- WebSocket is preferred when available to reduce API calls
- Data is cached where possible to minimize repeat requests

## Additional Resources

- [AirLabs API Documentation](https://airlabs.co/docs/api)
- [OpenSky Network API Documentation](https://openskynetwork.github.io/opensky-api/)
- [Aviation Edge API Documentation](https://aviation-edge.com/developers/)