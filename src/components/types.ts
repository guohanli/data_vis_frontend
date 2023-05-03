import * as d3 from 'd3'

export interface FireItem {
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

export interface CsvItem {
  [key: string]: string
}

export interface Counts {
  [key: string]: number
}

export interface LineDataItem {
  date: Date
  count: number
}

export interface PieDataItem {
  name: string
  value: number
}

export const fireTypeList = [
  '办公场所',
  '厂房',
  '学校',
  '居住场所',
  '其他',
  '商业场所',
  '公共娱乐场所',
  '纯餐饮场所',
  '石油化工企业',
  '轿车',
  '物资仓储场所',
  '工地',
  '宾馆、饭店、招待所',
  '通信场所',
  '货车',
  '汽车库',
  '垃圾堆',
  '交通枢纽（站）',
  '客车',
  '公园',
  '露天农副业场所',
  '加油加气站充电站',
  '宗教场所',
  '金融交易场所',
  '医疗机构',
  '养老院',
  '露天堆垛',
  '室外集贸市场',
  '科研试验场所',
  '室内农副业场所',
  '特种车',
  '城市轨道交通工具',
  '体育场馆',
  '文物古建筑',
  '会议、展览中心',
  '船舶',
  '道路绿化带、隔离带',
  '室外独立生产设施设备',
  '电动助力车（三轮车、自行车）',
  '垃圾箱',
  '森林',
  '废品回收场所',
  '修车库',
  '摩托车',
  '垃圾场',
  '文博馆（图书馆、博物馆、档案馆等）'
]

// 设置色彩盘, 最多有46种火灾类型，所以需要拼接一下色彩盘
export const color = d3
  .scaleOrdinal()
  .domain(fireTypeList)
  .range([
    ...d3.schemeDark2,
    ...d3.schemeSet1,
    ...d3.schemeSet2,
    ...d3.schemeSet3,
    ...d3.schemeCategory10,
    ...d3.schemeTableau10
  ])

export interface FireLocation {
  fire_code: number
  fire_lat: number
  fire_lng: number
  station_code: string
  battle_type: string
  fire_type: string
}

export interface FireStation {
  station_code: string
  station_lat: number
  station_lng: number
  task_count?: number
}

export interface GridData {
  topLeft: [number, number]
  bottomRight: [number, number]
  fireCount: number
  totalDistance: number
  stationCount: number
  risk: number
  reinforcementCount: number
}
