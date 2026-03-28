import { useState, useRef, useCallback, DragEvent } from 'react';

interface UseFileDropOptions {
  accept: string[];          // e.g. ['.zip', '.java', '.c', '.cpp']
  onFile: (file: File) => void;
}

export function useFileDrop({ accept, onFile }: UseFileDropOptions) {
  const [dragActive, setDragActive] = useState(false);
  // Counter prevents flicker when dragging over child elements
  const dragCounter = useRef(0);

  const isAccepted = (name: string) => {
    const lower = name.toLowerCase();
    return accept.some(ext => lower.endsWith(ext));
  };

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setDragActive(true);
    }
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setDragActive(false);
    }
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragActive(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Take the first valid file
    for (let i = 0; i < files.length; i++) {
      if (isAccepted(files[i].name)) {
        onFile(files[i]);
        return;
      }
    }
  }, [accept, onFile]);

  return {
    dragActive,
    dragHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
