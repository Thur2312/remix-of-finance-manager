// Shared CORS utilities for edge functions

// List of allowed origins for CORS
const allowedOrigins = [
  'https://id-preview--421daa1a-5e46-4a66-a384-f5a2f89a0cbe.lovable.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

/**
 * Get CORS headers with origin validation
 * Only allows requests from whitelisted origins
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  
  // Allow all localhost and local network IPs for development
  const isLocalDev = origin.includes('localhost') || 
                     origin.includes('127.0.0.1') ||
                     origin.match(/http:\/\/192\.168\.\d+\.\d+/) ||
                     origin.match(/http:\/\/172\.\d+\.\d+\.\d+/) ||
                     origin.match(/http:\/\/10\.\d+\.\d+\.\d+/);
  
  const isAllowed = allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  ) || isLocalDev;
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

/**
 * Handle CORS preflight OPTIONS request
 */
export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
