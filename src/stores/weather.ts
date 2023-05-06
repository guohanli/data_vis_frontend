import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as d3 from 'd3'
import type { WeatherItem, CsvItem, OtherDataItem } from '@/components/types'
import { useFireStore } from './fire'

export const useWeatherStore = defineStore('weather', () => {
  const weatherData = ref<WeatherItem[]>([])
  const otherData = ref<(OtherDataItem & { time: Date })[]>([])
  const highlightedFactor = ref<string | null>(null)

  async function loadData() {
    otherData.value = (await d3.json('other_info.json')) as (OtherDataItem & { time: Date })[]
    otherData.value.forEach((d: any) => {
      d.time = new Date(d.time)
    })

    const csvData: CsvItem[] = (await d3.csv('weather_info.csv')) as CsvItem[]
    weatherData.value = csvData.map((d) => {
      return {
        time: new Date(d.time),
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
  }

  const filteredFactorData = computed(() => {
    const fireStore = useFireStore()
    const filteredWeatherData = weatherData.value.filter(
      (d) => d.time! >= fireStore.timeRange[0] && d.time! <= fireStore.timeRange[1]
    )

    const weatherFactor = filteredWeatherData.reduce((acc: any, item) => {
      Object.entries(item).forEach(([key, value]) => {
        if (key === 'time') return
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(value)
      })
      return acc
    }, {})

    const filteredOtherData = otherData.value.filter(
      (d) => d.time! >= fireStore.timeRange[0] && d.time! <= fireStore.timeRange[1]
    )

    const otherFactor = filteredOtherData.reduce((acc: any, item) => {
      Object.entries(item).forEach(([key, value]) => {
        if (key === 'time') return
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(...(value as []))
      })
      return acc
    }, {})

    return { ...otherFactor, ...weatherFactor }
  })

  const fireFactorData = computed(() => {
    const fireStore = useFireStore()
    const factorData = fireStore.filteredData.map((d) => {
      // 只保留WeatherItem中的天气数据
      return {
        population_density: d.population_density,
        mean_registered_capital: d.mean_registered_capital,
        enterprise_count: d.enterprise_count,
        T: d.T,
        'T. max ave.': d['T. max ave.'],
        'T. min ave.': d['T. min ave.'],
        'T. max abs.': d['T. max abs.'],
        'T. min abs.': d['T. min abs.'],
        'Prec.(mm)': d['Prec.(mm)'],
        'Days(1mm)': d['Days(1mm)'],
        'Days(0.1mm)': d['Days(0.1mm)'],
        'Days(snow)': d['Days(snow)'],
        'Days(storm)': d['Days(storm)'],
        'Days(fog)': d['Days(fog)'],
        'Days(frost)': d['Days(frost)']
      }
    })

    return factorData.reduce((acc: any, item) => {
      Object.entries(item).forEach(([key, value]) => {
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(value)
      })
      return acc
    }, {})
  })

  loadData()
  return { weatherData, filteredFactorData, fireFactorData, highlightedFactor }
})
