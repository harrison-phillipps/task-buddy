import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const userEmail = user.email;
    const admin = base44.asServiceRole;

    // ── Mark deleted_at FIRST so webhook events arriving mid-deletion are
    // ignored by RevenueCatWebhook / stripeWebhook. Quick update; failures
    // are logged but do not block (webhooks also tolerate a missing user).
    try {
      await admin.entities.User.update(userId, { deleted_at: new Date().toISOString() });
    } catch (e) {
      console.error(`deleteAccount: failed to set deleted_at for ${userId}:`, e.message);
    }

    // ── RevenueCat: delete the subscriber record (app_user_id = User.id) via
    // the v1 REST API. Uses REVENUECAT_API_KEY (the secret REST key), NOT the
    // webhook secret. Failures are logged and do not block deletion.
    const rcKey = Deno.env.get('REVENUECAT_API_KEY');
    if (rcKey) {
      try {
        const rcRes = await fetch(
          `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${rcKey}` } },
        );
        if (!rcRes.ok) {
          const rcText = await rcRes.text().catch(() => '');
          console.error(`deleteAccount: RevenueCat delete returned ${rcRes.status}: ${rcText.slice(0, 200)}`);
        } else {
          console.log(`deleteAccount: RevenueCat subscriber ${userId} deleted`);
        }
      } catch (e) {
        console.error(`deleteAccount: RevenueCat delete failed for ${userId}:`, e.message);
      }
    } else {
      console.warn('deleteAccount: REVENUECAT_API_KEY not set — skipping RevenueCat subscriber deletion');
    }

    // Track completed operations so we can log incomplete ones on timeout
    const completed = new Set();

    // Build all cleanup tasks as named operations
    const tasks = [
      { name: 'stripe_cancel', fn: async () => {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          const subs = await stripe.subscriptions.list({
            customer: customers.data[0].id,
            status: 'active',
            limit: 10,
          });
          for (const sub of subs.data) {
            await stripe.subscriptions.del(sub.id);
          }
          return { cancelled: subs.data.length > 0, customerId: customers.data[0].id };
        }
        return { cancelled: false, customerId: null };
      }},
      ...[
        'Task', 'Goal', 'BrainDump', 'FocusSession', 'FocusJourney',
        'Habit', 'HabitCompletion', 'WinsJournal', 'CalendarEvent',
        'RoutineTemplate', 'FocusSessionTemplate', 'CollaborativeFocusSession',
        'TeamMessage', 'TeamNotification', 'TaskComment', 'TaskActivity',
        'Notification', 'NotificationPreferences', 'LearningPath', 'Skill',
      ].map((name) => ({
        name: `delete_${name}`,
        fn: () => admin.entities[name].deleteMany({ created_by_id: userId }),
      })),
      ...[
        'UserProgress', 'ActiveSession', 'CompanionLearning',
        'CompanionFeedback', 'Leaderboard',
      ].map((name) => ({
        name: `delete_${name}_by_user_id`,
        fn: () => admin.entities[name].deleteMany({ user_id: userId }),
      })),
      { name: 'delete_ClinicianProfile', fn: () => admin.entities.ClinicianProfile.deleteMany({ user_id: userId }) },
      { name: 'remove_client_links', fn: async () => {
        const allProfiles = await admin.entities.ClinicianProfile.list(null, 500);
        for (const profile of allProfiles) {
          const clients = profile.clients || [];
          const filtered = clients.filter((c) => c.client_user_id !== userId);
          if (filtered.length !== clients.length) {
            await admin.entities.ClinicianProfile.update(profile.id, { clients: filtered });
          }
        }
      }},
      { name: 'delete_ClientInvite_clinician', fn: () => admin.entities.ClientInvite.deleteMany({ clinician_user_id: userId }) },
      { name: 'delete_ClientInvite_client', fn: () => admin.entities.ClientInvite.deleteMany({ client_email: userEmail }) },
      { name: 'delete_ClinicianReport_clinician', fn: () => admin.entities.ClinicianReport.deleteMany({ clinician_user_id: userId }) },
      { name: 'delete_ClinicianReport_client', fn: () => admin.entities.ClinicianReport.deleteMany({ client_user_id: userId }) },
      // NOTE: anonymise_user moved AFTER all deletions succeed — see below.
    ];

    // Run all tasks in parallel; each marks itself complete
    const runAll = (async () => {
      const stripeTask = tasks[0];
      const rest = tasks.slice(1);

      // Stripe result tracked separately
      let stripeResult = { cancelled: false, customerId: null };
      const stripeP = stripeTask.fn()
        .then((result) => { stripeResult = result; completed.add(stripeTask.name); })
        .catch((e) => console.error(`deleteAccount: ${stripeTask.name} failed:`, e.message));

      const restPromises = rest.map((task) =>
        task.fn()
          .then(() => completed.add(task.name))
          .catch((e) => console.error(`deleteAccount: ${task.name} failed:`, e.message))
      );

      await Promise.allSettled([stripeP, ...restPromises]);
      return stripeResult;
    })();

    // 30-second timeout — on timeout, report failure so the frontend can prompt retry.
    // The user is NOT anonymised on timeout, so a retry can re-auth and resume.
    const timeout = new Promise((resolve) => setTimeout(() => resolve('__TIMEOUT__'), 30000));
    const result = await Promise.race([runAll, timeout]);

    if (result === '__TIMEOUT__') {
      const incomplete = tasks.map((t) => t.name).filter((n) => !completed.has(n));
      console.error(`deleteAccount: timed out after 30s for user ${userId}. Incomplete operations: ${incomplete.join(', ')}`);
      // Do NOT anonymise — all deleteMany ops are idempotent, so the user can
      // re-auth and retry this same endpoint to finish the cleanup.
      return Response.json({ success: false, timed_out: true, incomplete, message: 'Deletion incomplete — please retry to finish cleanup.' }, { status: 504 });
    }

    // ── All deletions completed. Clear stripe_customer_id ONLY if the Stripe
    // cancellation step succeeded. Logged, never blocks. (If the User record is
    // hard-deleted below this is moot, but it's a safe fallback if that fails.)
    const stripeResult = result;
    if (completed.has('stripe_cancel')) {
      try {
        await admin.entities.User.update(userId, { stripe_customer_id: null });
        console.log(`deleteAccount: cleared stripe_customer_id for ${userId}`);
      } catch (e) {
        console.error(`deleteAccount: failed to clear stripe_customer_id for ${userId}:`, e.message);
      }
    } else {
      console.warn(`deleteAccount: stripe_cancel did not complete — leaving stripe_customer_id in place`);
    }

    // ── Delete the User record itself. Service role can delete any user
    // (per Base44 docs). Email cannot be overwritten (account-owned), so
    // hard-delete is the stronger action. If this fails, report failure so the
    // user can retry — do NOT report success.
    try {
      await admin.entities.User.delete(userId);
      console.log(`deleteAccount: User record ${userId} deleted`);
    } catch (e) {
      console.error(`deleteAccount: failed to delete User record ${userId}:`, e.message);
      return Response.json({ success: false, partial: true, message: 'Your data was deleted, but we could not fully remove your account record. Please retry or contact support.' }, { status: 500 });
    }

    console.log(`deleteAccount: completed for user ${userId}, stripeCancelled=${stripeResult.cancelled}`);
    return Response.json({ success: true, stripeCancelled: stripeResult.cancelled });
  } catch (error) {
    console.error('deleteAccount error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});