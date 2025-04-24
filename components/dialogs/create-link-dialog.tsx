"use client"

import { useState, useEffect, useCallback } from "react"
import type { LinkTargetType } from "@/lib/file-system/types"
import { useApp } from "@/components/app-context"
import type { AppInfo } from "@/components/app-context"
import { useDialog } from "./dialog-context"
// We might need file/folder selection capability later
// import { useDialog } from "./dialog-context"

interface CreateLinkDialogProps {
  targetType: LinkTargetType
  onSubmit: (name: string, target: string) => void
  onClose: () => void
}

export default function CreateLinkDialog({ targetType, onSubmit, onClose }: CreateLinkDialogProps) {
  const [linkName, setLinkName] = useState("")
  const [linkTarget, setLinkTarget] = useState("")
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null)
  const { apps } = useApp()
  const { showFileOpenDialog } = useDialog()
  const [selectedTargetPath, setSelectedTargetPath] = useState<string | null>(null);

  useEffect(() => {
    // Reset target path display when type changes
    setSelectedTargetPath(null);
    // Set default name based on type
    if (targetType === "application") {
      setLinkName("New Application Link")
      if (apps.length > 0) {
        setSelectedApp(apps[0]);
        setLinkTarget(apps[0].id);
      }
    } else if (targetType === "url") {
      setLinkName("New URL Link")
      setLinkTarget("https://")
    } else {
      setLinkName("New Link") // Placeholder for file/folder
      setLinkTarget(""); // Clear target until selected
    }
  }, [targetType, apps])

  const handleAppChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const appId = e.target.value;
    const app = apps.find(a => a.id === appId);
    if (app) {
        setSelectedApp(app);
        setLinkTarget(app.id);
        // Maybe auto-update link name?
        // setLinkName(app.name);
    }
  }

  const handleSelectTarget = () => {
    showFileOpenDialog((entityId) => {
      console.log("[CreateLinkDialog] Selected entity ID:", entityId);
      setLinkTarget(entityId); // Set the ID as the target
      // Log the state value *after* setting it (though it might not be updated immediately in this closure)
      console.log("[CreateLinkDialog] linkTarget state should be updated to:", entityId);
      setSelectedTargetPath(`Selected ID: ${entityId}`); 
    });
  };

  const handleSubmit = () => {
    // Log state values when handleSubmit is invoked
    console.log("[CreateLinkDialog] handleSubmit called. Name:", linkName, "Target:", linkTarget);
    if (!linkName || !linkTarget) {
        console.warn("[CreateLinkDialog] Submit prevented. Name or Target missing.");
        return;
    }
    // Ensure .lnk extension
    const finalName = linkName.endsWith(".lnk") ? linkName : `${linkName}.lnk`;
    onSubmit(finalName, linkTarget)
    onClose()
  }

  const renderTargetInput = () => {
    switch (targetType) {
      case "application":
        return (
          <select
            value={selectedApp?.id || ""}
            onChange={handleAppChange}
            className="w-full p-2 border border-gray-300 rounded text-sm"
          >
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        );
      case "url":
        return (
          <input
            type="url"
            value={linkTarget}
            onChange={(e) => setLinkTarget(e.target.value)}
            placeholder="https://example.com"
            className="w-full p-2 border border-gray-300 rounded text-sm"
            required
          />
        );
      case "directory":
      case "file":
        return (
          selectedTargetPath ? (
             <div className="w-full p-2 border border-gray-200 rounded text-sm bg-gray-100 text-gray-600">
                {selectedTargetPath}
             </div>
           ) : (
             <button
                onClick={handleSelectTarget}
                className="p-2 border border-gray-300 rounded text-sm text-gray-500 w-full text-left hover:bg-gray-50"
             >
                 Click to select {targetType}...
             </button>
           )
        );
      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">Create New {targetType.charAt(0).toUpperCase() + targetType.slice(1)} Link</h2>

        <div className="mb-4">
          <label htmlFor="linkName" className="block text-sm font-medium text-gray-700 mb-1">
            Link Name:
          </label>
          <input
            type="text"
            id="linkName"
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-sm"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link Target ({targetType}):
          </label>
          {renderTargetInput()}
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!linkName || !linkTarget}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            Create Link
          </button>
        </div>
      </div>
    </div>
  );
} 