import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * TEMPORARY probe for the create rules on Notification / TeamMessage /
 * TeamNotification. Delete this page and its route once the rules are verified.
 *
 * It runs every check as the signed-in account (never the service role) and
 * prints one plain-text line per check with expected and actual. Setup values
 * below were read once by an admin; override with ?teamId= / ?otherUserId=.
 */
const HOME_TEAM_ID = "693f5602e5a97802369f6ba0"; // "H and Rach Home"
const HOME_TEAM_NAME = "H and Rach Home";
const HOTMAIL_USER_ID = "6a61816f1e6ed9f4008cdc78"; // harrison.phillipps@hotmail.com — Home member
const SCHOOLS_USER_ID = "6a83bdb5d956875ae281ac2f"; // harrison.phillipps219@schools.sa.edu.au — not a member

// One run per page load: a remount must not write a second set of probe rows.
let probeStarted = false;

const statusOf = (error) => Number(error?.status ?? error?.response?.status ?? 0);

const textOf = (error) =>
  String(error?.data?.error || error?.response?.data?.error || error?.message || error || "unknown error").slice(0, 200);

const isBlocked = (result) =>
  !result.allowed &&
  (result.status === 403 || /permission denied|forbidden|403|not a member/i.test(result.message || ""));

async function attempt(fn) {
  try {
    return { allowed: true, value: await fn() };
  } catch (error) {
    return { allowed: false, status: statusOf(error), message: textOf(error) };
  }
}

async function runProbe(push) {
  const params = new URLSearchParams(window.location.search);
  const teamId = params.get("teamId") || HOME_TEAM_ID;
  const me = await base44.auth.me();
  const otherUserId =
    params.get("otherUserId") || (me.id === HOTMAIL_USER_ID ? SCHOOLS_USER_ID : HOTMAIL_USER_ID);
  const stamp = new Date().toISOString();
  const results = [];

  push(`RLS create-rule probe · ${new Date().toLocaleString("en-CA")}`);
  push(`signed in as ${me.email} · role ${me.role || "user"} · id ${me.id}`);

  // Home team membership decides what postTeamMessage/postTeamNotification should do.
  const teamRead = await attempt(() => base44.entities.Team.get(teamId));
  let isMember = false;
  if (teamRead.allowed) {
    const members = Array.isArray(teamRead.value?.member_user_ids) && teamRead.value.member_user_ids.length
      ? teamRead.value.member_user_ids
      : teamRead.value?.member_ids || [];
    isMember = members.includes(me.id);
    push(
      `home team ${teamRead.value?.name || HOME_TEAM_NAME} (${teamId}) · ${members.length} members · you are ${
        isMember ? "a member" : "not a member"
      }`,
    );
  } else {
    push(
      `home team ${HOME_TEAM_NAME} (${teamId}) · not readable by this account (${teamRead.status || "error"} ${
        teamRead.message
      }) · you are not a member`,
    );
  }

  if (me.role === "admin") {
    push("note: an admin bypasses these rules, so member results come from the hotmail and schools accounts.");
  }

  if (me.role === "admin") {
    push("");
    push("--- setup (admin only) ---");
    push(`home team id: ${HOME_TEAM_ID} (${HOME_TEAM_NAME})`);
    push(`hotmail account id: ${HOTMAIL_USER_ID}`);
    push(`schools account id: ${SCHOOLS_USER_ID}`);
    push(`run as hotmail: sign in as harrison.phillipps@hotmail.com, then ${window.location.origin}/RlsProbe`);
    push(`run as schools: sign in as harrison.phillipps219@schools.sa.edu.au, then ${window.location.origin}/RlsProbe`);
  }

  push("");
  push("--- checks ---");

  const report = (label, expectBlocked, result, note) => {
    const expected = expectBlocked ? "403" : "allowed";
    const actual = result.allowed
      ? `allowed${result.value?.id ? ` (row ${result.value.id})` : ""}`
      : `${result.status || "error"} ${result.message}`;
    const pass = expectBlocked ? isBlocked(result) : result.allowed;
    results.push(pass);
    push(`${label} · expected ${expected} · actual ${actual} · ${pass ? "PASS" : "FAIL"}${note ? ` · ${note}` : ""}`);
  };

  // 1 — direct TeamMessage.create (create rule is admin-only → 403 for members)
  const directMessage = await attempt(() =>
    base44.entities.TeamMessage.create({
      team_id: teamId,
      user_id: me.id,
      user_name: me.full_name || me.email,
      member_user_ids: [me.id],
      content: `probe direct message ${stamp}`,
    }),
  );
  let directMessageNote = "";
  if (directMessage.allowed) {
    const cleanup = await attempt(() => base44.entities.TeamMessage.delete(directMessage.value.id));
    directMessageNote = cleanup.allowed ? "probe row deleted" : `probe row ${directMessage.value.id} left behind`;
  }
  report("1. direct TeamMessage.create into Home", true, directMessage, directMessageNote);

  // 2 — direct TeamNotification.create (create rule is admin-only → 403 for members)
  const directNotice = await attempt(() =>
    base44.entities.TeamNotification.create({
      team_id: teamId,
      member_user_ids: [me.id],
      type: "general",
      title: `probe ${stamp.slice(0, 16)}`,
      message: "RLS probe row; safe to delete",
    }),
  );
  let directNoticeNote = "";
  if (directNotice.allowed) {
    const cleanup = await attempt(() => base44.entities.TeamNotification.delete(directNotice.value.id));
    directNoticeNote = cleanup.allowed ? "probe row deleted" : `probe row ${directNotice.value.id} left behind`;
  }
  report("2. direct TeamNotification.create into Home", true, directNotice, directNoticeNote);

  // 3 — Notification.create naming another user (create rule is data.user_id == caller)
  const otherNotice = await attempt(() =>
    base44.entities.Notification.create({
      user_id: otherUserId,
      type: "general",
      title: `probe ${stamp.slice(0, 16)}`,
      message: "RLS probe row for another user; safe to delete",
    }),
  );
  let otherNoticeNote = `target user ${otherUserId}`;
  if (otherNotice.allowed) {
    const cleanup = await attempt(() => base44.entities.Notification.delete(otherNotice.value.id));
    otherNoticeNote += cleanup.allowed
      ? " · probe row deleted"
      : ` · probe row ${otherNotice.value.id} left behind (owner must delete)`;
  }
  report("3. Notification.create with another user's id", true, otherNotice, otherNoticeNote);

  // 4 — Notification.create naming the caller, then delete it
  const ownNotice = await attempt(() =>
    base44.entities.Notification.create({
      user_id: me.id,
      type: "general",
      title: `probe ${stamp.slice(0, 16)}`,
      message: "RLS probe row for the caller; safe to delete",
    }),
  );
  let ownNoticeNote = "";
  if (ownNotice.allowed) {
    const cleanup = await attempt(() => base44.entities.Notification.delete(ownNotice.value.id));
    ownNoticeNote = cleanup.allowed
      ? "row deleted"
      : `delete blocked (${cleanup.status || "error"} ${cleanup.message}) · row ${ownNotice.value.id} left behind`;
  }
  report("4. Notification.create with own user id", false, ownNotice, ownNoticeNote);

  // 5 — postTeamMessage (service role): success for a Home member, 403 otherwise
  const postedMessage = await attempt(async () => {
    const res = await base44.functions.invoke("postTeamMessage", {
      team_id: teamId,
      content: `probe via postTeamMessage ${stamp}`,
    });
    const data = res?.data ?? res;
    if (!data?.message?.id) throw Object.assign(new Error(textOf(data)), { status: res?.status });
    return { id: data.message.id };
  });
  let postedMessageNote = "";
  if (postedMessage.allowed) {
    const cleanup = await attempt(() => base44.entities.TeamMessage.delete(postedMessage.value.id));
    postedMessageNote = cleanup.allowed
      ? "row deleted"
      : `row ${postedMessage.value.id} left behind (delete blocked: ${cleanup.message})`;
  }
  report(`5. postTeamMessage into Home (you are ${isMember ? "a member" : "not a member"})`, !isMember, postedMessage, postedMessageNote);

  // 6 — postTeamNotification (service role): success for a Home member, 403 otherwise
  const postedNotice = await attempt(async () => {
    const res = await base44.functions.invoke("postTeamNotification", {
      team_id: teamId,
      type: "general",
      title: `probe ${stamp.slice(0, 16)}`,
      message: "RLS probe row via postTeamNotification; safe to delete",
      priority: "low",
    });
    const data = res?.data ?? res;
    if (!data?.notification?.id) throw Object.assign(new Error(textOf(data)), { status: res?.status });
    return { id: data.notification.id };
  });
  let postedNoticeNote = "";
  if (postedNotice.allowed) {
    const cleanup = await attempt(() => base44.entities.TeamNotification.delete(postedNotice.value.id));
    postedNoticeNote = cleanup.allowed
      ? "row deleted"
      : `row ${postedNotice.value.id} left behind (written under the service role; an admin must delete it)`;
  }
  report(`6. postTeamNotification into Home (you are ${isMember ? "a member" : "not a member"})`, !isMember, postedNotice, postedNoticeNote);

  const passed = results.filter(Boolean).length;
  push("");
  push(`done · ${passed} of ${results.length} checks passed`);
}

export default function RlsProbe() {
  const [lines, setLines] = useState([]);
  const [running, setRunning] = useState(true);
  const collected = useRef([]);

  useEffect(() => {
    const push = (line = "") => {
      collected.current.push(line);
      setLines([...collected.current]);
    };
    if (probeStarted) {
      setRunning(false);
      return;
    }
    probeStarted = true;
    push("running…");
    runProbe(push)
      .catch((error) => push(`probe crashed: ${textOf(error)}`))
      .finally(() => setRunning(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-3">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">RLS create-rule probe</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Temporary diagnostic page, not linked in navigation. Runs as the signed-in account and writes probe
          rows that it deletes again where the rules allow.
          {running ? " Running…" : ""}
        </p>
        <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-words bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-gray-800 dark:text-gray-200">
{lines.join("\n") || "no output"}
        </pre>
      </div>
    </div>
  );
}