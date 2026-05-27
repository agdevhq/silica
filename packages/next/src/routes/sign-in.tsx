import { cacheLife } from "next/cache";
import { resolveRuntimeAuthConfig } from "../auth-config.js";
import { loadResolvedConfig } from "../server-data.js";

export default async function SignInPage() {
  const config = await getSignInConfig();
  const authEnabled = resolveRuntimeAuthConfig(config).authEnabled;
  return (
    <main className="silica-status-page">
      <h1>Sign in</h1>
      <p>Use your Google account to access {config.title}.</p>
      {authEnabled ? (
        <form action="/api/auth/sign-in/social" method="post">
          <input type="hidden" name="provider" value="google" />
          <input type="hidden" name="callbackURL" value="/" />
          <input type="hidden" name="errorCallbackURL" value="/not-allowed" />
          <button className="silica-primary-link" type="submit">
            Continue with Google
          </button>
        </form>
      ) : (
        <p>Authentication is not enabled for this site.</p>
      )}
    </main>
  );
}

async function getSignInConfig() {
  "use cache";
  cacheLife("max");
  return loadResolvedConfig();
}
