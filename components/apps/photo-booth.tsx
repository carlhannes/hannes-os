'use client'

import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Download, Loader, AlertTriangle, Trash2 } from 'lucide-react';
import { useFileSystem } from '@/lib/file-system/file-system-context';
import { useDialog } from '@/components/dialogs/dialog-context';

const MAX_THUMBNAILS = 5;

export default function PhotoBooth() {
  const webcamRef = useRef<Webcam>(null);
  const { getEntityByPath, createFile } = useFileSystem();
  const { showErrorDialog } = useDialog();

  const [captures, setCaptures] = useState<string[]>([]);
  const [selectedCaptureIndex, setSelectedCaptureIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCaptures(prev => [imageSrc, ...prev].slice(0, MAX_THUMBNAILS));
        setSelectedCaptureIndex(0); // Select the newly captured image
      } else {
        setError("Could not capture image from webcam.");
      }
    } else {
      setError("Webcam component not ready.");
    }
  }, [webcamRef]);

  const deleteCapture = (indexToDelete: number) => {
    setCaptures(prev => prev.filter((_, index) => index !== indexToDelete));
    // Adjust selected index if necessary
    if (selectedCaptureIndex >= indexToDelete && selectedCaptureIndex > 0) {
        setSelectedCaptureIndex(prev => prev - 1);
    } else if (captures.length -1 === 0) {
        setSelectedCaptureIndex(0); // Reset if last one deleted
    }
  }

  const handleSave = useCallback(async () => {
    if (captures.length === 0 || selectedCaptureIndex >= captures.length) {
      showErrorDialog("No photo selected to save.");
      return;
    }

    const imageToSave = captures[selectedCaptureIndex];
    const defaultName = `Photo ${Date.now()}.png`; // More unique default name
    const fileName = prompt("Save as...", defaultName);

    if (!fileName) {
      return; // User cancelled
    }

    setIsSaving(true);
    try {
      const picturesDir = await getEntityByPath("/Users/User/Pictures");
      if (!picturesDir || picturesDir.type !== 'directory') {
        throw new Error("Pictures directory not found.");
      }

      const result = await createFile(fileName, picturesDir.id, imageToSave, 'image/png');
      if (!result.success) {
        throw new Error(result.error || "Failed to save file.");
      }

      console.log("Photo saved successfully:", fileName);
      // Maybe show a success notification later

    } catch (err: any) {
      console.error("Failed to save photo:", err);
      showErrorDialog(`Failed to save photo: ${err.message || err.toString()}`);
    } finally {
      setIsSaving(false);
    }
  }, [captures, selectedCaptureIndex, getEntityByPath, createFile, showErrorDialog]);

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Main Content Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-gray-900">
        {!isCameraReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <Loader className="w-8 h-8 animate-spin" />
          </div>
        )}
        {error && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900 text-red-200 p-4 z-10">
             <AlertTriangle className="w-12 h-12 mb-4 text-red-400" />
             <p className="text-lg font-semibold">Camera Error</p>
             <p className="text-sm mt-1">{error}</p>
           </div>
        )}
        <Webcam
          ref={webcamRef}
          audio={false}
          mirrored={true}
          screenshotFormat="image/png" // Save as PNG
          screenshotQuality={0.92}
          className={`transition-opacity duration-500 ${isCameraReady ? 'opacity-100' : 'opacity-0'}`}
          videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
          onUserMedia={() => {
            console.log("Camera ready");
            setIsCameraReady(true);
            setError(null);
          }}
          onUserMediaError={(err) => {
            console.error("Camera error:", err);
            setError(err.toString());
            setIsCameraReady(false);
          }}
        />
      </div>

      {/* Bottom Bar */}
      <div className="h-28 bg-gray-800 border-t border-gray-700 flex items-center px-4 space-x-4">
        {/* Thumbnails */}
        <div className="flex-1 flex items-center space-x-2 overflow-x-auto h-full py-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {captures.length === 0 && (
              <div className="text-gray-500 text-sm h-full flex items-center justify-center flex-1">Take a photo</div>
          )}
          {captures.map((src, index) => (
            <div 
                key={index} 
                className={`relative flex-shrink-0 w-24 h-full rounded overflow-hidden cursor-pointer border-2 ${selectedCaptureIndex === index ? 'border-blue-500' : 'border-transparent'} hover:border-gray-500`}
                onClick={() => setSelectedCaptureIndex(index)}
            >
                <img src={src} alt={`Capture ${index + 1}`} className="w-full h-full object-cover" />
                <button 
                    onClick={(e) => { e.stopPropagation(); deleteCapture(index); }} 
                    className="absolute top-0 right-0 p-0.5 bg-black bg-opacity-50 rounded-bl hover:bg-red-500 text-white"
                    title="Delete capture"
                 >
                     <Trash2 size={14} />
                 </button>
            </div>
          ))}
        </div>

        {/* Capture Button */}
        <button
          onClick={capture}
          disabled={!isCameraReady || !!error}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center ring-4 ring-gray-600 focus:outline-none focus:ring-red-500 transition-colors"
        >
          <Camera size={32} />
        </button>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={captures.length === 0 || isSaving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm font-medium flex items-center space-x-2"
        >
          {isSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Download size={16} />}
          <span>Save Photo</span>
        </button>
      </div>
    </div>
  );
} 