"use client";

import { Suspense } from "react";
import type { Manifest, ResolvedSilicaConfig } from "@silicajs/core/runtime";
import {
  DarkModeToggle,
  SearchTrigger,
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

import { useCurrentSlug } from "./use-current-slug.js";

export type SidebarProps = {
  manifest: Manifest;
  config: ResolvedSilicaConfig;
};

export function Sidebar({ manifest, config }: SidebarProps) {
  const currentSlug = useCurrentSlug();
  return (
    <ShadcnSidebar>
      <SidebarHeader className="gap-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <a
            href="/"
            className="truncate text-sm font-semibold tracking-tight text-foreground"
          >
            {config.title}
          </a>
          <DarkModeToggle />
        </div>
        <div className="px-1 pb-1">
          <SearchTrigger className="w-full justify-start" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <VaultTree manifest={manifest} currentSlug={currentSlug} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {config.auth ? (
        <SidebarFooter className="border-t border-sidebar-border">
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </SidebarFooter>
      ) : null}
      <SidebarRail />
    </ShadcnSidebar>
  );
}
