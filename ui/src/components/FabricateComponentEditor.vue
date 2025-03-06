<template>
  <div>
    <div>
      <label>Name<br>
        <input type="text" v-model="modelValue.name" />
      </label>
    </div>

    <div style="margin-top: 1rem;">
      <label>Props (JSON)<br>
        <textarea v-model="propsJson" style="width: 100%; height: 100px;"></textarea>
      </label>
    </div>

    <div style="margin-top: 1rem;">
      <label>Variables (JSON)<br>
        <textarea v-model="variablesJson" style="width: 100%; height: 200px;"></textarea>
      </label>
    </div>

    <div style="margin-top: 1rem;">
      <label>Computed (JSON)<br>
        <textarea v-model="computedJson" style="width: 100%; height: 100px;"></textarea>
      </label>
    </div>

    <div style="margin-top: 1rem;">
      <label>Constants (JSON)<br>
        <textarea v-model="constantsJson" style="width: 100%; height: 100px;"></textarea>
      </label>
    </div>

    <div style="margin-top: 1rem;">
      <label>Nodes (JSON)<br>
        <textarea v-model="nodesJson" style="width: 100%; height: 300px;"></textarea>
      </label>
    </div>

    <div style="margin-top: 1rem;">
      <label>Script<br>
        <textarea v-model="modelValue.script" style="width: 100%; height: 200px;"></textarea>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, computed } from 'vue'

const props = defineProps<{
  modelValue: any
}>()

const emit = defineEmits(['update:modelValue'])

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

const nodesJson = computed({
  get: () => JSON.stringify(props.modelValue.nodes, null, 2),
  set: (val) => {
    try {
      props.modelValue.nodes = JSON.parse(val)
      emit('update:modelValue', { ...props.modelValue, nodes: JSON.parse(val) })
    } catch (e) {
      console.error('Invalid JSON for nodes', e)
    }
  }
})

watch(() => props.modelValue.name, (newVal) => {
  emit('update:modelValue', { ...props.modelValue, name: newVal })
})

watch(() => props.modelValue.script, (newVal) => {
  emit('update:modelValue', { ...props.modelValue, script: newVal })
})
</script>

