export const config = { runtime: 'edge' } as const;

// Import the compiled Angular SSR handler (built by `ng build`)
// The path is relative to this file at runtime on Vercel.
import handler from '../dist/local-walls/server/server.mjs';

type FetchHandler = (request: Request) => Promise<Response> | Response;
const ssrHandler = handler as unknown as FetchHandler;

export default function (request: Request): Promise<Response> | Response {
  return ssrHandler(request);
}
