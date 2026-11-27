import { stopSessie } from '@/lib/sessie';

export async function POST(request: Request) {
  await stopSessie();
  return Response.redirect(new URL('/inloggen', request.url), 303);
}
