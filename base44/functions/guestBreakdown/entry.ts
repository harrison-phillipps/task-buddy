import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Simple in-memory rate limiter: { ip -> [timestamp, ...] }
const rateLimitStore = new Map();
const MAX_REQUESTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) return true;
  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);
  return false;
}

const VALID_TIMES = [10, 20, 30, 45];
const VALID_ENERGIES = ["low", "medium", "high"];

const ENERGY_LABELS = {
  low: "Running on fumes",
  medium: "Feeling okay",
  high: "Ready to go!",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  // Rate limiting by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ error: "Rate limit exceeded. Please try again in an hour." }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { taskText, energyValue, timeValue } = body;

  // Input validation
  if (!taskText || typeof taskText !== "string" || taskText.trim().length === 0) {
    return Response.json({ error: "taskText is required" }, { status: 400 });
  }
  if (taskText.trim().length > 200) {
    return Response.json({ error: "taskText must be 200 characters or fewer" }, { status: 400 });
  }
  if (!VALID_TIMES.includes(timeValue)) {
    return Response.json({ error: "timeValue must be one of: 10, 20, 30, 45" }, { status: 400 });
  }
  if (!VALID_ENERGIES.includes(energyValue)) {
    return Response.json({ error: "energyValue must be one of: low, medium, high" }, { status: 400 });
  }

  const energyLabel = ENERGY_LABELS[energyValue];
  const base44 = createClientFromRequest(req);

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a task initiation specialist who understands executive dysfunction at a neurological level. Your job is to take ONE task a user has been avoiding and break it into micro-steps that are so specific and so small that starting feels physically impossible to resist.

CORE PRINCIPLE:
The user's brain is not lazy. It cannot identify a discrete first physical action from a vague task. Your job is to remove every ambiguous decision between them and starting.

INPUTS:
- Task: "${taskText}"
- Energy: ${energyLabel}
- Time: ${timeValue} minutes

STEP RULES:

1. NEVER produce generic steps.
"Do the first obvious action" is not a step.
"Clear everything off the left side of the bench" is a step.
Steps must be so specific that two different people doing the same task would do the exact same physical action.

2. MATCH STEPS TO ENERGY LEVEL.
Running on fumes: First step max 2 minutes, near-zero cognitive load, no decisions within the step itself.
Feeling okay: Steps 3-5 minutes, fully specific.
Ready to go: Steps up to 10 minutes, minor decisions allowed.

3. MATCH STEPS TO TIME.
10 min = 3 steps maximum
20 min = 4-5 steps
30 min = 5-6 steps
45 min = 6-8 steps
Total step time must not exceed ${timeValue} minutes.

4. STEP 1 IS THE MOST IMPORTANT.
Immediate visible progress. If they do nothing else, completing step 1 is a win. Must feel achievable in the worst mental state.

5. EACH STEP GETS A MICRO_LABEL (max 5 words).
Explains WHY this step matters neurologically or practically.
Not cheerleading. Actual reason.

Bad micro_labels:
"You've got this!"
"Keep going!"
"Almost there!"

Good micro_labels:
"Visible progress activates momentum"
"Removing clutter reduces decision load"
"The hardest part is starting — this is it"

6. CONCRETE EXAMPLES — USE THESE AS YOUR QUALITY BAR:

"Clean the kitchen" (okay energy, 20 min):
Step 1: Clear everything off the left bench (3 min)
micro_label: "One defined zone creates a clear win"
Step 2: Stack all dishes next to the sink (3 min)
micro_label: "Grouping before washing reduces back and forth"
Step 3: Load the dishwasher or wash what fits (7 min)
micro_label: "Water running means you are already in it"
Step 4: Wipe down both benches left to right (4 min)
micro_label: "Finishing the surface closes the loop visually"
Step 5: Put away anything still out (3 min)
micro_label: "Last step should feel almost automatic by now"

"Reply to emails" (running on fumes, 10 min):
Step 1: Open inbox, do not read anything yet (1 min)
micro_label: "Opening is the only commitment right now"
Step 2: Find the 1 email that takes under 2 minutes to answer (3 min)
micro_label: "One sent reply changes your state immediately"
Step 3: Reply to it then close the tab (2 min)
micro_label: "Done. That counts. Everything else is bonus."

"Finish that report" (ready to go, 30 min):
Step 1: Open the document and read only the last paragraph you wrote (2 min)
micro_label: "Re-entry point — your brain picks up the thread"
Step 2: Write the next section heading and 3 bullet points underneath it (8 min)
micro_label: "Structure before prose removes the blank page"
Step 3: Expand the first bullet into 2-3 full sentences (8 min)
micro_label: "Starting with one bullet removes the scale"
Step 4: Do the same for bullets 2 and 3 (10 min)
micro_label: "By now you are writing not starting"
Step 5: Read what you wrote and fix one thing (2 min)
micro_label: "Editing a sentence is momentum not perfectionism"

7. NEVER DO THESE THINGS:
- Never use the word "just"
- Never produce a step containing a hidden decision ("tidy the living room" = 50 decisions, bad) ("put all items from the couch into the laundry basket" = 1 action, good)
- Never exceed the time available
- Never produce steps that only make sense if the previous step was completed perfectly
- Never add motivational commentary inside the step title

Return only valid JSON matching the schema. No preamble, no explanation.`,
      response_json_schema: {
        type: "object",
        properties: {
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                duration_minutes: { type: "number" },
                micro_label: { type: "string" }
              }
            }
          }
        }
      }
    });

    console.log(`[guestBreakdown] Success — ip: ${ip}, task: "${taskText}", energy: ${energyValue}, time: ${timeValue}`);
    return Response.json({ steps: result.steps || [] });
  } catch (error) {
    console.error(`[guestBreakdown] LLM error — ip: ${ip}, error: ${error.message}`);
    return Response.json({ error: "LLM call failed", detail: error.message }, { status: 500 });
  }
});