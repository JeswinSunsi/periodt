<script setup>
import { useRouter } from "vue-router";
import CycleDetail from "../components/CycleDetail.vue";
import { useCheckin } from "../composables/useCheckin.js";

const { openLog } = useCheckin();
const router = useRouter();
</script>

<template>
  <CycleDetail
    @log="(date) => openLog(date)"
    @calendar="router.push({ name: 'Overview' })"
  />
</template>
