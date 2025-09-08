import { AngularAppEngine, createRequestHandler } from '@angular/ssr';

// Lazily create the Angular App Engine after ensuring manifests are loaded.
let angularAppEngine: AngularAppEngine | undefined;

async function getAngularAppEngine(): Promise<AngularAppEngine> {
  if (!angularAppEngine) {
    // Some adapters may require Angular engine/app manifests to be imported
    // as side-effects before creating the engine. These files are emitted by
    // the Angular builder into the same directory as the server bundle.
    try {
      // @ts-expect-error: These files are generated at build time next to server.mjs
      await import('./angular-app-engine-manifest.mjs');
      // @ts-expect-error: These files are generated at build time next to server.mjs
      await import('./angular-app-manifest.mjs');
    } catch {
      // Ignore if not present in certain environments (e.g., dev server)
    }
    angularAppEngine = new AngularAppEngine();
  }
  return angularAppEngine;
}

export async function netlifyAppEngineHandler(
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Proxy 8a.nu calls to avoid browser CORS.
  // Example: /api/8anu/api/unification/... -> https://www.8a.nu/api/unification/...
  if (pathname.startsWith('/api/8anu/')) {
    const upstream = 'https://www.8a.nu' + pathname.replace('/api/8anu', '');
    const proxyUrl = new URL(upstream);
    proxyUrl.search = url.search; // preserve query string

    try {
      const resp = await fetch(proxyUrl.toString(), {
        method: request.method,
        headers: {
          // forward minimal headers
          accept: 'application/json',
        },
        // Do not forward credentials/cookies
      });
      const body = await resp.arrayBuffer();
      // Mirror status and pass-through JSON content-type when available
      const headers = new Headers();
      headers.set(
        'Content-Type',
        resp.headers.get('Content-Type') || 'application/json',
      );
      // Allow same-origin callers
      headers.set('Cache-Control', 'public, max-age=120');
      return new Response(body, { status: resp.status, headers });
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: 'Upstream fetch failed',
          message: e instanceof Error ? e.message : String(e),
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  const engine = await getAngularAppEngine();
  const result = await engine.handle(request);
  return result || new Response('Not found', { status: 404 });
}

/**
 * The request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);

// Default export for Netlify Edge/other adapters expecting a default handler.
export default reqHandler;
