"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

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

import { useSilicaRouting, type SilicaLinkComponent } from "./routing.js";
import { prettySegment, slugToHref } from "./slug.js";

const STORAGE_KEY = "silica-tree-expanded";
const SUBMENU_CLASS_NAME = "ml-2.5 mr-0 pl-2 pr-0";

export type VaultTreeEntry = {
  slug: string;
  title: string;
  sortKey?: string;
};

type NavigationResponse = {
  version: 1;
  entries: VaultTreeEntry[];
};

const navigationCache = new Map<string, Promise<VaultTreeEntry[]>>();

type NavigationState =
  | { status: "loading"; entries: VaultTreeEntry[] }
  | { status: "loaded"; entries: VaultTreeEntry[] }
  | { status: "error"; entries: VaultTreeEntry[] };

type FolderNode = {
  key: string;
  name: string;
  fullPath: string;
  sortKey?: string;
  entry?: VaultTreeEntry;
  children: FolderNode[];
};

function emptyNode(
  name: string,
  fullPath: string,
  sortKey?: string,
): FolderNode {
  return { key: fullPath || "/", name, fullPath, sortKey, children: [] };
}

function buildTreeFromEntries(entries: VaultTreeEntry[]): {
  nodes: FolderNode[];
  homeEntry?: VaultTreeEntry;
} {
  const root = emptyNode("", "");
  const byPath = new Map<string, FolderNode>([["", root]]);
  let homeEntry: VaultTreeEntry | undefined;

  for (const entry of entries) {
    if (entry.slug === "index") {
      homeEntry = entry;
      continue;
    }
    const segments = entry.slug.split("/");
    const sortSegments = entry.sortKey?.split("/") ?? [];
    let parent = root;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!;
      const isLast = i === segments.length - 1;
      const fullPath = segments.slice(0, i + 1).join("/");
      const nodeSortKey = sortSegments.slice(0, i + 1).join("/") || undefined;
      if (isLast && segment === "index") {
        parent.entry = entry;
        continue;
      }
      let node = byPath.get(fullPath);
      if (!node) {
        node = emptyNode(segment, fullPath, nodeSortKey);
        byPath.set(fullPath, node);
        parent.children.push(node);
      } else if (!node.sortKey && nodeSortKey) {
        node.sortKey = nodeSortKey;
      }
      if (isLast) node.entry = entry;
      parent = node;
    }
  }

  const sortRecursively = (node: FolderNode) => {
    if (node.children.some((child) => child.sortKey)) {
      node.children.sort(compareOrderedNodes);
    } else {
      const folders = node.children.filter((c) => c.children.length > 0);
      const leaves = node.children.filter((c) => c.children.length === 0);
      folders.sort((a, b) => a.name.localeCompare(b.name));
      leaves.sort((a, b) => {
        const ta = a.entry?.title ?? a.name;
        const tb = b.entry?.title ?? b.name;
        return ta.localeCompare(tb);
      });
      node.children = [...folders, ...leaves];
    }
    for (const child of node.children) sortRecursively(child);
  };
  sortRecursively(root);

  return { nodes: root.children, homeEntry };
}

function compareOrderedNodes(a: FolderNode, b: FolderNode): number {
  return (
    (a.sortKey ?? fallbackNodeSortKey(a)).localeCompare(
      b.sortKey ?? fallbackNodeSortKey(b),
    ) || fallbackNodeLabel(a).localeCompare(fallbackNodeLabel(b))
  );
}

function fallbackNodeSortKey(node: FolderNode): string {
  return `~~~~~~~~~~:${fallbackNodeLabel(node)}`;
}

function fallbackNodeLabel(node: FolderNode): string {
  return node.entry?.title ?? node.name;
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
  navigationEndpoint: string;
  currentSlug?: string;
  showHomeLink?: boolean;
};

export function VaultTree({
  navigationEndpoint,
  currentSlug: currentSlugProp,
  showHomeLink = true,
}: VaultTreeProps) {
  const { Link, currentSlug: routedCurrentSlug } = useSilicaRouting();
  const [navigationState, setNavigationState] = React.useState<NavigationState>(
    {
      status: "loading",
      entries: [],
    },
  );
  const entries = navigationState.entries;
  const currentSlug = currentSlugProp ?? routedCurrentSlug;
  const { nodes, homeEntry } = React.useMemo(
    () => buildTreeFromEntries(entries),
    [entries],
  );

  const activeId = activeIdFromSlug(currentSlug);
  const homeIsActive = currentSlug === "index" || currentSlug === undefined;

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let active = true;
    setNavigationState({ status: "loading", entries: [] });
    loadNavigationEntries(navigationEndpoint)
      .then((nextEntries) => {
        if (active) {
          setNavigationState({ status: "loaded", entries: nextEntries });
        }
      })
      .catch(() => {
        if (active) setNavigationState({ status: "error", entries: [] });
      });
    return () => {
      active = false;
    };
  }, [navigationEndpoint]);

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
          <SidebarMenuButton isActive={homeIsActive} render={<Link href="/" />}>
            <span className="truncate">{homeEntry?.title ?? "Home"}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : null}
      {navigationState.status === "loading" ? (
        <SidebarMenuItem>
          <SidebarMenuButton disabled>
            <span className="truncate text-muted-foreground">
              Loading navigation...
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : null}
      {navigationState.status === "error" ? (
        <SidebarMenuItem>
          <SidebarMenuButton disabled>
            <span className="truncate text-muted-foreground">
              Navigation unavailable
            </span>
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
          Link={Link}
        />
      ))}
    </SidebarMenu>
  );
}

export function loadNavigationEntries(
  endpoint: string,
): Promise<VaultTreeEntry[]> {
  const cached = navigationCache.get(endpoint);
  if (cached) return cached;

  const promise = fetch(endpoint)
    .then((response) => {
      if (!response.ok) throw new Error("Failed to load navigation.");
      return response.json() as Promise<NavigationResponse>;
    })
    .then((navigation) => navigation.entries)
    .catch((error: unknown) => {
      navigationCache.delete(endpoint);
      throw error;
    });
  navigationCache.set(endpoint, promise);
  return promise;
}

type VaultTreeNodeProps = {
  node: FolderNode;
  activeId: string | undefined;
  expanded: Set<string>;
  onToggle: (id: string, open: boolean) => void;
  Link: SilicaLinkComponent;
};

function VaultTreeNode({
  node,
  activeId,
  expanded,
  onToggle,
  Link,
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
          {...(href ? { render: <Link href={href} /> } : {})}
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
          <SidebarMenuButton isActive={isActive} render={<Link href={href} />}>
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
            <SidebarMenuSub className={SUBMENU_CLASS_NAME}>
              {node.children.map((child) => (
                <VaultTreeNode
                  key={child.key}
                  node={child}
                  activeId={activeId}
                  expanded={expanded}
                  onToggle={onToggle}
                  Link={Link}
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
          <SidebarMenuSub className={SUBMENU_CLASS_NAME}>
            {node.children.map((child) => (
              <VaultTreeNode
                key={child.key}
                node={child}
                activeId={activeId}
                expanded={expanded}
                onToggle={onToggle}
                Link={Link}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
