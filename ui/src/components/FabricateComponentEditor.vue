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
        <button @click="savePropsJson" style="margin-top: 0.5rem;">Save Props</button>
      </div>
    </div>

    <div v-else-if="activeTab === 'variables'">
      <div style="margin-top: 1rem;">
        <label>Variables (JSON)<br>
          <textarea v-model="variablesJson"></textarea>
        </label>
        <button @click="saveVariablesJson" style="margin-top: 0.5rem;">Save Variables</button>
      </div>
    </div>

    <div v-else-if="activeTab === 'computed'">
      <div style="margin-top: 1rem;">
        <div v-for="entry in computedKeys" :key="entry.oldKey" style="margin-top: 1rem;">
          <label>Property
            <input
              type="text"
              v-model="entry.label"
            />
          </label>
          <button @click="renameComputed(entry.oldKey, entry.label)" style="margin-left: 0.5rem;">Rename</button>
          <div style="margin-top: 0.5rem;">
            <label>Script</label><br>
            <textarea v-model="modelValue.computed[entry.oldKey]" rows="5"></textarea>
          </div>
          <button @click="removeComputed(entry.oldKey)" style="margin-top: 0.5rem;">Remove</button>
        </div>
        <button @click="addComputed" style="margin-top: 0.5rem;">Add Computed</button>
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
import { watch, computed, ref, onMounted } from 'vue'
import FabricateComponentNodeEditor from './FabricateComponentNodeEditor.vue'

const props = defineProps<{
  modelValue: any
}>()

const emit = defineEmits(['update:modelValue'])

const activeTab = ref('name')

const variablesJson = ref(JSON.stringify(props.modelValue.variables, null, 2))
const propsJson = ref(JSON.stringify(props.modelValue.props, null, 2))

watch(() => props.modelValue.variables, (newVal) => {
  variablesJson.value = JSON.stringify(newVal, null, 2)
}, { deep: true })

watch(() => props.modelValue.props, (newVal) => {
  propsJson.value = JSON.stringify(newVal, null, 2)
}, { deep: true })

function saveVariablesJson() {
  try {
    props.modelValue.variables = JSON.parse(variablesJson.value)
    emit('update:modelValue', { ...props.modelValue, variables: JSON.parse(variablesJson.value) })
  } catch (e) {
    console.error('Invalid JSON for variables', e)
  }
}

function savePropsJson() {
  try {
    props.modelValue.props = JSON.parse(propsJson.value)
    emit('update:modelValue', { ...props.modelValue, props: JSON.parse(propsJson.value) })
  } catch (e) {
    console.error('Invalid JSON for props', e)
  }
}

type ComputedEntry = { oldKey: string; label: string }
const computedKeys = ref<ComputedEntry[]>([])

onMounted(() => {
  for (const k in props.modelValue.computed) {
    computedKeys.value.push({ oldKey: k, label: k })
  }
})

const skipComputedKeysWatch = ref(false)

watch(() => props.modelValue.computed, (newVal) => {
  if (skipComputedKeysWatch.value) {
    return
  }

  computedKeys.value = []

  for (const k in newVal) {
    computedKeys.value.push({ oldKey: k, label: k })
  }
}, { immediate: true })

function renameComputed(oldKey: string, newKey: string) {
  if (newKey && newKey !== oldKey) {
    skipComputedKeysWatch.value = true
    props.modelValue.computed[newKey] = props.modelValue.computed[oldKey]
    delete props.modelValue.computed[oldKey]
    const entry = computedKeys.value.find(e => e.oldKey === oldKey)
    if (entry) entry.oldKey = newKey
    skipComputedKeysWatch.value = false
  }
}

function removeComputed(key: string) {
  if (!confirm('Are you sure you want to remove this computed property?')) {
    return
  }

  delete props.modelValue.computed[key]
  computedKeys.value = computedKeys.value.filter(e => e.oldKey !== key)
}

function addComputed() {
  if (!props.modelValue.computed) {
    props.modelValue.computed = {}
  }

  let newKey = 'newComputed'
  let i = 1
  while (props.modelValue.computed[newKey]) {
    newKey = `newComputed${i++}`
  }
  props.modelValue.computed[newKey] = ''
  computedKeys.value.push({ oldKey: newKey, label: newKey })
}

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
    element: 'div'
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
