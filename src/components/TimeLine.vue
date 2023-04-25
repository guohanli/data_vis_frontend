<template>
  <div class="bg">
    <svg ref="lineChart"></svg>
  </div>
</template>

<script setup lang="ts">
import { useFireStore } from '@/stores/fire'
import { watch, ref } from 'vue'
import * as d3 from 'd3'
import type { Counts, LineDataItem } from './types'

const store = useFireStore()
const lineChart = ref<HTMLElement | null>(null)

watch(
  () => store.fireData,
  (fireData) => {
    // 计算每个月的火灾数量
    const counts: Counts = {}
    fireData.forEach((fire) => {
      const yearMonth = fire.fire_time.toISOString().substring(0, 7) // 提取年月信息
      counts[yearMonth] = (counts[yearMonth] || 0) + 1 // 增加对应的计数器
    })
    // 将计数器对象转换成 d3 需要的格式
    const parseTime = d3.timeParse('%Y-%m')
    const lineData = Object.keys(counts).map((yearMonth) => {
      return { date: parseTime(yearMonth), count: counts[yearMonth] }
    }) as LineDataItem[]

    const width = 1308
    const height = 138
    const margin = { top: 20, right: 25, bottom: 30, left: 40 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const svg = d3
      .select(lineChart.value)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height)
    const innerChart = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)

    // 定义 x 轴和 y 轴的比例尺
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(lineData, (d) => d.date) as [Date, Date])
      .range([0, innerWidth])
      .nice()

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(lineData, (d) => d.count)] as [number, number])
      .range([innerHeight, 0])
      .nice()

    // 画 x 轴和 y 轴
    const bottomAxis = d3
      .axisBottom(xScale)
      .tickFormat(d3.timeFormat('%Y-%m') as any)
      .ticks(18)
    innerChart
      .append('g')
      .attr('class', 'axis-x')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(bottomAxis)
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick text').attr('fill', '#A3A3A3'))
    const leftAxis = d3.axisLeft(yScale).ticks(5)
    innerChart
      .append('g')
      .attr('class', 'axis-y')
      .call(leftAxis)
      .call((g) => g.select('.domain').remove())
      .call((g) =>
        g
          .selectAll('.tick line')
          .attr('x2', width - margin.left - margin.right)
          .attr('stroke', '#CCCCCC')
          .attr('stroke-dasharray', '3 3')
          .attr('stroke-width', '1')
      )
      .call((g) => g.selectAll('.tick text').attr('fill', '#A3A3A3').attr('x', '-10px'))

    const line = d3
      .line<LineDataItem>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.count))

    // 画折线
    innerChart
      .append('path')
      .attr('d', line(lineData))
      .attr('stroke-width', '2')
      .style('fill', 'none')
      .attr('stroke', '#826AF9')

    // 画渐变区域
    const gradient = innerChart
      .append('defs')
      .append('linearGradient')
      .attr('id', 'areaGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')
    gradient.append('stop').attr('offset', '61.36%').attr('stop-color', '#826AF9')
    gradient
      .append('stop')
      .attr('offset', '74.05%')
      .attr('stop-color', 'rgba(130, 106, 249, 0.411701)')
    gradient.append('stop').attr('offset', '98.2%').attr('stop-color', 'rgba(130, 106, 249, 0)')

    const area = d3
      .area<LineDataItem>()
      .x(function (d) {
        return xScale(d.date)
      })
      .y0(yScale(0))
      .y1(function (d) {
        return yScale(d.count)
      })

    innerChart
      .append('path')
      .attr('d', area(lineData))
      .style('fill', 'url(#areaGradient)')
      .style('opacity', '0.2')

    function handleBrush(this: SVGGElement, e: any) {
      // 清除先前添加的边界线和圆点
      d3.selectAll('.boundary-line').remove()
      d3.selectAll('.boundary-circle').remove()

      // 调整选中的区域高度和颜色
      d3.select(this)
        .select('.selection')
        .attr('stroke', 'none')
        .attr('height', 90)
        .attr('fill', 'rgba(226, 234, 255, 0.6)')

      // 如果没有选中区域，则默认是全部区域
      if (!e.selection) {
        store.timeRange = [parseTime('2007-01'), parseTime('2021-01')] as [Date, Date]
        return
      }

      // 获取brush的当前选区
      const [x0, x1] = e.selection

      const upBias = 13
      const downBias = 37
      // 在brush选区的左右两侧添加边界线
      const lines = [
        { x1: x0, y1: -upBias, x2: x0, y2: height - downBias },
        { x1: x1, y1: -upBias, x2: x1, y2: height - downBias }
      ]

      d3.select(this)
        .selectAll('.boundary-line')
        .data(lines)
        .join('line')
        .attr('class', 'boundary-line')
        .attr('x1', (d) => d.x1)
        .attr('y1', (d) => d.y1)
        .attr('x2', (d) => d.x2)
        .attr('y2', (d) => d.y2)
        .attr('stroke', '#E2EAFF')
        .attr('stroke-width', '2')

      // 在边界线的端点上添加圆点
      const circles = [
        { x: x0, y: -upBias },
        { x: x0, y: height - downBias },
        { x: x1, y: -upBias },
        { x: x1, y: height - downBias }
      ]

      d3.select(this)
        .selectAll('.boundary-circle')
        .data(circles)
        .join('circle')
        .attr('class', 'boundary-circle')
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('r', 5)
        .attr('fill', '#E2EAFF')

      // 如果是brush结束事件，才获取选中的时间范围
      if (e.type !== 'end') return

      // 找到对应的时间范围，分别取前一个月份第一天0点，和后一个月份最后一天，转成Date对象
      const startDate = new Date(xScale.invert(x0))
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(xScale.invert(x1))
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(0)
      endDate.setHours(23, 59, 59, 999)
      store.timeRange = [startDate, endDate]
    }

    const brush = d3.brushX().on('start brush end', handleBrush)
    innerChart.append('g').attr('class', 'brush').call(brush)
  }
)
</script>

<style scoped>
.bg {
  position: absolute;
  width: 1308px;
  height: 178px;
  left: 16px;
  top: 15px;

  background: rgba(21, 27, 58, 0.7);
  border-radius: 5px;
}
</style>
