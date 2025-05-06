<template>
  <div class="home">
    <div class="hero">
      <div class="hero-content">
        <h1>Flight Operations Dashboard</h1>
        <p class="hero-description">
          A comprehensive flight management system for tracking flights, delays, and passenger information in real-time.
        </p>
        <div class="hero-actions">
          <router-link v-if="isAuthenticated" to="/dashboard" class="btn btn-primary btn-lg">
            Go to Dashboard
          </router-link>
          <router-link v-else to="/login" class="btn btn-primary btn-lg">
            Login
          </router-link>
        </div>
      </div>
    </div>
    
    <div class="features-section">
      <div class="container">
        <h2 class="section-title">Features</h2>
        
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <icon-flight />
            </div>
            <h3>Real-time Flight Tracking</h3>
            <p>Monitor flights with live updates from FlightAware/FlightRadar24 APIs.</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <icon-passengers />
            </div>
            <h3>Passenger Management</h3>
            <p>Track passenger status, check-ins, and manage connecting flights.</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <icon-map />
            </div>
            <h3>Interactive Flight Map</h3>
            <p>Visualize flights in real-time with interactive map views.</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <icon-analytics />
            </div>
            <h3>Operational Analytics</h3>
            <p>Get insights into flight delays, passenger metrics, and operational efficiency.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

// Icons
const IconFlight = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
      <path d="M22,16.5L16.5,22H7.5L2,16.5L11,6L22,16.5M10.5,7.67V3L12,1L13.5,3V7.67L12,6L10.5,7.67Z"/>
    </svg>
  `
}

const IconPassengers = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
      <path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/>
    </svg>
  `
}

const IconMap = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
      <path d="M15,19L9,16.89V5L15,7.11M20.5,3C20.44,3 20.39,3 20.34,3L15,5.1L9,3L3.36,4.9C3.15,4.97 3,5.15 3,5.38V20.5A0.5,0.5 0 0,0 3.5,21C3.55,21 3.61,21 3.66,20.97L9,18.9L15,21L20.64,19.1C20.85,19 21,18.85 21,18.62V3.5A0.5,0.5 0 0,0 20.5,3Z"/>
    </svg>
  `
}

const IconAnalytics = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
      <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M9,17H7V10H9V17M13,17H11V7H13V17M17,17H15V13H17V17Z"/>
    </svg>
  `
}

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.hero {
  height: 70vh;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%);
  color: white;
  padding: 2rem;
}

.hero-content {
  text-align: center;
  max-width: 800px;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.hero-description {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.hero-actions {
  margin-top: 2rem;
}

.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
}

.features-section {
  padding: 4rem 2rem;
  background-color: #f8f9fa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  margin-bottom: 3rem;
  color: var(--primary-color);
  font-size: 2rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.feature-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.feature-icon {
  width: 70px;
  height: 70px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--light-color);
  border-radius: 50%;
  color: var(--primary-color);
}

.feature-card h3 {
  margin-bottom: 1rem;
  color: var(--primary-color);
}

.feature-card p {
  color: var(--gray-color);
  line-height: 1.6;
}

@media (max-width: 768px) {
  .hero h1 {
    font-size: 2rem;
  }
  
  .hero-description {
    font-size: 1rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>