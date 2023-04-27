<template>
  <div class="bg">
    <header>场景筛选</header>
    <main>
      <div class="option">
        <input type="checkbox" id="checkedAll" v-model="checkedAll" @change="changeAllChecked" />
        <label for="checkedAll"> <span class="custom-icon"></span>全选 </label>
      </div>

      <div class="option" v-for="item in fireTypeList" :key="item">
        <input type="checkbox" :id="item" :value="item" v-model="store.fireTypes" />
        <label :for="item"> <span class="custom-icon"></span>{{ item }} </label>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useFireStore } from '@/stores/fire'
import { fireTypeList } from './types'
import { ref, watch } from 'vue'

const store = useFireStore()
const checkedAll = ref(true)

function changeAllChecked() {
  if (checkedAll.value) {
    store.fireTypes = fireTypeList
  } else {
    store.fireTypes = []
  }
}

watch(
  () => store.fireTypes,
  (fireTypes) => {
    checkedAll.value = fireTypes.length === fireTypeList.length
  }
)
</script>

<style scoped>
.bg {
  position: absolute;
  width: 200px;
  height: 326px;
  left: 1344px;
  top: 15px;

  background: rgba(21, 27, 58, 0.7);
  border-radius: 5px;

  padding: 20px 13px 10px 24px;
}

header {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-size: 18px;
  line-height: 22px;
  text-align: center;
  margin-bottom: 12px;
  color: #ffffff;
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

  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  color: #ffffff;
}

label span {
  flex-shrink: 0;
}

main {
  max-height: 252px; /* 设置一个适当的高度 */
  overflow-y: auto; /* 在需要时显示垂直滚动条 */
  padding-right: 7px; /* 防止滚动条与文字重叠 */
}

::-webkit-scrollbar {
  width: 6px; /* 设置滚动条的宽度 */
  background-color: #9daadd; /* 设置滚动条的背景颜色 */
  border-radius: 9px; /* 设置滚动条的圆角 */
}

::-webkit-scrollbar-thumb {
  background-color: #333977; /* 设置滚动条的前景颜色 */
  border-radius: 9px;
}
</style>
