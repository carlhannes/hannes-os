"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ArrowLeft, ArrowRight, RefreshCw, Home, AlertTriangle } from "lucide-react"
import { useFileSystem } from "@/lib/file-system/file-system-context"

interface BrowserProps {
  initialUrl?: string
  fileId?: string
}

export default function Browser({ initialUrl, fileId }: BrowserProps) {
  const { getEntity, getPath, getEntityByPath } = useFileSystem();

  const [displayUrl, setDisplayUrl] = useState<string>("");
  const [addressBarInput, setAddressBarInput] = useState<string>("");
  const [iframeContent, setIframeContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      setError(null);
      setIframeContent(null);

      if (fileId) {
        console.log("[Browser] Loading fileId:", fileId);
        try {
          const entity = await getEntity(fileId);
          const path = await getPath(fileId);
          const fileUrl = `file:///${path || fileId}`;

          if (entity && entity.type === 'file' && (entity.name.toLowerCase().endsWith('.html') || entity.name.toLowerCase().endsWith('.htm'))) {
            console.log("[Browser] Rendering HTML file:", path);
            setIframeContent(entity.content || "");
            setDisplayUrl(fileUrl);
            setAddressBarInput(fileUrl);
            setError(null);
          } else {
            console.warn("[Browser] Cannot display file:", entity);
            setError(`Cannot display this file type or file not found.`);
            setDisplayUrl(fileUrl);
            setAddressBarInput(fileUrl);
            setIframeContent(null);
          }
        } catch (err) {
          console.error("[Browser] Error loading file:", err);
          setError("Error loading file.");
          const errorUrl = `file:///error/${fileId}`;
          setDisplayUrl(errorUrl);
          setAddressBarInput(errorUrl);
          setIframeContent(null);
        } finally {
           setIsLoading(false);
        }
      } else if (initialUrl) {
        console.log("[Browser] Loading initialUrl:", initialUrl);
        setDisplayUrl(initialUrl);
        setAddressBarInput(initialUrl);
        setIframeContent(null);
        setError(null);
        setIsLoading(true);
      } else {
        console.log("[Browser] No fileId or initialUrl, loading blank.");
        const blankUrl = "about:blank";
        setDisplayUrl(blankUrl);
        setAddressBarInput(blankUrl);
        setIframeContent(null);
        setError(null);
        setIsLoading(false);
      }
    };

    loadContent();
  }, [fileId, initialUrl, getEntity, getPath]);

  const handleNavigate = async (targetUrlInput: string) => {
    let targetPathOrUrl = targetUrlInput.trim();
    setIsLoading(true);
    setError(null);
    setIframeContent(null);

    if (targetPathOrUrl.startsWith("file:///")) {
      const extractedPath = targetPathOrUrl.substring(8);
      if (!extractedPath || extractedPath === '/') {
         setError("Invalid file path specified.");
         setIsLoading(false);
         setAddressBarInput(targetPathOrUrl);
         return;
      }
      console.log(`[Browser] Navigating to local path: /${extractedPath}`);
      try {
        const absolutePath = extractedPath.startsWith('/') ? extractedPath : `/${extractedPath}`;
        const entity = await getEntityByPath(absolutePath);

        if (entity && entity.type === 'file' && (entity.name.toLowerCase().endsWith('.html') || entity.name.toLowerCase().endsWith('.htm'))) {
          console.log("[Browser] Rendering HTML file from path:", absolutePath);
          setIframeContent(entity.content || "");
          setDisplayUrl(targetPathOrUrl);
          setAddressBarInput(targetPathOrUrl);
          setError(null);
        } else if (entity) {
            console.warn("[Browser] Cannot display file type from path:", absolutePath, entity);
            setError(`Cannot display this file type.`);
            setDisplayUrl(targetPathOrUrl);
            setAddressBarInput(targetPathOrUrl);
            setIframeContent(null);
        } else {
          console.warn("[Browser] File not found at path:", absolutePath);
          setError("File not found.");
          setDisplayUrl(targetPathOrUrl);
          setAddressBarInput(targetPathOrUrl);
          setIframeContent(null);
        }
      } catch (err) {
        console.error("[Browser] Error navigating to path:", extractedPath, err);
        setError("Error accessing file path.");
        setDisplayUrl(targetPathOrUrl);
        setAddressBarInput(targetPathOrUrl);
        setIframeContent(null);
      } finally {
         setIsLoading(false);
      }

    } else {
      let webUrl = targetPathOrUrl;
      if (webUrl && !webUrl.startsWith("http://") && !webUrl.startsWith("https://") && !webUrl.startsWith("about:")) {
         webUrl = `https://${webUrl}`;
      }
      console.log("[Browser] Navigating to web URL:", webUrl);
      setDisplayUrl(webUrl);
      setAddressBarInput(webUrl);
      setIframeContent(null);
      setError(null);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNavigate(addressBarInput);
    }
  };

  const handleRefresh = () => {
    console.log("[Browser] Refreshing:", displayUrl);
    handleNavigate(displayUrl);
  }

  const handleGoHome = () => {
    handleNavigate("https://www.google.com");
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="h-10 bg-gradient-to-b from-gray-200 to-gray-100 border-b border-gray-300 flex items-center px-2 space-x-2 flex-shrink-0">
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center disabled:opacity-50"
          onClick={() => console.log("Back")}
          disabled
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center disabled:opacity-50"
          onClick={() => console.log("Forward")}
          disabled
        >
          <ArrowRight className="w-4 h-4 text-gray-600" />
        </button>
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center"
          onClick={handleRefresh}
        >
          <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-200 border border-gray-400 flex items-center justify-center"
          onClick={handleGoHome}
        >
          <Home className="w-4 h-4 text-gray-600" />
        </button>

        <input
          type="text"
          className="flex-1 h-6 bg-white rounded border border-gray-400 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={addressBarInput}
          onChange={(e) => setAddressBarInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Enter URL or file path (e.g., file:///Users/User/Documents/file.html)"
          spellCheck="false"
        />
      </div>

      <div className="flex-1 bg-white overflow-hidden relative border-t border-gray-300">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        {error && (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-700 p-4 z-20">
             <AlertTriangle className="w-12 h-12 mb-4 text-red-500" />
             <p className="text-lg font-semibold">Browser Error</p>
             <p className="text-sm mt-1">{error}</p>
             <button
               className="mt-4 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
               onClick={() => setError(null)}
             >
               Dismiss
             </button>
           </div>
        )}
        <iframe
          key={iframeContent !== null ? `doc-${displayUrl}` : `src-${displayUrl}`}
          src={iframeContent === null && !error && displayUrl ? displayUrl : undefined}
          srcDoc={iframeContent ?? undefined}
          className={`w-full h-full border-none ${error ? 'opacity-0' : ''}`}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          title="Browser Content"
          onLoad={() => {
            if (iframeContent === null) {
                console.log("[Browser Iframe] onLoad triggered for src:", displayUrl);
                setIsLoading(false);
                setError(null);
            } else {
                 console.log("[Browser Iframe] onLoad triggered for srcdoc (ignored)");
            }
          }}
          onError={(e) => {
             if (iframeContent === null) {
                console.error("[Browser Iframe] onError triggered for src:", displayUrl, e);
                if (!isLoading) return;
                setIsLoading(false);
                setError(`Failed to load URL: ${displayUrl}`);
             } else {
                 console.error("[Browser Iframe] onError triggered for srcdoc (ignored)");
             }
          }}
        />
      </div>
    </div>
  );
}
