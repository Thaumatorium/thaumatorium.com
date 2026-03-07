/**
 * Asynchronously fetches and parses a JSON file from a given path.
 * Handles common fetch errors gracefully by returning null.
 *
 * @param {string} filename - The path to the JSON file relative to the executing script (e.g., worker).
 * @returns {Promise<object|null>} A promise resolving with the parsed JSON data, or null if fetching/parsing fails gracefully.
 * @throws {Error} If the filename argument itself is missing or invalid (programmer error).
 */
export async function fetchJsonFile(filename) {
	if (!filename || typeof filename !== "string" || filename.trim() === "") {
		throw new Error("fetchJsonFile: No valid filename provided.");
	}

	try {
		const response = await fetch(filename, {
			headers: { Accept: "application/json" },
		});

		if (!response.ok) {
			console.error(`HTTP ${response.status} fetching ${filename}`);
			return null;
		}

		return await response.json();
	} catch (error) {
		console.error(`Fetch/parse error for ${filename}:`, error);
		return null;
	}
}

/**
 * Safely extracts the game name from JSON data (which should have one top-level key).
 * @param {Object | null} jsonData - The parsed JSON data for a game.
 * @param {string} filename - The filename used to fetch this data (for logging).
 * @returns {string | null} The extracted game name or null if undetermined.
 */
export function getGameNameFromData(jsonData, filename) {
	if (!jsonData || typeof jsonData !== "object") return null;
	const keys = Object.keys(jsonData);
	if (keys.length === 1 && typeof keys[0] === "string" && keys[0].trim() !== "") {
		return keys[0].trim();
	}
	return null;
}

let invalidIdCounter = 0;

/**
 * Generates a consistent, sanitized ID for a person node based on their name.
 * Preserves Latin alphanumeric chars, common CJK characters (Hanzi/Kanji/Hangul),
 * Hiragana, Katakana, spaces, hyphens, and underscores.
 * Replaces separators with single underscores and provides fallbacks.
 *
 * @param {string | null | undefined} name - The name of the person.
 * @returns {string} A generated ID string (e.g., "person_john_smith", "person_홍진욱", "person_佐藤_太郎", "person_invalid_1").
 */
export function generatePersonId(name) {
	if (!name || typeof name !== "string" || name.trim() === "") {
		invalidIdCounter++;
		return `person_invalid_${invalidIdCounter}`;
	}

	const sanitizedName = name
		.trim()
		.replace(/[\s_-]+/g, "_")
		.replace(/[^a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7A3]+/g, "")
		.replace(/^_+|_+$/g, "");

	if (sanitizedName === "") {
		invalidIdCounter++;
		const originalSimplified = name.trim().replace(/[^a-zA-Z0-9]/g, "") || `original_empty_${invalidIdCounter}`;
		const fallbackId = `person_${originalSimplified}_sanitized_empty_${invalidIdCounter}`;
		return fallbackId.substring(0, 60);
	}

	return `person_${sanitizedName}`.substring(0, 100);
}
