"use client";

import { Suspense } from "react";
import type { ThemeLayoutConfig } from "@silicajs/core/theme";
import {
  DarkModeToggle,
  SearchTrigger,
  SilicaLink,
  UserMenu,
  VaultTree,
} from "@silicajs/components";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarRail,
} from "@silicajs/ui/components/sidebar";

export type SidebarProps = {
  navigationEndpoint: string;
  config: ThemeLayoutConfig;
};

export function Sidebar({ navigationEndpoint, config }: SidebarProps) {
  return (
    <ShadcnSidebar>
      <SidebarHeader className="gap-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <SilicaLink
            href="/"
            className="truncate text-sm font-semibold tracking-tight text-foreground"
          >
            {config.title}
          </SilicaLink>
          <DarkModeToggle />
        </div>
        <div className="px-1 pb-1">
          <SearchTrigger className="w-full justify-start" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <VaultTree navigationEndpoint={navigationEndpoint} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {config.authEnabled ? (
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <Suspense fallback={null}>
            <UserMenu logo={config.logo} />
          </Suspense>
        </SidebarFooter>
      ) : null}
      <SidebarRail />
    </ShadcnSidebar>
  );
}
