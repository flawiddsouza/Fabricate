<template>
  <template v-for="node in modelValue">
    <FabricateComponentNodeEditorNode :modelValue="node" />
  </template>
</template>

<script setup lang="ts">
import FabricateComponentNodeEditorNode from './FabricateComponentNodeEditorNode.vue'

defineProps<{
  modelValue: any
}>()
</script>
