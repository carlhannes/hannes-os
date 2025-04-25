"use client";

import { useCallback } from 'react';
import { useFileSystem } from '@/lib/file-system/file-system-context';
import type { FileSystemEntity, Link } from '@/lib/file-system/types';
import { useWindow } from '@/components/window-context';
import { useApp } from '@/components/app-context';
import { useDialog } from '@/components/dialogs/dialog-context';
import path from 'path-browserify'; // Use path-browserify for consistent path handling

// --- Default App Mappings (Extend as needed) ---
const DEFAULT_APP_MAP: { [key: string]: string } = {
  '.txt': 'textedit',
  '.md': 'textedit',
  '.html': 'browser',
  '.htm': 'browser',
  // Add mappings for images, etc. when viewers are available
};
const FALLBACK_APP_ID = 'textedit'; // App to use if extension not mapped

export function useFileOpener() {
  const { getEntity, getPath } = useFileSystem();
  const { openWindow } = useWindow();
  const { getAppById } = useApp();
  const { showErrorDialog } = useDialog();

  const openEntity = useCallback(async (entity: FileSystemEntity | null | undefined, overrideAppId?: string) => {
    if (!entity) {
      console.warn("[useFileOpener] Attempted to open null/undefined entity.");
      return;
    }

    console.log(`[useFileOpener] Opening entity: ${entity.name} (Type: ${entity.type})`);

    const defaultPos = { x: Math.random() * 150 + 50, y: Math.random() * 100 + 50 }; // Base random position

    try {
      switch (entity.type) {
        case 'directory': {
          const dirPath = await getPath(entity.id);
          if (!dirPath) throw new Error("Could not resolve directory path.");
          openWindow({
            title: "File Manager",
            subtitle: entity.name,
            icon: 'filemanager',
            position: { ...defaultPos, width: 700, height: 500 },
            component: 'FileManager',
            props: { initialPath: dirPath }
          });
          break;
        }

        case 'link': {
          const link = entity as Link;
          console.log(`[useFileOpener] Opening link targeting ${link.targetType}: ${link.target}`);
          switch (link.targetType) {
            case 'application': {
              const appInfo = getAppById(link.target);
              if (!appInfo) throw new Error(`Application not found: ${link.target}`);
              openWindow({
                title: appInfo.name,
                icon: appInfo.id,
                position: { ...(appInfo.defaultSize || { width: 500, height: 400 }), ...defaultPos },
                component: appInfo.component,
                props: appInfo.defaultProps || {},
              });
              break;
            }
            case 'url': {
              openWindow({
                title: "Browser",
                subtitle: link.target,
                icon: 'browser',
                position: { ...defaultPos, width: 800, height: 600 },
                component: 'Browser',
                props: { initialUrl: link.target },
              });
              break;
            }
            case 'directory': {
              const targetDir = await getEntity(link.target);
              if (!targetDir || targetDir.type !== 'directory') throw new Error("Link target directory not found.");
              // Recursively call openEntity for the target directory
              await openEntity(targetDir);
              break;
            }
            case 'file': {
              const targetFile = await getEntity(link.target);
              if (!targetFile || targetFile.type !== 'file') throw new Error("Link target file not found.");
              // Recursively call openEntity for the target file
              await openEntity(targetFile);
              break;
            }
            default: {
                // Handle unknown link types
                const unknownType: string = link.targetType; // Assign to string to satisfy checker
                throw new Error(`Unsupported link target type: ${unknownType}`);
            }
          }
          break;
        }

        case 'file': {
          const extension = path.extname(entity.name).toLowerCase();
          // Use override if provided, otherwise lookup default
          const appId = overrideAppId || DEFAULT_APP_MAP[extension] || FALLBACK_APP_ID;
          const appInfo = getAppById(appId);

          if (!appInfo) throw new Error(`Application not found: ${appId}`);

          console.log(`[useFileOpener] Opening file ${entity.name} with app: ${appInfo.name}`);
          openWindow({
            title: appInfo.name,
            subtitle: entity.name,
            icon: appInfo.id,
            position: { ...(appInfo.defaultSize || { width: 500, height: 400 }), ...defaultPos },
            component: appInfo.component,
            // Pass fileId to the application component
            props: { ...(appInfo.defaultProps || {}), fileId: entity.id }, 
          });
          break;
        }

        case 'application': {
            // Handle legacy application type if desired
            console.warn("Legacy 'application' type entities cannot be opened directly.");
             showErrorDialog("Cannot open this application type directly. Use application links.");
             break;
        }

        default: {
           // Handle unknown entity types
           const unknownType: string = (entity as any)?.type ?? 'unknown'; // Cast to any to get type
           throw new Error(`Unsupported entity type: ${unknownType}`);
        }
      }
    } catch (error) {
      console.error("[useFileOpener] Error opening entity:", error);
      showErrorDialog(error instanceof Error ? error.message : "An unknown error occurred while opening the item.");
    }
  }, [getEntity, getPath, openWindow, getAppById, showErrorDialog]);

  return { openEntity };
} 