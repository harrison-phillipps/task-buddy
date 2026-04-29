import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Minimal VAPID / Web Push implementation using SubtleCrypto (no npm:web-push needed)

const base64urlToUint8Array = (base64url) => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
};

const uint8ArrayToBase64url = (arr) => {
  let binary = '';
  arr.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

async function buildVapidHeader(audience, subject, publicKeyB64, privateKeyB64) {
  const privateKeyBytes = base64urlToUint8Array(privateKeyB64);
  const publicKeyBytes = base64urlToUint8Array(publicKeyB64);

  const privateKey = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  ).catch(async () => {
    // Try PKCS8 format if raw fails
    return crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  });

  const header = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject
  })));

  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${uint8ArrayToBase64url(new Uint8Array(signature))}`;
  return `vapid t=${jwt},k=${publicKeyB64}`;
}

async function encryptPayload(payload, authB64, p256dhB64) {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const authBytes = base64urlToUint8Array(authB64);
  const p256dhBytes = base64urlToUint8Array(p256dhB64);

  // Import the receiver's public key
  const receiverPublicKey = await crypto.subtle.importKey(
    'raw', p256dhBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, []
  );

  // Generate sender (ephemeral) key pair
  const senderKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, ['deriveKey', 'deriveBits']
  );

  const senderPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', senderKeyPair.publicKey)
  );

  // Derive shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverPublicKey },
    senderKeyPair.privateKey,
    256
  );

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF for content encryption key and nonce
  const prk = await crypto.subtle.importKey('raw', new Uint8Array(sharedBits), 'HKDF', false, ['deriveKey', 'deriveBits']);

  // Auth secret info
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const authBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authBytes, info: authInfo },
    prk, 256
  );

  const ikm = await crypto.subtle.importKey('raw', new Uint8Array(authBits), 'HKDF', false, ['deriveBits']);

  // Context
  const receiverKeyInfo = new Uint8Array([0, p256dhBytes.length, ...p256dhBytes]);
  const senderKeyInfo = new Uint8Array([0, senderPublicKeyRaw.length, ...senderPublicKeyRaw]);
  const context = new Uint8Array([
    ...new TextEncoder().encode('P-256\0'),
    ...receiverKeyInfo, ...senderKeyInfo
  ]);

  const cekInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: aesgcm\0'), ...context]);
  const nonceInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: nonce\0'), ...context]);

  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo }, ikm, 128);
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, ikm, 96);

  const cek = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt']);

  // Pad payload
  const padded = new Uint8Array([0, 0, ...payloadBytes]);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, cek, padded);

  return {
    ciphertext: new Uint8Array(encrypted),
    salt,
    serverPublicKey: senderPublicKeyRaw,
  };
}

async function sendWebPush(subscription, payload) {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@taskbuddy.app';

  const endpoint = subscription.endpoint;
  const { keys } = subscription;

  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const authHeader = await buildVapidHeader(audience, vapidSubject, vapidPublicKey, vapidPrivateKey);

  const { ciphertext, salt, serverPublicKey } = await encryptPayload(payload, keys.auth, keys.p256dh);

  const headers = {
    'Authorization': authHeader,
    'Content-Type': 'application/octet-stream',
    'Content-Encoding': 'aesgcm',
    'Encryption': `salt=${uint8ArrayToBase64url(salt)}`,
    'Crypto-Key': `dh=${uint8ArrayToBase64url(serverPublicKey)}`,
    'TTL': '86400',
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: ciphertext,
  });

  return { status: response.status, ok: response.ok };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { subscription, payload } = body;

    if (!subscription || !payload) {
      return Response.json({ error: 'Missing subscription or payload' }, { status: 400 });
    }

    const result = await sendWebPush(subscription, payload);
    console.log(`Push sent to ${user.email}: status=${result.status}`);

    return Response.json({ success: result.ok, status: result.status });
  } catch (error) {
    console.error('sendPushNotification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});