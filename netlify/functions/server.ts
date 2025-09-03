import type { Handler } from '@netlify/functions';

// The server bundle built by Angular is located under dist/.../server/server.mjs at runtime on Netlify.
// However, when using @netlify/angular-runtime plugin, it will copy the server bundle to the functions directory
// and expose a handler we can forward to. Here, we dynamically import the compiled server.mjs relative to this function.

// We keep this file in TypeScript; Netlify will transpile it if using esbuild. If not, keep it as JS.

export const handler: Handler = async (event) => {
  // Convert Netlify Event to a standard Request for Angular SSR.
  // The runtime plugin also supports directly exporting the Angular handler, but
  // to be resilient we import our server implementation which exports a fetch-like handler.
  const { netlifyAppEngineHandler } = await import('../../dist/local-walls/server/server.mjs').catch(async () => {
    // Fallback path used by @netlify/angular-runtime when bundling functions
    try {
      return await import('./server.mjs');
    } catch {
      throw new Error('SSR server bundle not found for Netlify function. Ensure `npm run build` ran successfully.');
    }
  });

  const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}`);
  const init: RequestInit = {
    method: event.httpMethod,
    headers: event.headers as unknown as HeadersInit,
    body: ['GET', 'HEAD'].includes(event.httpMethod) ? undefined : (event.body && (event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body)),
  };
  const request = new Request(url.toString(), init);

  const response = await netlifyAppEngineHandler(request);

  const respHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => (respHeaders[key] = value));
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    statusCode: response.status,
    headers: respHeaders,
    body: buffer.toString('base64'),
    isBase64Encoded: true,
  };
};
