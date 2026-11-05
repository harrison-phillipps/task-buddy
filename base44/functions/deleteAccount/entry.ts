import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14';
import { asRows, countRows } from '../../shared/entityResults.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Entities whose rows carry the creator in the system created_by_id field.
const BY_CREATOR = [
  'Task', 'Goal', 'BrainDump', 'FocusSession', 'FocusJourney',
  'Habit', 'HabitCompletion', 'WinsJournal', 'CalendarEvent',
  'RoutineTemplate', 'FocusSessionTemplate', 'CollaborativeFocusSession',
  'TeamMessage', 'TeamNotification', 'TaskComment', 'TaskActivity',
  'Notification', 'NotificationPreferences', 'LearningPath', 'Skill',
];

// Entities that carry the owner in a writable user_id field.
const BY_USER_ID = [
  'UserProgress', 'ActiveSession', 'CompanionLearning',
  'CompanionFeedback', 'Leaderboard',
  // Rows whose created_by_id is the service role or a legacy auth id, so the
  // writable owner field is the only pointer back to the user.
  'BrainDump', 'FocusSession', 'Goal',
  // Team chat is written by postTeamMessage under the service role and carries
  // its author in user_id; without this the author's messages would survive.
  'TeamMessage',
];

// Entities that carry the owner in a writable field with a different name.
const BY_OWNER_FIELD = [
  { name: 'Task', field: 'owner_user_id' },
];

const normaliseEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const requestedEmail = normaliseEmail(body?.email);
    const confirmEmail = normaliseEmail(body?.confirm_email);

    // ── Resolve the target. No email means "delete me", which is the in-app flow;
    // an email means an admin is purging someone else's account.
    let target = user;
    let requestedByAdmin = false;

    if (requestedEmail) {
      if (user.role !== 'admin') {
        console.warn(`deleteAccount: non-admin ${user.id} attempted to purge ${requestedEmail}`);
        return Response.json({ error: 'Only an admin can delete another account' }, { status: 403 });
      }
      const matches = asRows(await admin.entities.User.filter({ email: requestedEmail }));
      if (matches.length !== 1) {
        return Response.json({ error: `No unique user found for ${requestedEmail}` }, { status: 404 });
      }
      target = matches[0];
      requestedByAdmin = true;

      // An admin purging an address must not be purging their own account by proxy.
      if (target.id === user.id) {
        return Response.json(
          { error: 'Refusing to delete the calling account. Use the in-app delete flow instead.' },
          { status: 400 },
        );
      }
    }

    // Admin accounts are never deleted by this function.
    if (target.role === 'admin') {
      console.warn(`deleteAccount: refused — target ${target.id} is an admin`);
      return Response.json({ error: 'Refusing to delete an admin account' }, { status: 400 });
    }

    const userId = target.id;
    const userEmail = normaliseEmail(target.email);

    // ── Dry run unless this call confirms the exact target address.
    if (!confirmEmail || confirmEmail !== userEmail) {
      // Every predicate the deletion actually uses, per entity. A single row can
      // satisfy several of them (the platform stamps created_by_id AND created_by
      // together, and a Task can also be owned via owner_user_id), so a row count
      // is the size of their UNION — never the sum of the separate counts.
      const predicatesFor = (name: string): Record<string, any>[] => {
        const list: Record<string, any>[] = [{ created_by_id: userId }];
        if (userEmail) list.push({ created_by: target.email });
        if (BY_USER_ID.includes(name)) list.push({ user_id: userId });
        const ownerField = BY_OWNER_FIELD.find((entry) => entry.name === name);
        if (ownerField) list.push({ [ownerField.field]: userId });
        return list;
      };

      // Inclusion–exclusion over the entity's predicates.
      const countUnion = async (entity: any, predicates: Record<string, any>[]): Promise<number | null> => {
        let total = 0;
        for (let mask = 1; mask < 1 << predicates.length; mask++) {
          const merged: Record<string, any> = {};
          let bits = 0;
          predicates.forEach((predicate, i) => {
            if (mask & (1 << i)) {
              Object.assign(merged, predicate);
              bits++;
            }
          });
          const n = await countRows(entity, merged).catch(() => null);
          if (n === null) return null;
          total += bits % 2 === 1 ? n : -n;
        }
        return Math.max(0, total);
      };

      const [byId, byEmail, byUserId] = await Promise.all([
        Promise.all(BY_CREATOR.map((n) => countRows(admin.entities[n], { created_by_id: userId }).catch(() => null))),
        Promise.all(BY_CREATOR.map((n) => (userEmail ? countRows(admin.entities[n], { created_by: target.email }).catch(() => null) : null))),
        Promise.all(BY_USER_ID.map((n) => countRows(admin.entities[n], { user_id: userId }).catch(() => null))),
      ]);

      const counts: Record<string, any> = {};
      BY_CREATOR.forEach((name, i) => {
        counts[name] = { by_id: byId[i], by_email: byEmail[i] };
      });
      BY_USER_ID.forEach((name, i) => {
        counts[name] = { ...(counts[name] ?? {}), by_user_id: byUserId[i] };
      });

      // `matched` is the de-duplicated row count for the entity.
      const entityNames = [...new Set([...BY_CREATOR, ...BY_USER_ID, ...BY_OWNER_FIELD.map((e) => e.name)])];
      const matchedRows = await Promise.all(entityNames.map((name) => countUnion(admin.entities[name], predicatesFor(name))));
      entityNames.forEach((name, i) => {
        counts[name] = { ...(counts[name] ?? {}), matched: matchedRows[i] };
      });

      const [profile, invitesAsClinician, invitesAsClient, reportsAsClinician, reportsAsClient] = await Promise.all([
        countRows(admin.entities.ClinicianProfile, { user_id: userId }).catch(() => null),
        countRows(admin.entities.ClientInvite, { clinician_user_id: userId }).catch(() => null),
        userEmail ? countRows(admin.entities.ClientInvite, { client_email: target.email }).catch(() => null) : null,
        countRows(admin.entities.ClinicianReport, { clinician_user_id: userId }).catch(() => null),
        countRows(admin.entities.ClinicianReport, { client_user_id: userId }).catch(() => null),
      ]);
      counts.ClinicianProfile = { by_user_id: profile };
      counts.ClientInvite = { as_clinician: invitesAsClinician, as_client: invitesAsClient };
      counts.ClinicianReport = { as_clinician: reportsAsClinician, as_client: reportsAsClient };

      // Rows a deletion reaches ONLY through the writable owner field: their
      // created_by_id / created_by point somewhere else (service role, legacy
      // auth), so the creator passes above would miss them entirely.
      const ownerScoped = [
        ...BY_USER_ID.map((name) => ({ name, field: 'user_id' })),
        ...BY_OWNER_FIELD,
      ];
      const ownerOnly = await Promise.all(ownerScoped.map(async ({ name, field }) => {
        // Rows reachable ONLY through the owner field: the total minus every row
        // the creator passes already matched. Subtracting one creator predicate
        // (as before) left rows carrying both created_by and created_by_id in
        // both figures — the Task double count.
        const creatorPredicates = predicatesFor(name).filter((predicate) => !(field in predicate));
        const [all, overlap] = await Promise.all([
          countRows(admin.entities[name], { [field]: userId }).catch(() => null),
          countUnion(admin.entities[name], creatorPredicates.map((predicate) => ({ ...predicate, [field]: userId }))),
        ]);
        if (all === null) return null;
        return Math.max(0, all - (overlap ?? 0));
      }));

      const ownerFieldOnly = {};
      ownerScoped.forEach((entry, i) => {
        if (ownerOnly[i] !== null) ownerFieldOnly[entry.name] = ownerOnly[i];
      });
      const ownerFieldTotal = Object.values(ownerFieldOnly).reduce((a, b) => a + b, 0);
      console.log(`deleteAccount: dry run owner-field-only rows for ${userId}: ${ownerFieldTotal}`);

      // Per-entity union sizes are disjoint — a row belongs to exactly one
      // entity — so their sum is the true number of rows this deletion reaches.
      const rowsMatched = entityNames.reduce((sum, name) => sum + (counts[name]?.matched ?? 0), 0);

      console.log(`deleteAccount: dry run for ${userId} — ${rowsMatched} rows matched`);
      return Response.json({
        dry_run: true,
        target: { id: userId, email: userEmail, role: target.role, deleted_at: target.deleted_at || null },
        requested_by: user.id,
        requested_by_admin: requestedByAdmin,
        counts,
        owner_field_only: { by_entity: ownerFieldOnly, total: ownerFieldTotal },
        totals: { rows_matched: rowsMatched },
        instructions: confirmEmail
          ? 'confirm_email did not match the target address — nothing was deleted.'
          : `Re-send with confirm_email set to ${userEmail} to execute.`,
      });
    }

    // ── Mark deleted_at FIRST so webhook events arriving mid-deletion are
    // ignored by RevenueCatWebhook / stripeWebhook.
    try {
      await admin.entities.User.update(userId, { deleted_at: new Date().toISOString() });
    } catch (e) {
      console.error(`deleteAccount: failed to set deleted_at for ${userId}:`, e.message);
    }

    // ── RevenueCat: delete the subscriber record (app_user_id = User.id).
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

    const completed = new Set();

    // Two passes per creator-scoped entity: by id, then by the created_by email,
    // because created_by_id cannot be rewritten on legacy rows and some of them
    // still carry their creator only in the email field.
    const creatorTasks = BY_CREATOR.flatMap((name) => [
      {
        name: `delete_${name}_by_id`,
        fn: () => admin.entities[name].deleteMany({ created_by_id: userId }),
      },
      ...(userEmail
        ? [{
            name: `delete_${name}_by_email`,
            fn: () => admin.entities[name].deleteMany({ created_by: target.email }),
          }]
        : []),
    ]);

    const tasks = [
      { name: 'stripe_cancel', fn: async () => {
        try {
          let customerId = target.stripe_customer_id || null;
          if (!customerId) {
            const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
            customerId = customers.data[0]?.id || null;
          }
          if (!customerId) return { cancelled: false, customerId: null };
          const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
          const toCancel = subs.data.filter(s => ['active', 'trialing', 'past_due'].includes(s.status));
          for (const sub of toCancel) {
            await stripe.subscriptions.del(sub.id);
          }
          return { cancelled: toCancel.length > 0, customerId };
        } catch (e) {
          if (e?.code === 'resource_missing') {
            console.log('deleteAccount: stripe_cancel resource_missing — nothing to cancel');
            return { cancelled: false, customerId: null };
          }
          throw e;
        }
      }},
      ...creatorTasks,
      ...BY_USER_ID.map((name) => ({
        name: `delete_${name}_by_user_id`,
        fn: () => admin.entities[name].deleteMany({ user_id: userId }),
      })),
      ...BY_OWNER_FIELD.map(({ name, field }) => ({
        name: `delete_${name}_by_${field}`,
        fn: () => admin.entities[name].deleteMany({ [field]: userId }),
      })),
      { name: 'delete_ClinicianProfile', fn: () => admin.entities.ClinicianProfile.deleteMany({ user_id: userId }) },
      { name: 'remove_client_links', fn: async () => {
        const allProfiles = await asRows(await admin.entities.ClinicianProfile.list(null, 500));
        for (const profile of allProfiles) {
          const clients = profile.clients || [];
          const filtered = clients.filter((c) => c.client_user_id !== userId);
          if (filtered.length !== clients.length) {
            await admin.entities.ClinicianProfile.update(profile.id, { clients: filtered });
          }
        }
      }},
      { name: 'delete_ClientInvite_clinician', fn: () => admin.entities.ClientInvite.deleteMany({ clinician_user_id: userId }) },
      ...(userEmail
        ? [{ name: 'delete_ClientInvite_client', fn: () => admin.entities.ClientInvite.deleteMany({ client_email: target.email }) }]
        : []),
      { name: 'delete_ClinicianReport_clinician', fn: () => admin.entities.ClinicianReport.deleteMany({ clinician_user_id: userId }) },
      { name: 'delete_ClinicianReport_client', fn: () => admin.entities.ClinicianReport.deleteMany({ client_user_id: userId }) },
    ];

    const runAll = (async () => {
      const stripeTask = tasks[0];
      const rest = tasks.slice(1);

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

    // 30-second timeout — on timeout, report failure so the caller can retry.
    const timeout = new Promise((resolve) => setTimeout(() => resolve('__TIMEOUT__'), 30000));
    const result = await Promise.race([runAll, timeout]);

    if (result === '__TIMEOUT__') {
      const incomplete = tasks.map((t) => t.name).filter((n) => !completed.has(n));
      console.error(`deleteAccount: timed out after 30s for user ${userId}. Incomplete operations: ${incomplete.join(', ')}`);
      try {
        await admin.entities.User.update(userId, { deleted_at: null });
      } catch (e) {
        console.error(`deleteAccount: failed to clear deleted_at on timeout for ${userId}:`, e.message);
      }
      return Response.json({ success: false, timed_out: true, incomplete, message: 'Deletion incomplete — please retry to finish cleanup.' }, { status: 504 });
    }

    const stripeResult = result;

    // If the Stripe cancellation step did not complete, do NOT delete the User
    // record — the caller can retry.
    if (!completed.has('stripe_cancel')) {
      console.error(`deleteAccount: stripe_cancel did not complete for ${userId} — aborting before User.delete`);
      try {
        await admin.entities.User.update(userId, { deleted_at: null });
      } catch (e) {
        console.error(`deleteAccount: failed to clear deleted_at on stripe_cancel abort for ${userId}:`, e.message);
      }
      return Response.json({ success: false, partial: true, message: "We couldn't cancel the web subscription. Please retry or contact support." }, { status: 500 });
    }

    try {
      await admin.entities.User.update(userId, { stripe_customer_id: null });
      console.log(`deleteAccount: cleared stripe_customer_id for ${userId}`);
    } catch (e) {
      console.error(`deleteAccount: failed to clear stripe_customer_id for ${userId}:`, e.message);
    }

    try {
      await admin.entities.User.delete(userId);
      console.log(`deleteAccount: User record ${userId} deleted`);
    } catch (e) {
      console.error(`deleteAccount: failed to delete User record ${userId}:`, e.message);
      return Response.json({ success: false, partial: true, message: 'Your data was deleted, but we could not fully remove your account record. Please retry or contact support.' }, { status: 500 });
    }

    console.log(`deleteAccount: completed for user ${userId}, stripeCancelled=${stripeResult.cancelled}, operations=${completed.size}/${tasks.length}`);
    return Response.json({
      success: true,
      stripeCancelled: stripeResult.cancelled,
      deleted_user_id: userId,
      operations_completed: completed.size,
      operations_total: tasks.length,
    });
  } catch (error) {
    console.error('deleteAccount error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});