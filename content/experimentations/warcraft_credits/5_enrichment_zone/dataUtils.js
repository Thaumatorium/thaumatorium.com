// dataUtils.js
// Utility functions for data fetching and ID generation.

/**
 * Asynchronously fetches and parses a JSON file from a given path.
 * @param {string} filename - The path to the JSON file.
 * @returns {Promise<Object>} A promise resolving with the parsed JSON data.
 * @throws {Error} If the filename is missing, fetching fails, or parsing fails.
 */
export async function fetchJsonFile(filename) {
    if (!filename || typeof filename !== 'string') {
        throw new Error("No valid filename provided for fetching.");
    }
    try {
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} loading ${filename}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Fetch or parse error for ${filename}:`, error);
        // Re-throw a more specific error for upstream handling
        throw new Error(`Failed to load/parse ${filename}: ${error.message}`);
    }
}

/**
 * Generates a consistent, sanitized ID for a person node based on their name.
 * Provides a fallback for invalid input.
 * @param {string} name - The name of the person.
 * @returns {string} A generated ID string (e.g., "person_johnsmith").
 */
export function generatePersonId(name) {
    if (!name || typeof name !== 'string') {
        console.warn("Generating ID for invalid name:", name);
        // Provide a more predictable fallback than random
        return `person_invalid_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
    // Normalize: lowercase, remove non-alphanumeric chars
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `person_${sanitizedName}`;
}
