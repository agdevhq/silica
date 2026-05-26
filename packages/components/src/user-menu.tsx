"use client";

import { UserIcon } from "lucide-react";

import { Button } from "@silicajs/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@silicajs/ui/components/dropdown-menu";

export type UserMenuProps = {
  label?: string;
  className?: string;
};

export function UserMenu({ label = "Signed in", className }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="User menu"
            className={className}
          >
            <UserIcon aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-44">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<a href="/api/auth/sign-out">Sign out</a>} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
