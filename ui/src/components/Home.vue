<template>
  <div class="home-container" v-if="!dedicatedMode">
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

      <button @click="openInDedicatedMode" style="margin-left: 1rem;">
        Open in Dedicated Mode
      </button>
    </div>

    <div v-if="shouldRenderComponent">
      <FabricateComponent :components="components" :root-component="manifest.rootComponent" :props="{}" />
    </div>
  </div>
  <div v-if="dedicatedMode && shouldRenderComponent">
    <FabricateComponent v-if="dedicatedMode" :components="components" :root-component="manifest.rootComponent" :props="{}" />
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
const dedicatedMode = ref(false)

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

function openInDedicatedMode() {
  document.location.search = 'dedicated=true'
}

onMounted(async() => {
  await loadDirectoryHandle()
  if (directoryHandle.value) {
    files.value = await getFilesFromDirectory(directoryHandle.value)
    await handleAfterDirectoryOpen()
  }

  if (document.location.search.includes('dedicated=true')) {
    renderComponent.value = true
    dedicatedMode.value = true
  }
})
</script>

<style scoped>
.home-container {
  font-family: sans-serif;
  margin: 1rem;
}
</style>
