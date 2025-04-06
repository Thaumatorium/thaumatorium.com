// ui.js
// Handles UI interactions like populating dropdowns and handling selection changes.

import { gameTitleMap } from './config.js';

/**
 * Populates a select dropdown with options based on a title map.
 * @param {HTMLSelectElement} selectElement - The dropdown element.
 * @param {Object} titleMap - An object mapping filenames to display titles.
 */
export function populateDropdown(selectElement, titleMap) {
    selectElement.innerHTML = ''; // Clear existing options
    const filenames = Object.keys(titleMap).sort();

    if (filenames.length === 0) {
        const option = document.createElement('option');
        option.value = ""; option.textContent = "No files found"; option.disabled = true;
        selectElement.appendChild(option); return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = ""; placeholder.textContent = "-- Select a Game --";
    selectElement.appendChild(placeholder);

    filenames.forEach(filename => {
        const option = document.createElement('option');
        option.value = filename; option.textContent = titleMap[filename];
        selectElement.appendChild(option);
    });
}

/**
 * Creates the event handler function for dropdown changes.
 * This uses a closure to access necessary variables and functions from the main script.
 * @param {Object} elements - Object containing required DOM elements { fileSelect1, fileSelect2, errorMessage, cyContainer, tooltip }.
 * @param {Object} state - Object containing shared state { cy, lastFile1, lastFile2 }.
 * @param {Function} loadAndVisualizeCallback - The function to call to load/visualize data.
 * @returns {Function} The event handler function.
 */
export function createHandleSelectionChange(elements, state, loadAndVisualizeCallback) {
    const { fileSelect1, fileSelect2, errorMessage, cyContainer, tooltip } = elements;

    return function handleSelectionChange() {
        const selectedFile1 = fileSelect1.value;
        const selectedFile2 = fileSelect2.value;

        if (!selectedFile1 || !selectedFile2) {
            // Clear graph if selection becomes invalid
            if (state.cy) { state.cy.destroy(); state.cy = null; cyContainer.innerHTML = ''; }
            tooltip.style.display = 'none';
            state.lastFile1 = null; state.lastFile2 = null; // Reset tracking
            errorMessage.textContent = ''; // Clear potential previous errors
            return;
        }

        if (selectedFile1 === state.lastFile1 && selectedFile2 === state.lastFile2) {
            return; // No actual change
        }

        errorMessage.textContent = '';
        state.lastFile1 = selectedFile1;
        state.lastFile2 = selectedFile2;

        // Call the main loading function passed from main.js
        loadAndVisualizeCallback(selectedFile1, selectedFile2);
    };
}

/**
 * Sets default selections for the dropdowns and triggers the initial load.
 * @param {Object} elements - Object containing required DOM elements { fileSelect1, fileSelect2, errorMessage }.
 * @param {Function} handleSelectionChangeCallback - The event handler to trigger the load.
 */
export function setDefaultSelections(elements, handleSelectionChangeCallback) {
    const { fileSelect1, fileSelect2, errorMessage } = elements;
    const sortedFiles = Object.keys(gameTitleMap).sort();

    if (sortedFiles.length >= 2) {
        fileSelect1.value = sortedFiles[0];
        fileSelect2.value = sortedFiles[1];
        console.log(`Defaults set: ${sortedFiles[0]}, ${sortedFiles[1]}`);
        handleSelectionChangeCallback(); // Trigger initial load
    } else if (sortedFiles.length === 1) {
        fileSelect1.value = sortedFiles[0];
        fileSelect2.value = sortedFiles[0];
        console.log(`Defaults set (single file): ${sortedFiles[0]}`);
        handleSelectionChangeCallback();
    } else {
        errorMessage.textContent = 'No game data found. Please check configuration.';
        fileSelect1.disabled = true;
        fileSelect2.disabled = true;
    }
}
