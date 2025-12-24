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

// Color palette with shades - vibrant versions included (AI Select removed)
const colorPalette = [
  // Row 1 - Reds (with vibrant)
  { id: "red-vibrant", name: "Vibrant Red", color: "#ff0000" },
  { id: "red", name: "Red", color: "#ef4444" },
  { id: "red-dark", name: "Dark Red", color: "#991b1b" },
  // Row 2 - Oranges (with vibrant)
  { id: "orange-vibrant", name: "Vibrant Orange", color: "#ff6600" },
  { id: "orange", name: "Orange", color: "#f97316" },
  { id: "orange-dark", name: "Dark Orange", color: "#c2410c" },
  // Row 3 - Yellows (with vibrant)
  { id: "yellow-vibrant", name: "Vibrant Yellow", color: "#ffee00" },
  { id: "yellow", name: "Yellow", color: "#eab308" },
  { id: "gold", name: "Gold", color: "#d4af37" },
  // Row 4 - Greens (with vibrant)
  { id: "green-vibrant", name: "Vibrant Green", color: "#00ff00" },
  { id: "green", name: "Green", color: "#22c55e" },
  { id: "green-dark", name: "Dark Green", color: "#166534" },
  // Row 5 - Teals/Cyans (with vibrant)
  { id: "cyan-vibrant", name: "Vibrant Cyan", color: "#00ffff" },
  { id: "teal", name: "Teal", color: "#14b8a6" },
  { id: "cyan", name: "Cyan", color: "#06b6d4" },
  // Row 6 - Blues (with vibrant)
  { id: "blue-vibrant", name: "Vibrant Blue", color: "#0066ff" },
  { id: "blue", name: "Blue", color: "#3b82f6" },
  { id: "blue-dark", name: "Dark Blue", color: "#1e40af" },
  // Row 7 - Purples (with vibrant)
  { id: "purple-vibrant", name: "Vibrant Purple", color: "#9900ff" },
  { id: "purple", name: "Purple", color: "#8b5cf6" },
  { id: "purple-dark", name: "Dark Purple", color: "#581c87" },
  // Row 8 - Pinks (with vibrant)
  { id: "pink-vibrant", name: "Vibrant Pink", color: "#ff00aa" },
  { id: "pink", name: "Pink", color: "#ec4899" },
  { id: "pink-dark", name: "Dark Pink", color: "#9d174d" },
  // Row 9 - Neutrals
  { id: "white", name: "White", color: "#ffffff" },
  { id: "gray-light", name: "Light Gray", color: "#d1d5db" },
  { id: "gray", name: "Gray", color: "#6b7280" },
  { id: "gray-dark", name: "Dark Gray", color: "#374151" },
  { id: "brown-light", name: "Light Brown", color: "#a16207" },
  { id: "brown", name: "Brown", color: "#78350f" },
  { id: "black", name: "Black", color: "#000000" },
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
              } ${color.id === "white" ? "border border-border" : ""}`}
              style={{ backgroundColor: color.color }}
              title={color.name}
            >
              {value === color.id && (
                <Check className={`absolute inset-0 m-auto w-4 h-4 ${
                  ["white", "yellow-vibrant", "yellow", "gold", "cyan-vibrant", "green-vibrant"].includes(color.id) ? "text-gray-800" : "text-white"
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
  if (colorId === "ai" || !colorId) return "";
  const color = colorPalette.find(c => c.id === colorId);
  return color?.name || colorId;
};
