import { jwtVerify, importJWK } from 'jose';

// Clerk JWKS (JSON Web Key Set)
const CLERK_JWKS_URL = 'https://still-terrapi-33.clerk.accounts.dev/.well-known/jwks.json';
let jwksCache = null;
let jwksCacheTime = 0;

async function getJWKS() {
  // Cache JWKS for 1 hour
  if (jwksCache && Date.now() - jwksCacheTime < 3600000) {
    return jwksCache;
  }

  const response = await fetch(CLERK_JWKS_URL);
  const jwks = await response.json();
  jwksCache = jwks;
  jwksCacheTime = Date.now();
  return jwks;
}

async function verifyClerkToken(token) {
  try {
    const [headerB64, payloadB64, signature] = token.split('.');
    const header = JSON.parse(atob(headerB64));

    const jwks = await getJWKS();
    const key = jwks.keys.find(k => k.kid === header.kid);

    if (!key) {
      throw new Error('Key not found');
    }

    const publicKey = await importJWK(key);
    const { payload } = await jwtVerify(token, publicKey);

    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      error: true,
      message: 'No authorization token provided'
    }, 401);
  }

  const token = authHeader.substring(7);
  const payload = await verifyClerkToken(token);

  if (!payload) {
    return c.json({
      error: true,
      message: 'Invalid or expired token'
    }, 401);
  }

  // Extract user ID from Clerk token
  const userId = payload.sub;
  if (!userId) {
    return c.json({
      error: true,
      message: 'Invalid token structure'
    }, 401);
  }

  // Store user ID in context for all subsequent handlers
  c.set('userId', userId);
  c.set('userEmail', payload.email);

  await next();
};