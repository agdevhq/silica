"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import type { Manifest, ManifestEntry } from "@silicajs/core/runtime";

import { cn } from "@silicajs/ui/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@silicajs/ui/components/collapsible";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@silicajs/ui/components/sidebar";

import { prettySegment, slugToHref } from "./slug.js";

const STORAGE_KEY = "silica-tree-expanded";

type FolderNode = {
  key: string;
  name: string;
  fullPath: string;
  entry?: ManifestEntry;
  children: FolderNode[];
};

function emptyNode(name: string, fullPath: string): FolderNode {
  return { key: fullPath || "/", name, fullPath, children: [] };
}

function buildTreeFromManifest(manifest: Manifest): {
  nodes: FolderNode[];
  homeEntry?: ManifestEntry;
} {
  const root = emptyNode("", "");
  const byPath = new Map<string, FolderNode>([["", root]]);
  let homeEntry: ManifestEntry | undefined;

  for (const entry of manifest.entries) {
    if (entry.slug === "index") {
      homeEntry = entry;
      continue;
    }
    const segments = entry.slug.split("/");
    let parent = root;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!;
      const isLast = i === segments.length - 1;
      const fullPath = segments.slice(0, i + 1).join("/");
      if (isLast && segment === "index") {
        parent.entry = entry;
        continue;
      }
      let node = byPath.get(fullPath);
      if (!node) {
        node = emptyNode(segment, fullPath);
        byPath.set(fullPath, node);
        parent.children.push(node);
      }
      if (isLast) node.entry = entry;
      parent = node;
    }
  }

  const sortRecursively = (node: FolderNode) => {
    const folders = node.children.filter((c) => c.children.length > 0);
    const leaves = node.children.filter((c) => c.children.length === 0);
    folders.sort((a, b) => a.name.localeCompare(b.name));
    leaves.sort((a, b) => {
      const ta = a.entry?.title ?? a.name;
      const tb = b.entry?.title ?? b.name;
      return ta.localeCompare(tb);
    });
    node.children = [...folders, ...leaves];
    for (const child of node.children) sortRecursively(child);
  };
  sortRecursively(root);

  return { nodes: root.children, homeEntry };
}

function ancestorIdsOf(slug: string | undefined): string[] {
  if (!slug || slug === "index") return [];
  const segments = slug.split("/");
  const out: string[] = [];
  for (let i = 1; i < segments.length; i++) {
    out.push(segments.slice(0, i).join("/"));
  }
  return out;
}

function activeIdFromSlug(slug: string | undefined): string | undefined {
  if (!slug || slug === "index") return undefined;
  if (slug.endsWith("/index")) return slug.slice(0, -"/index".length);
  return slug;
}

export type VaultTreeProps = {
  manifest: Manifest;
  currentSlug?: string;
  showHomeLink?: boolean;
};

export function VaultTree({
  manifest,
  currentSlug,
  showHomeLink = true,
}: VaultTreeProps) {
  const { nodes, homeEntry } = React.useMemo(
    () => buildTreeFromManifest(manifest),
    [manifest]
  );

  const activeId = activeIdFromSlug(currentSlug);
  const homeIsActive = currentSlug === "index" || currentSlug === undefined;

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  // Hydrate expansion state from localStorage and re-sync ancestor expansion
  // whenever the active slug changes (e.g. on client-side navigation).
  React.useEffect(() => {
    const next = new Set<string>();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          for (const x of parsed) if (typeof x === "string") next.add(x);
        }
      }
    } catch {
      // ignore
    }
    for (const id of ancestorIdsOf(currentSlug)) next.add(id);
    setExpanded(next);
  }, [currentSlug]);

  const handleToggle = React.useCallback((id: string, open: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <SidebarMenu>
      {showHomeLink ? (
        <SidebarMenuItem>
          <SidebarMenuButton isActive={homeIsActive} render={<a href="/" />}>
            <span className="truncate">{homeEntry?.title ?? "Home"}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : null}
      {nodes.map((node) => (
        <VaultTreeNode
          key={node.key}
          node={node}
          activeId={activeId}
          expanded={expanded}
          onToggle={handleToggle}
        />
      ))}
    </SidebarMenu>
  );
}

type VaultTreeNodeProps = {
  node: FolderNode;
  activeId: string | undefined;
  expanded: Set<string>;
  onToggle: (id: string, open: boolean) => void;
};

function VaultTreeNode({
  node,
  activeId,
  expanded,
  onToggle,
}: VaultTreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isActive = activeId === node.key;
  const isOpen = expanded.has(node.key);
  const label = node.entry?.title ?? prettySegment(node.name);
  const href = node.entry ? slugToHref(node.entry.slug) : undefined;

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isActive}
          {...(href ? { render: <a href={href} /> } : {})}
        >
          <span className="truncate">{label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Folder that is also a page: label navigates, separate chevron toggles.
  if (href) {
    return (
      <SidebarMenuItem>
        <Collapsible
          open={isOpen}
          onOpenChange={(open) => onToggle(node.key, open)}
        >
          <SidebarMenuButton isActive={isActive} render={<a href={href} />}>
            <span className="truncate">{label}</span>
          </SidebarMenuButton>
          <CollapsibleTrigger
            render={
              <SidebarMenuAction
                aria-label={isOpen ? "Collapse" : "Expand"}
                className={cn("transition-transform", isOpen && "rotate-90")}
              >
                <ChevronRight />
              </SidebarMenuAction>
            }
          />
          <CollapsibleContent>
            <SidebarMenuSub>
              {node.children.map((child) => (
                <VaultTreeNode
                  key={child.key}
                  node={child}
                  activeId={activeId}
                  expanded={expanded}
                  onToggle={onToggle}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  }

  // Folder without its own page: whole row toggles.
  return (
    <SidebarMenuItem>
      <Collapsible
        open={isOpen}
        onOpenChange={(open) => onToggle(node.key, open)}
      >
        <SidebarMenuButton isActive={isActive} render={<CollapsibleTrigger />}>
          <ChevronRight
            className={cn("transition-transform", isOpen && "rotate-90")}
          />
          <span className="truncate">{label}</span>
        </SidebarMenuButton>
        <CollapsibleContent>
          <SidebarMenuSub>
            {node.children.map((child) => (
              <VaultTreeNode
                key={child.key}
                node={child}
                activeId={activeId}
                expanded={expanded}
                onToggle={onToggle}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
