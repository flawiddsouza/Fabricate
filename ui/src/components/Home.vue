<template>
  <div class="home-container" v-if="loaded && !dedicatedMode">
    <div style="margin-bottom: 1rem;">
      <div style="display: inline-flex; width: 18rem; overflow: hidden;">
        <button @click="handleOpenDirectory">Open Directory</button>
        <button @click="view = !view" v-if="canRenderActiveDirectoryComponent && !edit" style="margin-left: 1rem; width: 3rem;">
          <template v-if="view">Hide</template>
          <template v-else>View</template>
        </button>
        <button @click="edit = !edit" v-if="!view" style="margin-left: 1rem; min-width: 3rem;">
          <template v-if="!edit">Edit</template>
          <template v-else>Cancel Edit</template>
        </button>
      </div>
      <span v-if="activeDirectory && activeDirectory.manifest" style="margin-left: 1rem;">
        {{ getDirectoryDisplayName(activeDirectory) }}
        <span v-if="activeDirectory.manifest.description" style="font-size: 0.9rem; margin-left: 0.5rem;">{{ activeDirectory.manifest.description }}</span>
      </span>
    </div>

    <div v-if="directories.length && !view && !edit">
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

    <div v-if="edit && activeDirectory">
      <FabricateEditor :directory="activeDirectory" />
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
  getFilesFromDirectory,
  writeFileJSON,
} from '../utils/fileSystem'
import FabricateComponent from './FabricateComponent.vue'
import FabricateEditor from './FabricateEditor.vue'
import { get, set } from 'idb-keyval'

export interface DirectoryData {
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
  createComponent?: (name: string, template?: any) => Promise<boolean>
}

const directories = ref<DirectoryData[]>([])
const activeDirectoryIndex = ref<number>(-1)
const view = ref(false)
const dedicatedMode = ref(false)
const showDetails = ref(true)
const loaded = ref(false)
const edit = ref(false)

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

const shouldRenderComponent = computed(() => view.value && canRenderActiveDirectoryComponent.value)

function canRenderDirectoryComponent(dir: DirectoryData): boolean {
  return Object.keys(dir.components).length > 0 && Object.keys(dir.manifest).length > 0
}

function getDirectoryDisplayName(dir: DirectoryData): string {
  if (dir.manifest && dir.manifest.name) {
    let name = dir.manifest.name

    if (dir.manifest.version) {
      name += ` v${dir.manifest.version}`
    }

    return name
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

  const dirData: DirectoryData = {
    handle,
    name: handle.name,
    files,
    parsedFiles,
    components,
    manifest,
    requestPermission: false,
    createComponent: async (name: string, template: any = null) => {
      return await createComponentInDirectory(dirData, name, template)
    }
  }

  return dirData
}

async function createComponentInDirectory(dirData: DirectoryData, name: string, template: any = null): Promise<boolean> {
  if (!name) return false

  // Validate component name
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    alert('Component name must start with a letter and contain only letters, numbers, and underscores')
    return false
  }

  // Check if component already exists
  if (dirData.components[name]) {
    alert(`Component "${name}" already exists`)
    return false
  }

  try {
    // Create default component structure or use template
    const componentData = template || {
      name: name,
      props: {},
      variables: {},
      computed: {},
      Constants: {},
      nodes: [
        { element: 'div', text: `This is ${name} component` }
      ],
      script: '// Component script goes here'
    }

    // Create file in directory
    const fileHandle = await dirData.handle.getFileHandle(`${name}.json`, { create: true })
    const file = await fileHandle.getFile()
    const fileEntry: FileEntry = {
      path: `${name}.json`,
      file,
      handle: fileHandle
    }

    // Write component data to file
    await writeFileJSON(fileEntry, componentData)

    // Update directory data
    dirData.files.push(fileEntry)
    dirData.parsedFiles.push({ file: fileEntry, content: componentData })
    dirData.components[name] = componentData

    return true
  } catch (error) {
    if (error instanceof Error) {
      alert(`Failed to create component: ${error.message}`)
    } else {
      alert('Failed to create component due to an unknown error')
    }
    return false
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
  window.open(`?dir=${dir}`, '_blank')
}

onMounted(async() => {
  await loadDirectoryHandles()

  if (document.location.search.includes('dir=')) {
    view.value = true
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
