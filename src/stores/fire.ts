import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as d3 from 'd3'
import { fireTypeList } from '@/components/types'
import type {
  CsvItem,
  FireItem,
  WeatherItem,
  OtherInfoItem,
  FireLocation,
  FireStation
} from '@/components/types'

export const useFireStore = defineStore('fire', () => {
  const csvData = ref<Array<CsvItem>>([])
  const fireData = ref<Array<FireItem & WeatherItem & OtherInfoItem>>([])
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
        station_build_time: new Date(d.station_build_time),
        population_density: parseInt(d.population_density),
        mean_registered_capital: parseInt(d.mean_registered_capital),
        enterprise_count: parseInt(d.enterprise_count),
        T: parseFloat(d.T),
        'T. max ave.': parseFloat(d['T. max ave.']),
        'T. min ave.': parseFloat(d['T. min ave.']),
        'T. max abs.': parseFloat(d['T. max abs.']),
        'T. min abs.': parseFloat(d['T. min abs.']),
        'Prec.(mm)': parseFloat(d['Prec.(mm)']),
        'Days(1mm)': parseInt(d['Days(1mm)']),
        'Days(0.1mm)': parseInt(d['Days(0.1mm)']),
        'Days(snow)': parseInt(d['Days(snow)']),
        'Days(storm)': parseInt(d['Days(storm)']),
        'Days(fog)': parseInt(d['Days(fog)']),
        'Days(frost)': parseInt(d['Days(frost)'])
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

  const typeFilteredFireData = computed(() => {
    // 按火灾类型过滤
    return fireData.value.filter((d) => fireTypes.value.includes(d.fire_type))
  })

  const fireLocations = computed(() => {
    // 传回经过过滤后的数据，所有火灾的经纬度
    const data: FireLocation[] = filteredData.value.map((d) => {
      return {
        fire_code: d.fire_code,
        fire_lat: d.fire_lat,
        fire_lng: d.fire_lng,
        station_code: d.station_code,
        battle_type: d.battle_type,
        fire_type: d.fire_type
      }
    })
    // 去掉相同的火灾点
    const fireCodeSet = new Set<number>()
    const fireLocations = data.filter((d) => {
      if (fireCodeSet.has(d.fire_code)) {
        return false
      } else {
        fireCodeSet.add(d.fire_code)
        return true
      }
    })
    return fireLocations
  })

  const fireStations = computed(() => {
    // 传回经过过滤后的数据，所有消防站的经纬度
    const data: FireStation[] = filteredData.value.map((d) => {
      return {
        station_code: d.station_code,
        station_lat: d.station_lat,
        station_lng: d.station_lng
      }
    })
    // 去掉相同的消防站
    const stationCodeSet = new Set<string>()
    const fireStations = data.filter((d) => {
      if (stationCodeSet.has(d.station_code)) {
        return false
      } else {
        stationCodeSet.add(d.station_code)
        return true
      }
    })

    // 计算每个消防站的出警次数
    const stationCodeToCount = new Map<string, number>()
    for (const d of filteredData.value) {
      if (stationCodeToCount.has(d.station_code)) {
        stationCodeToCount.set(d.station_code, stationCodeToCount.get(d.station_code)! + 1)
      } else {
        stationCodeToCount.set(d.station_code, 1)
      }
    }
    for (const d of fireStations) {
      d.task_count = stationCodeToCount.get(d.station_code)!
    }
    return fireStations
  })

  loadData()

  return {
    fireData,
    timeRange,
    fireTypes,
    highlightedType,
    filteredData,
    fireLocations,
    fireStations,
    typeFilteredFireData
  }
})
