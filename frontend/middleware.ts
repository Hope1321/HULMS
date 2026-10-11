import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware is intentionally minimal — auth is handled client-side
// in each dashboard page using localStorage token checks.
// This file only exists to satisfy Next.js; it passes all requests through.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
