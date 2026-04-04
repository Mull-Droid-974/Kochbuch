import { Season } from '@/types/database'

interface RecipePromptOptions {
  mealType: 'lunch' | 'dinner'
  season: Season
  avoidIds?: string[]
  avoidTitles?: string[]
  glutenFree?: boolean
  lactoseFree?: boolean
}

const RECIPE_JSON_SCHEMA = `{
  "title": "string",
  "description": "string (2 Sätze auf Deutsch)",
  "difficulty": "easy" | "medium" | "hard",
  "prep_time_minutes": number,
  "cook_time_minutes": number,
  "servings_base": 2,
  "season": ["spring" | "summer" | "autumn" | "winter"],
  "is_gluten_free": boolean,
  "is_lactose_free": boolean,
  "is_low_carb": boolean,
  "is_high_protein": boolean,
  "ingredients": [
    { "name": "string", "quantity": number, "unit": "string", "category": "string" }
  ],
  "steps": [
    { "order": number, "text": "string", "tip": "string | null" }
  ],
  "tags": ["string"],
  "photo_search_term": "string (English, for Unsplash, e.g. 'lentil soup vegetarian')"
}`

export function buildRecipePrompt(opts: RecipePromptOptions): string {
  const { mealType, season, avoidTitles = [], glutenFree = false, lactoseFree = false } = opts

  const seasonLabels: Record<Season, string> = {
    spring: 'Frühling',
    summer: 'Sommer',
    autumn: 'Herbst',
    winter: 'Winter',
  }

  const dietaryRestrictions = [
    glutenFree && 'glutenfrei',
    lactoseFree && 'laktosefrei',
  ].filter(Boolean).join(', ')

  const avoidNote = avoidTitles.length > 0
    ? `\nVermeide diese Gerichte (bereits vorgeschlagen): ${avoidTitles.join(', ')}`
    : ''

  const mealSpecific = mealType === 'lunch'
    ? `Mahlzeit: Mittagessen (normales vegetarisches Gericht, sättigend, saisonal)
Keine speziellen Diät-Einschränkungen bezüglich Kohlenhydrate.`
    : `Mahlzeit: Abendessen (Low-Carb, proteinreich, vegetarisch)
WICHTIG: Low-Carb bedeutet:
- KEINE Nudeln, Brot, Reis, Kartoffeln, Couscous, Bulgur oder andere Getreidesorten
- Proteinquellen: Eier, Hülsenfrüchte (Linsen, Kichererbsen), Tofu, Tempeh, Käse, Quark, griechischer Joghurt, Nüsse, Samen
- Viel Gemüse erlaubt
- is_low_carb: true, is_high_protein: true`

  return `Du bist ein kreativer vegetarischer Koch. Erstelle ein Rezept für 2 Personen auf Deutsch.

${mealSpecific}

Saison: ${seasonLabels[season]}
${dietaryRestrictions ? `Diätanforderungen: ${dietaryRestrictions}` : ''}${avoidNote}

Antworte NUR mit validem JSON ohne Markdown-Codeblöcke, exakt in diesem Schema:
${RECIPE_JSON_SCHEMA}

Wichtig:
- Alle Texte auf Deutsch
- photo_search_term auf Englisch (für Unsplash-Suche)
- Mengenangaben realistisch für 2 Personen
- Zutaten-Kategorien auf Deutsch (z.B. "Gemüse", "Milchprodukte", "Gewürze", "Hülsenfrüchte", "Nüsse & Samen", "Öle & Essig", "Sonstiges")`
}

export function buildIngredientSearchPrompt(
  ingredients: string[],
  filters: { glutenFree?: boolean; lactoseFree?: boolean; maxTime?: number } = {}
): string {
  const restrictions = [
    filters.glutenFree && 'glutenfrei',
    filters.lactoseFree && 'laktosefrei',
  ].filter(Boolean)

  return `Du bist ein vegetarischer Kochexperte. Schlage 3 vegetarische Rezepte vor, die diese Zutaten verwenden: ${ingredients.join(', ')}.

Mindestens 1 Rezept soll Low-Carb und proteinreich sein.
${restrictions.length > 0 ? `Alle Rezepte müssen ${restrictions.join(' und ')} sein.` : ''}
${filters.maxTime ? `Maximale Gesamtzeit: ${filters.maxTime} Minuten.` : ''}

Antworte NUR mit einem JSON-Array mit 3 Rezept-Objekten, ohne Markdown-Codeblöcke.
Jedes Objekt folgt exakt diesem Schema:
${RECIPE_JSON_SCHEMA}

Alle Texte auf Deutsch, photo_search_term auf Englisch.`
}
