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

// Color palette with shades
const colorPalette = [
  // Row 1 - Reds
  { id: "ai", name: "AI Select", color: "linear-gradient(135deg, hsl(0 84% 60%) 0%, hsl(0 0% 75%) 100%)" },
  { id: "red-light", name: "Light Red", color: "#f87171" },
  { id: "red", name: "Red", color: "#ef4444" },
  { id: "red-dark", name: "Dark Red", color: "#991b1b" },
  // Row 2 - Oranges
  { id: "orange-light", name: "Light Orange", color: "#fb923c" },
  { id: "orange", name: "Orange", color: "#f97316" },
  { id: "orange-dark", name: "Dark Orange", color: "#c2410c" },
  // Row 3 - Yellows
  { id: "yellow-light", name: "Light Yellow", color: "#fde047" },
  { id: "yellow", name: "Yellow", color: "#eab308" },
  { id: "gold", name: "Gold", color: "#d4af37" },
  // Row 4 - Greens
  { id: "green-light", name: "Light Green", color: "#4ade80" },
  { id: "green", name: "Green", color: "#22c55e" },
  { id: "green-dark", name: "Dark Green", color: "#166534" },
  // Row 5 - Teals/Cyans
  { id: "teal-light", name: "Light Teal", color: "#2dd4bf" },
  { id: "teal", name: "Teal", color: "#14b8a6" },
  { id: "cyan", name: "Cyan", color: "#06b6d4" },
  // Row 6 - Blues
  { id: "blue-light", name: "Light Blue", color: "#60a5fa" },
  { id: "blue", name: "Blue", color: "#3b82f6" },
  { id: "blue-dark", name: "Dark Blue", color: "#1e40af" },
  // Row 7 - Purples
  { id: "purple-light", name: "Light Purple", color: "#a78bfa" },
  { id: "purple", name: "Purple", color: "#8b5cf6" },
  { id: "purple-dark", name: "Dark Purple", color: "#581c87" },
  // Row 8 - Pinks
  { id: "pink-light", name: "Light Pink", color: "#f9a8d4" },
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
  
  const selectedColor = colorPalette.find(c => c.id === value) || colorPalette[0];
  const isAiSelect = value === "ai" || !value;
  
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
          {isAiSelect ? (
            <div
              className="w-5 h-5 rounded-full border border-border"
              style={{ background: "linear-gradient(135deg, hsl(0 84% 60%) 0%, hsl(0 0% 75%) 100%)" }}
            />
          ) : (
            <div
              className="w-5 h-5 rounded-full border border-border"
              style={{ backgroundColor: selectedColor.color }}
            />
          )}
          <span className="text-sm">
            {isAiSelect ? label : selectedColor.name}
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
              style={{
                background: color.id === "ai"
                  ? "linear-gradient(135deg, hsl(0 84% 60%) 0%, hsl(0 0% 75%) 100%)"
                  : color.color
              }}
              title={color.name}
            >
              {value === color.id && (
                <Check className={`absolute inset-0 m-auto w-4 h-4 ${
                  ["white", "yellow-light", "yellow", "gold"].includes(color.id) ? "text-gray-800" : "text-white"
                }`} />
              )}
              {color.id === "ai" && value !== "ai" && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-[8px] font-bold">AI</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {selectedColor.name === "AI Select" ? "AI will choose based on design" : `Selected: ${selectedColor.name}`}
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
