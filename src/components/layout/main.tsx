/**
 * Main Content Wrapper Component
 *
 * Generic main content container with flexible layout options
 * - Supports fixed and fluid layouts
 * - Handles overflow and flex-grow
 * - Can be used across different routes
 */

"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface MainProps extends HTMLAttributes<HTMLElement> {
  /**
   * Whether the main content should have fixed height
   * @default false
   */
  fixed?: boolean;

  /**
   * Whether to use full width (no max-width constraint)
   * @default false
   */
  fluid?: boolean;
}

export const Main = forwardRef<HTMLElement, MainProps>(
  ({ fixed, className, fluid, ...props }, ref) => {
    return (
      <main
        ref={ref}
        data-layout={fixed ? "fixed" : "auto"}
        className={cn(
          "px-4 py-6 overflow-x-hidden sm:px-6 lg:px-8",
          fixed && "flex flex-col flex-grow overflow-hidden",
          !fluid && "w-full mx-auto",
          className
        )}
        {...props}
      />
    );
  }
);

Main.displayName = "Main";
