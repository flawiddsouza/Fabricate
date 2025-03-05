<template>
  <div class="home-container" v-if="loaded && !dedicatedMode">
    <div>
      <button @click="handleOpenDirectory">Open Directory</button>
    </div>

    <div v-if="directories.length" class="directories-list">
      <h3>Open Directories:</h3>
      <div v-for="(dir, index) in directories" :key="index" class="directory-item"
        :class="{ 'active-directory': activeDirectoryIndex === index }" @click="setActiveDirectory(index)">
        <div class="directory-header">
          <span class="directory-name">{{ dir.name }}</span>
          <span class="directory-file-count">({{ dir.files.length }} files)</span>
          <button class="remove-directory-btn" @click.stop="removeDirectory(index)">✕</button>
        </div>
        <div v-if="showDetails && activeDirectoryIndex === index" class="directory-files">
          <ul>
            <li v-for="(file, fIndex) in dir.files" :key="fIndex">
              {{ file.path }} - {{ formatSize(file.file.size) }}
            </li>
          </ul>
        </div>
      </div>
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

    <div v-if="shouldRenderComponent && activeDirectory">
      <FabricateComponent :key="activeDirectoryIndex" :components="activeDirectory.components" :root-component="activeDirectory.manifest.rootComponent" :props="{}" />
    </div>
  </div>
  <div v-if="loaded && dedicatedMode && shouldRenderComponent && activeDirectory">
    <FabricateComponent v-if="dedicatedMode" :components="activeDirectory.components" :root-component="activeDirectory.manifest.rootComponent" :props="{}" />
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

interface DirectoryData {
  handle: FileSystemDirectoryHandle
  name: string
  files: FileEntry[]
  parsedFiles: {
    file: FileEntry
    content: any
  }[]
  components: any
  manifest: any
}

const directories = ref<DirectoryData[]>([])
const activeDirectoryIndex = ref<number>(-1)
const renderComponent = ref(false)
const dedicatedMode = ref(false)
const showDetails = ref(true)
const loaded = ref(false)

const activeDirectory = computed(() =>
  activeDirectoryIndex.value >= 0 && activeDirectoryIndex.value < directories.value.length
    ? directories.value[activeDirectoryIndex.value]
    : null
)

const canRenderComponent = computed(() => {
  if (!activeDirectory.value) return false
  return Object.keys(activeDirectory.value.components).length > 0 &&
    Object.keys(activeDirectory.value.manifest).length > 0
})

const shouldRenderComponent = computed(() => renderComponent.value && canRenderComponent.value)

async function saveDirectoryHandles() {
  const handles = directories.value.map(dir => dir.handle)
  await set('directoryHandles', handles)
  await set('activeDirectoryIndex', activeDirectoryIndex.value)
}

async function loadDirectoryHandles() {
  const savedHandles = await get('directoryHandles')
  const savedActiveIndex = await get('activeDirectoryIndex') ?? -1

  if (Array.isArray(savedHandles) && savedHandles.length > 0) {
    activeDirectoryIndex.value = savedActiveIndex

    for (const handle of savedHandles) {
      await addDirectory(handle)
    }
  }
}

async function processDirectory(handle: FileSystemDirectoryHandle): Promise<DirectoryData> {
  const files = await getFilesFromDirectory(handle)
  const parsedFiles = []
  const components: any = {}
  let manifest = {}

  // naturally sort files by path
  files.sort((a, b) => a.path.localeCompare(b.path))

  for (const file of files) {
    try {
      const content = await readFileJSON(file)
      parsedFiles.push({ file, content })

      if (file.path !== 'manifest.json') {
        components[content.name] = content
      } else {
        manifest = content
      }
    } catch {
      // ignore if json parsing fails
    }
  }

  return {
    handle,
    name: handle.name,
    files,
    parsedFiles,
    components,
    manifest
  }
}

async function addDirectory(handle: FileSystemDirectoryHandle) {
  const dirData = await processDirectory(handle)
  directories.value.push(dirData)
  if (activeDirectoryIndex.value === -1) {
    activeDirectoryIndex.value = 0
  }
  await saveDirectoryHandles()
}

async function handleOpenDirectory() {
  try {
    const result = await openDirectory()
    if (!result.directoryHandle) {
      return
    }
    await addDirectory(result.directoryHandle)
  } catch (error) {
    if (error instanceof Error) {
      alert(`Error opening directory: ${error.message}`)
    }
  }
}

function setActiveDirectory(index: number) {
  if (index >= 0 && index < directories.value.length) {
    activeDirectoryIndex.value = index
    saveDirectoryHandles()
  }
}

async function removeDirectory(index: number) {
  directories.value.splice(index, 1)

  if (directories.value.length === 0) {
    activeDirectoryIndex.value = -1
  } else if (activeDirectoryIndex.value >= directories.value.length) {
    activeDirectoryIndex.value = directories.value.length - 1
  }

  await saveDirectoryHandles()
}

function openInDedicatedMode() {
  document.location.search = `dedicated=true&dir=${activeDirectoryIndex.value}`
}

onMounted(async() => {
  await loadDirectoryHandles()

  if (document.location.search.includes('dedicated=true')) {
    renderComponent.value = true
    dedicatedMode.value = true

    // Parse directory index from URL if available
    const params = new URLSearchParams(document.location.search)
    const dirIndex = parseInt(params.get('dir') || '0')
    if (!isNaN(dirIndex) && dirIndex >= 0 && dirIndex < directories.value.length) {
      activeDirectoryIndex.value = dirIndex
    }
  }

  loaded.value = true
})
</script>

<style scoped>
.home-container {
  font-family: sans-serif;
  margin: 1rem;
}.directories-list {
  margin: 1rem 0;
}

.directory-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
}

.active-directory {
  border-color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.1);
}

.directory-header {
  display: flex;
  align-items: center;
}

.directory-name {
  font-weight: bold;
  flex-grow: 1;
}

.directory-file-count {
  margin-left: 0.5rem;
  color: #666;
}

.remove-directory-btn {
  margin-left: 1rem;
  background: none;
  border: none;
  color: #f44336;
  cursor: pointer;
  font-weight: bold;
}

.directory-files {
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.9rem;
}
</style>
