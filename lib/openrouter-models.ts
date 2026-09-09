/**
 * Live catalog of OpenRouter free models.
 *
 * The chain is refreshed from https://openrouter.ai/api/v1/models (public,
 * no API key required to list models) and cached in memory for an hour, so
 * every free model OpenRouter offers is always in the fallback chain —
 * including models added after this file was written.
 *
 * A bundled snapshot keeps the chat working if the catalog request fails.
 */

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const CATALOG_TIMEOUT_MS = 8_000;

export type FreeModelCatalog = {
  /** Free models that produce text — used for the chat fallback chain. */
  text: string[];
  /** Free models that can produce images — used for image generation. */
  image: string[];
};

// Snapshot captured 2026-09-09 (all 18 free models on OpenRouter at that
// time), ordered best-first for chat quality. Live refreshes keep this order
// for known models and append newly discovered ones alphabetically.
export const FREE_TEXT_MODEL_SNAPSHOT: string[] = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "thinkingmachines/inkling:free",
  "nex-agi/nex-n2.5-pro:free",
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-26b-a4b-it:free",
  "thinkingmachines/inkling-small:free",
  "nex-agi/nex-n2.5-mini:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "inclusionai/ling-3.0-flash-sante:free",
  "inclusionai/ling-3.0-flash-fin:free",
  "dots-studio/dots-3-note-preview:free",
  "liquid/lfm-2.5-2.6b:free",
  "cohere/north-mini-code:free",
  "poolside/laguna-s-2.1:free",
  "poolside/laguna-xs-2.1:free",
  "nvidia/nemotron-3.5-content-safety:free",
];

const FREE_IMAGE_MODEL_SNAPSHOT: string[] = [];

type OpenRouterModel = {
  id: string;
  architecture?: { output_modalities?: string[] };
};

let cache: { catalog: FreeModelCatalog; fetchedAt: number } | null = null;

function orderModels(models: string[], preferred: string[]): string[] {
  const live = new Set(models);
  const known = preferred.filter((id) => live.has(id));
  const fresh = models.filter((id) => !preferred.includes(id)).sort();
  return [...known, ...fresh];
}

async function fetchCatalog(): Promise<FreeModelCatalog> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CATALOG_TIMEOUT_MS);
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`OpenRouter models API responded with HTTP ${response.status}`);
    }

    const data = (await response.json()) as { data?: OpenRouterModel[] };
    const freeModels = (data.data ?? []).filter((model) => model.id.endsWith(":free"));

    const image = freeModels
      .filter((model) => model.architecture?.output_modalities?.includes("image"))
      .map((model) => model.id);
    const text = freeModels
      .filter((model) => !model.architecture?.output_modalities?.includes("image"))
      .map((model) => model.id);

    return {
      text: orderModels(text, FREE_TEXT_MODEL_SNAPSHOT),
      image: orderModels(image, FREE_IMAGE_MODEL_SNAPSHOT),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getFreeModels(): Promise<FreeModelCatalog> {
  if (cache && Date.now() - cache.fetchedAt < REFRESH_INTERVAL_MS) {
    return cache.catalog;
  }

  try {
    const catalog = await fetchCatalog();
    if (catalog.text.length > 0) {
      cache = { catalog, fetchedAt: Date.now() };
      return catalog;
    }
    console.warn("OpenRouter catalog returned no free models; using the bundled snapshot.");
  } catch (error) {
    console.warn("Falling back to the bundled free-model snapshot:", error);
  }

  return { text: FREE_TEXT_MODEL_SNAPSHOT, image: FREE_IMAGE_MODEL_SNAPSHOT };
}