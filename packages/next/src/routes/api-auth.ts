import { toNextJsHandler } from "better-auth/next-js";
import { cacheLife, cacheTag } from "next/cache";
import { silicaAuth } from "@silicajs/auth";
import { resolveRuntimeAuthConfig } from "../auth-config.js";
import { getCacheState, getConfig } from "../server-data.js";

async function getAuth() {
  const cacheState = getCacheState();
  const config = await getCachedAuthConfig(cacheState.renderEnvironmentHash);
  const auth = resolveRuntimeAuthConfig(config);
  return silicaAuth({
    allowedDomains: auth.allowedDomains,
    allowedEmails: auth.allowedEmails,
  });
}

async function getCachedAuthConfig(renderEnvironmentHash: string) {
  "use cache";
  cacheLife("max");
  cacheTag(`environment:${renderEnvironmentHash}`);
  return getConfig();
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
