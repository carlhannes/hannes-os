# Virtual Desktop - Mac OS X Jaguar Inspired

A web-based virtual desktop environment inspired by Mac OS X 10.2 Jaguar, built with Next.js, React, and TypeScript. This project recreates the classic Mac OS X experience in the browser with a window manager, dock, file system, and applications.

![Virtual Desktop Screenshot](screenshot.png)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technical Architecture](#technical-architecture)
- [Core Systems](#core-systems)
  - [Window Manager](#window-manager)
  - [File System](#file-system)
  - [Dialog System](#dialog-system)
  - [Context Menu System](#context-menu-system)
  - [App Management](#app-management)
- [UI Components](#ui-components)
- [Development Guide](#development-guide)
- [Libraries and Dependencies](#libraries-and-dependencies)
- [Future Improvements](#future-improvements)

## Overview

This project recreates the look and feel of Mac OS X 10.2 Jaguar in a web browser. It features a fully functional window manager with draggable, resizable windows, a dock for application launching, and a virtual file system that persists data between sessions using IndexedDB.

The goal is to provide a nostalgic yet functional desktop environment that runs entirely in the browser, demonstrating advanced React patterns and state management techniques.

## Features

- **Window Management**: Create, close, minimize, maximize, and resize windows.
  - Windows minimize to the Dock with a thumbnail preview.
  - Window state is preserved when minimized/restored.
- **Dock**: Application launcher with minimize/restore functionality.
  - Displays running application indicators.
  - Shows thumbnails of minimized windows on the right side.
- **Menu Bar**: Classic Mac OS X menu bar with dropdown menus.
- **File System**: Persistent virtual file system using IndexedDB.
  - Supports files, directories, and links.
  - CRUD operations including **renaming** items.
  - **File System Links/Shortcuts**: Create `.lnk` files targeting applications, files, folders, or URLs. Default application links are automatically created in `/Applications`.
- **Desktop**:
  - Displays file system items with draggable icons.
  - Supports icon position saving and **"Clean Up"** to reset positions.
  - Context menu for creating folders and all link types.
  - **Inline renaming** of icons via context menu.
- **File Manager**: Browse, create, rename, and manage files and directories.
  - Supports multiple independent instances.
  - Editable path bar for direct navigation.
  - Icon and List view modes.
  - **Inline renaming** of items via context menu.
  - Customizable sidebar with Favorites and System locations.
- **TextEdit**: Simple text editor with open/save functionality.
- **Browser**: Simple web browser component.
- **Context Menus**: Right-click context menus throughout the interface (Desktop background, Desktop icons, File Manager background, File Manager items, Links).
- **File Dialogs**: Generic file open/save dialogs, create/edit link dialogs.
- **Error Handling**: Basic visual error dialogs for common operations.

## Technical Architecture

The project is built with:

- **Next.js**: App Router for routing and project structure
- **React**: Functional components with hooks for UI
- **TypeScript**: For type safety and better developer experience
- **Tailwind CSS**: For styling components
- **Framer Motion**: For animations and transitions
- **IndexedDB**: For persistent storage via the idb library
- **html2canvas**: For generating window thumbnails during minimize.

The architecture uses context-based state management for global systems and local state for application-specific views:

- `WindowContext`: Manages window state and operations (including minimized state and thumbnails).
- `AppContext`: Manages application registration and metadata.
- `FileSystemContext`: Provides access to core, stateless virtual file system operations.
- `DialogContext`: Manages dialog display and interaction (File Open/Save, Create/Edit Link, Error).
- `ContextMenuContext`: Handles right-click context menus.

## Core Systems

### Window Manager

The window manager is implemented in `components/window-context.tsx` and provides functionality for:

- Creating new windows (supports `title` and optional `subtitle`)
- Closing windows
- Minimizing windows (stores `isMinimized` state and optional `thumbnail` data URL)
- Restoring minimized windows (`restoreWindow`)
- Maximizing/toggling maximize state
- Activating windows (bringing to front)
- Updating window position and size
- Managing z-index for proper window stacking

Windows are rendered in `components/window.tsx`, which handles:

- Window chrome (title bar with title/subtitle, buttons)
- Dragging via title bar
- Resizing via corner handle
- Animations for open/close, minimize/restore, and maximize.
- Capturing content snapshot using `html2canvas` on minimize.
- Rendering the appropriate application component (`FileManager`, `Notepad`, etc.).
- Remaining mounted but visually hidden (`display: none`) when minimized to preserve state.

Example usage:

```typescript
const { openWindow, minimizeWindow, restoreWindow } = useWindow();

// Minimize a window (thumbnail generation happens in Window component)
minimizeWindow(windowId, targetDockPosition);

// Restore a window
restoreWindow(windowId);
```

### File System

The virtual file system is implemented in `lib/file-system/` and provides a complete file system abstraction that persists to IndexedDB. Key components:

- `file-system.ts`: Core service with stateless file operations (CRUD, linking, path resolution).
- `db.ts`: IndexedDB interaction layer.
- `types.ts`: TypeScript types for file system entities (`File`, `Directory`, `Application`, `Link`).
- `file-system-context.tsx`: React context providing access to the core file system service methods.

The file system supports:

- Files, directories, application shortcuts (legacy), and `.lnk` files.
- Link types: `application`, `directory`, `file`, `url`.
- File metadata (creation/modification dates, icon positions via `metadata` field).
- File content storage.
- Directory navigation.
- CRUD operations (create, read, update, delete, **rename**) for files/directories.
- Link creation (`createLink`) and updating (`updateLink`).

Example usage (within a component like FileManager):

```typescript
const { getEntityByPath, listDirectory, createFile, renameEntity, createLink, getPath } = useFileSystem();

// Rename an item
await renameEntity(itemId, "New Item Name");

// Get directory contents
const dir = await getEntityByPath("/Users/User");
if (dir?.type === 'directory') {
  const contents = await listDirectory(dir.id);
  console.log(contents);
}
```
*Note: View-specific state like `currentPath` is managed locally within components like `FileManager`.*

### Dialog System

The dialog system provides reusable dialogs and is implemented in `components/dialogs/`. Key components:

- `dialog-context.tsx`: Context provider for showing/hiding dialogs.
- `file-open-dialog.tsx`: Dialog for opening files or selecting link targets (files/folders).
- `file-save-dialog.tsx`: Dialog for saving files.
- `create-link-dialog.tsx`: Dialog for creating new `.lnk` files.
- `edit-link-dialog.tsx`: Dialog for editing existing `.lnk` files.
- `error-dialog.tsx`: Dialog for displaying feedback on failed operations.

Example usage:

```typescript
const { showFileOpenDialog, showCreateLinkDialog, showErrorDialog } = useDialog();

// Show file open dialog
showFileOpenDialog((entityId) => {
  console.log("Selected entity:", entityId);
}, "/Users/User/Documents");

// Show create link dialog
showCreateLinkDialog('url', (name, target) => {
  console.log("Create URL link:", name, target);
  // Call file system createLink here...
});

// Show an error
showErrorDialog("The specified file name already exists.");
```

### Context Menu System

The context menu system provides right-click menus throughout the interface and is implemented in `components/context-menu-provider.tsx`. It supports nested submenus and separators.

Example usage:

```typescript
const { showContextMenu } = useContextMenu();

// Show context menu on right-click
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault();
  showContextMenu(e, [
    { label: "New Folder", action: () => createFolder() },
    { label: "New Link...", submenu: [
        { label: "Application Link...", action: () => handleCreateLink('application') },
        // ... other link types
    ] },
    { separator: true },
    { label: "Paste", action: () => paste() }, // Example, Paste not implemented
  ]);
};
```

### App Management

The app management system is implemented in `components/app-context.tsx` and provides:

- Registration of available applications (`DEFAULT_APPS`).
- Application metadata (name, icon, default size).
- Application launching via `useWindow().openWindow()`.
- **Note:** `DEFAULT_APPS` is now exported and used by the `FileSystem` service during initialization to create `.lnk` files in the `/Applications` directory.

Example usage:

```typescript
const { apps, getAppById } = useApp();

// Get a specific app
const app = getAppById("textedit");
```

## UI Components

The project includes several key UI components:

- **Desktop** (`components/desktop.tsx`): Main desktop area.
    - Renders draggable icons (`DesktopIcon`).
    - Handles icon position saving and cleanup.
    - Provides context menu for background actions (New Folder, New Link..., Clean Up, etc.).
    - Manages state for inline renaming of icons.
- **DesktopIcon** (`components/desktop-icon.tsx`): Represents a file system entity on the desktop.
    - Handles its own context menu (Open, Rename, Delete, Get Info).
    - Displays an inline input for renaming.
- **Dock** (`components/dock.tsx`): Application dock at the bottom.
    - Displays icons for registered applications.
    - Shows indicators for running applications.
    - Displays thumbnail previews or icons for minimized windows on the right side.
    - Handles launching apps and restoring minimized windows.
- **Menu Bar** (`components/menu-bar.tsx`): Top menu bar with Apple menu and application menus (placeholder).
- **Window** (`components/window.tsx`): Window component with chrome (title, subtitle, buttons) and content area.
    - Handles dragging, resizing, minimize, maximize, close actions.
    - Renders the specific application component passed to it.
    - Manages animations for state changes (open, close, minimize).
    - Captures thumbnail snapshots on minimize.
- **File Manager** (`components/apps/file-manager.tsx`): File browser application (with local state).
    - Includes toolbar, editable path bar, sidebar, and content area (icon/list views).
    - Handles navigation, item selection, creation, and renaming.
- **TextEdit** (`components/apps/notepad.tsx`): Text editor application.
- **Browser** (`components/apps/browser.tsx`): Simple web browser application.
- **DropdownMenu** (`components/dropdown-menu.tsx`): Menu component for application menus (used by Menu Bar).
- **Dialogs** (`components/dialogs/`):
  - `FileOpenDialog`
  - `FileSaveDialog`
  - `CreateLinkDialog`
  - `EditLinkDialog`
  - `ErrorDialog`

## Development Guide

### Project Structure

```
/
├── app/                    # Next.js app directory
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main page component (renders Providers & AppContent)
├── components/             # React components
│   ├── apps/               # Application components (FileManager, Notepad, etc.)
│   ├── dialogs/            # Dialog components
│   ├── app-context.tsx     # App management context
│   ├── context-menu-provider.tsx # Context menu system
│   ├── desktop-icon.tsx    # Desktop icon component
│   ├── desktop.tsx         # Desktop component (renders icons)
│   ├── dock.tsx            # Dock component
│   ├── dropdown-menu.tsx   # Dropdown menu component
│   ├── menu-bar.tsx        # Menu bar component
│   ├── window-context.tsx  # Window management context
│   └── window.tsx          # Window component (renders app components inside)
├── lib/                    # Utility libraries
│   └── file-system/        # File system implementation
│       ├── db.ts           # IndexedDB interaction
│       ├── file-system-context.tsx # File system context (stateless ops)
│       ├── file-system.ts  # Core file system service
│       └── types.ts        # File system types (File, Directory, Link...)
├── public/                 # Static assets
├── README.md               # This file
├── next.config.js          # Next.js configuration
├── package.json            # Project dependencies
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

### Running the Project

1. Clone the repository
2. Install dependencies:
   ```bash
   # Use --legacy-peer-deps if you encounter peer dependency conflicts
   npm install --legacy-peer-deps
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Adding a New Application

To add a new application:

1. Create a new component in `components/apps/`.
2. Register the application by adding an `AppInfo` object to the `DEFAULT_APPS` array in `components/app-context.tsx`.
   - This will automatically create a `.lnk` file for your app in the `/Applications` directory when the file system is initialized for the first time.
3. Ensure the main `renderComponent` function in `components/window.tsx` includes a case to render your new app component.

```typescript
// In components/app-context.tsx
export const DEFAULT_APPS: AppInfo[] = [
  // ... existing apps
  {
    id: "myapp",
    name: "My App",
    icon: <MyIcon className="w-full h-full text-purple-500" />,
    component: "MyApp",
    defaultSize: { width: 600, height: 400 },
  },
];

// Then create the component in components/apps/my-app.tsx
// And add it to the renderComponent function in components/window.tsx
```

### Extending the File System

The file system can be extended by:

1. Adding new entity types to `lib/file-system/types.ts` (like the `Link` type). Remember to update `FileType` and `FileSystemEntity` unions.
2. Adding new methods to the `FileSystem` class in `lib/file-system/file-system.ts`.
3. Exposing new methods through the `FileSystemContext` in `lib/file-system/file-system-context.tsx`.
4. Using the new methods in your components via the `useFileSystem` hook.

## Libraries and Dependencies

- **Next.js**: React framework for server-rendered applications
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **Lucide React**: Icon library
- **UUID**: For generating unique identifiers
- **idb**: Promise-based IndexedDB wrapper
- **html2canvas**: For capturing DOM snapshots (used for window thumbnails)

## Future Improvements

- Implement remaining context menu actions (Get Info, Delete, Change Background)
- Add "Genie effect" minimize animation
- Keyboard shortcuts for menu items and window operations
- Drag and drop for files between folders/desktop
- File search functionality
- Image viewer application
- Terminal application
- User preferences and settings
- Multiple desktops/spaces
- More realistic browser with tabs
- File import/export with real file system
- Clipboard support for copy/paste between applications
- Refine file/folder selection UI within Create/Edit Link dialogs.
- More specific icons for file links based on target type.
- Allow editing link target for file/folder links.
- Handle file name collisions gracefully (e.g., "Untitled Folder 2")

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
