import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Tier check — Pro or Premium only
    const tier = user.subscription_tier || 'free';
    if (tier === 'free') {
      return Response.json({
        error: "This feature requires a Pro or Premium subscription. Upgrade to unlock AI task breakdown.",
        upgrade_required: true,
      }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { title, description, category, difficulty, energy_level_needed, current_mood, profile_type } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }
    if (title.trim().length > 300) {
      return Response.json({ error: "title must be 300 characters or fewer" }, { status: 400 });
    }

    // Build tone instructions based on profile_type (mirrors frontend logic exactly)
    let toneInstructions;
    if (profile_type === "child") {
      toneInstructions = `TONE: This is for a child aged 5-12. Use very simple, warm, encouraging language. Keep steps SHORT (max 1 sentence each). Use friendly words like "Let's", "First", "Then", "All done!". Avoid adult vocabulary. Make steps feel like a fun game or adventure. Use emojis in step titles. Max 4-5 steps total.`;
    } else if (profile_type === "teen") {
      toneInstructions = `TONE: This is for a teenager aged 13-17. Use casual, direct language. Do NOT be patronising or preachy. No "you've got this!" energy. Be straightforward and practical. No unnecessary explanation. Treat them like a capable person who just needs clear steps. Max 5-7 steps.`;
    } else {
      toneInstructions = `TONE: Standard adult tone. Clear, specific, non-patronising. Focus on removing ambiguity and reducing decision load.`;
    }

    const prompt = `You are a task initiation specialist who understands executive dysfunction at a neurological level. Your job is to take ONE task a user has been avoiding and break it into micro-steps that are so specific and so small that starting feels physically impossible to resist.

CORE PRINCIPLE:
The user's brain is not lazy. It cannot identify a discrete first physical action from a vague task. Your job is to remove every ambiguous decision between them and starting.

${toneInstructions}

INPUTS:
- Task: "${title}"
- Description: ${description || "None"}
- Category: ${category || "personal"}
- Difficulty: ${difficulty || "medium"}
- Energy needed: ${energy_level_needed || "medium"}
- Current mood: ${current_mood || "not specified"}

STEP RULES:

1. NEVER produce generic steps.
"Do the first obvious action" is not a step.
"Clear everything off the left side of the bench" is a step.
Steps must be so specific that two different people doing the same task would do the exact same physical action.

2. MATCH STEPS TO ENERGY LEVEL.
Low energy: First step max 2 minutes, near-zero cognitive load, no decisions within the step itself.
Medium energy: Steps 3-5 minutes, fully specific.
High energy: Steps up to 10 minutes, minor decisions allowed.

3. STEP 1 IS THE MOST IMPORTANT.
Immediate visible progress. If they do nothing else, completing step 1 is a win. Must feel achievable in the worst mental state.

4. MOOD ADJUSTMENTS:
- tired/low energy: first step especially minimal, max 2 min
- anxious: second step can include a grounding physical action
- overwhelmed: keep all steps very small, max 3 steps initially
- unmotivated: early steps especially tangible and visible
- distracted: first step removes the primary distraction source

5. NEVER DO THESE THINGS:
- Never use the word "just"
- Never produce a step containing a hidden decision
- Never produce steps that only make sense if the previous step was completed perfectly
- Never add motivational commentary inside the step title (unless child profile)

Total steps should be 4-8. Return JSON only in this format: {"subtasks": [{"title": "...", "order": 1, "estimated_minutes": N}], "estimated_minutes": N, "encouragement": "..."}`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY"),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: "You are a task breakdown engine. You ALWAYS respond with valid JSON only — no preamble, no markdown, no explanation.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const responseText = await anthropicRes.text();
    if (!anthropicRes.ok) {
      console.error(`[taskBreakdownAI] Anthropic error — status: ${anthropicRes.status}, body: ${responseText}`);
      return Response.json({ error: "AI service error. Please try again." }, { status: 502 });
    }

    const anthropicData = JSON.parse(responseText);
    const rawText = anthropicData.content?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No valid JSON found in AI response");
      parsed = JSON.parse(match[0]);
    }

    console.log(`[taskBreakdownAI] Success — user: ${user.id}, tier: ${tier}, task: "${title}"`);
    return Response.json(parsed);

  } catch (error) {
    console.error(`[taskBreakdownAI] Error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});