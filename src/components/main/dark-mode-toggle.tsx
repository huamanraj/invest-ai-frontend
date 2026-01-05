"use client";

import { Moon, Sun } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "./theme-provider";

export function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Toggle
      pressed={theme === "dark"}
      onPressedChange={toggleTheme}
      aria-label="Toggle dark mode"
      variant="outline"
      size="sm"
    >
      {theme === "dark" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </Toggle>
  );
}
