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
          return subs.data.length > 0;
        }
        return false;
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
      { name: 'anonymise_user', fn: () => admin.entities.User.update(userId, {
        display_name: 'Deleted User',
        subscription_tier: 'free',
        companion_type: null,
        companion_personality: null,
      })},
    ];

    // Run all tasks in parallel; each marks itself complete
    const runAll = (async () => {
      const stripeTask = tasks[0];
      const rest = tasks.slice(1);

      // Stripe result tracked separately
      let stripeCancelled = false;
      const stripeP = stripeTask.fn()
        .then((result) => { stripeCancelled = result; completed.add(stripeTask.name); })
        .catch((e) => console.error(`deleteAccount: ${stripeTask.name} failed:`, e.message));

      const restPromises = rest.map((task) =>
        task.fn()
          .then(() => completed.add(task.name))
          .catch((e) => console.error(`deleteAccount: ${task.name} failed:`, e.message))
      );

      await Promise.allSettled([stripeP, ...restPromises]);
      return stripeCancelled;
    })();

    // 30-second timeout — return success regardless; stragglers handled by scheduled job
    const timeout = new Promise((resolve) => setTimeout(() => resolve('__TIMEOUT__'), 30000));
    const result = await Promise.race([runAll, timeout]);

    if (result === '__TIMEOUT__') {
      const incomplete = tasks.map((t) => t.name).filter((n) => !completed.has(n));
      console.error(`deleteAccount: timed out after 30s for user ${userId}. Incomplete operations: ${incomplete.join(', ')}`);
      return Response.json({ success: true, timed_out: true, incomplete });
    }

    const stripeCancelled = result;
    console.log(`deleteAccount: completed for user ${userId}, stripeCancelled=${stripeCancelled}`);
    return Response.json({ success: true, stripeCancelled });
  } catch (error) {
    console.error('deleteAccount error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});