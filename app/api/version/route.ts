import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface VersionInfo {
  buildTime: string;
  buildHash: string;
  version: string;
}

export async function GET() {
  // Get build info from environment variables or generate them
  const buildTime = process.env.BUILD_TIME || new Date().toISOString();
  const buildHash = process.env.BUILD_HASH || Math.random().toString(36).substring(7);
  const version = process.env.npm_package_version || '1.0.0';

  const versionInfo: VersionInfo = {
    buildTime,
    buildHash,
    version,
  };

  // Add cache control headers to prevent caching
  const response = NextResponse.json(versionInfo);
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}