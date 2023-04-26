<template>
  <div class="title-bg">
    <span class="title">智慧消防</span>
    <span class="sub-title">可视化分析系统</span>
  </div>

  <div class="location-bg">
    <span class="country">中国</span>
    <span class="city">杭州市</span>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.title-bg {
  position: absolute;
  width: 208px;
  height: 27.6852vh;
  left: -42px;
  top: 33.6111vh;

  background: linear-gradient(267.18deg, rgba(66, 74, 113, 0.7) 2.51%, rgba(66, 74, 113, 0) 65.21%);
  border-radius: 41px;
}

.title {
  /* 智慧消防 */

  position: absolute;
  width: 29px;
  height: 24.537vh;
  left: 94px;
  top: 3.148148vh;

  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  font-size: 4.17vh;
  line-height: 4.907vh;
  text-align: center;

  color: #ffffff;
}

.sub-title {
  /* 可视化分析系统 */

  position: absolute;
  width: 29px;
  height: 18.148vh;
  padding-left: 1vh;
  left: 144px;
  top: 4vh;

  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  font-size: 2.3148vh;
  line-height: 2.59259vh;
  text-align: center;

  color: #a8a6f7;
}

.location-bg {
  position: absolute;
  width: 166px;
  height: 9.444vh;
  left: 0px;
  top: 63.241vh;

  background: linear-gradient(267.18deg, rgba(66, 74, 113, 0.7) 2.51%, rgba(66, 74, 113, 0) 65.21%);
  border-radius: 41px;
}

.country {
  /* 中国 */

  position: absolute;
  width: 82px;
  height: 23px;
  left: 42px;
  top: 1.38888vh;

  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  font-size: 20px;
  line-height: 23px;
  text-align: center;

  color: #968adc;
}

.city {
  /* 杭州市 */

  position: absolute;
  width: 82px;
  height: 29px;
  left: 44px;
  top: 4.814814vh;

  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  font-size: 25px;
  line-height: 29px;
  text-align: center;

  color: #ffffff;
}
</style>
