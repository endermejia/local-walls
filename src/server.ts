import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { getContext } from '@netlify/angular-runtime/context.mjs';

// Lazily create the Angular App Engine after ensuring manifests are loaded.
let angularAppEngine: AngularAppEngine | undefined;

async function getAngularAppEngine(): Promise<AngularAppEngine> {
  if (!angularAppEngine) {
    // Netlify Edge (and some other adapters) require Angular engine/app manifests
    // to be imported as side-effects before creating the engine. These files are
    // emitted by the Angular builder into the same directory as the server bundle.
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

export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const context = getContext();

  // Example API endpoints can be defined here.
  // Uncomment and define endpoints as necessary.
  // const pathname = new URL(request.url).pathname;
  // if (pathname === '/api/hello') {
  //   return Response.json({ message: 'Hello from the API' });
  // }

  const engine = await getAngularAppEngine();
  const result = await engine.handle(request, context);
  return result || new Response('Not found', { status: 404 });
}

/**
 * The request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);
