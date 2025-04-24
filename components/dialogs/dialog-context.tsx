"use client"

import type React from "react"
import { createContext, useContext, useState, type ReactNode, useCallback } from "react"
import FileOpenDialog from "@/components/dialogs/file-open-dialog"
import FileSaveDialog from "@/components/dialogs/file-save-dialog"
import CreateLinkDialog from "./create-link-dialog"
import EditLinkDialog from "./edit-link-dialog"
import ErrorDialog from "./error-dialog"
import type { LinkTargetType, Link } from "@/lib/file-system/types"

type DialogType = "fileOpen" | "fileSave" | "createLink" | "editLink" | null

interface DialogContextType {
  showFileOpenDialog: (onSelect: (fileId: string) => void, initialPath?: string) => void
  showFileSaveDialog: (
    onSave: (path: string, fileName: string) => void,
    initialFileName?: string,
    initialPath?: string,
  ) => void
  hideDialog: () => void
  showCreateLinkDialog: (targetType: LinkTargetType, onSubmit: (name: string, target: string) => void) => void
  showEditLinkDialog: (link: Link, onSubmit: (linkId: string, updates: { name?: string; target?: string }) => void) => void
  showErrorDialog: (message: string) => void
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialogType, setDialogType] = useState<DialogType>(null)
  const [fileOpenCallback, setFileOpenCallback] = useState<((fileId: string) => void) | null>(null)
  const [fileSaveCallback, setFileSaveCallback] = useState<((path: string, fileName: string) => void) | null>(null)
  const [initialPath, setInitialPath] = useState<string>("/")
  const [initialFileName, setInitialFileName] = useState<string>("")

  const [createLinkProps, setCreateLinkProps] = useState<{
    targetType: LinkTargetType;
    onSubmit: (name: string, target: string) => void;
  } | null>(null);

  const [editLinkProps, setEditLinkProps] = useState<{
      link: Link;
      onSubmit: (linkId: string, updates: { name?: string; target?: string }) => void;
  } | null>(null);

  const [errorDialogMessage, setErrorDialogMessage] = useState<string | null>(null);

  const showFileOpenDialog = (onSelect: (fileId: string) => void, initialPath = "/") => {
    setFileOpenCallback(() => onSelect)
    setInitialPath(initialPath)
    setDialogType("fileOpen")
  }

  const showFileSaveDialog = (
    onSave: (path: string, fileName: string) => void,
    initialFileName = "Untitled.txt",
    initialPath = "/",
  ) => {
    setFileSaveCallback(() => onSave)
    setInitialFileName(initialFileName)
    setInitialPath(initialPath)
    setDialogType("fileSave")
  }

  const showErrorDialog = useCallback((message: string) => {
      setErrorDialogMessage(message);
  }, []);

  const hideDialog = () => {
    setDialogType(null)
    setFileOpenCallback(null)
    setFileSaveCallback(null)
    setCreateLinkProps(null);
    setEditLinkProps(null);
    setErrorDialogMessage(null);
  }

  const handleFileSelected = (entityId: string) => {
    const calledFromCreateLink = !!createLinkProps; 
    
    if (fileOpenCallback) {
      fileOpenCallback(entityId);
    }
    
    if (calledFromCreateLink) {
        setDialogType('createLink');
        setFileOpenCallback(null);
    } else {
        hideDialog();
    }
  };

  const handleFileSaved = (path: string, fileName: string) => {
    if (fileSaveCallback) {
      fileSaveCallback(path, fileName);
    }
    hideDialog();
  };

  const showCreateLinkDialog = useCallback(
    (targetType: LinkTargetType, onSubmit: (name: string, target: string) => void) => {
      setCreateLinkProps({ targetType, onSubmit });
      setDialogType("createLink");
    },
    []
  );

  const handleLinkCreated = (name: string, target: string) => {
    if (createLinkProps?.onSubmit) {
      createLinkProps.onSubmit(name, target);
    }
    hideDialog();
  };

  const showEditLinkDialog = useCallback(
      (link: Link, onSubmit: (linkId: string, updates: { name?: string; target?: string }) => void) => {
          setEditLinkProps({ link, onSubmit });
          setDialogType("editLink");
      },
      []
  );

  const handleLinkEdited = (linkId: string, updates: { name?: string; target?: string }) => {
    if (editLinkProps?.onSubmit) {
      editLinkProps.onSubmit(linkId, updates);
    }
    hideDialog();
  };

  const contextValue = {
    showFileOpenDialog,
    showFileSaveDialog,
    hideDialog,
    showCreateLinkDialog,
    showEditLinkDialog,
    showErrorDialog,
  }

  return (
    <DialogContext.Provider value={contextValue}>
      {children}

      {/* Keep dialogs mounted if their props exist, control visibility with dialogType */}

      {/* File Open Dialog */} 
      {fileOpenCallback && (
         <div style={{ display: dialogType === 'fileOpen' ? 'block' : 'none' }}>
           <FileOpenDialog 
             initialPath={initialPath} 
             onSelect={handleFileSelected} 
             onCancel={hideDialog} 
           />
        </div>
      )}

      {/* File Save Dialog */} 
      {fileSaveCallback && (
        <div style={{ display: dialogType === 'fileSave' ? 'block' : 'none' }}>
          <FileSaveDialog
            initialPath={initialPath}
            initialFileName={initialFileName}
            onSave={handleFileSaved}
            onCancel={hideDialog}
          />
        </div>
      )}

      {/* Create Link Dialog */} 
      {createLinkProps && (
        <div style={{ display: dialogType === 'createLink' ? 'block' : 'none' }}>
          <CreateLinkDialog
            targetType={createLinkProps.targetType}
            onSubmit={handleLinkCreated}
            onClose={hideDialog}
          />
        </div>
      )}

      {/* Edit Link Dialog */} 
      {editLinkProps && (
        <div style={{ display: dialogType === 'editLink' ? 'block' : 'none' }}>
          <EditLinkDialog
            link={editLinkProps.link}
            onSubmit={handleLinkEdited}
            onClose={hideDialog}
          />
        </div>
      )}

      {/* Render ErrorDialog conditionally */} 
      {errorDialogMessage && (
         <ErrorDialog message={errorDialogMessage} onClose={hideDialog} />
      )}

    </DialogContext.Provider>
  )
}

export const useDialog = () => {
  const context = useContext(DialogContext)
  if (context === undefined) {
    throw new Error("useDialog must be used within a DialogProvider")
  }
  return context
}
