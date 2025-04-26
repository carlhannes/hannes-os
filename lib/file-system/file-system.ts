// Core file system service

import { v4 as uuidv4 } from "uuid"
import type {
  FileSystemEntity,
  File,
  Directory,
  Application,
  FileSystemState,
  FileSystemOperationResult,
  Link,
  LinkTargetType,
} from "./types"
import * as db from "./db"
import { DEFAULT_APPS } from "@/components/app-context" // Import default apps

class FileSystem {
  private initialized = false
  private state: FileSystemState = {
    entities: {},
    rootId: "",
  }

  // Initialize the file system
  async initialize(): Promise<FileSystemOperationResult> {
    if (this.initialized) {
      return { success: true }
    }

    try {
      // Try to load existing state from IndexedDB
      const savedState = await db.getFileSystemState()

      if (savedState) {
        this.state = savedState
      } else {
        // Create a new file system if none exists
        await this.createNewFileSystem()
      }

      this.initialized = true
      return { success: true }
    } catch (error) {
      console.error("Failed to initialize file system:", error)
      return {
        success: false,
        error: "Failed to initialize file system",
      }
    }
  }

  // Create a new file system with root directory
  private async createNewFileSystem(): Promise<void> {
    const rootId = uuidv4();

    const rootDir: Directory = {
      id: rootId,
      name: "/",
      type: "directory",
      parentId: null,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      metadata: {},
    };

    this.state = {
      entities: { [rootId]: rootDir },
      rootId,
    };

    await db.saveEntity(rootDir);
    // No need to save state immediately, bulk save at the end is fine

    // --- Create Default Structure Sequentially --- 

    let usersDirId: string | undefined;
    let appsDirId: string | undefined;
    let userDirId: string | undefined;
    let desktopDirId: string | undefined;
    let documentsDirId: string | undefined;

    try {
      // Create top-level directories
      const usersDirResult = await this.createDirectory("Users", rootId);
      if (!usersDirResult.success || !usersDirResult.data) throw new Error("Failed to create /Users");
      usersDirId = usersDirResult.data.id;

      const appsDirResult = await this.createDirectory("Applications", rootId);
      if (!appsDirResult.success || !appsDirResult.data) throw new Error("Failed to create /Applications");
      appsDirId = appsDirResult.data.id;

      await this.createDirectory("System", rootId); // Don't need its ID for now

      // Create user directory
      const userDirResult = await this.createDirectory("User", usersDirId);
      if (!userDirResult.success || !userDirResult.data) throw new Error("Failed to create /Users/User");
      userDirId = userDirResult.data.id;

      // Create user subdirectories
      const documentsDirResult = await this.createDirectory("Documents", userDirId);
      if (!documentsDirResult.success || !documentsDirResult.data) throw new Error("Failed to create /Users/User/Documents");
      documentsDirId = documentsDirResult.data.id;

      const desktopDirResult = await this.createDirectory("Desktop", userDirId);
      if (!desktopDirResult.success || !desktopDirResult.data) throw new Error("Failed to create /Users/User/Desktop");
      desktopDirId = desktopDirResult.data.id;
      
      await this.createDirectory("Downloads", userDirId); // Don't need its ID for now
      await this.createDirectory("Pictures", userDirId); // Added Pictures directory

      // Create links in /Applications folder
      console.log("[FileSystem] Creating app links in /Applications:", appsDirId);
      for (const app of DEFAULT_APPS) {
          console.log(`[FileSystem] Creating link for ${app.name} in /Applications`);
          await this.createLink(app.name, appsDirId, "application", app.id);
      }

      // Create links on Desktop
      console.log("[FileSystem] Creating app links on Desktop:", desktopDirId);
      for (const app of DEFAULT_APPS) {
          console.log(`[FileSystem] Creating link for ${app.name} on Desktop`);
          await this.createLink(app.name, desktopDirId, "application", app.id);
      }
      
      // Create sample files in Documents
      console.log("[FileSystem] Creating sample files in Documents:", documentsDirId);
       await this.createFile(
            "Welcome.txt",
            documentsDirId,
            "Welcome to your virtual desktop!\n\nThis is a sample text file that you can edit and save.",
            "text/plain",
        );
        await this.createFile("Notes.txt", documentsDirId, "Your notes go here...", "text/plain");
        await this.createFile(
            "Todo.txt",
            documentsDirId,
            "- Create virtual file system\n- Implement file editing\n- Add more apps",
            "text/plain",
        );

      // Save the complete initial state once at the end
      await db.saveFileSystemState(this.state);
      console.log("[FileSystem] New file system created successfully.");

    } catch(error) {
        console.error("[FileSystem] CRITICAL: Failed during initial file system creation:", error);
        // If creation fails badly, maybe reset state to just the root?
        this.state = { entities: { [rootId]: rootDir }, rootId };
        await db.saveFileSystemState(this.state); // Save minimal state
        // Rethrow or handle appropriately? For now, log and continue.
    }
  }

  // Create a directory
  async createDirectory(name: string, parentId: string): Promise<FileSystemOperationResult<Directory>> {
    try {
      // Check if parent exists
      const parent = await db.getEntity(parentId)
      if (!parent || parent.type !== "directory") {
        return {
          success: false,
          error: "Parent directory not found",
        }
      }

      // Check if a file/directory with this name already exists in the parent
      const siblings = await db.getEntitiesByParent(parentId)
      if (siblings.some((entity) => entity.name === name)) {
        return {
          success: false,
          error: `A file or directory named "${name}" already exists`,
        }
      }

      const dirId = uuidv4()
      const now = Date.now()

      const directory: Directory = {
        id: dirId,
        name,
        type: "directory",
        parentId,
        createdAt: now,
        modifiedAt: now,
        metadata: {},
      }

      await db.saveEntity(directory)

      // Update state
      this.state.entities[dirId] = directory
      await db.saveFileSystemState(this.state)

      return {
        success: true,
        data: directory,
      }
    } catch (error) {
      console.error("Failed to create directory:", error)
      return {
        success: false,
        error: "Failed to create directory",
      }
    }
  }

  // Create a file
  async createFile(
    name: string,
    parentId: string,
    content = "",
    mimeType = "text/plain",
  ): Promise<FileSystemOperationResult<File>> {
    try {
      // Check if parent exists
      const parent = await db.getEntity(parentId)
      if (!parent || parent.type !== "directory") {
        return {
          success: false,
          error: "Parent directory not found",
        }
      }

      // Check if a file/directory with this name already exists in the parent
      const siblings = await db.getEntitiesByParent(parentId)
      if (siblings.some((entity) => entity.name === name)) {
        return {
          success: false,
          error: `A file or directory named "${name}" already exists`,
        }
      }

      const fileId = uuidv4()
      const now = Date.now()

      const file: File = {
        id: fileId,
        name,
        type: "file",
        parentId,
        createdAt: now,
        modifiedAt: now,
        content,
        mimeType,
        metadata: {},
      }

      await db.saveEntity(file)

      // Update state
      this.state.entities[fileId] = file
      await db.saveFileSystemState(this.state)

      return {
        success: true,
        data: file,
      }
    } catch (error) {
      console.error("Failed to create file:", error)
      return {
        success: false,
        error: "Failed to create file",
      }
    }
  }

  // Register an application
  async registerApplication(
    name: string,
    parentId: string,
    appId: string,
  ): Promise<FileSystemOperationResult<Application>> {
    try {
      // Check if parent exists
      const parent = await db.getEntity(parentId)
      if (!parent || parent.type !== "directory") {
        return {
          success: false,
          error: "Parent directory not found",
        }
      }

      const entityId = uuidv4()
      const now = Date.now()

      const app: Application = {
        id: entityId,
        name,
        type: "application",
        parentId,
        createdAt: now,
        modifiedAt: now,
        appId,
        metadata: {},
      }

      await db.saveEntity(app)

      // Update state
      this.state.entities[entityId] = app
      await db.saveFileSystemState(this.state)

      return {
        success: true,
        data: app,
      }
    } catch (error) {
      console.error("Failed to register application:", error)
      return {
        success: false,
        error: "Failed to register application",
      }
    }
  }

  // Create a link
  async createLink(
    name: string, // Should ideally end with .lnk
    parentId: string,
    targetType: LinkTargetType,
    target: string,
  ): Promise<FileSystemOperationResult<Link>> {
    try {
      const parent = await db.getEntity(parentId);
      if (!parent || parent.type !== "directory") {
        return { success: false, error: "Parent directory not found" };
      }

      const siblings = await db.getEntitiesByParent(parentId);
      if (siblings.some((entity) => entity.name === name)) {
        return {
          success: false,
          error: `A file or directory named "${name}" already exists`,
        };
      }

      const linkId = uuidv4();
      const now = Date.now();

      const link: Link = {
        id: linkId,
        // Ensure name ends with .lnk for consistency, but allow overrides
        name: name.endsWith(".lnk") ? name : `${name}.lnk`,
        type: "link",
        parentId,
        createdAt: now,
        modifiedAt: now,
        targetType,
        target,
        metadata: {},
      };

      await db.saveEntity(link);

      // Update state (optional here, as state is mainly for quick lookups?)
      // this.state.entities[linkId] = link;
      // await db.saveFileSystemState(this.state); // Avoid saving full state on every op

      return { success: true, data: link };
    } catch (error) {
      console.error("Failed to create link:", error);
      return { success: false, error: "Failed to create link" };
    }
  }

  // Get entity by ID
  async getEntity(id: string): Promise<FileSystemEntity | undefined> {
    try {
      return await db.getEntity(id)
    } catch (error) {
      console.error(`Failed to get entity ${id}:`, error)
      return undefined
    }
  }

  // Get entity by path
  async getEntityByPath(path: string): Promise<FileSystemEntity | null | undefined> {
    if (!this.initialized) {
      console.error("[FileSystem] getEntityByPath called before initialization")
      return null
    }
    console.log(`[FileSystem] getEntityByPath called with path: "${path}"`);

    if (path === "/") {
      const root = await db.getEntity(this.state.rootId)
      console.log(`[FileSystem] Path is root. Returning:`, root);
      return root
    }

    // Normalize and split
    const normalizedPath = path.replace(/^\/+/, '').replace(/\/+$/, ''); // Remove leading/trailing slashes
    const parts = normalizedPath.split('/');
    console.log(`[FileSystem] Normalized path: "${normalizedPath}", Parts:`, parts);
    let currentEntityId = this.state.rootId;
    let currentPathSegment = "/";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue; // Skip empty parts

      console.log(`[FileSystem] Processing part "${part}" (looking in parentId: ${currentEntityId})`);
      currentPathSegment += (currentPathSegment === "/" ? "" : "/") + part;

      // Get children of current directory
      const children = await db.getEntitiesByParent(currentEntityId);
      console.log(`[FileSystem] Children of ${currentEntityId}:`, children);
      // Find the child matching the current path part name
      const foundChild = children.find((child) => child.name === part);
      console.log(`[FileSystem] Found child for "${part}":`, foundChild);

      // Explicitly check for undefined and return null if not found
      if (foundChild === undefined) {
        console.error(`[FileSystem] Child "${part}" not found in parent ${currentEntityId}. Path resolution failed.`);
        return null;
      }

      if (foundChild.type === "directory") {
        currentEntityId = foundChild.id;
        console.log(`[FileSystem] Found directory "${part}", continuing with new parentId: ${currentEntityId}`);
      } else {
        // It's a file or application
        if (i < parts.length - 1) {
          // Found a file/app but it's not the last part of the path
          console.error(`[FileSystem] Path segment "${part}" is a ${foundChild.type}, but not the last part of the path. Path resolution failed.`);
          return null;
        }
        // It's the last part, return the file/app
        console.log(`[FileSystem] Found ${foundChild.type} "${part}" as the final path segment. Returning:`, foundChild);
        return foundChild;
      }
    }

    // If the loop finishes, we have the ID of the target directory
    console.log(`[FileSystem] Path resolution finished. Getting final entity for ID: ${currentEntityId}`);
    const finalEntity = await this.getEntity(currentEntityId);
    console.log(`[FileSystem] Final entity:`, finalEntity);
    // Return the result directly (can be entity, null, or undefined)
    return finalEntity;
  }

  // List directory contents
  async listDirectory(dirId: string): Promise<FileSystemEntity[]> {
    try {
      return await db.getEntitiesByParent(dirId)
    } catch (error) {
      console.error("Failed to list directory:", error)
      return []
    }
  }

  // List directory contents by path
  async listDirectoryByPath(path: string): Promise<FileSystemEntity[]> {
    const dir = await this.getEntityByPath(path)
    if (!dir || dir.type !== "directory") {
      return []
    }

    return this.listDirectory(dir.id)
  }

  // Update file content
  async updateFileContent(fileId: string, content: string): Promise<FileSystemOperationResult> {
    try {
      const file = await db.getEntity(fileId)
      if (!file || file.type !== "file") {
        return {
          success: false,
          error: "File not found",
        }
      }

      const updatedFile: File = {
        ...(file as File),
        content,
        modifiedAt: Date.now(),
      }

      await db.saveEntity(updatedFile)

      // Update state
      this.state.entities[fileId] = updatedFile
      await db.saveFileSystemState(this.state)

      return { success: true }
    } catch (error) {
      console.error("Failed to update file content:", error)
      return {
        success: false,
        error: "Failed to update file content",
      }
    }
  }

  // Rename entity
  async renameEntity(entityId: string, newName: string): Promise<FileSystemOperationResult> {
    try {
      const entity = await db.getEntity(entityId)
      if (!entity) {
        return {
          success: false,
          error: "Entity not found",
        }
      }

      // Check if a file/directory with this name already exists in the parent
      const siblings = await db.getEntitiesByParent(entity.parentId)
      if (siblings.some((e) => e.name === newName && e.id !== entityId)) {
        return {
          success: false,
          error: `A file or directory named "${newName}" already exists`,
        }
      }

      const updatedEntity: FileSystemEntity = {
        ...entity,
        name: newName,
        modifiedAt: Date.now(),
      }

      await db.saveEntity(updatedEntity)

      // Update state
      this.state.entities[entityId] = updatedEntity
      await db.saveFileSystemState(this.state)

      return { success: true }
    } catch (error) {
      console.error("Failed to rename entity:", error)
      return {
        success: false,
        error: "Failed to rename entity",
      }
    }
  }

  // Delete entity
  async deleteEntity(entityId: string): Promise<FileSystemOperationResult> {
    try {
      const entity = await db.getEntity(entityId)
      if (!entity) {
        return {
          success: false,
          error: "Entity not found",
        }
      }

      // If it's a directory, recursively delete all children
      if (entity.type === "directory") {
        const children = await db.getEntitiesByParent(entityId)
        for (const child of children) {
          await this.deleteEntity(child.id)
        }
      }

      await db.deleteEntity(entityId)

      // Update state
      delete this.state.entities[entityId]
      await db.saveFileSystemState(this.state)

      return { success: true }
    } catch (error) {
      console.error("Failed to delete entity:", error)
      return {
        success: false,
        error: "Failed to delete entity",
      }
    }
  }

  // Move entity
  async moveEntity(entityId: string, newParentId: string): Promise<FileSystemOperationResult> {
    try {
      const entity = await db.getEntity(entityId)
      if (!entity) {
        return {
          success: false,
          error: "Entity not found",
        }
      }

      const newParent = await db.getEntity(newParentId)
      if (!newParent || newParent.type !== "directory") {
        return {
          success: false,
          error: "Destination directory not found",
        }
      }

      // Check if a file/directory with this name already exists in the new parent
      const siblings = await db.getEntitiesByParent(newParentId)
      if (siblings.some((e) => e.name === entity.name)) {
        return {
          success: false,
          error: `A file or directory named "${entity.name}" already exists in the destination`,
        }
      }

      const updatedEntity: FileSystemEntity = {
        ...entity,
        parentId: newParentId,
        modifiedAt: Date.now(),
      }

      await db.saveEntity(updatedEntity)

      // Update state
      this.state.entities[entityId] = updatedEntity
      await db.saveFileSystemState(this.state)

      return { success: true }
    } catch (error) {
      console.error("Failed to move entity:", error)
      return {
        success: false,
        error: "Failed to move entity",
      }
    }
  }

  // Update Link properties
  async updateLink(
    linkId: string,
    updates: { name?: string; targetType?: LinkTargetType; target?: string },
  ): Promise<FileSystemOperationResult<Link>> {
    try {
      const link = await this.getEntity(linkId);
      if (!link || link.type !== "link") {
        return { success: false, error: "Link not found" };
      }

      // Validate name uniqueness if name is changing
      if (updates.name && updates.name !== link.name) {
          const siblings = await db.getEntitiesByParent(link.parentId);
          if (siblings.some((e) => e.name === updates.name && e.id !== linkId)) {
              return {
                  success: false,
                  error: `A file or directory named "${updates.name}" already exists`,
              };
          }
      }

      const updatedLink: Link = {
        ...link,
        ...updates, // Apply updates
        // Ensure name still has .lnk if provided without it
        name: updates.name
            ? (updates.name.endsWith(".lnk") ? updates.name : `${updates.name}.lnk`)
            : link.name,
        modifiedAt: Date.now(),
      };

      await db.saveEntity(updatedLink);

      return { success: true, data: updatedLink };
    } catch (error) {
      console.error("Failed to update link:", error);
      return { success: false, error: "Failed to update link" };
    }
  }

  // Update entity metadata
  async updateEntityMetadata(
    entityId: string,
    metadataUpdates: Record<string, any>,
  ): Promise<FileSystemOperationResult> {
    try {
      const entity = await this.getEntity(entityId);
      if (!entity) {
        return { success: false, error: "Entity not found" };
      }

      const updatedEntity: FileSystemEntity = {
        ...entity,
        metadata: {
          ...entity.metadata,
          ...metadataUpdates, // Merge new metadata
        },
        // Note: We might not need to update modifiedAt for just a metadata change
        // modifiedAt: Date.now(), 
      };

      await db.saveEntity(updatedEntity);

      // Update the in-memory state cache if using one (currently not heavily relied upon)
      // this.state.entities[entityId] = updatedEntity;
      // await db.saveFileSystemState(this.state); // Avoid saving full state

      return { success: true };
    } catch (error) {
      console.error("Failed to update entity metadata:", error);
      return { success: false, error: "Failed to update metadata" };
    }
  }

  // Get file path
  async getPath(entityId: string): Promise<string> {
    try {
      const entity = await db.getEntity(entityId)
      if (!entity) {
        return ""
      }

      if (entity.parentId === null) {
        return "/"
      }

      const parentPath = await this.getPath(entity.parentId)
      return `${parentPath === "/" ? "" : parentPath}/${entity.name}`
    } catch (error) {
      console.error("Failed to get path:", error)
      return ""
    }
  }

  // Reset file system (for testing/debugging)
  async reset(): Promise<void> {
    await db.clearFileSystem()
    this.initialized = false
    this.state = { entities: {}, rootId: "" }
    await this.initialize()
  }
}

// Create a singleton instance
const fileSystem = new FileSystem()
export default fileSystem
