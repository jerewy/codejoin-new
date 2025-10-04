"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Folder, Code, Database, Image, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProjectExportModalProps {
  projectId: string;
  projectName: string;
  files: Array<{
    id: string;
    name: string;
    type: "file" | "folder";
    content?: string | null;
    language?: string | null;
    parent_id?: string | null;
  }>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExportOptions {
  format: "zip" | "json";
  includeMetadata: boolean;
  includeHistory: boolean;
  includeSettings: boolean;
  selectedFiles: string[];
  compressionLevel: "none" | "fast" | "best";
}

export default function ProjectExportModal({
  projectId,
  projectName,
  files,
  isOpen,
  onOpenChange,
}: ProjectExportModalProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "zip",
    includeMetadata: true,
    includeHistory: false,
    includeSettings: true,
    selectedFiles: files.map((f) => f.id),
    compressionLevel: "fast",
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  /**
   * Memoize a quick lookup map so we can rebuild folder paths while exporting.
   * Having this map prevents repeatedly searching the array every time a file
   * needs to discover who its parent folder is.
   */
  const filesById = useMemo(() => {
    return new Map(files.map((file) => [file.id, file]));
  }, [files]);

  /**
   * Only keep nodes that the user explicitly checked in the UI.
   * We filter against the `files` prop rather than the memoised map so that
   * folder children are always sourced from the most up-to-date data.
   */
  const selectedNodes = useMemo(
    () => files.filter((file) => exportOptions.selectedFiles.includes(file.id)),
    [files, exportOptions.selectedFiles]
  );

  const getFileIcon = (file: any) => {
    if (file.type === "folder") {
      return <Folder className="h-4 w-4" />;
    }

    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

    if (
      [
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".py",
        ".java",
        ".cpp",
        ".c",
        ".cs",
        ".php",
        ".rb",
        ".go",
        ".rs",
      ].includes(ext)
    ) {
      return <Code className="h-4 w-4" />;
    }
    if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico"].includes(ext)) {
      return <Image className="h-4 w-4" />;
    }
    if (ext === ".sql") {
      return <Database className="h-4 w-4" />;
    }

    return <File className="h-4 w-4" />;
  };

  /**
   * Calculate a rough size estimate so users know how big their download will be.
   * We prefer TextEncoder here because it mimics how strings will actually be
   * stored inside the Blob created for the download (UTF-8 bytes).
   */
  const formatFileSize = (nodes: typeof files): string => {
    const totalSize = nodes.reduce((acc, node) => {
      if (node.type === "file" && typeof node.content === "string") {
        return acc + new TextEncoder().encode(node.content).byteLength;
      }

      // Folders do not carry content, so we add a tiny overhead to avoid 0B results.
      return acc + 256;
    }, 0);

    if (totalSize <= 0) {
      return "0 Bytes";
    }

    const units = ["Bytes", "KB", "MB", "GB"] as const;
    const exponent = Math.min(Math.floor(Math.log(totalSize) / Math.log(1024)), units.length - 1);
    const value = totalSize / Math.pow(1024, exponent);
    return `${value.toFixed(value > 100 ? 0 : 2)} ${units[exponent]}`;
  };

  const toggleFileSelection = (fileId: string) => {
    setExportOptions((prev) => ({
      ...prev,
      selectedFiles: prev.selectedFiles.includes(fileId)
        ? prev.selectedFiles.filter((id) => id !== fileId)
        : [...prev.selectedFiles, fileId],
    }));
  };

  const selectAllFiles = () => {
    setExportOptions((prev) => ({
      ...prev,
      selectedFiles: files.map((f) => f.id),
    }));
  };

  const deselectAllFiles = () => {
    setExportOptions((prev) => ({
      ...prev,
      selectedFiles: [],
    }));
  };

  /**
   * Utility helper to resolve the full path of a node, including all parent folders.
   * Example: a file named "App.tsx" inside "src/components" becomes
   * ["src", "components", "App.tsx"]
   */
  const getPathSegments = (nodeId: string): string[] => {
    const segments: string[] = [];
    let current = filesById.get(nodeId);
    const visited = new Set<string>();

    while (current && !visited.has(current.id)) {
      segments.unshift(current.name);
      visited.add(current.id);
      if (!current.parent_id) {
        break;
      }
      current = filesById.get(current.parent_id);
    }

    return segments;
  };

  const downloadBlob = (blob: Blob, extension: "zip" | "json") => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${projectName.replace(/[^a-zA-Z0-9-_]/g, "_")}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const createDownload = async () => {
    if (selectedNodes.length === 0) {
      toast.error("Select at least one file or folder to export");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      if (exportOptions.format === "json") {
        // JSON export keeps the structure human-readable for quick inspection.
        const exportPayload = {
          project: {
            id: projectId,
            name: projectName,
            exportedAt: new Date().toISOString(),
          },
          files: selectedNodes.map((node) => ({
            id: node.id,
            name: node.name,
            type: node.type,
            parent_id: node.parent_id,
            language: node.language,
            content: node.type === "file" ? node.content ?? "" : undefined,
            path: getPathSegments(node.id),
          })),
          options: exportOptions,
        };

        if (!exportOptions.includeMetadata) {
          delete (exportPayload as any).options;
        }

        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
          type: "application/json",
        });
        downloadBlob(blob, "json");
        setExportProgress(100);
        toast.success(`Project "${projectName}" exported successfully!`);
        onOpenChange(false);
        return;
      }

      const zip = new JSZip();
      const folderCache = new Map<string, JSZip>();
      folderCache.set("", zip);

      const ensureFolder = (pathSegments: string[]) => {
        let currentPath = "";
        let folder = zip;

        for (const segment of pathSegments) {
          currentPath = currentPath ? `${currentPath}/${segment}` : segment;
          if (!folderCache.has(currentPath)) {
            const nextFolder = folder.folder(segment);
            if (nextFolder) {
              folderCache.set(currentPath, nextFolder);
              folder = nextFolder;
            }
          } else {
            folder = folderCache.get(currentPath)!;
          }
        }

        return folder;
      };

      // Reserve the first 40% of the progress bar for iterating the selection.
      const stepWeight = selectedNodes.length > 0 ? 40 / selectedNodes.length : 40;
      let progress = 0;

      for (const node of selectedNodes) {
        const path = getPathSegments(node.id);

        if (node.type === "folder") {
          ensureFolder(path);
        } else {
          const folderPath = path.slice(0, -1);
          const folder = ensureFolder(folderPath);
          const fileName = path[path.length - 1];
          folder.file(fileName, node.content ?? "");
        }

        progress += stepWeight;
        setExportProgress(Math.min(progress, 40));
      }

      if (exportOptions.includeMetadata) {
        zip.file(
          "metadata.json",
          JSON.stringify(
            {
              projectId,
              projectName,
              exportedAt: new Date().toISOString(),
              selectedCount: selectedNodes.length,
              languages: [
                ...new Set(
                  selectedNodes
                    .map((node) => node.language)
                    .filter((language): language is string => Boolean(language))
                ),
              ],
            },
            null,
            2
          )
        );
      }

      if (exportOptions.includeSettings) {
        zip.file(
          "settings.json",
          JSON.stringify(
            {
              compressionLevel: exportOptions.compressionLevel,
              includeHistory: exportOptions.includeHistory,
            },
            null,
            2
          )
        );
      }

      if (exportOptions.includeHistory) {
        zip.file(
          "history.json",
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              executions: [],
            },
            null,
            2
          )
        );
      }

      const compression = exportOptions.compressionLevel === "none" ? "STORE" : "DEFLATE";
      const compressionOptions =
        compression === "DEFLATE"
          ? { level: exportOptions.compressionLevel === "best" ? 9 : 1 }
          : undefined;

      const blob = await zip.generateAsync(
        {
          type: "blob",
          compression,
          compressionOptions,
        },
        (metadata) => {
          // Use the remaining 60% of the progress bar for compression feedback.
          setExportProgress(40 + (metadata.percent * 0.6));
        }
      );

      downloadBlob(blob, "zip");
      setExportProgress(100);
      toast.success(`Project "${projectName}" exported successfully!`);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        "Export failed: " + (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export "{projectName}"
          </DialogTitle>
          <DialogDescription>
            Download your project files and settings for backup or sharing
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* File Selection */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Select Files ({selectedNodes.length}/{files.length})</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllFiles}
                  disabled={isExporting}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllFiles}
                  disabled={isExporting}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex-1 border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      id={file.id}
                      checked={exportOptions.selectedFiles.includes(file.id)}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                      disabled={isExporting}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      {getFileIcon(file)}
                      <span className="text-sm">{file.name}</span>
                      {file.language && (
                        <Badge variant="outline" className="text-xs">
                          {file.language}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">
                <p>Selected: {selectedNodes.length} files</p>
                <p>Estimated size: {formatFileSize(selectedNodes)}</p>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="w-80 flex flex-col min-h-0">
            <h3 className="font-medium mb-4">Export Options</h3>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
              {/* Format */}
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={exportOptions.format}
                  onValueChange={(value: "zip" | "json") =>
                    setExportOptions((prev) => ({ ...prev, format: value }))
                  }
                  disabled={isExporting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zip">ZIP Archive</SelectItem>
                    <SelectItem value="json">JSON Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Compression */}
              <div className="space-y-2">
                <Label>Compression Level</Label>
                <Select
                  value={exportOptions.compressionLevel}
                  onValueChange={(value: "none" | "fast" | "best") =>
                    setExportOptions((prev) => ({ ...prev, compressionLevel: value }))
                  }
                  disabled={isExporting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Compression</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                    <SelectItem value="best">Best</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Include Options */}
              <div className="space-y-3">
                <Label>Include in Export</Label>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="metadata"
                    checked={exportOptions.includeMetadata}
                    onCheckedChange={(checked) =>
                      setExportOptions((prev) => ({ ...prev, includeMetadata: !!checked }))
                    }
                    disabled={isExporting}
                  />
                  <Label htmlFor="metadata" className="text-sm">
                    Project metadata
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="history"
                    checked={exportOptions.includeHistory}
                    onCheckedChange={(checked) =>
                      setExportOptions((prev) => ({ ...prev, includeHistory: !!checked }))
                    }
                    disabled={isExporting}
                  />
                  <Label htmlFor="history" className="text-sm">
                    Execution history
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="settings"
                    checked={exportOptions.includeSettings}
                    onCheckedChange={(checked) =>
                      setExportOptions((prev) => ({ ...prev, includeSettings: !!checked }))
                    }
                    disabled={isExporting}
                  />
                  <Label htmlFor="settings" className="text-sm">
                    Project settings
                  </Label>
                </div>
              </div>

              {/* Export Progress */}
              {isExporting && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Exporting...</span>
                      <span>{Math.round(exportProgress)}%</span>
                    </div>
                    <Progress value={exportProgress} />
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-auto border-t border-border/60 pt-4">
              <Button
                onClick={createDownload}
                disabled={selectedNodes.length === 0 || isExporting}
                className={cn(
                  "w-full justify-center font-semibold text-slate-950 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300",
                  "shadow-[0_22px_45px_-20px_rgba(249,115,22,0.65)] border border-orange-500/40",
                  "hover:from-orange-400 hover:via-orange-300 hover:to-amber-200 hover:shadow-[0_25px_55px_-18px_rgba(249,115,22,0.7)]",
                  "focus-visible:ring-orange-400/60 focus-visible:border-orange-400 focus-visible:ring-offset-2",
                  isExporting && "opacity-90"
                )}
              >
                {isExporting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin mr-2" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Project
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isExporting}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}