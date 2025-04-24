"use client"

import { useState, useEffect, useCallback } from "react"
import type { Link, LinkTargetType } from "@/lib/file-system/types"
import { useApp } from "@/components/app-context"
import type { AppInfo } from "@/components/app-context"

interface EditLinkDialogProps {
  link: Link // Pass the existing link object
  onSubmit: (linkId: string, updates: { name?: string; target?: string }) => void // Only allow name/target changes for now
  onClose: () => void
}

export default function EditLinkDialog({ link, onSubmit, onClose }: EditLinkDialogProps) {
  const [linkName, setLinkName] = useState(link.name.replace(".lnk", "")) // Remove .lnk for editing
  const [linkTarget, setLinkTarget] = useState(link.target)
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null)
  const { apps } = useApp()

  // Initialize state based on link target type
  useEffect(() => {
    if (link.targetType === "application") {
        const app = apps.find(a => a.id === link.target);
        if (app) {
            setSelectedApp(app);
        }
    }
    // Add initial setup for other types if needed
  }, [link, apps]);

  const handleAppChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const appId = e.target.value;
    const app = apps.find(a => a.id === appId);
    if (app) {
        setSelectedApp(app);
        setLinkTarget(app.id);
    }
  }

  const handleSubmit = () => {
    if (!linkName || !linkTarget) return;
    const finalName = linkName.endsWith(".lnk") ? linkName : `${linkName}.lnk`;
    const updates: { name?: string; target?: string } = {};
    if (finalName !== link.name) updates.name = finalName;
    if (linkTarget !== link.target) updates.target = linkTarget;

    if (Object.keys(updates).length > 0) {
        onSubmit(link.id, updates);
    }
    onClose()
  }

  const renderTargetInput = () => {
    switch (link.targetType) { // Use link.targetType to render correct input
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
        // Show non-editable target for file/folder links for now
        return (
          <div className="w-full p-2 border border-gray-200 rounded text-sm bg-gray-100 text-gray-600">
            {linkTarget} (Cannot edit target for file/folder links yet)
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">Edit Link</h2>

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
            Link Target ({link.targetType}):
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
            disabled={!linkName || !linkTarget || (link.targetType !== 'url' && !linkTarget)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
} 