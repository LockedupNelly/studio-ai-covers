import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";

interface ColorPickerPopoverProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  themeMode?: "light" | "dark";
  hideLabel?: boolean; // For mobile - just show color circle
}

// Simplified color palette - vibrant colors (removed brown and blue-grey)
export const colorPalette = [
  { id: "red", name: "Red", color: "#ff2d2d" },
  { id: "orange", name: "Orange", color: "#ff8800" },
  { id: "yellow", name: "Yellow", color: "#ffcc00" },
  { id: "green", name: "Green", color: "#00dd66" },
  { id: "teal", name: "Teal", color: "#00d4c8" },
  { id: "blue", name: "Blue", color: "#3388ff" },
  { id: "purple", name: "Purple", color: "#9944ff" },
  { id: "pink", name: "Pink", color: "#ff44aa" },
  { id: "white", name: "White", color: "#ffffff" },
  { id: "black", name: "Black", color: "#1a1a1a" },
];

export const ColorPickerPopover = ({ label, value, onChange, themeMode = "dark", hideLabel = false }: ColorPickerPopoverProps) => {
  const [open, setOpen] = useState(false);
  
  const selectedColor = colorPalette.find(c => c.id === value);
  const hasSelection = !!value && !!selectedColor;
  
  const handleSelect = (colorId: string) => {
    onChange(colorId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`h-10 w-12 rounded-lg border flex items-center justify-center ${
            themeMode === "light" 
              ? "bg-white border-gray-300 hover:bg-gray-50" 
              : "bg-secondary border-border hover:bg-secondary/80"
          }`}
        >
          {/* Square gradient color preview */}
          <div
            className="w-7 h-7 rounded-md flex-shrink-0 border border-border/50"
            style={{ 
              background: hasSelection 
                ? `linear-gradient(135deg, ${selectedColor.color} 0%, ${selectedColor.color}dd 50%, ${selectedColor.color}bb 100%)`
                : "linear-gradient(135deg, #ff2d2d 0%, #ffcc00 33%, #00dd66 66%, #3388ff 100%)"
            }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="grid grid-cols-5 gap-2">
          {colorPalette.map((color) => (
            <button
              key={color.id}
              onClick={() => handleSelect(color.id)}
              className={`relative aspect-square rounded-md transition-transform hover:scale-110 ${
                value === color.id ? "ring-2 ring-primary ring-offset-2" : ""
              } ${color.id === "white" ? "border border-border" : ""} ${color.id === "black" ? "ring-1 ring-white/50" : ""}`}
              style={{ backgroundColor: color.color }}
              title={color.name}
            >
              {value === color.id && (
                <Check className={`absolute inset-0 m-auto w-4 h-4 ${
                  ["white", "yellow"].includes(color.id) ? "text-gray-800" : "text-white"
                }`} />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {hasSelection ? `Selected: ${selectedColor.name}` : "Select a color"}
        </p>
      </PopoverContent>
    </Popover>
  );
};

// Helper to get actual color value from ID
export const getColorValue = (colorId: string): string => {
  if (colorId === "none" || !colorId) return "";
  const color = colorPalette.find(c => c.id === colorId);
  return color?.name || colorId;
};

// Helper to get hex color value from ID
export const getColorHex = (colorId: string): string => {
  if (colorId === "none" || !colorId) return "";
  const color = colorPalette.find(c => c.id === colorId);
  return color ? color.color : "";
};
