"use client";

import { createAuthClient } from "better-auth/react";
import { GoogleIcon } from "@silicajs/components";
import { Button } from "@silicajs/ui/components/button";

const authClient = createAuthClient();

export type GoogleSignInButtonProps = {
  callbackURL?: string;
  errorCallbackURL?: string;
};

export function resolveCallbackURL(explicit?: string): string {
  if (isInternalCallbackPath(explicit)) return explicit;
  if (typeof window === "undefined") return "/";
  const fromQuery = new URLSearchParams(window.location.search).get(
    "callbackUrl",
  );
  return isInternalCallbackPath(fromQuery) ? fromQuery : "/";
}

function isInternalCallbackPath(value?: string | null): value is string {
  return Boolean(
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\"),
  );
}

export function GoogleSignInButton({
  callbackURL,
  errorCallbackURL = "/not-allowed",
}: GoogleSignInButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => {
        void authClient.signIn.social({
          provider: "google",
          callbackURL: resolveCallbackURL(callbackURL),
          errorCallbackURL,
        });
      }}
    >
      <GoogleIcon className="size-4" />
      Continue with Google
    </Button>
  );
}
