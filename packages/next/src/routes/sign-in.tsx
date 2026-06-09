import { cacheLife, cacheTag } from "next/cache";
import { SignInShell } from "@silicajs/components";
import { GoogleSignInButton } from "../google-sign-in-button.js";
import { resolveRuntimeAuthConfig } from "../auth-config.js";
import { loadRenderCacheState, loadResolvedConfig } from "../server-data.js";

export default async function SignInPage() {
  const config = await getSignInConfig();
  const authEnabled = resolveRuntimeAuthConfig(config).authEnabled;

  return (
    <SignInShell
      title={config.title}
      logo={config.logo}
      headline="Sign in required"
      subheadline={
        authEnabled
          ? `${config.title} is private. Sign in with Google to access.`
          : undefined
      }
    >
      {authEnabled ? (
        <GoogleSignInButton errorCallbackURL="/not-allowed" />
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Authentication is not enabled for this site.
        </p>
      )}
    </SignInShell>
  );
}

async function getSignInConfig() {
  "use cache";
  cacheLife("max");
  const cacheState = await loadRenderCacheState();
  cacheTag(`environment:${cacheState.renderEnvironmentHash}`);
  return loadResolvedConfig();
}
