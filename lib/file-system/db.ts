// IndexedDB implementation for file system persistence

import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import type { FileSystemEntity, FileSystemState } from "./types"

interface FileSystemDB extends DBSchema {
  "file-system": {
    key: string
    value: FileSystemState
  }
  files: {
    key: string
    value: FileSystemEntity
    indexes: { "by-parent": string }
  }
}

const DB_NAME = "virtual-desktop-fs"
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<FileSystemDB>> | null = null

export const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<FileSystemDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store for file system metadata
        if (!db.objectStoreNames.contains("file-system")) {
          db.createObjectStore("file-system")
        }

        // Store for individual files and directories
        if (!db.objectStoreNames.contains("files")) {
          const fileStore = db.createObjectStore("files", { keyPath: "id" })
          fileStore.createIndex("by-parent", "parentId")
        }
      },
    })
  }

  return dbPromise
}

export const saveFileSystemState = async (state: FileSystemState): Promise<void> => {
  const db = await getDB()
  await db.put("file-system", state, "state")
}

export const getFileSystemState = async (): Promise<FileSystemState | undefined> => {
  const db = await getDB()
  return db.get("file-system", "state")
}

export const saveEntity = async (entity: FileSystemEntity): Promise<void> => {
  const db = await getDB()
  await db.put("files", entity)
}

export const getEntity = async (id: string): Promise<FileSystemEntity | undefined> => {
  const db = await getDB()
  return db.get("files", id)
}

export const getEntitiesByParent = async (parentId: string | null): Promise<FileSystemEntity[]> => {
  const db = await getDB()
  return db.getAllFromIndex("files", "by-parent", parentId)
}

export const deleteEntity = async (id: string): Promise<void> => {
  const db = await getDB()
  await db.delete("files", id)
}

export const clearFileSystem = async (): Promise<void> => {
  const db = await getDB()
  const tx = db.transaction(["file-system", "files"], "readwrite")
  await Promise.all([tx.objectStore("file-system").clear(), tx.objectStore("files").clear(), tx.done])
}
