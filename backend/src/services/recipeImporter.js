// src/services/recipeImporter.js — Import recipes from URLs using structured data + HTML scraping

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Attempts to extract recipe data from a URL.
 * Priority: JSON-LD schema.org/Recipe → microdata → HTML heuristics
 */
async function importFromUrl(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Crouton-Importer/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    maxRedirects: 5,
  });

  const $ = cheerio.load(response.data);

  // 1. Try JSON-LD
  const jsonldResult = extractJsonLd($);
  if (jsonldResult) return jsonldResult;

  // 2. Fallback: HTML heuristics
  return extractHeuristics($, url);
}

function extractJsonLd($) {
  let recipe = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (recipe) return;
    try {
      const data = JSON.parse($(el).html());
      const items = Array.isArray(data) ? data : [data, ...(data['@graph'] || [])];
      for (const item of items) {
        if (item['@type'] === 'Recipe' || item?.['@type']?.includes?.('Recipe')) {
          recipe = item;
          return false; // break
        }
      }
    } catch { /* skip malformed */ }
  });

  if (!recipe) return null;

  return {
    title: recipe.name || '',
    description: recipe.description || '',
    prep_time_minutes: parseDuration(recipe.prepTime),
    cook_time_minutes: parseDuration(recipe.cookTime),
    servings: parseServings(recipe.recipeYield),
    ingredients: parseIngredients(recipe.recipeIngredient),
    steps: parseSteps(recipe.recipeInstructions),
    source_url: recipe.url || '',
  };
}

function extractHeuristics($, url) {
  const title =
    $('[class*="recipe-title"], [class*="recipe__title"], h1').first().text().trim() ||
    $('title').text().replace(/ [-|].*$/, '').trim();

  const rawIngredients = [];
  $('[class*="ingredient"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 200) rawIngredients.push({ name: text, amount: null, unit: null });
  });

  const rawSteps = [];
  $('[class*="instruction"], [class*="step"], [class*="direction"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10) rawSteps.push({ instruction: text, timer_seconds: null });
  });

  return {
    title: title || 'Imported Recipe',
    description: $('meta[name="description"]').attr('content') || '',
    prep_time_minutes: null,
    cook_time_minutes: null,
    servings: 4,
    ingredients: rawIngredients.slice(0, 50),
    steps: rawSteps.slice(0, 30),
    source_url: url,
  };
}

function parseDuration(iso) {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  return (parseInt(match[1] || 0) * 60) + parseInt(match[2] || 0);
}

function parseServings(raw) {
  if (!raw) return 4;
  if (typeof raw === 'number') return raw;
  const match = String(raw).match(/\d+/);
  return match ? parseInt(match[0]) : 4;
}

function parseIngredients(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map(item => {
    if (typeof item === 'string') {
      // Simple parse: "200g flour" → amount:200, unit:g, name:flour
      const match = item.match(/^([\d¼½¾⅓⅔⅛⅜⅝⅞.,/\s]+)?\s*([a-zA-Z]+(?:sp|oz|lb|g|kg|ml|l|cup|tbsp|tsp)?)?\.?\s+(.+)/i);
      if (match) {
        return { name: match[3] || item, amount: parseFloat(match[1]) || null, unit: match[2] || null, notes: null };
      }
      return { name: item, amount: null, unit: null, notes: null };
    }
    return { name: item.name || String(item), amount: null, unit: null, notes: null };
  });
}

function parseSteps(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') return [{ instruction: raw, timer_seconds: null }];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap(step => {
    if (typeof step === 'string') return [{ instruction: step, timer_seconds: null }];
    if (step['@type'] === 'HowToStep') return [{ instruction: step.text || step.name, timer_seconds: null }];
    if (step['@type'] === 'HowToSection' && step.itemListElement) {
      return step.itemListElement.map(s => ({ instruction: s.text || s.name, timer_seconds: null }));
    }
    return [{ instruction: step.text || String(step), timer_seconds: null }];
  });
}

module.exports = { importFromUrl };
