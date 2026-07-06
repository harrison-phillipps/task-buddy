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

    // 1) Cancel active Stripe subscription immediately (if any)
    let stripeCancelled = false;
    try {
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
        stripeCancelled = subs.data.length > 0;
      }
    } catch (stripeErr) {
      console.error('deleteAccount: Stripe cancellation failed:', stripeErr.message);
      // continue with deletion regardless
    }

    // 2) Delete personal data owned by the user (by created_by_id)
    const ownedEntities = [
      'Task', 'Goal', 'BrainDump', 'FocusSession', 'FocusJourney',
      'Habit', 'HabitCompletion', 'WinsJournal', 'CalendarEvent',
      'RoutineTemplate', 'FocusSessionTemplate', 'CollaborativeFocusSession',
      'TeamMessage', 'TeamNotification', 'TaskComment', 'TaskActivity',
      'Notification', 'NotificationPreferences', 'LearningPath', 'Skill',
    ];
    for (const name of ownedEntities) {
      try {
        await admin.entities[name].deleteMany({ created_by_id: userId });
      } catch (e) {
        console.error(`deleteAccount: deleteMany ${name} failed:`, e.message);
      }
    }

    // 3) Delete entities keyed by user_id
    const userIdEntities = [
      'UserProgress', 'ActiveSession', 'CompanionLearning',
      'CompanionFeedback', 'Leaderboard',
    ];
    for (const name of userIdEntities) {
      try {
        await admin.entities[name].deleteMany({ user_id: userId });
      } catch (e) {
        console.error(`deleteAccount: deleteMany ${name} (user_id) failed:`, e.message);
      }
    }

    // 4) Remove ClinicianProfile(s) owned by this user
    try {
      await admin.entities.ClinicianProfile.deleteMany({ user_id: userId });
    } catch (e) {
      console.error('deleteAccount: delete ClinicianProfile failed:', e.message);
    }

    // 5) Remove this user from other clinicians' client lists
    try {
      const allProfiles = await admin.entities.ClinicianProfile.list(null, 500);
      for (const profile of allProfiles) {
        const clients = profile.clients || [];
        const filtered = clients.filter((c) => c.client_user_id !== userId);
        if (filtered.length !== clients.length) {
          await admin.entities.ClinicianProfile.update(profile.id, { clients: filtered });
        }
      }
    } catch (e) {
      console.error('deleteAccount: removing client links failed:', e.message);
    }

    // 6) Delete ClientInvite records (as clinician or as invited client)
    try {
      await admin.entities.ClientInvite.deleteMany({ clinician_user_id: userId });
    } catch (e) {
      console.error('deleteAccount: delete ClientInvite (clinician) failed:', e.message);
    }
    try {
      await admin.entities.ClientInvite.deleteMany({ client_email: userEmail });
    } catch (e) {
      console.error('deleteAccount: delete ClientInvite (client) failed:', e.message);
    }

    // 7) Delete ClinicianReport records involving this user
    try {
      await admin.entities.ClinicianReport.deleteMany({ clinician_user_id: userId });
    } catch (e) {
      console.error('deleteAccount: delete ClinicianReport (clinician) failed:', e.message);
    }
    try {
      await admin.entities.ClinicianReport.deleteMany({ client_user_id: userId });
    } catch (e) {
      console.error('deleteAccount: delete ClinicianReport (client) failed:', e.message);
    }

    // 8) Anonymise the user account (platform-owned User record cannot be deleted)
    try {
      await admin.entities.User.update(userId, {
        display_name: 'Deleted User',
        subscription_tier: 'free',
        companion_type: null,
        companion_personality: null,
      });
    } catch (e) {
      console.error('deleteAccount: anonymise user failed:', e.message);
    }

    console.log(`deleteAccount: completed for user ${userId}, stripeCancelled=${stripeCancelled}`);
    return Response.json({ success: true, stripeCancelled });
  } catch (error) {
    console.error('deleteAccount error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});