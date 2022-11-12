<script setup lang='ts'>
const route = useRoute()
</script>

<template>
  <div class="mt-10 mb-6 prose m-auto opacity-50 flex">
    <span class="text-sm"><a target="_blank" href="https://creativecommons.org/licenses/by-nc-sa/4.0/" style="color:inherit">CC BY-NC-SA 4.0</a> 2022-PRESENT © GODLiangCY</span>
    <span v-if="route.path === '/'" text-sm> &nbsp;&nbsp;|&nbsp;&nbsp; <a target="_blank" href="https://beian.miit.gov.cn/" style="color:inherit">浙ICP备2021035264号-2</a> </span>
    <div class="flex-auto" />
  </div>
</template>

<style scoped>

</style>
