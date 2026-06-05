"use client";

import { useEffect, useState } from "react";
import { EllipsisVertical, LogOut } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@silicajs/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@silicajs/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@silicajs/ui/components/sidebar";

export type UserMenuProps = {
  logo?: string;
};

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type SessionResponse = {
  user?: SessionUser;
};

export function UserMenu({ logo }: UserMenuProps) {
  const { isMobile } = useSidebar();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/get-session", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: SessionResponse | null) => {
        if (cancelled || !data?.user) return;
        setUser({
          name: data.user.name ?? data.user.email ?? "Account",
          email: data.user.email ?? "",
          image: data.user.image ?? undefined,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = user?.name ?? "Account";
  const displayEmail = user?.email ?? "";
  const avatarSrc = user?.image ?? logo;
  const initials = getInitials(user?.name, user?.email);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <UserAvatar src={avatarSrc} alt={displayName} initials={initials} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              {displayEmail ? (
                <span className="truncate text-xs text-muted-foreground">
                  {displayEmail}
                </span>
              ) : null}
            </div>
            <EllipsisVertical className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <div className="px-1 py-1.5 font-normal">
              <div className="flex items-center gap-2 text-left text-sm">
                <UserAvatar
                  src={avatarSrc}
                  alt={displayName}
                  initials={initials}
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  {displayEmail ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {displayEmail}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  void signOut();
                }}
              >
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function UserAvatar({
  src,
  alt,
  initials,
}: {
  src?: string;
  alt: string;
  initials: string;
}) {
  return (
    <Avatar className="size-8">
      {src ? <AvatarImage src={src} alt={alt} /> : null}
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  );
}

function getInitials(name?: string | null, email?: string | null): string {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }
    return trimmedName.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

async function signOut(): Promise<void> {
  await fetch("/api/auth/sign-out", {
    method: "POST",
    credentials: "include",
  });
  window.location.assign("/sign-in");
}
