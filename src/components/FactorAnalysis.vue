<template>
  <div class="factor-bg">
    <svg ref="factorSvg"></svg>
  </div>
  <div v-show="weatherStore.highlightedFactor !== null" class="distribution-bg">
    <svg ref="distributionSvg"></svg>
  </div>
</template>

<script setup lang="ts">
import { useWeatherStore } from '@/stores/weather'
import { watch, ref } from 'vue'
import * as d3 from 'd3'
import { nameMap } from '@/components/types'

const weatherStore = useWeatherStore()
const factorSvg = ref<SVGSVGElement | null>(null)
const distributionSvg = ref<SVGSVGElement | null>(null)
let histogramData: any = {}

function computeCombinedExtent(data1: any, data2: any, key: string) {
  const extent1 = d3.extent(data1[key]) as [unknown, unknown]
  const extent2 = d3.extent(data2[key]) as [unknown, unknown]

  return [
    Math.min(extent1[0] as number, extent2[0] as number),
    Math.max(extent1[1] as number, extent2[1] as number)
  ]
}

function computeHistogram(data: any, key: string, numBins: number, domain: any) {
  const values = data[key]
  const histogram = d3.bin().domain(domain).thresholds(numBins)

  const totalCount = values.length
  const bins = histogram(values)

  return bins.map((bin) => ({
    x0: bin.x0,
    x1: bin.x1,
    probability: bin.length / totalCount
  }))
}

async function computeSimilarity(allData: any, fireData: any, numBins = 50) {
  const keys = Object.keys(allData)
  const similarityScores: any[] = []
  histogramData = {}

  keys.forEach((key) => {
    const combinedExtent = computeCombinedExtent(allData, fireData, key)
    const allHistogram = computeHistogram(allData, key, numBins, combinedExtent)
    const fireHistogram = computeHistogram(fireData, key, numBins, combinedExtent)
    histogramData[key] = {
      combinedExtent: combinedExtent,
      allHistogram: allHistogram,
      fireHistogram: fireHistogram
    }
    const score = overlapArea(allHistogram, fireHistogram)

    similarityScores.push({ key, score })
  })

  similarityScores.sort((a, b) => a.score - b.score)

  return similarityScores
}

function overlapArea(distribution1: any, distribution2: any) {
  let overlap = 0

  for (let i = 0; i < distribution1.length; i++) {
    overlap += Math.min(distribution1[i].probability, distribution2[i].probability)
  }

  return overlap
}

watch(
  () => [weatherStore.fireFactorData, weatherStore.filteredFactorData],
  async () => {
    d3.select(factorSvg.value).selectAll('*').remove()

    if (
      Object.keys(weatherStore.fireFactorData).length !== 15 ||
      Object.keys(weatherStore.filteredFactorData).length !== 15
    ) {
      return
    }
    const allFactorData = weatherStore.filteredFactorData
    const fireFactorData = weatherStore.fireFactorData
    const similarityScores = await computeSimilarity(allFactorData, fireFactorData)
    similarityScores.sort((a, b) => a.score - b.score)

    const width = 558
    const height = 426
    const margin = { top: 40, right: 30, bottom: 80, left: 55 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const svg = d3
      .select(factorSvg.value)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)

    // 添加图表标题
    svg
      .append('text')
      .text('全图/火灾数据各因素分布图相似程度')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', 18)
      .attr('font-weight', 'bold')
      .style('fill', '#fff')

    const innerChart = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)
    const keys = similarityScores.map((score) => score.key)

    const xScale = d3.scaleBand().domain(keys).range([0, innerWidth]).padding(0.2)
    const yScale = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0])

    // 添加x轴
    innerChart
      .append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .call((g) =>
        g
          .selectAll('.tick text')
          .attr('fill', '#DDD')
          .text((d) => nameMap[d as keyof typeof nameMap])
      )
      .call((g) => g.selectAll('.tick line').style('color', '#416FEE'))
      .call((g) => g.select('.domain').attr('stroke', '#416FEE'))
      .selectAll('text')
      .attr('font-size', '12px')

      .attr('transform', 'translate(-10,10)rotate(-45)')
      .style('text-anchor', 'end')

    // 添加y轴
    innerChart
      .append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.0%')))
      .call((g) => g.selectAll('.tick text').attr('fill', '#DDD'))
      .call((g) => g.selectAll('.tick line').style('color', '#416FEE'))
      .call((g) => g.select('.domain').attr('stroke', '#416FEE'))
      .selectAll('text')
      .attr('font-size', '12px')

    // 添加柱状图
    innerChart
      .selectAll('.bar')
      .data(similarityScores)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.key) as number)
      .attr('y', (d) => yScale(d.score))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerHeight - yScale(d.score))
      .style('fill', '#4169E1aa')
      .on('mouseover', (event, d) => {
        weatherStore.highlightedFactor = d.key
        // 设置鼠标悬浮时矩形的样式
        d3.select(event.currentTarget).style('fill', '#416FEE')
        // 该矩形对应的text也要变色
        d3.select(factorSvg.value)
          .selectAll('text')
          .attr('fill', (textData) => {
            return textData == d.key ? '#416FEE' : '#DDD'
          })
      })
      .on('mouseout', (event) => {
        weatherStore.highlightedFactor = null
        // 设置鼠标离开时的样式
        d3.select(event.currentTarget).style('fill', '#4169E1aa')
        // 所有text恢复原色
        d3.select(factorSvg.value).selectAll('text').attr('fill', '#DDD')
      })
  }
)

watch(
  () => weatherStore.highlightedFactor,
  (key) => {
    d3.select(distributionSvg.value).selectAll('*').remove()
    if (key === null) return

    const width = 700
    const height = 426
    const margin = { top: 45, right: 30, bottom: 40, left: 50 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const svg = d3
      .select(distributionSvg.value)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)

    const innerChart = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)
    const { combinedExtent, allHistogram, fireHistogram } =
      histogramData[key as keyof typeof histogramData]

    const xScale = d3.scaleLinear().domain(combinedExtent).range([0, innerWidth]).nice()
    const yScale = d3
      .scaleLinear()
      .domain([
        0,
        Math.max(
          d3.max(allHistogram, (d: any) => d.probability) as any,
          d3.max(fireHistogram, (d: any) => d.probability) as any
        )
      ])
      .range([innerHeight, 0])
      .nice()

    // 添加x轴
    innerChart
      .append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .call((g) => g.selectAll('.tick text').attr('fill', '#DDD'))
      .call((g) => g.selectAll('.tick line').style('color', '#416FEE'))
      .call((g) => g.select('.domain').attr('stroke', '#416FEE'))
      .selectAll('text')
      .attr('font-size', '12px')
      .style('text-anchor', 'middle')

    // 添加y轴
    innerChart
      .append('g')
      .call(d3.axisLeft(yScale))
      .call((g) => g.selectAll('.tick text').attr('fill', '#DDD'))
      .call((g) => g.selectAll('.tick line').style('color', '#416FEE'))
      .call((g) => g.select('.domain').attr('stroke', '#416FEE'))
      .selectAll('text')
      .attr('font-size', '12px')

    // 添加全部数据的直方图
    innerChart
      .selectAll('.all-bar')
      .data(allHistogram)
      .enter()
      .append('rect')
      .attr('class', 'all-bar')
      .attr('x', (d: any) => xScale(d.x0))
      .attr('y', (d: any) => yScale(d.probability))
      .attr('width', xScale(allHistogram[0].x1) - xScale(allHistogram[0].x0))
      .attr('height', (d: any) => innerHeight - yScale(d.probability))
      .style('fill', '#4169E1')
      .style('stroke', 'none')
      .attr('opacity', 1)

    // 添加火灾数据的直方图
    innerChart
      .selectAll('.fire-bar')
      .data(fireHistogram)
      .enter()
      .append('rect')
      .attr('class', 'fire-bar')
      .attr('x', (d: any) => xScale(d.x0))
      .attr('y', (d: any) => yScale(d.probability))
      .attr('width', xScale(fireHistogram[0].x1) - xScale(fireHistogram[0].x0))
      .attr('height', (d: any) => innerHeight - yScale(d.probability))
      .style('fill', '#FF5733')
      .style('stroke', 'none')
      .attr('opacity', '0.6')

    // 添加图表标题
    svg
      .append('text')
      .text(nameMap[key as keyof typeof nameMap])
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', 16)
      .style('fill', '#fff')
      .style('font-family', 'Inter')

    // 添加图例
    const legend = innerChart.append('g').attr('transform', `translate(${innerWidth - 50}, 0)`)
    legend
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 10)
      .attr('height', 10)
      .style('fill', '#4169E1')
    legend
      .append('text')
      .text('全图数据')
      .attr('x', 15)
      .attr('y', 10)
      .attr('font-size', 12)
      .attr('fill', '#DDD')

    legend
      .append('rect')
      .attr('x', 0)
      .attr('y', 20)
      .attr('width', 10)
      .attr('height', 10)
      .style('fill', '#FF5733')

    legend
      .append('text')
      .text('火灾数据')
      .attr('x', 15)
      .attr('y', 30)
      .attr('font-size', 12)
      .attr('fill', '#DDD')
  }
)
</script>

<style scoped>
.factor-bg {
  position: absolute;
  width: 558px;
  height: 39.444vh;
  left: 1344px;
  top: 58.8vh;

  background: rgba(21, 27, 58, 0.5);
  border-radius: 5px;
}

.distribution-bg {
  position: absolute;
  width: 700px;
  height: 39.444vh;
  left: 632px;
  top: 58.8vh;

  background: rgba(21, 27, 58, 0.5);
  border-radius: 5px;
}
</style>
