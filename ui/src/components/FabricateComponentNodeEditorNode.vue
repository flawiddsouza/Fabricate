<template>
  <div style="border: 1px solid #ddd; padding: 1rem">
    <div>{{ modelValue.element }}</div>
    <template v-if="'slots' in modelValue">
      <template v-for="slot in Object.keys(modelValue.slots)">
        <div>{{ slot }}</div>
        <template v-for="slotItem in modelValue.slots[slot]">
          <FabricateComponentNodeEditorNode :modelValue="slotItem" />
        </template>
      </template>
    </template>
    <template v-for="node in modelValue.children">
      <FabricateComponentNodeEditorNode :modelValue="node" />
    </template>
  </div>
</template>

<script setup lang="ts">
import FabricateComponentNodeEditorNode from './FabricateComponentNodeEditorNode.vue'

defineProps<{
  modelValue: any
}>()
</script>
