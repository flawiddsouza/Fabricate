<template>
  <div>
    <ul class="editor-tabs">
      <li :class="{ active: activeTab === 'name' }" @click="activeTab = 'name'">Name</li>
      <li :class="{ active: activeTab === 'props' }" @click="activeTab = 'props'">Props</li>
      <li :class="{ active: activeTab === 'variables' }" @click="activeTab = 'variables'">Variables</li>
      <li :class="{ active: activeTab === 'computed' }" @click="activeTab = 'computed'">Computed</li>
      <li :class="{ active: activeTab === 'constants' }" @click="activeTab = 'constants'">Constants</li>
      <li :class="{ active: activeTab === 'nodes' }" @click="activeTab = 'nodes'">Nodes</li>
      <li :class="{ active: activeTab === 'script' }" @click="activeTab = 'script'">Script</li>
    </ul>

    <div v-if="activeTab === 'name'">
      <div>
        <label>Name<br>
          <input type="text" v-model="modelValue.name" />
        </label>
      </div>
    </div>

    <div v-else-if="activeTab === 'props'">
      <div style="margin-top: 1rem;">
        <label>Props (JSON)<br>
          <textarea v-model="propsJson"></textarea>
        </label>
      </div>
    </div>

    <div v-else-if="activeTab === 'variables'">
      <div style="margin-top: 1rem;">
        <label>Variables (JSON)<br>
          <textarea v-model="variablesJson"></textarea>
        </label>
      </div>
    </div>

    <div v-else-if="activeTab === 'computed'">
      <div style="margin-top: 1rem;">
        <label>Computed (JSON)<br>
          <textarea v-model="computedJson"></textarea>
        </label>
      </div>
    </div>

    <div v-else-if="activeTab === 'constants'">
      <div style="margin-top: 1rem;">
        <label>Constants (JSON)<br>
          <textarea v-model="constantsJson"></textarea>
        </label>
      </div>
    </div>

    <div v-else-if="activeTab === 'nodes'">
      <div style="margin-top: 1rem;">
        <FabricateComponentNodeEditor v-model="modelValue.nodes" />
        <button @click="handleAddNode">Add node</button>
      </div>
    </div>

    <div v-else-if="activeTab === 'script'">
      <div style="margin-top: 1rem;">
        <label>Script<br>
          <textarea v-model="modelValue.script"></textarea>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, computed, ref } from 'vue'
import FabricateComponentNodeEditor from './FabricateComponentNodeEditor.vue'

const props = defineProps<{
  modelValue: any
}>()

const emit = defineEmits(['update:modelValue'])

const activeTab = ref('name')

const variablesJson = computed({
  get: () => JSON.stringify(props.modelValue.variables, null, 2),
  set: (val) => {
    try {
      props.modelValue.variables = JSON.parse(val)
      emit('update:modelValue', { ...props.modelValue, variables: JSON.parse(val) })
    } catch (e) {
      console.error('Invalid JSON for variables', e)
    }
  }
})

const propsJson = computed({
  get: () => JSON.stringify(props.modelValue.props, null, 2),
  set: (val) => {
    try {
      props.modelValue.props = JSON.parse(val)
      emit('update:modelValue', { ...props.modelValue, props: JSON.parse(val) })
    } catch (e) {
      console.error('Invalid JSON for props', e)
    }
  }
})

const computedJson = computed({
  get: () => JSON.stringify(props.modelValue.computed, null, 2),
  set: (val) => {
    try {
      props.modelValue.computed = JSON.parse(val)
      emit('update:modelValue', { ...props.modelValue, computed: JSON.parse(val) })
    } catch (e) {
      console.error('Invalid JSON for computed', e)
    }
  }
})

const constantsJson = computed({
  get: () => JSON.stringify(props.modelValue.Constants, null, 2),
  set: (val) => {
    try {
      props.modelValue.Constants = JSON.parse(val)
      emit('update:modelValue', { ...props.modelValue, Constants: JSON.parse(val) })
    } catch (e) {
      console.error('Invalid JSON for Constants', e)
    }
  }
})

function handleAddNode() {
  if (!props.modelValue.nodes) {
    props.modelValue.nodes = []
  }
  props.modelValue.nodes.push({
    element: 'div',
    children: []
  })
  emit('update:modelValue', { ...props.modelValue })
}

watch(() => props.modelValue.name, (newVal) => {
  emit('update:modelValue', { ...props.modelValue, name: newVal })
})

watch(() => props.modelValue.script, (newVal) => {
  emit('update:modelValue', { ...props.modelValue, script: newVal })
})
</script>

<style scoped>
textarea {
  width: 100%;
  height: 15rem;
  font-family: monospace;
  resize: vertical;
}

.editor-tabs {
  display: flex;
  list-style: none;
  padding: 0;
}
.editor-tabs li {
  margin-right: 1rem;
  cursor: pointer;
}
.editor-tabs li.active {
  font-weight: bold;
}
</style>
