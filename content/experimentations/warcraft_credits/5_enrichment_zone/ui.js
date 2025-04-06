// ui.js
// Handles UI element population and event handling logic.

import { gameTitleMap } from './config.js';

/**
 * Populates a <select> dropdown element with game options.
 * The options are sorted alphabetically by their filename (the key in titleMap).
 *
 * @param {HTMLSelectElement} selectElement - The dropdown element to populate.
 * @param {Object<string, string>} titleMap - An object mapping filenames (values) to display titles (text).
 */
export function populateDropdown(selectElement, titleMap) {
    if (!selectElement) {
        console.error("populateDropdown: Invalid select element provided.");
        return;
    }
    selectElement.innerHTML = ''; // Clear any existing options

    // Get the filenames (keys) and sort them directly (alphabetically by filename)
    const filenames = Object.keys(titleMap).sort();

    if (filenames.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No games configured";
        option.disabled = true;
        selectElement.appendChild(option);
        selectElement.disabled = true; // Disable dropdown if no options
        return;
    }

    // Add a placeholder option
    const placeholder = document.createElement('option');
    placeholder.value = ""; // Empty value indicates placeholder
    placeholder.textContent = "-- Select a Game --";
    placeholder.disabled = true; // Cannot select the placeholder itself initially
    placeholder.selected = true; // Make it the default visible option
    selectElement.appendChild(placeholder);

    // Add options for each game, using the filename-sorted list
    filenames.forEach(filename => {
        const option = document.createElement('option');
        option.value = filename; // The value will be the filename
        option.textContent = titleMap[filename]; // The displayed text is the title from the map
        selectElement.appendChild(option);
    });

    selectElement.disabled = false; // Ensure dropdown is enabled if options exist
}

/**
 * Creates the event handler function for changes in the game selection dropdowns.
 * Uses a closure to maintain access to necessary elements, state, and the callback function.
 *
 * @param {Object} elements - Object containing required DOM elements { fileSelect1, fileSelect2, errorMessage, cyContainer, tooltip }.
 * @param {Object} state - Application state object { cy, lastFile1, lastFile2 }. Will be modified.
 * @param {Function} loadAndVisualizeCallback - The async function to call when selections change (e.g., loadAndVisualize from main.js).
 * @returns {Function} The event handler function to attach to 'change' events.
 */
export function createHandleSelectionChange(elements, state, loadAndVisualizeCallback) {
    const { fileSelect1, fileSelect2, errorMessage, cyContainer, tooltip } = elements;

    return function handleSelectionChange() {
        const selectedFile1 = fileSelect1.value;
        const selectedFile2 = fileSelect2.value;

        // Re-enable placeholders if a selection is cleared
        fileSelect1.options[0].disabled = !!selectedFile1;
        fileSelect2.options[0].disabled = !!selectedFile2;

        // If either selection is invalid (back to placeholder)
        if (!selectedFile1 || !selectedFile2) {
            // Clear graph and reset tracking if selection becomes incomplete
            if (state.cy) {
                state.cy.destroy();
                state.cy = null;
                cyContainer.innerHTML = ''; // Clear visual
            }
            tooltip.style.display = 'none'; // Hide tooltip
            errorMessage.textContent = ''; // Clear previous errors
            errorMessage.style.display = 'none';
            state.lastFile1 = null; // Reset tracking
            state.lastFile2 = null;
            console.log("Selection incomplete, graph cleared.");
            return; // Do not proceed further
        }

        // Check if the selection actually changed from the last valid load
        if (selectedFile1 === state.lastFile1 && selectedFile2 === state.lastFile2) {
            console.log("Selection hasn't changed, skipping reload.");
            return; // No change, do nothing
        }

        // Valid selections made, proceed with loading
        console.log(`Selection changed. New selection: ${selectedFile1}, ${selectedFile2}`);
        errorMessage.textContent = ''; // Clear any previous error message
        errorMessage.style.display = 'none';

        // Update the state *before* calling the async load function
        state.lastFile1 = selectedFile1;
        state.lastFile2 = selectedFile2;

        // Call the main loading/visualization function (passed in as a callback)
        loadAndVisualizeCallback(selectedFile1, selectedFile2);
    };
}

/**
 * Sets initial default selections for the dropdowns and triggers the initial data load.
 * Selects the first two available games based on the filename sort order.
 * If only one game exists, selects it for both.
 *
 * @param {Object} elements - Object containing required DOM elements { fileSelect1, fileSelect2, errorMessage }.
 * @param {Function} handleSelectionChangeCallback - The event handler function (created by createHandleSelectionChange)
 *                                                   to trigger the initial load sequence.
 */
export function setDefaultSelections(elements, handleSelectionChangeCallback) {
    const { fileSelect1, fileSelect2, errorMessage } = elements;

    // Ensure dropdowns are populated before trying to set values
    if (fileSelect1.options.length <= 1 || fileSelect2.options.length <= 1) { // <=1 because of placeholder
        console.warn("setDefaultSelections: Dropdowns not populated or empty.");
        if (errorMessage) {
            errorMessage.textContent = 'Cannot set default games: No game data found or UI not ready.';
            errorMessage.style.display = 'block';
        }
        fileSelect1.disabled = true;
        fileSelect2.disabled = true;
        return;
    }

    // Get available game filenames (excluding the placeholder), already sorted by filename
    // because populateDropdown sorts them that way now.
    const availableFiles = Array.from(fileSelect1.options)
        .map(opt => opt.value)
        .filter(val => val !== ""); // Filter out empty placeholder value

    if (availableFiles.length >= 2) {
        // Select first two distinct files (based on filename sort order)
        fileSelect1.value = availableFiles[0];
        fileSelect2.value = availableFiles[1];
        console.log(`Default selections set (by filename): ${availableFiles[0]}, ${availableFiles[1]}`);
    } else if (availableFiles.length === 1) {
        // Select the single available file for both dropdowns
        fileSelect1.value = availableFiles[0];
        fileSelect2.value = availableFiles[0];
        console.log(`Single game available. Default selections set (by filename): ${availableFiles[0]}, ${availableFiles[0]}`);
    } else {
        // This case should ideally be handled by populateDropdown, but added as safety
        errorMessage.textContent = 'No game data available to select.';
        errorMessage.style.display = 'block';
        fileSelect1.disabled = true;
        fileSelect2.disabled = true;
        console.error("setDefaultSelections: No valid game files found after population.");
        return; // Don't trigger callback if no valid selection could be made
    }

    // Disable placeholders now that defaults are set
    fileSelect1.options[0].disabled = true;
    fileSelect2.options[0].disabled = true;

    // Trigger the 'change' handler manually to perform the initial load
    handleSelectionChangeCallback();
}
