<template>
  <div>
    <div>
      Select file to edit:
      <select v-model="selectedFile">
        <option v-for="file in directory.files" :value="file">
          {{ file.path }}
        </option>
      </select>
      <button @click="addComponent" style="margin-left: 0.5rem;">Add Component</button>
    </div>
    <div v-if="selectedFile && selectedFileJSON" style="margin-top: 1rem">
      <div v-if="selectedFile.path === 'manifest.json'">
        <div>
          <label>Name<br>
            <input type="text" v-model="selectedFileJSON.name" />
          </label>
        </div>
        <div style="margin-top: 1rem">
          <label>Description<br>
            <input type="text" v-model="selectedFileJSON.description" />
          </label>
        </div>
        <div style="margin-top: 1rem">
          <label>Version<br>
            <input type="text" v-model="selectedFileJSON.version" />
          </label>
        </div>
        <div style="margin-top: 1rem">
          <label>Root Component<br>
            <input type="text" v-model="selectedFileJSON.rootComponent" />
          </label>
        </div>
      </div>
      <div v-else>
        <FabricateComponentEditor v-model="selectedFileJSON" :key="selectedFile.path" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { DirectoryData } from './Home.vue'
import { readFileJSON, writeFileJSON, type FileEntry } from '../utils/fileSystem';
import FabricateComponentEditor from './FabricateComponentEditor.vue';

const props = defineProps<{
  directory: DirectoryData
}>()

const selectedFile = ref<FileEntry|null>(null)
const selectedFileJSON = ref<any>(null)

watch(() => selectedFile.value, async(file) => {
  if (file && file.path.endsWith('.json')) {
    selectedFileJSON.value = await readFileJSON(file)
  }
})

watch(() => selectedFileJSON.value, async() => {
  if (selectedFile.value) {
    if (selectedFileJSON.value) {
      await writeFileJSON(selectedFile.value, selectedFileJSON.value)
    }

    if (selectedFile.value.path === 'manifest.json') {
      props.directory.manifest = selectedFileJSON.value
    } else {
      const foundFile = props.directory.parsedFiles.find(parsedFile => parsedFile.file.path === selectedFile.value?.path)

      if (foundFile) {
        foundFile.content = JSON.parse(JSON.stringify(selectedFileJSON.value))

        props.directory.components[foundFile.content.name] = foundFile.content
      }
    }
  }
}, {
  deep: true
})

async function addComponent() {
  if (!props.directory.createComponent) return

  const name = prompt('Enter component name:')
  if (!name) return

  const success = await props.directory.createComponent(name)
  if (success) {
    alert(`Component "${name}" created successfully!`)
    // Select the newly created component in the editor
    const newFile = props.directory.files.find(file => file.path === `${name}.json`)
    if (newFile) {
      selectedFile.value = newFile
    }
  }
}

onMounted(() => {
  selectedFile.value = props.directory.files.find(file => file.path === 'manifest.json') || null
})
</script>
