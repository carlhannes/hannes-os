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

export const useFileOpener = () => {
  const { apps, getAppById, getAppsForExtension } = useApp(); // Rely solely on useApp
  const { openWindow } = useWindow();
  const { showErrorDialog } = useDialog();
  const { getEntity, getPath, getEntityByPath } = useFileSystem();

  const openEntity = useCallback(async (entity: FileSystemEntity | Link, overrideAppId?: string) => {
    console.log(`[useFileOpener] openEntity called for: ${entity.name} (id: ${entity.id}), override: ${overrideAppId}`);

    // Define a helper function for default positioning
    const getDefaultPosition = (size?: { width: number; height: number }) => ({
      x: Math.random() * 150 + 50,
      y: Math.random() * 100 + 50,
      width: size?.width || 600, // Default width if not specified
      height: size?.height || 400, // Default height if not specified
    });

    // --- Handle Links ---
    if (entity.type === 'link') {
        const link = entity as Link;
        console.log(`[useFileOpener] Handling link to ${link.targetType}: ${link.target}`);
        switch (link.targetType) {
            case 'application':
                // Open the linked application directly
                const appInfo = getAppById(link.target);
                if (!appInfo) {
                    showErrorDialog(`Cannot open link: Application "${link.target}" not found.`);
                    return;
                }
                console.log(`[useFileOpener] Opening linked application: ${appInfo.name}`);
                openWindow({
                    title: appInfo.name,
                    component: appInfo.component,
                    icon: appInfo.icon,
                    props: appInfo.defaultProps || {},
                    position: getDefaultPosition(appInfo.defaultSize), // Add position
                });
                return;
            case 'directory':
            case 'file':
                // Resolve the target entity and open it
                const targetEntity = await getEntityByPath(link.target);
                if (!targetEntity) {
                    showErrorDialog(`Cannot open link: Target path "${link.target}" not found.`);
                    return;
                }
                console.log(`[useFileOpener] Opening linked entity: ${targetEntity.name}`);
                // Recursively call openEntity for the resolved target (no override needed here)
                await openEntity(targetEntity);
                return;
            case 'url':
                // Open the URL in the browser app
                const browserApp = getAppById('browser');
                if (!browserApp) {
                    showErrorDialog("Browser application not found.");
                    return;
                }
                console.log(`[useFileOpener] Opening linked URL: ${link.target}`);
                openWindow({
                    title: browserApp.name,
                    component: browserApp.component,
                    icon: browserApp.icon,
                    props: { initialUrl: link.target },
                    position: getDefaultPosition(browserApp.defaultSize), // Add position
                });
                return;
            default:
                showErrorDialog(`Unsupported link target type: ${link.targetType}`);
                return;
        }
    }

    // --- Handle Files & Directories ---
    if (entity.type === 'directory') {
      console.log(`[useFileOpener] Opening directory: ${entity.name}`);
      const dirPath = await getPath(entity.id);
      const fileManagerApp = getAppById('filemanager');
      if (!fileManagerApp) {
          showErrorDialog("File Manager application not found.");
          return;
      }
      openWindow({
        title: fileManagerApp.name,
        subtitle: entity.name === '/' ? undefined : entity.name,
        component: fileManagerApp.component,
        icon: fileManagerApp.icon,
        props: { initialPath: dirPath }, // Pass the actual path
        position: getDefaultPosition(fileManagerApp.defaultSize), // Add position
      });
      return;
    }

    if (entity.type === 'file') {
      let appIdToUse = overrideAppId;

      if (!appIdToUse) {
        // Use getAppsForExtension from useApp context
        const applicableApps = getAppsForExtension(entity.name);
        console.log(`[useFileOpener] Applicable apps for ${entity.name}:`, applicableApps.map(a=>a.id));
        
        if (applicableApps.length === 0) {
          showErrorDialog(`No application found to open "${entity.name}".`);
          console.error(`No application registered for file: ${entity.name}`);
          return;
        }
        // Use the first app in the list as the default
        appIdToUse = applicableApps[0].id;
      }

      const appInfo = getAppById(appIdToUse);

      if (!appInfo) {
        // This error should ideally not happen if getAppsForExtension is correct
        showErrorDialog(`Application not found: ${appIdToUse}`);
        console.error(`Application ID "${appIdToUse}" resolved but not found in DEFAULT_APPS.`);
        return;
      }

      console.log(`[useFileOpener] Opening file ${entity.name} with app: ${appInfo.name}`);
      openWindow({
        title: appInfo.name,
        subtitle: entity.name,
        component: appInfo.component,
        icon: appInfo.icon,
        props: { ...appInfo.defaultProps, fileId: entity.id }, // Pass fileId
        position: getDefaultPosition(appInfo.defaultSize), // Add position
      });
      return;
    }

    // Handle other types or show error
    console.warn(`[useFileOpener] Cannot open entity type: ${entity.type}`);
    showErrorDialog(`Cannot open items of type "${entity.type}".`);

  }, [apps, getAppById, getAppsForExtension, openWindow, showErrorDialog, getEntity, getPath, getEntityByPath]);

  return { openEntity };
}; 