'use client'

import { useState, useEffect, useCallback } from 'react';
import { useFileSystem } from '@/lib/file-system/file-system-context';
import { useDialog } from '@/components/dialogs/dialog-context';
import { Loader, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import path from 'path-browserify';
import type { FileSystemEntity } from '@/lib/file-system/types';

interface ImageViewerProps {
  fileId?: string;
}

const imageFileFilter = (entity: FileSystemEntity): boolean => {
  if (entity.type !== 'file') return false;
  const ext = path.extname(entity.name).toLowerCase();
  return /\.(png|jpg|jpeg|gif|webp|bmp|ico)$/i.test(ext);
};

export default function ImageViewer({ fileId }: ImageViewerProps) {
  const { getEntity } = useFileSystem();
  const { showFileOpenDialog } = useDialog();
  
  const [currentFileId, setCurrentFileId] = useState<string | null | undefined>(fileId);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!fileId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fileId !== undefined) {
      setCurrentFileId(fileId);
    }
  }, [fileId]);

  useEffect(() => {
    const loadImage = async () => {
      if (!currentFileId) {
        setIsLoading(false);
        setError(null);
        setImageUrl(null);
        return;
      }

      console.log(`[ImageViewer] Loading fileId: ${currentFileId}`);
      setIsLoading(true);
      setError(null);
      setImageUrl(null);
      
      try {
        const entity = await getEntity(currentFileId);

        if (entity && entity.type === 'file' && entity.content && entity.content.startsWith('data:image/')) {
          setImageUrl(entity.content);
          setError(null);
        } else if (entity && entity.type === 'file') {
            setError('The selected file does not appear to be a supported image.');
            setImageUrl(null);
        } else {
          setError('File not found or is not a file.');
          setImageUrl(null);
        }
      } catch (err) {
        console.error('Error loading image:', err);
        setError('Failed to load image.');
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [currentFileId, getEntity]);

  const handleOpenFileClick = useCallback(() => {
    console.log("[ImageViewer] Open file button clicked.");
    showFileOpenDialog(
      (selectedId) => {
        if (selectedId) {
          console.log("[ImageViewer] File selected:", selectedId);
          setCurrentFileId(selectedId);
        } else {
          console.log("[ImageViewer] File selection cancelled.");
        }
      },
      {
        initialPath: "/Users/User/Pictures",
        filter: imageFileFilter,
      }
    );
  }, [showFileOpenDialog]);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gray-800 overflow-hidden p-4 text-gray-400">
      {isLoading && (
        <div className="flex flex-col items-center">
          <Loader className="w-12 h-12 animate-spin mb-4" />
          <span>Loading Image...</span>
        </div>
      )}
      {!isLoading && error && (
        <div className="flex flex-col items-center text-red-400 text-center">
          <AlertTriangle className="w-12 h-12 mb-4" />
          <span className="font-semibold">Error Loading Image</span>
          <span className="text-sm mt-1">{error}</span>
          <button 
            onClick={handleOpenFileClick} 
            className="mt-4 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Open Another File...
          </button>
        </div>
      )}
      {!isLoading && !error && !currentFileId && (
         <div className="flex flex-col items-center text-center">
           <ImageIcon className="w-16 h-16 mb-4 text-gray-600" />
           <span className="text-lg font-semibold text-gray-500 mb-4">
             No image selected
            </span>
            <button 
              onClick={handleOpenFileClick} 
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Open Image File...
            </button>
         </div>
      )}
      {!isLoading && !error && currentFileId && imageUrl && (
        <img
          src={imageUrl}
          alt={`Image content for ${currentFileId}`}
          className="max-w-full max-h-full object-contain select-none"
        />
      )}
    </div>
  );
} 