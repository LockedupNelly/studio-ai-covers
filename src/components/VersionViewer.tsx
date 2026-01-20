import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, ChevronLeft, ChevronRight, Pencil, RotateCw, Clock, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GenerationVersion {
  id: string;
  image_url: string;
  version: number;
  edit_instructions: string | null;
  created_at: string;
  prompt: string;
  genre: string;
  style: string;
  mood: string;
  song_title?: string | null;
  artist_name?: string | null;
  cover_analysis?: any;
}

interface VersionViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: GenerationVersion[];
  onDownload: (imageUrl: string, prompt: string) => void;
  onDelete: (id: string) => void;
  onEdit: (generation: GenerationVersion) => void;
  onRerun: (generation: GenerationVersion) => void;
}

export const VersionViewer = ({
  open,
  onOpenChange,
  versions,
  onDownload,
  onDelete,
  onEdit,
  onRerun,
}: VersionViewerProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Sort versions by version number (oldest first for display)
  const sortedVersions = [...versions].sort((a, b) => a.version - b.version);
  const selectedVersion = sortedVersions[selectedIndex];
  
  if (!selectedVersion) return null;

  const handlePrev = () => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => Math.min(sortedVersions.length - 1, prev + 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            VERSION HISTORY
            <Badge variant="secondary" className="ml-2">
              {sortedVersions.length} version{sortedVersions.length !== 1 ? "s" : ""}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6">
          {/* Main preview */}
          <div className="flex-1 space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-border bg-secondary">
              <img
                src={selectedVersion.image_url}
                alt={`Version ${selectedVersion.version}`}
                className="w-full h-full object-cover"
              />
              
              {/* Version badge */}
              <div className="absolute top-3 left-3">
                <Badge className="bg-primary/90 text-primary-foreground">
                  v{selectedVersion.version}
                </Badge>
              </div>
              
              {/* Navigation arrows */}
              {sortedVersions.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className={cn(
                      "absolute left-2 top-1/2 -translate-y-1/2 rounded-full",
                      selectedIndex === 0 && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={handlePrev}
                    disabled={selectedIndex === 0}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 rounded-full",
                      selectedIndex === sortedVersions.length - 1 && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={handleNext}
                    disabled={selectedIndex === sortedVersions.length - 1}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(selectedVersion)}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => onRerun(selectedVersion)}
              >
                <RotateCw className="w-4 h-4 mr-2" />
                Rerun
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(selectedVersion.image_url, selectedVersion.prompt)}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(selectedVersion.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Version list sidebar */}
          <div className="w-48 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">All Versions</p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {sortedVersions.map((ver, idx) => (
                <button
                  key={ver.id}
                  onClick={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-full rounded-lg overflow-hidden border-2 transition-all",
                    idx === selectedIndex
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className="aspect-square relative">
                    <img
                      src={ver.image_url}
                      alt={`Version ${ver.version}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        v{ver.version}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Edit instructions for selected version */}
            {selectedVersion.edit_instructions && (
              <div className="mt-4 p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Wand2 className="w-3 h-3" />
                  Edit applied:
                </div>
                <p className="text-xs text-foreground line-clamp-3">
                  "{selectedVersion.edit_instructions}"
                </p>
              </div>
            )}
            
            {/* Timestamp */}
            <p className="text-xs text-muted-foreground">
              Created: {new Date(selectedVersion.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};