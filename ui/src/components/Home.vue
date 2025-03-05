<template>
  <div class="home-container">
    <div>
      <button @click="handleOpenDirectory">Open Directory</button>
    </div>

    <div v-if="files.length">
      <h3>{{ directoryPath }} ({{ files.length }}):</h3>
      <ul>
        <li v-for="(file, index) in files" :key="index">
          {{ file.path }} - {{ formatSize(file.file.size) }}
        </li>
      </ul>
    </div>

    <div v-if="parsedFiles.length" style="margin-bottom: 1rem;">
      <button @click="renderComponent = !renderComponent">
        <template v-if="renderComponent">Hide</template>
        <template v-else>Show</template>
      </button>
    </div>

    <div v-if="renderComponent">
      <FabricateComponent :components="components" :root-component="manifest.rootComponent" :props="{}" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  openDirectory,
  formatSize,
  type FileEntry,
  readFileJSON
} from '../utils/fileSystem'
import FabricateComponent from './FabricateComponent.vue'

const files = ref<FileEntry[]>([])
const parsedFiles = ref<{
  file: FileEntry
  content: any
}[]>([])
const directoryHandle = ref<FileSystemDirectoryHandle | null>(null)
const directoryPath = ref<string>('')
const components = ref<any>({})
const manifest = ref<any>({})
const renderComponent = ref(false)

async function handleOpenDirectory() {
  try {
    const result = await openDirectory()
    directoryHandle.value = result.directoryHandle
    directoryPath.value = result.directoryHandle?.name ?? ''
    files.value = result.files
    components.value = {}
    manifest.value = {}
    renderComponent.value = false

    for (const file of files.value) {
      parsedFiles.value.push({
        file,
        content: await readFileJSON(file)
      })
    }

    for (const parsedFile of parsedFiles.value) {
      if (parsedFile.file.path !== 'manifest.json') {
        components.value[parsedFile.content.name] = parsedFile.content
      } else {
        manifest.value = parsedFile.content
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      alert(`Error opening directory: ${error.message}`)
    }
  }
}
</script>

<style scoped>
.home-container {
  font-family: sans-serif;
  margin: 1rem;
}
</style>
