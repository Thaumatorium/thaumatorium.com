import { fetchJsonFile, generatePersonId, getGameNameFromData } from "./dataUtils.js";
import { processDataForD3 } from "./graphProcessor.js"; // Will be modified
import { DEFAULT_ROLE, gameTitleMap } from "./config.js";

/**
 * Transforms the short filename from the dropdown into the expected data path.
 * @param {string} shortFilename - The filename from the dropdown (e.g., 'wc1_ovh.json').
 * @returns {string} The path used for fetching the JSON data.
 */
function getActualDataPath(shortFilename) {
	if (!shortFilename || typeof shortFilename !== "string" || !shortFilename.includes(".")) {
		return `./${shortFilename || "invalid_filename.json"}`;
	}
	return `./${shortFilename}`;
}

/**
 * Calculates basic statistics from the raw game JSON data.
 * @param {object | null} jsonData - The parsed JSON object for a single game.
 * @param {string} filename - The filename, used for finding the game name key.
 * @returns {{personCount: number, uniqueRoleCount: number} | null} Stats object or null if data is invalid.
 */
function calculateRawStats(jsonData, filename) {
	if (!jsonData) return null;
	const gameName = getGameNameFromData(jsonData, filename);
	let peopleArray = null;
	if (!gameName || !Array.isArray(jsonData[gameName])) {
		const topLevelKeys = Object.keys(jsonData);
		for (const key of topLevelKeys) {
			if (Array.isArray(jsonData[key])) {
				peopleArray = jsonData[key];
				break;
			}
		}

		if (!peopleArray) {
			return { personCount: 0, uniqueRoleCount: 0 };
		}
	} else {
		peopleArray = jsonData[gameName];
	}

	const personCount = peopleArray.length;
	const uniqueRoles = new Set();

	peopleArray.forEach((person) => {
		if (person && Array.isArray(person.roles)) {
			person.roles.forEach((role) => {
				const trimmedRole = typeof role === "string" ? role.trim() : null;
				if (trimmedRole) {
					uniqueRoles.add(trimmedRole);
				}
			});
		}
	});

	return {
		personCount: personCount,
		uniqueRoleCount: uniqueRoles.size,
	};
}

self.onmessage = async (event) => {
	const {
		filename1: shortFilename1,
		filename2: shortFilename2,
		filters, // Raw filters from main.js (text might have commas)
	} = event.data;

	// Split comma-separated terms and validate
	const parseFilterText = (text) => {
		return String(text || "")
			.split(",")
			.map((term) => term.trim())
			.filter(Boolean); // Remove empty strings resulting from double commas etc.
	};

	const validatedFilters = {
		name: {
			// Store the original text and the parsed terms
			text: String(filters?.name?.text ?? ""),
			terms: parseFilterText(filters?.name?.text),
			mode: ["contains", "not_contains", "exact", "not_exact"].includes(filters?.name?.mode) ? filters.name.mode : "contains",
		},
		role: {
			// Store the original text and the parsed terms
			text: String(filters?.role?.text ?? ""),
			terms: parseFilterText(filters?.role?.text),
			mode: ["contains", "not_contains", "exact", "not_exact"].includes(filters?.role?.mode) ? filters.role.mode : "contains",
		},
	};

	const actualPath1 = getActualDataPath(shortFilename1);
	const actualPath2 = getActualDataPath(shortFilename2);

	let jsonData1 = null;
	let jsonData2 = null;
	let rawStats1 = null;
	let rawStats2 = null;

	try {
		const isSameGame = actualPath1 === actualPath2;

		try {
			if (isSameGame) {
				jsonData1 = await fetchJsonFile(actualPath1);
				jsonData2 = jsonData1;
				if (jsonData1) {
					rawStats1 = calculateRawStats(jsonData1, shortFilename1);
					rawStats2 = rawStats1;
				}
			} else {
				const results = await Promise.allSettled([fetchJsonFile(actualPath1), fetchJsonFile(actualPath2)]);

				jsonData1 = results[0].status === "fulfilled" ? results[0].value : null;
				jsonData2 = results[1].status === "fulfilled" ? results[1].value : null;

				if (jsonData1) {
					rawStats1 = calculateRawStats(jsonData1, shortFilename1);
				}
				if (jsonData2) {
					rawStats2 = calculateRawStats(jsonData2, shortFilename2);
				}
			}
		} catch (fetchError) {
			console.error("Worker (D3) fetch execution error:", fetchError);
			throw new Error(`Failed during game data fetch attempt: ${fetchError.message}`);
		}

		if (!jsonData1 && !jsonData2) {
			throw new Error(`Failed to fetch data for both selections: ${shortFilename1}, ${shortFilename2}`);
		}

		const workerPersonRolesMap = new Map();
		const workerNormalizedRolePositions = new Map();

		// Pass the filters object (which now contains 'terms' arrays)
		const { nodes, links, filteredStats1, filteredStats2, sharedCount } = processDataForD3(
			jsonData1,
			jsonData2,
			shortFilename1,
			shortFilename2,
			isSameGame,
			workerPersonRolesMap,
			validatedFilters // Pass the object with 'terms' arrays
		);
		const d3GraphData = { nodes, links };

		const personRolesMapData = Array.from(workerPersonRolesMap.entries()).map(([key, valueSet]) => [key, Array.from(valueSet)]);

		// Collect all unique roles from the filtered person-roles map
		const allFilteredRoles = new Set();
		for (const rolesSet of workerPersonRolesMap.values()) {
			for (const role of rolesSet) allFilteredRoles.add(role);
		}
		const hasPersonNodes = d3GraphData.nodes.some((n) => n.type === "person");
		if (allFilteredRoles.size === 0 && hasPersonNodes) {
			allFilteredRoles.add(DEFAULT_ROLE);
		}

		// Distribute roles evenly around a circle for spatial positioning
		const sortedRoles = Array.from(allFilteredRoles).sort();
		const count = sortedRoles.length || 1;
		const angleStep = (2 * Math.PI) / count;
		const radius = 0.4;
		workerNormalizedRolePositions.clear();
		sortedRoles.forEach((role, i) => {
			const angle = i * angleStep - Math.PI / 2;
			workerNormalizedRolePositions.set(role, {
				normX: 0.5 + radius * Math.cos(angle),
				normY: 0.5 + radius * Math.sin(angle),
			});
		});
		// Ensure DEFAULT_ROLE has a center fallback if not already positioned
		if (hasPersonNodes && !workerNormalizedRolePositions.has(DEFAULT_ROLE)) {
			workerNormalizedRolePositions.set(DEFAULT_ROLE, { normX: 0.5, normY: 0.5 });
		}
		const normalizedRolePositionsData = Array.from(workerNormalizedRolePositions.entries());

		self.postMessage({
			status: "success",
			graphData: d3GraphData,
			personRolesMapData: personRolesMapData,
			normalizedRolePositionsData: normalizedRolePositionsData,
			stats1: filteredStats1,
			stats2: filteredStats2,
			sharedCount,
			effectiveFilters: validatedFilters, // Send back the parsed filters including the 'terms' arrays
		});
	} catch (error) {
		console.error("Worker (D3) processing error:", error);
		self.postMessage({
			status: "error",
			message: error.message || "Unknown D3 worker error",
			stats1: null,
			stats2: null,
			sharedCount: 0,
			effectiveFilters: validatedFilters, // Still send filters used
		});
	}
};
