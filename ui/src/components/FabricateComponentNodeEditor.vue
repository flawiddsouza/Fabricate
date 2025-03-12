<template>
  <div class="fabricate-editor-container">
    <template v-for="(node, index) in modelValue" :key="index">
      <FabricateComponentNodeEditorNode
        :modelValue="node"
        :depth="0"
        @removeNode="modelValue.splice(index, 1)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import FabricateComponentNodeEditorNode from './FabricateComponentNodeEditorNode.vue'

defineProps<{
  modelValue: any
}>()
</script>

<style scoped>
.fabricate-editor-container {
  width: 60rem;
}
</style>
