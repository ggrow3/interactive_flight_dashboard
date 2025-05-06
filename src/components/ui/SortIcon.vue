<template>
  <span v-if="column === currentSort" class="sort-icon">
    {{ currentDirection === 'asc' ? '▲' : '▼' }}
  </span>
  <span v-else class="sort-icon-placeholder"></span>
</template>

<script setup lang="ts">
defineProps({
  column: {
    type: String,
    required: true
  },
  currentSort: {
    type: String,
    required: true
  },
  currentDirection: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.sort-icon {
  margin-left: 0.25rem;
  display: inline-block;
  width: 1rem;
  text-align: center;
}

.sort-icon-placeholder {
  margin-left: 0.25rem;
  display: inline-block;
  width: 1rem;
}
</style>