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
    } catch (error) {
      console.error('Error loading manifests:', error);
      // Ignore if not present in certain environments (e.g., dev server)
    }
    angularAppEngine = new AngularAppEngine();
  }
  return angularAppEngine;
}

export async function netlifyAppEngineHandler(
  request: Request,
): Promise<Response> {
  try {
    // Obtener la URL de la solicitud
    const url = new URL(request.url);
    const pathname = url.pathname;

    // API endpoints can be defined here if needed
    // if (pathname === '/api/hello') {
    //   return Response.json({ message: 'Hello from the API' });
    // }

    // Verificar si se debe manejar como SPA fallback para rutas no encontradas
    const engine = await getAngularAppEngine();
    const result = await engine.handle(request);

    if (result) {
      return result;
    }

    // Si no hay resultado del motor, redirigir al SPA
    return Response.redirect(`${url.origin}/page-not-found`, 302);
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response('Server error', { status: 500 });
  }
}

/**
 * The request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);

// Default export for Netlify Edge/other adapters expecting a default handler.
export default reqHandler;
