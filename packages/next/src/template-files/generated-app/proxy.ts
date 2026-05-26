import type { NextRequest } from "next/server";
import { silicaProxy } from "@silicajs/next/proxy";

export function proxy(request: NextRequest) {
  return silicaProxy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
