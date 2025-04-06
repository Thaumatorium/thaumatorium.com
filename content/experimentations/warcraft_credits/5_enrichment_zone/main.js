// main.js
// Main application entry point. Orchestrates UI, data fetching, processing, and visualization.

import { gameTitleMap } from './config.js';
import { fetchJsonFile } from './dataUtils.js';
import { processGraphData } from './graphProcessor.js';
import { visualizeGraph } from './graphVisualizer.js';
import { populateDropdown, createHandleSelectionChange, setDefaultSelections } from './ui.js';

// Wait for the DOM to be fully loaded and parsed
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    // --- 1. Select Essential DOM Elements ---
    const elements = {
        fileSelect1: document.getElementById('fileSelect1'),
        fileSelect2: document.getElementById('fileSelect2'),
        cyContainer: document.getElementById('cy'),
        loadingMessage: document.getElementById('loadingMessage'),
        errorMessage: document.getElementById('errorMessage'),
        tooltip: document.getElementById('tooltip') // Needed for UI interaction logic
    };

    // Verify elements exist
    for (const key in elements) {
        if (!elements[key]) {
            console.error(`Fatal Error: DOM element with ID '${key}' not found.`);
            document.body.innerHTML = `<h1>Error</h1><p>Required element '${key}' is missing. Please check index.html.</p>`;
            return; // Stop execution
        }
    }

    // --- 2. Initialize Application State ---
    const state = {
        cy: null, // Holds the current Cytoscape instance
        lastFile1: null, // Tracks the last selected filename for comparison
        lastFile2: null,
        personRolesMap: new Map() // Shared map for person roles, populated by processor
    };

    // --- 3. Core Application Logic ---

    /**
     * Orchestrates fetching data, processing it, and visualizing the graph.
     * Handles loading states, errors, and cleans up previous instances.
     * @param {string} filename1 - The filename for the first selected game.
     * @param {string} filename2 - The filename for the second selected game.
     */
    async function loadAndVisualize(filename1, filename2) {
        console.log(`Attempting to load: ${filename1}, ${filename2}`);
        // Reset UI state
        elements.errorMessage.textContent = '';
        elements.errorMessage.style.display = 'none'; // Hide error message area initially
        elements.loadingMessage.style.display = 'block';
        elements.tooltip.style.display = 'none'; // Ensure tooltip is hidden

        // Destroy previous Cytoscape instance if it exists
        if (state.cy) {
            state.cy.destroy();
            state.cy = null;
        }
        elements.cyContainer.innerHTML = ''; // Clear the container

        try {
            // --- Check Cytoscape CORE Availability (Essential Pre-check) ---
            // We perform this check early. The layout extension availability check
            // is implicitly handled by the try...catch block within visualizeGraph,
            // as timing issues with deferred scripts can make early checks unreliable here.
            if (typeof window.cytoscape === 'undefined') {
                throw new Error("Cytoscape core library is not available (window.cytoscape is undefined). Check script loading in HTML.");
            }
            console.log("Cytoscape core confirmed.");

            // --- Fetch Data ---
            const isSameGame = (filename1 === filename2);
            let data1, data2;
            if (isSameGame) {
                data1 = await fetchJsonFile(filename1);
                data2 = data1; // Avoid fetching the same file twice
            } else {
                // Fetch in parallel for potentially faster loading
                [data1, data2] = await Promise.all([
                    fetchJsonFile(filename1),
                    fetchJsonFile(filename2)
                ]);
            }

            // --- Process Data ---
            // The processGraphData function modifies state.personRolesMap directly
            const graphDataForVis = processGraphData(data1, data2, isSameGame, state.personRolesMap);

            // --- Visualize Graph ---
            const visualizerDomElements = { // Pass only necessary elements
                cyContainer: elements.cyContainer,
                tooltipElement: elements.tooltip,
                errorMessageElement: elements.errorMessage
            };

            // visualizeGraph uses window.cytoscape implicitly and will throw an error
            // internally if the specified layout (e.g., 'cose-bilkent') isn't registered yet.
            // This error will be caught by the catch block below.
            state.cy = visualizeGraph(graphDataForVis, visualizerDomElements, state.personRolesMap);

            // Check if visualization succeeded (visualizeGraph returns null on failure OR throws error)
            if (!state.cy) {
                 // If visualizeGraph returned null without throwing (e.g., no data),
                 // it should have set an error message. Log a warning just in case.
                 console.warn("visualizeGraph returned null or failed, indicating visualization failure.");
                 if (elements.errorMessage.textContent) {
                     elements.errorMessage.style.display = 'block';
                 } else if (!errorOccurred) { // Check if an error was already caught
                    // Only set fallback if no specific error was caught and message is empty
                    elements.errorMessage.textContent = "Graph visualization failed: No data or configuration issue.";
                    elements.errorMessage.style.display = 'block';
                 }
            } else {
                console.log("Graph visualization successful.");
            }

        } catch (error) {
            // This catch block will handle errors from fetchJsonFile, processGraphData,
            // AND errors thrown by visualizeGraph (including layout not found).
            console.error("Error during load/process/visualize:", error);
            // Display user-friendly error message
            elements.errorMessage.textContent = `Error: ${error.message}`; // The error message from visualizeGraph will be shown here if it failed
            elements.errorMessage.style.display = 'block';
            elements.tooltip.style.display = 'none'; // Hide tooltip on error
            // Reset state fully on critical error
            state.lastFile1 = null;
            state.lastFile2 = null;
            if (state.cy) { state.cy.destroy(); state.cy = null; }
            elements.cyContainer.innerHTML = '';
            // errorOccurred = true; // Signal that an error was caught
        } finally {
            // Always hide loading message when done (success or error)
            elements.loadingMessage.style.display = 'none';
        }
    } // --- End of loadAndVisualize ---

    // --- 4. Setup UI Interactions ---
    try {
        populateDropdown(elements.fileSelect1, gameTitleMap);
        populateDropdown(elements.fileSelect2, gameTitleMap);

        // Create the event handler using a closure to pass dependencies
        const handleSelectionChange = createHandleSelectionChange(elements, state, loadAndVisualize);

        // Attach the handler to both dropdowns
        elements.fileSelect1.addEventListener('change', handleSelectionChange);
        elements.fileSelect2.addEventListener('change', handleSelectionChange);

        // --- 5. Initial Load ---
        // Set default selections and trigger the first load sequence
        setDefaultSelections(elements, handleSelectionChange);

    } catch(uiError) {
         console.error("Error setting up UI:", uiError);
         elements.errorMessage.textContent = `Fatal UI Setup Error: ${uiError.message}`;
         elements.errorMessage.style.display = 'block';
         elements.loadingMessage.style.display = 'none';
    }

}); // End DOMContentLoaded listener
