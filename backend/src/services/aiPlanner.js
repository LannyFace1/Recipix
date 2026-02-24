// src/services/aiPlanner.js — Claude-powered meal plan generator
// ⚠️  REQUIRES: CLAUDE_API_KEY environment variable
// When CLAUDE_API_KEY is empty, all AI routes return 503.

const Anthropic = require('@anthropic-ai/sdk');

/**
 * Generate a weekly meal plan from available recipes.
 * @param {Array} recipes - User's recipe list (id, title, tags, difficulty, prep+cook time)
 * @param {Object} preferences - { days, slots, preferences string }
 * @returns {Array} - Array of { day_of_week, meal_slot, recipe_id, reason }
 */
async function generateMealPlan(recipes, preferences = {}) {
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error('AI_DISABLED');
  }

  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  const recipeList = recipes.map(r => ({
    id: r.id,
    title: r.title,
    tags: r.tags?.map(t => t.name).join(', '),
    difficulty: r.difficulty,
    total_minutes: (r.prep_time_minutes || 0) + (r.cook_time_minutes || 0),
  }));

  const prompt = `You are a helpful meal planner. Given the user's recipe collection, generate a weekly meal plan.

User preferences: ${preferences.note || 'None specified'}
Days to plan (0=Monday, 6=Sunday): ${preferences.days?.join(', ') ?? '0,1,2,3,4,5,6'}
Meal slots to fill: ${preferences.slots?.join(', ') ?? 'lunch,dinner'}

Available recipes (JSON):
${JSON.stringify(recipeList, null, 2)}

Return ONLY a valid JSON array, no explanation, no markdown. Format:
[
  { "day_of_week": 0, "meal_slot": "lunch", "recipe_id": "<uuid>", "reason": "short reason" },
  ...
]

Rules:
- Only use recipe_ids from the list above
- Vary recipes across the week (don't repeat the same dish)
- Balance difficulty: not every meal should be "hard"
- Account for prep time: use quick recipes on weekdays if possible`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content.find(b => b.type === 'text')?.text || '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('AI returned unexpected format');

  const plan = JSON.parse(jsonMatch[0]);

  // Validate structure
  if (!Array.isArray(plan)) throw new Error('AI plan is not an array');
  return plan.filter(e =>
    typeof e.day_of_week === 'number' &&
    ['breakfast','lunch','dinner','snack'].includes(e.meal_slot) &&
    recipes.some(r => r.id === e.recipe_id)
  );
}

module.exports = { generateMealPlan };
