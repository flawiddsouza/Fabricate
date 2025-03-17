<template>
  <div class="fabricate-node-container" :class="[`depth-${depth}`, { 'is-collapsed': collapsed }]">
    <div class="node-header" @click="toggleCollapsed">
      <span class="node-type">{{ modelValue.element || 'Node' }}</span>
      <div class="node-controls">
        <button class="expand-collapse-button" @click.stop="toggleCollapsed">
          {{ collapsed ? '+' : '–' }}
        </button>
        <button class="remove-node" @click.stop="handleRemoveNode">✕</button>
      </div>
    </div>

    <div v-if="!collapsed" class="node-content">
      <div class="node-properties">
        <div class="property-group">
          <label>Element
            <input
              type="text"
              v-model="modelValue.element"
              list="supported-elements"
            >
          </label>
          <datalist id="supported-elements">
            <option
              v-for="element in supportedElements"
              :value="element"
            />
          </datalist>
        </div>
        <div class="property-group">
          <label>Ref
            <input
              type="text"
              v-model="modelValue.ref"
              @input="handlePropInput('ref')"
            >
          </label>
        </div>
        <div class="property-group">
          <label>Style
            <input
              type="text"
              v-model="modelValue.style"
              @input="handlePropInput('style')"
            >
          </label>
        </div>
        <div class="property-group">
          <label>For Each
            <input
              type="text"
              v-model="modelValue.vFor"
              @input="handlePropInput('vFor')"
            >
          </label>
        </div>
        <div class="property-group">
          <label>If
            <input
              type="text"
              v-model="modelValue.vIf"
              @input="handlePropInput('vIf')"
            >
          </label>
        </div>
        <div class="property-group">
          <label>Props (JSON)<br>
            <textarea v-model="propsJson" class="props-json"></textarea>
          </label>
          <button @click="savePropsJson" style="margin-top: 0.5rem;">Save Props</button>
          <div v-if="propsJsonError" class="error-message">{{ propsJsonError }}</div>
        </div>
        <div v-if="modelValue.element === 'input' || modelValue.element === 'select'" class="property-group">
          <label>Model
            <input
              type="text"
              v-model="modelValue.vModel"
              @input="handlePropInput('vModel')"
            >
          </label>
        </div>
        <div v-if="supportedProps[modelValue.element]" class="property-group">
          <div v-for="prop in Object.keys(supportedProps[modelValue.element])">
            <label>{{ supportedProps[modelValue.element][prop].label }}
              <input
                v-if="supportedProps[modelValue.element][prop].input === 'input-text'"
                type="text"
                v-model="modelValue[prop]"
                @input="handlePropInput(prop)"
              >
            </label>
          </div>
        </div>
        <div v-if="modelValue.element === 'button' || (modelValue.element === 'form' && modelValue.on)" class="property-group">
          <div v-for="handlerName in Object.keys(modelValue.on || {})" :key="handlerName" style="margin-top: 0.5rem;">
            <label>Event
              <input
                type="text"
                v-model="handlerNames[handlerName]"
                @blur="renameEventHandler(handlerName, handlerNames[handlerName])"
              >
            </label>
            <label style="margin-left: 0.5rem;">Expression
              <input
                type="text"
                v-model="modelValue.on[handlerName]"
              >
            </label>
            <button @click="removeEventHandler(handlerName)" style="margin-left: 0.5rem;">Remove</button>
          </div>
          <button @click="addEventHandler" style="margin-top: 0.5rem;">Add Event Handler</button>
        </div>
      </div>

      <div v-if="slotStructure[modelValue.element]" class="slots-container">
        <div v-for="slot in slotStructure[modelValue.element]" class="slot-group">
          <div class="slot-header">Slot: {{ slot }}</div>
          <div class="slot-content">
            <template v-for="(slotItem, slotItemIndex) in modelValue.slots[slot]" :key="slotItemIndex">
              <FabricateComponentNodeEditorNode
                :modelValue="slotItem"
                :depth="depth + 1"
                @removeNode="removeSlotChildNode(slot, slotItemIndex)"
              />
            </template>
            <button class="add-node-btn" @click="handleAddNodeSlot(slot)">Add Node to Slot</button>
          </div>
        </div>
      </div>

      <div v-if="modelValue.children && modelValue.children.length > 0" class="children-container">
        <div class="children-header">Children</div>
        <div class="children-content">
          <template v-for="(node, idx) in modelValue.children" :key="idx">
            <FabricateComponentNodeEditorNode
              :modelValue="node"
              :depth="depth + 1"
              @removeNode="removeChildNode(idx)"
            />
          </template>
        </div>
      </div>

      <div class="actions" v-if="!addNodeDisallowed.includes(modelValue.element)">
        <button class="add-node-btn" @click="handleAddNode">Add Child Node</button>
      </div>
    </div>

    <div v-else class="collapsed-info">
      <span v-if="modelValue.text" class="collapsed-text">"{{ truncateText(modelValue.text, 20) }}"</span>
      <span v-if="hasChildren" class="collapsed-children-count">({{ childrenCount }} {{ childrenCount === 1 ? 'child' : 'children' }})</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import FabricateComponentNodeEditorNode from './FabricateComponentNodeEditorNode.vue'

const props = defineProps<{
  modelValue: any,
  depth?: number
}>()

const emit = defineEmits(['removeNode'])

const depth = computed(() => props.depth || 0)
const hasChildren = computed(() => {
  return (props.modelValue.children?.length > 0) ||
         (Object.values(props.modelValue.slots || {}).some((slot: any) => slot.length > 0));
})

const childrenCount = computed(() => {
  let count = props.modelValue.children?.length || 0;
  if (props.modelValue.slots) {
    Object.values(props.modelValue.slots).forEach((slot: any) => {
      count += slot.length || 0;
    });
  }
  return count;
})

const supportedElements = [
  'text',
  'div',
  'span',
  'button',
  'input',
  'select',
  'option',
  'form',
  'template',
  'AppFrame',
  'PlayersContainer',
  'PlayerFrame',
]

const supportedProps: any = {
  option: {
    text: {
      label: 'Option Text',
      input: 'input-text'
    },
    'value': {
      label: 'Option Value',
      input: 'input-text'
    },
    ':value': {
      label: 'Option :Value',
      input: 'input-text'
    }
  },
  div: {
    text: {
      label: 'Text',
      input: 'input-text'
    },
  },
  text: {
    text: {
      label: 'Text',
      input: 'input-text'
    },
  },
  span: {
    text: {
      label: 'Text',
      input: 'input-text'
    },
  },
  button: {
    text: {
      label: 'Text',
      input: 'input-text'
    },
  },
  input: {
    type: {
      label: 'Input Type',
      input: 'input-text'
    },
    placeholder: {
      label: 'Placeholder',
      input: 'input-text'
    },
    required: {
      label: 'Required',
      input: 'input-text'
    }
  }
}

const addNodeDisallowed = [
  'input',
  'option',
  'button',
  'text',
]

const slotStructure: any = {
  AppFrame: ['top', 'bottom'],
  PlayersContainer: ['default'],
  PlayerFrame: ['1-left', '1-right', '2', '3']
}

const handlerNames = ref<any>({})

const collapsed = ref(true)

const propsJson = ref('')
const propsJsonError = ref('')

onMounted(() => {
  if (props.modelValue.on) {
    for (const name in props.modelValue.on) {
      handlerNames.value[name] = name
    }
  }

  if (props.modelValue.props) {
    propsJson.value = JSON.stringify(props.modelValue.props, null, 2)
  }
})

watch(() => props.modelValue.props, (newVal) => {
  if (newVal) {
    propsJson.value = JSON.stringify(newVal, null, 2)
  } else {
    propsJson.value = ''
  }
}, { deep: true })

function handlePropInput(prop: string) {
  // Remove prop if empty
  if (props.modelValue[prop] === '') {
    delete props.modelValue[prop]
  }
}

function handleAddNode() {
  if (!props.modelValue.children) {
    props.modelValue.children = []
  }
  props.modelValue.children.push({
    element: 'div'
  })
}

function handleRemoveNode() {
  if (!confirm('Are you sure you want to remove this node?')) {
    return
  }
  emit('removeNode')
}

function removeChildNode(index: number) {
  props.modelValue.children.splice(index, 1)
}

function removeSlotChildNode(slotName: string, index: number) {
  props.modelValue.slots[slotName].splice(index, 1)
}

function addEventHandler() {
  if (!props.modelValue.on) {
    props.modelValue.on = {}
  }
  const newHandlerName = 'click'
  if (!props.modelValue.on[newHandlerName]) {
    props.modelValue.on[newHandlerName] = ''
  } else {
    let i = 1
    let uniqueName = `${newHandlerName}_${i}`
    while (props.modelValue.on[uniqueName]) {
      i++
      uniqueName = `${newHandlerName}_${i}`
    }
    props.modelValue.on[uniqueName] = ''
  }
}

function removeEventHandler(handlerName: string) {
  delete props.modelValue.on[handlerName]
}

function renameEventHandler(oldName: string, newName: string) {
  if (newName && newName !== oldName) {
    props.modelValue.on[newName] = props.modelValue.on[oldName]
    delete props.modelValue.on[oldName]
    handlerNames.value[newName] = newName
    delete handlerNames.value[oldName]
  }
}

function handleAddNodeSlot(slotName: string) {
  props.modelValue.slots[slotName].push({
    element: 'div'
  })
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value
}

function savePropsJson() {
  try {
    if (propsJson.value === '') {
      delete props.modelValue.props
      return
    }

    const parsed = JSON.parse(propsJson.value)
    props.modelValue.props = parsed
    propsJsonError.value = ''
  } catch (e) {
    propsJsonError.value = 'Invalid JSON format'
    console.error('Invalid JSON for props', e)
  }
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  return text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`;
}
</script>

<style scoped>
.fabricate-node-container {
  border: 1px solid #ddd;
  padding: 0;
  margin: 0.5rem 0;
  border-radius: 6px;
  background-color: #ffffff;
  transition: box-shadow 0.2s;
  position: relative;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  overflow: hidden;
}

.fabricate-node-container:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.node-header {
  padding: 0.5rem;
  background-color: #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
}

.node-type {
  font-weight: bold;
  color: #333;
}

.node-controls {
  display: flex;
  gap: 0.25rem;
}

.node-content {
  padding: 0.75rem;
}

.node-properties {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.property-group {
  margin-bottom: 0.5rem;
}

.children-container, .slots-container {
  margin-top: 1rem;
  border-top: 1px dashed #ccc;
  padding-top: 0.75rem;
}

.children-header, .slot-header {
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #555;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.children-content, .slot-content {
  padding-left: 1rem;
  border-left: 2px solid #e0e0e0;
  margin-left: 0.5rem;
}

.slot-group {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: #f9f9f9;
  border-radius: 4px;
}

input, textarea, select {
  border: 1px solid #d2d2d2;
  padding: 0.4rem;
  border-radius: 4px;
  width: 100%;
  margin-top: 0.25rem;
}

input:focus, textarea:focus, select:focus {
  border: 1px solid #0078d4;
  outline: 0;
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
}

.remove-node {
  background-color: #ff4d4f;
  color: #fff;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.expand-collapse-button {
  background-color: #0078d4;
  color: #fff;
  border: none;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  width: 24px;
}

.props-json {
  width: 100%;
  height: 100px;
  font-family: monospace;
  resize: vertical;
}

.error-message {
  color: red;
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.add-node-btn {
  background-color: #52c41a;
  color: white;
  border: none;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 0.5rem;
  font-size: 0.85rem;
}

.actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-start;
}

.collapsed-info {
  padding: 0.5rem;
  font-style: italic;
  color: #777;
  display: flex;
  gap: 0.5rem;
}

.collapsed-text {
  font-family: monospace;
}

.collapsed-children-count {
  color: #0078d4;
}

/* Depth-based styling */
.depth-0 {
  background-color: #ffffff;
  border-color: #d0d0d0;
}

.depth-1 {
  background-color: #f9f9f9;
  border-color: #d8d8d8;
}

.depth-2 {
  background-color: #f0f5ff;
  border-color: #d6e4ff;
}

.depth-3 {
  background-color: #f6ffed;
  border-color: #d9f7be;
}

.depth-4, .depth-5, .depth-6 {
  background-color: #fff7e6;
  border-color: #ffe7ba;
}

.is-collapsed {
  border-left: 3px solid #0078d4;
}
</style>
