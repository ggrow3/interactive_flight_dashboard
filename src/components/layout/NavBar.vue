<template>
  <nav class="navbar">
    <div class="navbar-brand">
      <router-link to="/dashboard" class="logo">
        Flight Dashboard
      </router-link>
    </div>
    
    <div class="navbar-menu">
      <router-link to="/dashboard" class="navbar-item" active-class="active">
        Dashboard
      </router-link>
      <router-link to="/flights" class="navbar-item" active-class="active">
        Flights
      </router-link>
      <router-link to="/passengers" class="navbar-item" active-class="active">
        Passengers
      </router-link>
      <router-link to="/analytics" class="navbar-item" active-class="active">
        Analytics
      </router-link>
    </div>
    
    <div class="navbar-end">
      <div class="user-info" v-if="user">
        <span>{{ user.email }}</span>
        <button @click="handleLogout" class="logout-button">Logout</button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'
import { useRouter } from 'vue-router'
import { computed } from 'vue'

const authStore = useAuthStore()
const router = useRouter()
const user = computed(() => authStore.user)

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  background-color: #2c3e50;
  color: white;
  padding: 0 1rem;
  height: 60px;
}

.navbar-brand {
  font-size: 1.5rem;
  font-weight: bold;
}

.logo {
  color: white;
  text-decoration: none;
}

.navbar-menu {
  display: flex;
  margin-left: 2rem;
  flex: 1;
}

.navbar-item {
  color: #eee;
  text-decoration: none;
  padding: 0 1rem;
  height: 60px;
  display: flex;
  align-items: center;
  transition: background-color 0.2s;
}

.navbar-item:hover, .navbar-item.active {
  background-color: #34495e;
  color: white;
}

.navbar-end {
  margin-left: auto;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-info span {
  margin-right: 1rem;
}

.logout-button {
  background-color: transparent;
  border: 1px solid white;
  color: white;
  padding: 0.3rem 0.7rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logout-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>