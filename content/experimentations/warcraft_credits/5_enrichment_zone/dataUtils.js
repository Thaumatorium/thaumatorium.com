// dataUtils.js
// Contains utility functions for fetching data and generating IDs

/**
 * Asynchronously fetches and parses a JSON file.
 * @param {string} filename - The path to the JSON file.
 * @returns {Promise<Object>} A promise that resolves with the parsed JSON data.
 * @throws {Error} If fetching or parsing fails.
 */
export async function fetchJsonFile(filename) {
    if (!filename) {
        throw new Error("No filename provided for fetching.");
    }
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status} while loading ${filename}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Fetch or parse failed for ${filename}:`, error);
        throw new Error(`Could not load or parse ${filename}. (${error.message})`);
    }
}

/**
 * Generates a consistent ID for a person node based on their name.
 * Handles potential missing or non-string names.
 * @param {string} name - The name of the person.
 * @returns {string} A generated ID string (e.g., "person_johnsmith").
 */
export function generatePersonId(name) {
    if (!name || typeof name !== 'string') {
        console.warn("Attempted to generate ID for invalid name:", name);
        return `person_unknown_${Math.random().toString(16).slice(2)}`; // Fallback
    }
    return `person_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}
