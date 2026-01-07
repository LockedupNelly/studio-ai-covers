import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";

interface ColorPickerPopoverProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  themeMode?: "light" | "dark";
}

// Simplified color palette - vibrant colors (no None option - click to toggle)
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
  { id: "gray", name: "Gray", color: "#7788aa" },
  { id: "brown", name: "Brown", color: "#bb6633" },
  { id: "black", name: "Black", color: "#1a1a1a" },
];

export const ColorPickerPopover = ({ label, value, onChange, themeMode = "dark" }: ColorPickerPopoverProps) => {
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
        <Button
          variant="outline"
          className={`w-full h-10 justify-start gap-2 ${
            themeMode === "light" 
              ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50" 
              : "bg-secondary border-border text-foreground hover:bg-secondary/80"
          }`}
        >
          {hasSelection ? (
            <div
              className="w-5 h-5 rounded-full border border-border flex-shrink-0"
              style={{ backgroundColor: selectedColor.color }}
            />
          ) : (
            <div
              className="w-5 h-5 rounded-full border border-border flex-shrink-0 bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500"
            />
          )}
          <span className="text-sm truncate">
            {hasSelection ? selectedColor.name : label}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="grid grid-cols-7 gap-1.5">
          {colorPalette.map((color) => (
            <button
              key={color.id}
              onClick={() => handleSelect(color.id)}
              className={`relative w-8 h-8 rounded-md transition-transform hover:scale-110 ${
                value === color.id ? "ring-2 ring-primary ring-offset-2" : ""
              } ${color.id === "white" ? "border border-border" : ""} ${
                (color as any).isNone ? "border-2 border-border bg-secondary" : ""
              }`}
              style={(color as any).isNone ? {} : { backgroundColor: color.color }}
              title={color.name}
            >
              {(color as any).isNone && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-0.5 bg-muted-foreground/50 rotate-45 absolute" />
                </div>
              )}
              {value === color.id && !(color as any).isNone && (
                <Check className={`absolute inset-0 m-auto w-4 h-4 ${
                  ["white", "yellow"].includes(color.id) ? "text-gray-800" : "text-white"
                }`} />
              )}
              {value === color.id && (color as any).isNone && (
                <Check className="absolute -top-1 -right-1 w-3 h-3 text-primary" />
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
  return (color && !(color as any).isNone) ? color.color : "";
};
