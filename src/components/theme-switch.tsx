"use client";

import { useEffect } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeSwitch() {
  const { theme, setTheme, systemTheme } = useTheme();

  useEffect(() => {
    const current =
      theme === "system"
        ? systemTheme === "dark"
          ? "#020817"
          : "#ffffff"
        : theme === "dark"
        ? "#020817"
        : "#ffffff";

    const meta = document.querySelector("meta[name='theme-color']");
    if (meta) meta.setAttribute("content", current);
  }, [theme, systemTheme]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative scale-95 rounded-full"
        >
          <Sun className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[8rem]">
        {["light", "dark", "system"].map((t) => (
          <DropdownMenuItem key={t} onClick={() => setTheme(t)}>
            {t[0].toUpperCase() + t.slice(1)}
            <Check
              size={14}
              className={cn("ms-auto", theme !== t && "hidden")}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}