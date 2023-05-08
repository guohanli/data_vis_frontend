<template>
  <div class="bg">
    <svg v-show="fireStore.typeFilteredFireData.length > 0" ref="lineChart"></svg>
    <div class="info" v-show="fireStore.typeFilteredFireData.length === 0">
      请至少选择一种类型 🫠
    </div>
    <div class="layer-options">
      <div class="option" v-for="(value, key) in LayerTypeDict" :key="key">
        <input type="checkbox" :id="key" :value="key" v-model="mapStore.mapLayers" />
        <label :for="key"> <span class="custom-icon"></span>{{ value }} </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue'
import * as d3 from 'd3'

import { useFireStore } from '@/stores/fire'
import { useMapStore } from '@/stores/map'
import type { Counts, LineDataItem } from './types'

const fireStore = useFireStore()
const mapStore = useMapStore()
const lineChart = ref<HTMLElement | null>(null)
const LayerTypeDict = {
  'reinforcement-grid-layer': '显示增援密度',
  'grid-layer': '显示火灾风险',
  'fire-location-layer': '显示火灾点',
  'fire-station-layer': '显示消防站'
}

watch(
  () => fireStore.typeFilteredFireData,
  (fireData) => {
    // 删除.inner-chart下的直接子元素，除了.brush的元素
    d3.select(lineChart.value).selectAll('.inner-chart > :not(.brush)').remove()
    // 如果没有数据，就连brush也删了算了
    if (!fireData.length) d3.select(lineChart.value).selectAll('*').remove()

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

    const width = 1314
    const height = 160
    const margin = { top: 35, right: 25, bottom: 30, left: 40 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const svg = d3
      .select(lineChart.value)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', '80%')

    let innerChart = svg.select<SVGGElement>('.inner-chart')
    // 选择inner-chart元素，如果不存在的话
    if (innerChart.empty()) {
      innerChart = svg
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .attr('class', 'inner-chart')
    }

    // 定义 x 轴和 y 轴的比例尺
    const xScale = d3
      .scaleTime()
      .domain([new Date('2007-01'), new Date('2020-12')])
      .range([0, innerWidth])
      .nice()

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(lineData, (d) => d.count)] as [number, number])
      .range([innerHeight, 0])
      .nice()

    // 定义 x 轴和 y 轴格式
    const bottomAxis = d3
      .axisBottom(xScale)
      .tickFormat(d3.timeFormat('%Y-%m') as any)
      .ticks(18)
    const leftAxis = d3.axisLeft(yScale).ticks(5)

    // 绘制 x 轴和 y 轴
    innerChart
      .append('g')
      .attr('class', 'axis-x')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(bottomAxis)
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick text').attr('y', 15).attr('fill', '#A3A3A3'))
      .call((g) => g.selectAll('.tick line').style('color', '#A3A3A3'))
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

    // 定义折线生成器
    const line = d3
      .line<LineDataItem>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.count))

    // 定义渐变色
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

    // 定义初始面积生成器
    const zeroArea = d3
      .area<LineDataItem>()
      .x(function (d) {
        return xScale(d.date)
      })
      .y0(innerHeight)
      .y1(0)

    // 定义面积生成器
    const area = d3
      .area<LineDataItem>()
      .x(function (d) {
        return xScale(d.date)
      })
      .y0(yScale(0))
      .y1(function (d) {
        return yScale(d.count)
      })

    // 画折线下的面积部分
    innerChart
      .append('path')
      .attr('d', zeroArea(lineData))
      .style('fill', 'url(#areaGradient)')
      .style('opacity', '0.2')
      .transition()
      .duration(1500)
      .attr('d', area(lineData))
      .style('fill', 'url(#areaGradient)')
      .style('opacity', '0.2')

    // 画折线
    const path = innerChart
      .append('path')
      .attr('d', line(lineData))
      .attr('stroke-width', '2')
      .style('fill', 'none')
      .attr('stroke', '#826AF9')

    // 添加折线绘制动画效果
    const length = path.node()?.getTotalLength()
    path
      .attr('stroke-dasharray', length + ' ' + length)
      .attr('stroke-dashoffset', `${length}`)
      .transition()
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0)
      .delay(1500)
      .duration(1500)

    const referenceLineGroup = innerChart.append('g').attr('class', 'reference-line-group')
    function handleMouseMove(e: MouseEvent) {
      const [x] = d3.pointer(e, innerChart.node())

      const date = xScale.invert(x)

      const isInside = x > 0 && x < innerWidth
      if (isInside) {
        referenceLineGroup.selectAll('*').remove()
        referenceLineGroup
          .append('line')
          .attr('class', 'reference-line')
          .attr('stroke', '#fff')
          .attr('stroke-dasharray', '5,5')
        referenceLineGroup.append('text').attr('class', 'reference-text').attr('fill', '#fff')

        const referenceLine = referenceLineGroup.select('.reference-line')
        const referenceText = referenceLineGroup.select('.reference-text')
        referenceLine.attr('x1', x).attr('x2', x).attr('y2', innerHeight)
        referenceText
          .attr('x', x)
          .attr('y', -17)
          .text(d3.timeFormat('%Y-%m')(date))
          .attr('text-anchor', 'middle')
      }
    }
    innerChart.on('mousemove', handleMouseMove)
    innerChart.on('mouseleave', () => {
      referenceLineGroup.selectAll('*').remove()
    })

    function handleBrush(this: SVGGElement, e: any) {
      // 清除参考线
      referenceLineGroup.selectAll('*').remove()

      // 清除先前添加的边界线和圆点
      d3.selectAll('.boundary-line').remove()
      d3.selectAll('.boundary-circle').remove()

      // 调整选中的区域高度和颜色
      d3.select(this)
        .select('.selection')
        .attr('stroke', 'none')
        .attr('height', innerHeight)
        .attr('fill', 'rgba(226, 234, 255, 0.6)')

      // 如果没有选中区域，则默认是全部区域
      if (!e.selection) {
        d3.select(this).selectAll('.reference-text').remove()
        fireStore.timeRange = [parseTime('2007-01'), parseTime('2021-01')] as [Date, Date]
        return
      }

      // 获取brush的当前选区
      const [x0, x1] = e.selection

      const upBias = 11
      const downBias = 56
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

      // 添加brush选区的开始和结束文字
      const texts = [
        { x: x0, y: -upBias - 6, text: d3.timeFormat('%Y-%m')(xScale.invert(x0)) },
        { x: x1, y: -upBias - 6, text: d3.timeFormat('%Y-%m')(xScale.invert(x1)) }
      ]

      // 画出文字
      d3.select(this)
        .selectAll('.reference-text')
        .data(texts)
        .join('text')
        .attr('class', 'reference-text')
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y)
        .text((d) => d.text)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')

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
      fireStore.timeRange = [startDate, endDate]
    }

    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [innerWidth, innerHeight]
      ])
      .on('start brush end', handleBrush)
    if (svg.select('.brush').empty()) {
      innerChart.append('g').attr('class', 'brush').call(brush)
    } else {
      svg.select<SVGGElement>('.brush').call(brush)
    }
  }
)
</script>

<style scoped>
.bg {
  position: absolute;
  width: 1314px;
  height: 200px;
  left: 16px;
  top: 15px;

  background: rgba(21, 27, 58, 0.7);
  border-radius: 5px;
}

.layer-options {
  display: flex;
  justify-content: flex-end;
  gap: 30px;
  padding-right: 25px;
}

input[type='checkbox'] {
  display: none;
}

.custom-icon {
  display: inline-block;
  width: 18px;
  height: 18px;
  background-size: cover;
  margin-right: 10px;
}

input[type='checkbox'] + label[for] .custom-icon {
  background-image: url('@/assets/unchecked.svg');
}

input[type='checkbox']:checked + label[for] .custom-icon {
  background-image: url('@/assets/checked.svg');
}

label {
  display: flex;
  align-items: center;

  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  color: #ffffff;
}

label span {
  flex-shrink: 0;
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
