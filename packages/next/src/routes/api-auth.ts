import { toNextJsHandler } from "better-auth/next-js";
import { silicaAuth } from "@silicajs/auth";
import { resolveRuntimeAuthConfig } from "../auth-config.js";
import { loadResolvedConfig } from "../server-data.js";

async function getAuth() {
  const config = await loadResolvedConfig();
  const auth = resolveRuntimeAuthConfig(config);
  return silicaAuth({
    allowedDomains: auth.allowedDomains,
    allowedEmails: auth.allowedEmails,
  });
}

export async function GET(request: Request) {
  const auth = await getAuth();
  const handler = toNextJsHandler(auth);
  return handler.GET(request);
}

export async function POST(request: Request) {
  const auth = await getAuth();
  const handler = toNextJsHandler(auth);
  return handler.POST(request);
}
