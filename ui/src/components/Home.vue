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

    <div v-if="canRenderComponent" style="margin-bottom: 1rem;">
      <button @click="renderComponent = !renderComponent">
        <template v-if="renderComponent">Hide</template>
        <template v-else>Show</template>
      </button>
    </div>

    <div v-if="shouldRenderComponent">
      <FabricateComponent :components="components" :root-component="manifest.rootComponent" :props="{}" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import {
  openDirectory,
  formatSize,
  type FileEntry,
  readFileJSON,
  getFilesFromDirectory
} from '../utils/fileSystem'
import FabricateComponent from './FabricateComponent.vue'
import { get, set } from 'idb-keyval'

const files = ref<FileEntry[]>([])
const parsedFiles = ref<{
  file: FileEntry
  content: any
}[]>([])
const directoryHandle = ref<FileSystemDirectoryHandle | null>(null)
const components = ref<any>({})
const manifest = ref<any>({})
const renderComponent = ref(false)

const directoryPath = computed(() => directoryHandle.value?.name ?? '')
const canRenderComponent = computed(() => Object.keys(components.value).length && Object.keys(manifest.value).length)
const shouldRenderComponent = computed(() => renderComponent.value && canRenderComponent.value)

function reset() {
  components.value = {}
  manifest.value = {}
  renderComponent.value = false
  parsedFiles.value = []
}

async function saveDirectoryHandle() {
  if (directoryHandle.value) {
    await set('directoryHandle', directoryHandle.value)
  }
}

async function loadDirectoryHandle() {
  const savedHandle = await get('directoryHandle')
  if (savedHandle) {
    directoryHandle.value = savedHandle
  }
}

async function handleAfterDirectoryOpen() {
  reset()

  for (const file of files.value) {
    try {
      parsedFiles.value.push({
        file,
        content: await readFileJSON(file)
      })
    } catch {
      // we ignore if json parsing fails
    }
  }

  for (const parsedFile of parsedFiles.value) {
    if (parsedFile.file.path !== 'manifest.json') {
      components.value[parsedFile.content.name] = parsedFile.content
    } else {
      manifest.value = parsedFile.content
    }
  }
}

async function handleOpenDirectory() {
  try {
    const result = await openDirectory()
    directoryHandle.value = result.directoryHandle
    files.value = result.files
    saveDirectoryHandle()
    await handleAfterDirectoryOpen()
  } catch (error) {
    if (error instanceof Error) {
      alert(`Error opening directory: ${error.message}`)
    }
  }
}

onMounted(async() => {
  await loadDirectoryHandle()
  if (directoryHandle.value) {
    files.value = await getFilesFromDirectory(directoryHandle.value)
    await handleAfterDirectoryOpen()
  }
})
</script>

<style scoped>
.home-container {
  font-family: sans-serif;
  margin: 1rem;
}
</style>
