import { loadResolvedConfig } from "../server-data.js";

export default async function SignInPage() {
  const config = await loadResolvedConfig();
  const authEnabled = Boolean(config.auth);
  return (
    <main className="silica-status-page">
      <h1>Sign in</h1>
      <p>Use your Google account to access {config.title}.</p>
      {authEnabled ? (
        <a className="silica-primary-link" href="/api/auth/sign-in/google">
          Continue with Google
        </a>
      ) : (
        <p>Authentication is not enabled for this site.</p>
      )}
    </main>
  );
}
