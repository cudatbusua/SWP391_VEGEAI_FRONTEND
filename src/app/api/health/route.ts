// route handlers (BFF): health check
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
