<template>
  <div class="bg">
    <svg ref="map"></svg>
    <div class="tooltip"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import * as d3 from 'd3'

import { useMapStore } from '@/stores/map'
import { useFireStore } from '@/stores/fire'
import type { FireLocation, FireStation, GridData } from './types'
import { color } from './types'

const map = ref<SVGSVGElement | null>(null)
let innerChart: d3.Selection<SVGGElement, unknown, null, undefined>
let projection: d3.GeoProjection

const mapStore = useMapStore()
const fireStore = useFireStore()

function calculateGridData(
  fireLocations: FireLocation[],
  fireStations: FireStation[],
  gridSize = 0.02
): GridData[] {
  const width = 1920
  const height = 1080
  const projection = d3.geoMercator().fitSize([width, height], mapStore.mapData)
  const bounds = d3.geoBounds(mapStore.mapData)

  const latRange = bounds[1][1] - bounds[0][1]
  const lngRange = bounds[1][0] - bounds[0][0]

  const latGridCount = Math.ceil(latRange / gridSize)
  const lngGridCount = Math.ceil(lngRange / gridSize)

  const gridData = []

  for (let i = 0; i <= latGridCount; i++) {
    for (let j = 0; j <= lngGridCount; j++) {
      const topLeft: [number, number] = [bounds[0][0] + j * gridSize, bounds[0][1] + i * gridSize]
      const bottomRight: [number, number] = [topLeft[0] + gridSize, topLeft[1] + gridSize]

      const firesInCell = fireLocations.filter((fire) => {
        return (
          fire.fire_lat >= topLeft[1] &&
          fire.fire_lat <= bottomRight[1] &&
          fire.fire_lng >= topLeft[0] &&
          fire.fire_lng <= bottomRight[0]
        )
      })
      const fireCount = firesInCell.length

      const firesInCellReinforcement = fireLocations.filter((fire) => {
        return (
          fire.battle_type === '增援' &&
          fire.fire_lat >= topLeft[1] &&
          fire.fire_lat <= bottomRight[1] &&
          fire.fire_lng >= topLeft[0] &&
          fire.fire_lng <= bottomRight[0]
        )
      })
      var rf = 0
      for (var jj = 0; jj < firesInCellReinforcement.length; jj++) {
        rf += 1 - 0.1 * rf
      }
      const reinforcementCount = rf

      let totalDistance = 0
      let stationCount = 0
      let minDistance = Infinity

      fireStations.forEach((station) => {
        const stationPoint = projection([station.station_lng, station.station_lat])!
        const cellCenter = [
          (projection(topLeft)![0] + projection(bottomRight)![0]) / 2,
          (projection(topLeft)![1] + projection(bottomRight)![1]) / 2
        ]

        const dx = stationPoint[0] - cellCenter[0]
        const dy = stationPoint[1] - cellCenter[1]
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < minDistance) {
          minDistance = distance
        }

        if (distance <= 50) {
          stationCount++
        }
      })

      let risk
      if (fireCount == 0) {
        risk = -8
      } else {
        var fc = 0
        for (var ii = 0; ii < fireCount; ii++) {
          fc += 1 - 0.1 * fc
        }
        risk = Math.log((fc / 500 + minDistance / 25) / (1 + stationCount * 5))
      }

      gridData.push({
        topLeft,
        bottomRight,
        fireCount,
        totalDistance,
        stationCount,
        risk,
        reinforcementCount
      })
    }
  }

  return gridData
}

function drawFireLocationLayer() {
  if (!innerChart) return
  const fireLocations = fireStore.fireLocations
  // 清除之前的火灾点
  d3.select('.fire-location-layer').remove()

  const fireLocationsLayer = innerChart.append('g').attr('class', 'fire-location-layer')
  fireLocationsLayer
    .selectAll('circle')
    .data(fireLocations)
    .join('circle')
    .attr('class', 'fire-location')
    .attr('cx', (d: any) => projection([d.fire_lng, d.fire_lat])![0])
    .attr('cy', (d: any) => projection([d.fire_lng, d.fire_lat])![1])
    .attr('r', 0.5)
    .attr('fill', '#fff')
    .attr('fill-opacity', 0.7)
}

function drawFireStationLayer() {
  if (!innerChart) return
  const fireStations = fireStore.fireStations
  // 清除之前的消防站点
  d3.select('.fire-station-layer').remove()

  const fireStationsLayer = innerChart.append('g').attr('class', 'fire-station-layer')
  fireStationsLayer
    .selectAll('circle')
    .data(fireStations)
    .join('circle')
    .attr('cx', (d: any) => projection([d.station_lng, d.station_lat])![0])
    .attr('cy', (d: any) => projection([d.station_lng, d.station_lat])![1])
    .attr('r', 2)
    .attr('fill', 'red')
    .attr('fill-opacity', 0.7)
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.5)
    .attr('stroke-opacity', 0.7)

  // tooltip
  const tooltip = d3.select('.tooltip')
  fireStationsLayer
    .selectAll('circle')
    .on('mouseover', function (e, d: any) {
      tooltip
        .style('display', 'block')
        .style('left', e.pageX + 30 + 'px')
        .style('top', e.pageY - 40 + 'px')
        .style('position', 'absolute')
        .style('color', '#fff')
        .style('background-color', '#0005')
        .style('padding', '12px')
        .style('border-radius', '4px')
        .html(
          `
          <div>消防站编号：${d.station_code}</div>
          <div>消防站经度：${d3.format('.3f')(d.station_lng)}</div>
          <div>消防站纬度：${d3.format('.3f')(d.station_lat)}</div>
          <div>出警总数：${d.task_count}</div>
          `
        )
    })
    .on('mouseout', function () {
      tooltip.style('display', 'none')
    })
}

function drawGridLayer() {
  if (!innerChart) return
  const fireLocations = fireStore.fireLocations.filter((d) => d.battle_type == '主战')
  const fireStations = fireStore.fireStations
  // 清除之前的网格
  d3.select(map.value).selectAll('.grid-layer').remove()

  if (fireLocations.length > 0 && fireStations.length > 0) {
    const gridData = calculateGridData(fireLocations, fireStations)

    const colorScale = d3
      .scaleSequential()
      .domain(d3.extent(gridData.filter((d) => d.risk !== 0) as any[], (d) => d.risk).reverse())
      .interpolator(d3.interpolateRdYlBu)

    const svg = d3.select(map.value).select('.inner-chart').append('g').attr('class', 'grid-layer')
    const projection = d3.geoMercator().fitSize([1920, 1080], mapStore.mapData)

    svg
      .selectAll('.grid-cell')
      .data(gridData)
      .enter()
      .append('rect')
      .attr('class', 'grid-cell')
      .attr('x', (d) => projection(d.topLeft)![0])
      .attr(
        'y',
        (d) =>
          projection(d.topLeft)![1] -
          Math.abs(projection(d.bottomRight)![1] - projection(d.topLeft)![1])
      )
      .attr('width', (d) => Math.abs(projection(d.bottomRight)![0] - projection(d.topLeft)![0]))
      .attr('height', (d) => Math.abs(projection(d.bottomRight)![1] - projection(d.topLeft)![1]))
      .attr('fill', (d) => colorScale(d.risk))
      .attr('opacity', 0.3)
  }
}

function drawReinforcementGridLayer() {
  if (!innerChart) return
  const fireLocations = fireStore.fireLocations.filter((d) => d.battle_type == '增援')
  const fireStations = fireStore.fireStations
  // 清除之前的增援密度网格
  d3.select(map.value).selectAll('.reinforcement-grid-layer').remove()

  if (fireLocations.length > 0 && fireStations.length > 0) {
    const gridData = calculateGridData(fireLocations, fireStations)

    const colorScale = d3
      .scaleSequential()
      .domain(
        d3
          .extent(
            gridData.filter((d) => d.reinforcementCount !== 0) as any[],
            (d) => d.reinforcementCount
          )
          .reverse()
      )
      .interpolator(d3.interpolateRdYlBu)

    const svg = d3
      .select(map.value)
      .select('.inner-chart')
      .append('g')
      .attr('class', 'reinforcement-grid-layer')
    const projection = d3.geoMercator().fitSize([1920, 1080], mapStore.mapData)

    svg
      .selectAll('.reinforcement-grid-cell')
      .data(gridData)
      .enter()
      .append('rect')
      .attr('class', 'reinforcement-grid-cell')
      .attr('x', (d) => projection(d.topLeft)![0])
      .attr(
        'y',
        (d) =>
          projection(d.topLeft)![1] -
          Math.abs(projection(d.bottomRight)![1] - projection(d.topLeft)![1])
      )
      .attr('width', (d) => Math.abs(projection(d.bottomRight)![0] - projection(d.topLeft)![0]))
      .attr('height', (d) => Math.abs(projection(d.bottomRight)![1] - projection(d.topLeft)![1]))
      .attr('fill', (d) => colorScale(d.reinforcementCount))
      .attr('opacity', 0.3)
  }
}

function adjustLayers() {
  const layers = [
    'fire-location-layer',
    'fire-station-layer',
    'grid-layer',
    'reinforcement-grid-layer'
  ]
  layers.forEach((layer) => {
    if (mapStore.mapLayers.includes(layer)) {
      innerChart?.select(`.${layer}`).style('display', 'block')
    } else {
      innerChart?.select(`.${layer}`).style('display', 'none')
    }
  })
}

watch(
  () => mapStore.mapData,
  (data) => {
    if (!data) return

    const width = 1920
    const height = 1080

    const svg = d3
      .select(map.value)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`) // 添加缩放和拖拽事件

    innerChart = svg.append('g').attr('class', 'inner-chart')

    const baseMap = innerChart.append('g').attr('class', 'base-map')

    projection = d3.geoMercator().fitSize([width, height], data)
    const path = d3.geoPath().projection(projection)
    baseMap
      .selectAll('path')
      .data(data.features)
      .join('path')
      .attr('d', path as any)
      .attr('fill', '#1A2161') // 修改填充颜色
      .attr('stroke', '#735CFF') // 修改边界线颜色
      .attr('stroke-width', 1) // 修改边界线宽度

    // 新增缩放和拖拽函数
    const initialScale = 2.4412341055663855
    const initialTranslate = [-2439.1421184776445, 35.94543782709036]
    const zoom = d3
      .zoom()
      .on('zoom', (event: any) => {
        d3.select(map.value).select('.inner-chart').attr('transform', event.transform)
      })
      .scaleExtent([0.5, 10])

    svg
      .call(zoom as any)
      .call(
        zoom.transform as any,
        d3.zoomIdentity.translate(initialTranslate[0], initialTranslate[1]).scale(initialScale)
      )
  }
)

watch(
  () => fireStore.filteredData,
  () => {
    drawReinforcementGridLayer()
    drawGridLayer()
    drawFireLocationLayer()
    drawFireStationLayer()
    adjustLayers()
  }
)

watch(
  () => mapStore.mapLayers,
  () => {
    adjustLayers()
  }
)

watch(
  () => fireStore.highlightedType,
  (type) => {
    // 地图上对应类型的火灾点用该类型的颜色标记
    if (type) {
      d3.select(map.value)
        .selectAll('.fire-location')
        .attr('fill', (d: any): string => {
          if (d.fire_type == type) {
            return color(type) as string
          } else {
            return 'none'
          }
        })
        .attr('r', 1)
    } else {
      d3.select(map.value).selectAll('.fire-location').attr('fill', '#FFFFFF').attr('r', 0.5)
    }
  }
)
</script>

<style scoped>
.bg {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
