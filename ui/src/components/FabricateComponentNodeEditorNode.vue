<template>
  <div class="fabricate-node-container">
    <button class="remove-node" @click="handleRemoveNode">X</button>
    <button class="expand-collapse-button" @click="toggleCollapsed">
      {{ collapsed ? '+' : '–' }}
    </button>
    <div v-if="!collapsed">
      <div>
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
      <div>
        <label>Ref
          <input
            type="text"
            v-model="modelValue.ref"
            @input="handlePropInput('ref')"
          >
        </label>
      </div>
      <div>
        <label>Style
          <input
            type="text"
            v-model="modelValue.style"
            @input="handlePropInput('style')"
          >
        </label>
      </div>
      <div>
        <label>For Each
          <input
            type="text"
            v-model="modelValue.vFor"
            @input="handlePropInput('vFor')"
          >
        </label>
      </div>
      <div>
        <label>If
          <input
            type="text"
            v-model="modelValue.vIf"
            @input="handlePropInput('vIf')"
          >
        </label>
      </div>
      <div>
        <label>Props (JSON)<br>
          <textarea v-model="propsJson" class="props-json"></textarea>
        </label>
        <button @click="savePropsJson" style="margin-top: 0.5rem;">Save Props</button>
        <div v-if="propsJsonError" class="error-message">{{ propsJsonError }}</div>
      </div>
      <div v-if="modelValue.element === 'input' || modelValue.element === 'select'">
        <label>Model
          <input
            type="text"
            v-model="modelValue.vModel"
            @input="handlePropInput('vModel')"
          >
        </label>
      </div>
      <div v-if="supportedProps[modelValue.element]">
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
      <div v-if="modelValue.element === 'button' || (modelValue.element === 'form' && modelValue.on)">
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
      <div v-if="slotStructure[modelValue.element]">
        <div v-for="slot in slotStructure[modelValue.element]" style="margin-top: 0.5rem;">
          <div>Slot: {{ slot }}</div>
          <template v-for="(slotItem, slotItemIndex) in modelValue.slots[slot]" :key="slotItemIndex">
            <FabricateComponentNodeEditorNode
              :modelValue="slotItem"
              @removeNode="removeSlotChildNode(slot, slotItemIndex)"
            />
          </template>
          <button @click="handleAddNodeSlot(slot)" style="margin-top: 0.5rem;">Add Node</button>
        </div>
      </div>
      <template v-for="(node, idx) in modelValue.children" :key="idx">
        <FabricateComponentNodeEditorNode
          :modelValue="node"
          @removeNode="removeChildNode(idx)"
        />
      </template>
      <div style="margin-top: 0.5rem;" v-if="!addNodeDisallowed.includes(modelValue.element)">
        <button @click="handleAddNode">Add Node</button>
      </div>
    </div>
    <div v-else style="font-style: italic; margin-top: 1rem;">
      Collapsed: {{ modelValue.element }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import FabricateComponentNodeEditorNode from './FabricateComponentNodeEditorNode.vue'

const props = defineProps<{
  modelValue: any
}>()

const emit = defineEmits(['removeNode'])

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
  if (!confirm('Are you sure you want to remove this node?')) {
    return
  }
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
</script>

<style scoped>
input {
  border: 1px solid #d2d2d2;
  padding: 0.2rem;
}

input:focus {
  border: 1px solid #0078d4;
  outline: 0;
}

.fabricate-node-container {
  border: 1px solid #ddd;
  padding: 1rem;
  margin-top: 0.5rem;
  display: inline-block;
  border-radius: 6px;
  background-color: #f9f9f9;
  transition: box-shadow 0.2s;
  position: relative;
}

.fabricate-node-container:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.remove-node {
  position: absolute;
  top: 0;
  right: 0;
  background-color: red;
  color: #fff;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}

.expand-collapse-button {
  position: absolute;
  top: 0;
  right: 2rem;
  background-color: #0078d4;
  color: #fff;
  border: none;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  cursor: pointer;
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
</style>
