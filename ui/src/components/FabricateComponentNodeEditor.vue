<template>
  <template v-for="(node, index) in modelValue" :key="index">
    <FabricateComponentNodeEditorNode
      :modelValue="node"
      @removeNode="modelValue.splice(index, 1)"
    />
  </template>
</template>

<script setup lang="ts">
import FabricateComponentNodeEditorNode from './FabricateComponentNodeEditorNode.vue'

defineProps<{
  modelValue: any
}>()
</script>
