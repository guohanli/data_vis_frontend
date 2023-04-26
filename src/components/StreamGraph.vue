<template>
  <div class="bg">
    <svg v-show="store.filteredData.length > 0" ref="streamGraph"></svg>
    <div class="info" v-show="store.filteredData.length === 0">求你给我点数据吧 🙏</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import * as d3 from 'd3'

import { useFireStore } from '@/stores/fire'
import { color } from './types'

const store = useFireStore()
const streamGraph = ref<SVGSVGElement | null>(null)

watch(
  () => store.filteredData,
  (data) => {
    // 清除之前的图表
    d3.select(streamGraph.value).selectAll('*').remove()

    // 如果没有数据，直接返回
    if (data.length === 0) {
      return
    }

    const width = 558
    const height = 270
    const margin = { top: 50, right: 10, bottom: 30, left: 10 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const svg = d3
      .select(streamGraph.value)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)

    // 添加图表标题
    svg
      .append('text')
      .text('火灾场景时序河流图')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', 18)
      .attr('font-weight', 'bold')
      .style('fill', '#fff')
      .style('font-family', 'Inter')

    const innerChart = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)

    // 将数据转化为河流图需要的格式
    const fireTypeCount = data.reduce((acc: any, cur: any) => {
      const hour = new Date(cur.fire_time).getHours()
      if (!acc[hour]) {
        acc[hour] = {}
        store.fireTypes.forEach((fireType) => {
          acc[hour][fireType] = 0
        })
      }
      acc[hour][cur.fire_type] += 1
      return acc
    }, {})
    fireTypeCount[24] = fireTypeCount[0]

    // 将数据转化为堆栈格式
    const stack = d3.stack().keys(store.fireTypes).offset(d3.stackOffsetWiggle)
    const stackData = stack(Object.values(fireTypeCount))

    // 设置x轴比例尺
    const xScale = d3.scaleLinear().domain([0, 24]).range([0, innerWidth])

    // 设置y轴比例尺
    const yScale = d3
      .scaleLinear()
      .domain([
        d3.min(stackData, (layer) => d3.min(layer, (d) => d[0])) as number,
        d3.max(stackData, (layer) => d3.max(layer, (d) => d[1])) as number
      ])
      .range([innerHeight, 0])

    // 绘制x轴
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(13)
      .tickValues(d3.range(0, 25, 2))
      .tickSize(-innerHeight)
      .tickPadding(10)
      .tickFormat((d) => {
        const hour = d3.format('02')(d)
        return `${hour}:00`
      })

    innerChart
      .append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').attr('stroke', '#597EFF'))
      .call((g) => g.selectAll('.tick text').attr('fill', 'white'))

    // 绘制y轴
    const [yMin, yMax] = yScale.domain()
    const yAxisTicks = Array.from({ length: 6 }, (_, i) => yMin + (i * (yMax - yMin)) / 5)
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(yAxisTicks)
      .tickSize(-innerWidth)
      .tickFormat(() => '')

    innerChart
      .append('g')
      .call(yAxis)
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').attr('stroke', '#597EFF'))

    // 定义河流区域
    const area = d3
      .area<{ 0: number; 1: number }>()
      .x((d, i) => xScale(i))
      .y0((d) => yScale(d[0]))
      .y1((d) => yScale(d[1]))
      .curve(d3.curveBasis)

    // 将数据绑定到SVG路径并设置相应的属性
    innerChart
      .selectAll('path')
      .data(stackData)
      .join('path')
      .attr('d', area)
      .attr('fill', (d, i) => color(store.fireTypes[i]) as string)
      // 设置鼠标交互
      .on('mouseover', (e, d) => {
        store.highlightedType = d.key
      })
      .on('mouseout', () => {
        store.highlightedType = null
      })
      .on('click', (e, d) => {
        store.fireTypes = [d.key]
      })
      .attr('opacity', 0)
      .transition()
      .ease(d3.easeLinear)
      .duration(1000)
      .attr('opacity', 1)
  }
)

watch(
  () => store.highlightedType,
  (type) => {
    if (type === null) {
      d3.select(streamGraph.value).selectAll('path').attr('opacity', 1)
    } else {
      d3.select(streamGraph.value)
        .selectAll('path')
        .attr('opacity', (d, i) => (store.fireTypes[i] === type ? 1 : 0.2))
    }
  }
)
</script>

<style scoped>
.bg {
  position: absolute;
  width: 558px;
  height: 25vh;
  left: 1344px;
  top: 73vh;

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
