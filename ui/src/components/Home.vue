<template>
  <div class="home-container" v-if="loaded && !dedicatedMode">
    <div>
      <button @click="handleOpenDirectory">Open Directory</button>
      <button @click="renderComponent = !renderComponent" v-if="canRenderActiveDirectoryComponent" style="margin-left: 1rem;">
        <template v-if="renderComponent">Hide</template>
        <template v-else>View</template>
      </button>
    </div>

    <div v-if="directories.length" class="directories-list">
      <div v-for="(dir, index) in directories" :key="index" class="directory-item"
        :class="{ 'active-directory': activeDirectoryIndex === index }" @click="setActiveDirectory(index)">
        <div class="directory-header">
          <span class="directory-name">{{ getDirectoryDisplayName(dir) }}</span>
          <span class="directory-file-count">({{ dir.files.length }} files)</span>
          <button class="remove-directory-btn" @click.stop="removeDirectory(index)">✕</button>
        </div>
        <div v-if="dir.manifest && dir.manifest.description" style="margin-top: 0.3rem; font-size: 0.9rem;">{{ dir.manifest.description }}</div>
        <div v-if="dir.requestPermission" class="permission-warning">
          <p>Permission needed to access this directory</p>
          <button @click.stop="requestPermission(index)" class="request-permission-btn">
            Request Permission
          </button>
        </div>
        <div v-else-if="showDetails && activeDirectoryIndex === index" class="directory-files">
          <table>
            <tbody>
              <tr v-for="(file, fIndex) in dir.files" :key="fIndex">
                <td style="padding: 0.1rem;">{{ file.path }}</td>
                <td style="padding: 0.1rem;">{{ formatSize(file.file.size) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="canRenderDirectoryComponent(dir)" style="margin-top: 0.5rem;">
          <button @click.stop="openInDedicatedMode(index)">
            Open in Dedicated Mode
          </button>
        </div>
      </div>
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
  requestPermission: boolean
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

const canRenderActiveDirectoryComponent = computed(() => {
  if (!activeDirectory.value) {
    return false
  }
  return canRenderDirectoryComponent(activeDirectory.value)
})

const shouldRenderComponent = computed(() => renderComponent.value && canRenderActiveDirectoryComponent.value)

function canRenderDirectoryComponent(dir: DirectoryData): boolean {
  return Object.keys(dir.components).length > 0 && Object.keys(dir.manifest).length > 0
}

function getDirectoryDisplayName(dir: DirectoryData): string {
  if (dir.manifest && dir.manifest.name) {
    return dir.manifest.name
  }
  return dir.name
}

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
  let files: any[] = []
  let needsPermission = false

  try {
    // Check if we have permission first
    const permissionStatus = await handle.queryPermission({ mode: 'readwrite' })

    if (permissionStatus === 'granted') {
      files = await getFilesFromDirectory(handle)
    } else {
      needsPermission = true
    }
  } catch (error) {
    needsPermission = true
  }

  if (needsPermission) {
    return {
      handle,
      name: handle.name,
      files: [],
      parsedFiles: [],
      components: {},
      manifest: {},
      requestPermission: true
    }
  }

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
    manifest,
    requestPermission: false
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
  if (!confirm(`Are you sure you want to remove the directory: ${directories.value[index].name}?`)) {
    return
  }

  directories.value.splice(index, 1)

  if (directories.value.length === 0) {
    activeDirectoryIndex.value = -1
  } else if (activeDirectoryIndex.value >= directories.value.length) {
    activeDirectoryIndex.value = directories.value.length - 1
  }

  await saveDirectoryHandles()
}

async function requestPermission(index: number) {
  if (index < 0 || index >= directories.value.length) return

  const handle = directories.value[index].handle

  try {
    const permission = await handle.requestPermission({ mode: 'readwrite' })

    if (permission === 'granted') {
      // Reload the directory data
      const updatedDirData = await processDirectory(handle)
      directories.value[index] = updatedDirData
      await saveDirectoryHandles()
    } else {
      alert('Permission denied. Cannot access directory.')
    }
  } catch (error) {
    if (error instanceof Error) {
      alert(`Error requesting permission: ${error.message}`)
    }
  }
}

function openInDedicatedMode(dir: number) {
  window.open(`?dedicated=true&dir=${dir}`, '_blank')
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
}

.directories-list {
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

.permission-warning {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 4px;
  text-align: center;
}

.request-permission-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 0.5rem;
}

.request-permission-btn:hover {
  background-color: #0069d9;
}
</style>
