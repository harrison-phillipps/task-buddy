import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let key = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    if (!key) return Response.json({ error: 'VAPID not configured' }, { status: 500 });

    // Sanitize: strip any surrounding quotes, whitespace, or JSON artifacts
    key = key.trim().replace(/^[":,\s]+/, '').replace(/[":,\s]+$/, '').trim();

    return Response.json({ key });
  } catch (error) {
    console.error('getVapidPublicKey error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});