import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as d3 from 'd3'

export const useMapStore = defineStore('map', () => {
  const mapData = ref<any>(null)
  const mapLayers = ref<string[]>([])

  async function loadData() {
    mapData.value = await d3.json('杭州市.json')
    mapLayers.value = ['heatmap-layer', 'fire-location-layer', 'fire-station-layer']
  }

  loadData()
  return { mapData, mapLayers }
})
