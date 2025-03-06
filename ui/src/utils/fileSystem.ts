export interface FileEntry {
  path: string
  file: File
  handle: FileSystemFileHandle
}

/**
 * Opens a directory picker and returns the directory handle and files
 * @returns A promise that resolves to an object containing the directory handle and files
 */
export async function openDirectory(): Promise<{ directoryHandle: FileSystemDirectoryHandle | null; files: FileEntry[] }> {
  if ('showDirectoryPicker' in window === false) {
    throw new Error('File System Access API is not supported in this browser')
  }

  try {
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
    })

    const permissionStatus = await directoryHandle.queryPermission({ mode: 'readwrite' })

    if (permissionStatus !== 'granted') {
      const requestPermission = await directoryHandle.requestPermission({ mode: 'readwrite' })

      if (requestPermission !== 'granted') {
        throw new Error('Read/write permission is required to proceed')
      }
    }

    const files = await getFilesFromDirectory(directoryHandle)
    return { directoryHandle, files }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // User canceled the picker
      return { directoryHandle: null, files: [] }
    }
    throw error
  }
}

/**
 * Gets all files recursively from a directory
 * @param dirHandle The directory handle to read from
 * @param path The current path (used for recursion)
 * @returns A promise that resolves to an array of file entries
 */
export async function getFilesFromDirectory(dirHandle: FileSystemDirectoryHandle, path = ''): Promise<FileEntry[]> {
  const fileEntries: FileEntry[] = []

  async function readDir(handle: FileSystemDirectoryHandle, currentPath = '') {
    for await (const entry of handle.values()) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name

      if (entry.kind === 'file') {
        const fileHandle = entry
        const file = await fileHandle.getFile()

        fileEntries.push({
          path: entryPath,
          file: file,
          handle: fileHandle
        })
      } else if (entry.kind === 'directory') {
        await readDir(entry, entryPath)
      }
    }
  }

  await readDir(dirHandle, path)
  return fileEntries
}

/**
 * Reads a file as text
 * @param fileEntry The file entry to read
 * @returns A promise that resolves to the file content as text
 */
export async function readFile(fileEntry: FileEntry): Promise<string> {
  try {
    const fileObj = await fileEntry.handle.getFile()
    return await fileObj.text()
  } catch (error) {
    throw new Error(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Reads a file as JSON
 * @param fileEntry The file entry to read
 * @returns A promise that resolves to the parsed JSON content
 */
export async function readFileJSON(fileEntry: FileEntry): Promise<any> {
  try {
    const text = await readFile(fileEntry)
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`Error reading JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Writes content to a file
 * @param fileEntry The file entry to write to
 * @param content The content to write
 */
export async function writeFile(fileEntry: FileEntry, content: string): Promise<void> {
  try {
    const writable = await fileEntry.handle.createWritable()
    await writable.write(content)
    await writable.close()

    // Update the file object after writing
    const newFile = await fileEntry.handle.getFile()
    fileEntry.file = newFile
  } catch (error) {
    throw new Error(`Error saving changes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Writes JSON content to a file
 * @param fileEntry The file entry to write to
 * @param content The JSON content to write
 */
export async function writeFileJSON(fileEntry: FileEntry, content: any): Promise<void> {
  try {
    await writeFile(fileEntry, JSON.stringify(content, null, 2) + '\n')
  } catch (error) {
    throw new Error(`Error saving JSON changes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes The file size in bytes
 * @returns A formatted string representing the file size
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
