<template>
  <div class="bg">
    <svg v-show="store.filteredData.length > 0" ref="pieChart"></svg>
    <div class="info" v-show="store.filteredData.length === 0">这里一条数据都没有哦 😭</div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue'
import * as d3 from 'd3'

import { useFireStore } from '@/stores/fire'
import type { Counts, PieDataItem } from './types'
import { color } from './types'

const store = useFireStore()
const pieChart = ref<SVGSVGElement | null>(null)
let dataReady: any[] = []

watch(
  () => store.filteredData,
  (data) => {
    // 清除之前的图表
    d3.select(pieChart.value).selectAll('*').remove()

    const width = 342
    const height = 326
    const margin = 30
    const radius = Math.min(width, height) / 2 - margin

    const innerChart = d3
      .select(pieChart.value)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')')
      .attr('class', 'inner-chart')

    // 计算各个类型的火灾数量
    const fireTypeCount: Counts = data.reduce((acc: any, cur: any) => {
      if (acc[cur.fire_type]) {
        acc[cur.fire_type] += 1
      } else {
        acc[cur.fire_type] = 1
      }
      return acc
    }, {})

    // 将数据转换为饼图需要的数据格式
    const pieData: PieDataItem[] = Object.keys(fireTypeCount).map((key) => {
      return { name: key, value: fireTypeCount[key] }
    })

    pieData.sort((a, b) => b.value - a.value)
    const pie = d3.pie<PieDataItem>().value((d) => d.value)
    dataReady = pie(pieData)

    // 绘制饼图
    let cumulativeDelay = 0
    const totalDuration = 500
    const arc = d3
      .arc()
      .innerRadius(radius * 0.5)
      .outerRadius(radius * 0.8)

    innerChart
      .selectAll('path')
      .data(dataReady)
      .enter()
      .append('path')
      .attr('fill', (d) => color(d.data.name) as string)
      .transition()
      .duration(function (d) {
        return ((d.endAngle - d.startAngle) / (2 * Math.PI)) * totalDuration
      })
      .delay(function (d) {
        const delay = ((d.endAngle - d.startAngle) / (2 * Math.PI)) * totalDuration
        cumulativeDelay += delay
        return cumulativeDelay - delay
      })
      .ease(d3.easeLinear)
      .attrTween('d', function (d: any) {
        const i = d3.interpolate(d.startAngle, d.endAngle)
        return function (t: any) {
          d.endAngle = i(t)
          return arc(d as any)
        }
      } as any)

    // 过滤掉小于一定比例的数据，避免标签密密麻麻重叠在一起
    const labelThreshod = 0.02
    const filteredData = dataReady.filter(function (d) {
      return d.value / data.length > labelThreshod
    })

    // 用于绘制到标签的连线中定位关键点
    const outerArc = d3
      .arc()
      .innerRadius(radius * 0.9)
      .outerRadius(radius * 0.9)

    const helpArc = d3
      .arc()
      .innerRadius(radius * 0.8)
      .outerRadius(radius * 0.8)

    // 添加到标签的连线
    innerChart
      .selectAll('allPolylines')
      .data(filteredData)
      .enter()
      .append('polyline')
      .attr('stroke', '#CCC')
      .style('fill', 'none')
      .attr('stroke-width', 1)
      // 添加初始点，供动画使用
      .attr('points', function (d: any) {
        const posA = helpArc.centroid(d as any)
        const posB = helpArc.centroid(d as any)
        const posC = helpArc.centroid(d as any)
        return [posA, posB, posC]
      } as any)
      .transition()
      .delay(totalDuration)
      .ease(d3.easeLinear)
      .duration(200)
      .attr('points', function (d: any) {
        const posA = helpArc.centroid(d as any)
        const posB = outerArc.centroid(d as any)
        const posC = outerArc.centroid(d as any)
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
        posC[0] = radius * 0.88 * (midangle < Math.PI ? 1 : -1)
        return [posA, posB, posC]
      } as any)

    // 添加标签
    innerChart
      .selectAll('allLabels')
      .data(filteredData)
      .enter()
      .append('text')
      .attr('transform', function (d) {
        const pos = outerArc.centroid(d as any)
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
        pos[0] = radius * 0.9 * (midangle < Math.PI ? 1 : -1)
        return 'translate(' + pos + ')'
      })
      .style('text-anchor', function (d) {
        const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
        return midangle < Math.PI ? 'start' : 'end'
      })
      .style('font-size', 9)
      .style('fill', 'white')
      .transition()
      .delay(totalDuration + 200)
      .ease(d3.easeLinear)
      .text(function (d) {
        return d.data.name
      })

    // 添加鼠标交互
    innerChart
      .selectAll('path')
      .on('mouseover', function (event, d: any) {
        store.highlightedType = d.data.name
      })
      .on('mouseout', function () {
        store.highlightedType = null
      })
      .on('click', function (event, d: any) {
        store.fireTypes = [d.data.name]
      })
  }
)

watch(
  () => store.highlightedType,
  (type) => {
    // 高亮对应的饼图
    d3.select(pieChart.value)
      .selectAll('path')
      .style('opacity', (d: any) => {
        return store.highlightedType === null || store.highlightedType === d.data.name ? 1 : 0.2
      })

    // 在饼图中心显示对应的类型和数量
    d3.select('.center-text').remove()
    const d = dataReady.find((d) => d.data.name === type)
    const centerText = d3
      .select(pieChart.value)
      .select('.inner-chart')
      .append('text')
      .attr('class', 'center-text')
      .style('text-anchor', 'middle')
      .text('')

    if (type) {
      centerText
        .text(d.data.name)
        .style('font-size', 20)
        .style('fill', color(d.data.name) as string)
        .style('font-weight', 'bold')
        .attr('dy', -5)
        .append('tspan')
        .text(d.data.value)
        .style('font-size', 20)
        .style('font-weight', 'bold')
        .style('fill', color(d.data.name) as string)
        .attr('x', 0)
        .attr('dy', 30)
    }
  }
)
</script>

<style scoped>
.bg {
  position: absolute;
  width: 342px;
  height: 30.186vh;
  left: 1559px;
  top: 1.3888vh;

  background: rgba(21, 27, 58, 0.7);
  border-radius: 5px;
}

.info {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
  color: #fff;
  font-size: 40px;
}
</style>
