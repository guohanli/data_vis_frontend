import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as d3 from 'd3'
import { fireTypeList } from '@/components/types'

export const useFireStore = defineStore('fire', () => {
  const csvData = ref<Array<CsvItem>>([])
  const fireData = ref<Array<FireItem>>([])
  const timeRange = ref<[Date, Date]>([
    new Date('2007-01-01 00:00:00'),
    new Date('2021-01-01 00:00:00')
  ])
  const fireTypes = ref<Array<string>>(fireTypeList)
  const highlightedType = ref<string | null>(null)

  async function loadData() {
    csvData.value = (await d3.csv('fire_info.csv')) as Array<CsvItem>
    fireData.value = csvData.value.map((d) => {
      return {
        id: parseInt(d.id),
        fire_code: parseInt(d.fire_code),
        fire_time: new Date(d.fire_time),
        fire_type: d.fire_type,
        station_code: d.station_code,
        battle_type: d.battle_type,
        fire_lat: parseFloat(d.fire_lat),
        fire_lng: parseFloat(d.fire_lng),
        station_lat: parseFloat(d.station_lat),
        station_lng: parseFloat(d.station_lng),
        station_build_time: new Date(d.station_build_time)
      }
    })
    fireData.value.sort((a, b) => a.fire_time.getTime() - b.fire_time.getTime())
  }

  const filteredData = computed(() => {
    // 按时间和火灾类型过滤
    return fireData.value.filter(
      (d) =>
        d.fire_time >= timeRange.value[0] &&
        d.fire_time <= timeRange.value[1] &&
        fireTypes.value.includes(d.fire_type)
    )
  })

  loadData()

  return { fireData, timeRange, fireTypes, highlightedType, filteredData }
})

interface FireItem {
  id: number
  fire_code: number
  fire_time: Date
  fire_type: string
  station_code: string
  battle_type: string
  fire_lat: number
  fire_lng: number
  station_lat: number
  station_lng: number
  station_build_time: Date
}

interface CsvItem {
  [key: string]: string
}
