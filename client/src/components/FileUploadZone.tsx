import { useCallback, useState } from "react";
import { Upload, X, FileText, FileImage, File, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface UploadedFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
}

interface FileUploadZoneProps {
  onUpload: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  maxSizeMB?: number;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <FileImage className="h-5 w-5 text-blue-500" />;
  if (type === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploadZone({
  onUpload,
  accept,
  multiple = true,
  disabled = false,
  maxSizeMB = 50,
}: FileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newFiles = Array.from(fileList);
      const maxSize = maxSizeMB * 1024 * 1024;

      const validFiles: File[] = [];
      const uploaded: UploadedFile[] = [];

      for (const file of newFiles) {
        if (file.size > maxSize) {
          uploaded.push({
            file,
            progress: 0,
            status: "error",
            error: `File exceeds ${maxSizeMB}MB limit`,
          });
        } else {
          validFiles.push(file);
          uploaded.push({ file, progress: 0, status: "pending" });
        }
      }

      setFiles((prev) => [...prev, ...uploaded]);
      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
    },
    [onUpload, maxSizeMB]
  );

  const handleDrag = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (disabled) return;
      if (e.dataTransfer.files?.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, handleFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
        `}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          {dragActive ? "Drop files here" : "Drag & drop files here, or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, DOCX, XLSX, DWG, JPG, PNG up to {maxSizeMB}MB
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item, index) => (
            <div
              key={`${item.file.name}-${index}`}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              {getFileIcon(item.file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.file.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(item.file.size)}</span>
                  {item.status === "uploading" && (
                    <Progress value={item.progress} className="w-24 h-1.5" />
                  )}
                  {item.status === "complete" && (
                    <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
                      <CheckCircle className="h-3 w-3" /> Uploaded
                    </Badge>
                  )}
                  {item.status === "error" && (
                    <Badge variant="outline" className="text-red-600 border-red-300 gap-1">
                      <AlertCircle className="h-3 w-3" /> {item.error}
                    </Badge>
                  )}
                  {item.status === "uploading" && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
