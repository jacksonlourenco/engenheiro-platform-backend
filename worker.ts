type Env = {
  API_ORIGIN?: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
};

function isApiPath(pathname: string): boolean {
  return (
    pathname === "/health" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/budget/") ||
    pathname.startsWith("/budgets/") ||
    pathname.startsWith("/utils/")
  );
}

function mapSpaRoutes(pathname: string): string | null {
  // Support "pretty" routes that exist as html files in /public.
  if (pathname === "/") return "/index.html";
  if (pathname === "/dashboard") return "/dashboard.html";
  if (pathname === "/admin") return "/admin.html";
  if (pathname === "/reset-password") return "/reset-password.html";
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (isApiPath(url.pathname)) {
      const origin = String(env.API_ORIGIN || "").trim().replace(/\/+$/, "");
      if (!origin) {
        return new Response("API_ORIGIN is not configured.", { status: 500 });
      }

      const target = new URL(origin);
      target.pathname = url.pathname;
      target.search = url.search;

      // Forward the request as-is to the Node API.
      const headers = new Headers(request.headers);
      headers.set("host", target.host);

      const upstreamReq = new Request(target.toString(), {
        method: request.method,
        headers,
        body: request.body,
        redirect: "manual",
      });

      return fetch(upstreamReq);
    }

    const mapped = mapSpaRoutes(url.pathname);
    if (mapped) {
      const next = new URL(request.url);
      next.pathname = mapped;
      return env.ASSETS.fetch(new Request(next.toString(), request));
    }

    return env.ASSETS.fetch(request);
  },
};

