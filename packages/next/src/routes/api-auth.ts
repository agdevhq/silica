import { toNextJsHandler } from "better-auth/next-js";
import { silicaAuth } from "@silicajs/auth";
import { loadResolvedConfig } from "../server-data.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuth() {
  const config = await loadResolvedConfig();
  return silicaAuth({
    allowedDomains: config.auth?.allowedDomains ?? [],
    allowedEmails: config.auth?.allowedEmails ?? [],
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
