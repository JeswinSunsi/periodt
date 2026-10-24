<script setup>
import { useRouter } from "vue-router";
import CycleDetail from "../components/CycleDetail.vue";
import { useCheckin } from "../composables/useCheckin.js";
import { useDialog } from "../composables/useDialog.js";

const { openLog } = useCheckin();
const { openDialog } = useDialog();
const router = useRouter();
</script>

<template>
  <CycleDetail
    @log="(date) => openLog(date)"
    @settings="openDialog('settings')"
    @calendar="router.push({ name: 'Overview' })"
  />
</template>
