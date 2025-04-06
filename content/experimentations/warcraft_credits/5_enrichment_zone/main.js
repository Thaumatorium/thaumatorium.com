// main.js
// Main application entry point. Orchestrates UI, data fetching (via worker), processing (via worker), and visualization.

import { gameTitleMap } from './config.js';
// fetchJsonFile and processGraphData are now mainly used by the worker
// import { fetchJsonFile } from './dataUtils.js';
// import { processGraphData } from './graphProcessor.js';
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
        personRolesMap: new Map(), // Shared map for person roles, populated by worker result
        activeWorker: null // Keep track of the active worker
    };

    // --- 3. Core Application Logic ---

    /**
     * Orchestrates fetching data, processing it (using a Web Worker), and visualizing the graph.
     * Handles loading states, errors, and cleans up previous instances.
     * @param {string} filename1 - The filename for the first selected game.
     * @param {string} filename2 - The filename for the second selected game.
     */
    async function loadAndVisualize(filename1, filename2) {
        console.log(`Main: Attempting to load via worker: ${filename1}, ${filename2}`);
        // Reset UI state
        elements.errorMessage.textContent = '';
        elements.errorMessage.style.display = 'none';
        elements.loadingMessage.style.display = 'block';
        elements.tooltip.style.display = 'none';

        // Terminate any previous worker still running
        if (state.activeWorker) {
            console.log("Main: Terminating previous worker.");
            state.activeWorker.terminate();
            state.activeWorker = null;
        }

        // Destroy previous Cytoscape instance if it exists
        if (state.cy) {
            state.cy.destroy();
            state.cy = null;
        }
        elements.cyContainer.innerHTML = ''; // Clear the container

        try {
            // --- Check Cytoscape Core Availability (Essential Pre-check) ---
            if (typeof window.cytoscape === 'undefined') {
                throw new Error("Cytoscape core library is not available (window.cytoscape is undefined). Check script loading in HTML.");
            }
            console.log("Main: Cytoscape core confirmed.");

            // --- Initialize and Start Web Worker ---
            // Ensure your worker file exists and path is correct
            // Use { type: 'module' } if your worker uses import/export syntax
            const worker = new Worker('./worker.js', { type: 'module' });
            state.activeWorker = worker; // Store reference to the current worker

            worker.onmessage = (event) => {
                // Make sure this message is from the currently active worker
                if (worker !== state.activeWorker) {
                    console.log("Main: Received message from outdated worker, ignoring.");
                    return;
                }

                const { status, graphData, personRolesMapData, message } = event.data;

                if (status === 'success') {
                    console.log("Main: Worker finished successfully.");
                    // Reconstruct the roles Map on the main thread from the worker data
                    // The worker converts the Map to an array for transport
                    state.personRolesMap = new Map(personRolesMapData || []); // Handle case where map might be empty

                    // --- Visualize Graph (using data from worker) ---
                    const visualizerDomElements = {
                        cyContainer: elements.cyContainer,
                        tooltipElement: elements.tooltip,
                        errorMessageElement: elements.errorMessage
                    };
                    // visualizeGraph uses window.cytoscape implicitly
                    state.cy = visualizeGraph(graphData, visualizerDomElements, state.personRolesMap);

                    if (!state.cy) {
                        // visualizeGraph should have set an error message if it failed internally
                        console.warn("Main: visualizeGraph returned null or failed.");
                        if (!elements.errorMessage.textContent) {
                             elements.errorMessage.textContent = "Graph visualization failed.";
                             elements.errorMessage.style.display = 'block';
                        }
                    } else {
                        console.log("Main: Graph visualization successful.");
                    }

                } else { // status === 'error'
                    console.error("Main: Worker reported error:", message);
                    elements.errorMessage.textContent = `Error processing data: ${message}`;
                    elements.errorMessage.style.display = 'block';
                    state.lastFile1 = state.lastFile2 = null; // Reset selection tracking on error
                }

                // Hide loading and clean up worker AFTER processing message
                elements.loadingMessage.style.display = 'none';
                if (state.activeWorker === worker) { // Check again before terminating
                     worker.terminate();
                     state.activeWorker = null;
                     console.log("Main: Worker terminated after processing message.");
                }
            };

            worker.onerror = (error) => {
                 if (worker !== state.activeWorker) {
                     console.log("Main: Received error from outdated worker, ignoring.");
                     return;
                 }
                 console.error("Main: Worker onerror event:", error);
                 // Display a generic worker error, as specific details might be limited
                 elements.errorMessage.textContent = `Worker failed unexpectedly. Check console for details. (${error.message})`;
                 elements.errorMessage.style.display = 'block';
                 elements.loadingMessage.style.display = 'none';
                 state.lastFile1 = state.lastFile2 = null; // Reset selection tracking
                 if (state.activeWorker === worker) {
                      worker.terminate();
                      state.activeWorker = null;
                      console.log("Main: Worker terminated after onerror.");
                 }
            };

            // Send filenames to worker to start processing
            worker.postMessage({ filename1, filename2 });
            console.log("Main: Sent job to worker.");

            // NOTE: loadAndVisualize now finishes here. The actual graph rendering
            // happens asynchronously when the worker sends back the result.
            // The loading indicator remains visible until the worker responds.

        } catch (error) { // Catch errors during worker setup or core checks
            console.error("Main: Error setting up worker or pre-check:", error);
            elements.errorMessage.textContent = `Initialization Error: ${error.message}`;
            elements.errorMessage.style.display = 'block';
            elements.loadingMessage.style.display = 'none'; // Hide loading on setup error
            // Reset state fully on critical error
            state.lastFile1 = null;
            state.lastFile2 = null;
            if (state.activeWorker) {
                 state.activeWorker.terminate();
                 state.activeWorker = null;
            }
            if (state.cy) { state.cy.destroy(); state.cy = null; }
            elements.cyContainer.innerHTML = '';
        }
        // Removed 'finally' block for loading message; it's handled by worker message/error handlers.

    } // --- End of loadAndVisualize ---

    // --- 4. Setup UI Interactions ---
    try {
        populateDropdown(elements.fileSelect1, gameTitleMap);
        populateDropdown(elements.fileSelect2, gameTitleMap);

        // Create the event handler using a closure to pass dependencies
        // The handler now just needs to call loadAndVisualize
        const handleSelectionChange = createHandleSelectionChange(elements, state, loadAndVisualize);

        // Attach the handler to both dropdowns
        elements.fileSelect1.addEventListener('change', handleSelectionChange);
        elements.fileSelect2.addEventListener('change', handleSelectionChange);

        // --- 5. Initial Load ---
        // Set default selections and trigger the first load sequence via the handler
        setDefaultSelections(elements, handleSelectionChange);

    } catch(uiError) {
         console.error("Error setting up UI:", uiError);
         elements.errorMessage.textContent = `Fatal UI Setup Error: ${uiError.message}`;
         elements.errorMessage.style.display = 'block';
         elements.loadingMessage.style.display = 'none';
    }

}); // End DOMContentLoaded listener
