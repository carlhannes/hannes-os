"use client"

import { AlertTriangle } from "lucide-react";

interface ErrorDialogProps {
  message: string;
  onClose: () => void;
}

export default function ErrorDialog({ message, onClose }: ErrorDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[110]" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-[90%] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside dialog
      >
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold mb-3 text-center">Error</h2>
        <p className="text-sm text-gray-700 mb-6 text-center">{message}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm font-medium"
        >
          OK
        </button>
      </div>
    </div>
  );
} 