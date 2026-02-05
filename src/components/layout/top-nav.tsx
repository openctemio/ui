/**
 * Top Navigation Component
 *
 * Generic horizontal navigation with responsive design
 * - Desktop: Horizontal links
 * - Mobile: Dropdown menu
 * - Active link highlighting
 * - Disabled state support
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TopNavLink {
  /**
   * Link title/label
   */
  title: string;

  /**
   * Link URL
   */
  href: string;

  /**
   * Whether the link is disabled
   * @default false
   */
  disabled?: boolean;
}

type TopNavProps = React.HTMLAttributes<HTMLElement> & {
  /**
   * Navigation links to display
   */
  links: TopNavLink[];
};

export function TopNav({ className, links, ...props }: TopNavProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Dropdown */}
      <div className="lg:hidden">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline" className="md:size-7">
              <Menu />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="bottom" align="start">
            {links.map(({ title, href, disabled }) => {
              const isActive = pathname === href;
              return (
                <DropdownMenuItem key={href} asChild>
                  <Link
                    href={href}
                    className={cn(
                      "block w-full",
                      isActive ? "text-primary font-medium" : "text-muted-foreground",
                      disabled && "pointer-events-none opacity-50"
                    )}
                  >
                    {title}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop Nav */}
      <nav
        className={cn(
          "hidden items-center space-x-4 lg:flex lg:space-x-4 xl:space-x-6",
          className
        )}
        {...props}
      >
        {links.map(({ title, href, disabled }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isActive ? "text-primary" : "text-muted-foreground",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              {title}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
