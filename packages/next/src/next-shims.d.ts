declare module "next/server" {
  export class NextRequest extends Request {
    nextUrl: URL & { clone(): URL };
    cookies: {
      get(name: string): { value: string } | undefined;
    };
  }

  export class NextResponse extends Response {
    static next(): NextResponse;
    static redirect(url: URL | string): NextResponse;
    static json(body: unknown, init?: ResponseInit): NextResponse;
  }
}

declare module "next/cache" {
  export function cacheLife(profile: string): void;
  export function cacheTag(...tags: string[]): void;
  export function revalidateTag(tag: string, profile?: string): void;
}

declare module "next/navigation" {
  export function notFound(): never;
}
