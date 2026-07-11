// src/features/upload/components/dropzone.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCsvFile } from "../utils/parse-csv";

interface DropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFileSelected, disabled }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndEmit = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!isCsvFile(file)) {
        setError(`"${file.name}" isn't a CSV file. Please upload a .csv file.`);
        return;
      }
      setError(null);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);
      if (disabled) return;
      validateAndEmit(e.dataTransfer.files?.[0]);
    },
    [disabled, validateAndEmit]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndEmit(e.target.files?.[0]);
    e.target.value = "";
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragActive(false);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-20 text-center transition-all duration-200",
          "border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/40",
          isDragActive && "border-primary bg-primary/5 shadow-md",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
          <UploadCloud className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">
            Drag and drop your CSV file here
          </p>
          <p className="text-sm text-muted-foreground">
            or{" "}
            <span className="font-medium text-primary underline underline-offset-2">
              click to browse
            </span>{" "}
            · .csv only
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}