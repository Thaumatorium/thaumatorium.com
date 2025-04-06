// main.js (NO imports for cytoscape or coseBilkent, NO waiting check)

import { gameTitleMap } from './config.js';
import { fetchJsonFile } from './dataUtils.js';
import { processGraphData } from './graphProcessor.js';
import { visualizeGraph } from './graphVisualizer.js'; // Uses window.cytoscape
import { populateDropdown, createHandleSelectionChange, setDefaultSelections } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired."); // Debug log

    // --- Basic Check: Ensure Cytoscape core loaded ---
    if (typeof window.cytoscape === 'undefined') {
        console.error("Cytoscape core (window.cytoscape) is not defined!");
        document.getElementById('errorMessage').textContent = "Fatal Error: Cytoscape core library failed to load. Check script tags in HTML.";
        return; // Stop if core isn't even there
    } else {
         console.log("window.cytoscape is defined. Assuming extensions loaded due to script order.");
    }

    // --- 1. Select DOM Elements ---
    const elements = {
        fileSelect1: document.getElementById('fileSelect1'),
        fileSelect2: document.getElementById('fileSelect2'),
        cyContainer: document.getElementById('cy'),
        loadingMessage: document.getElementById('loadingMessage'),
        errorMessage: document.getElementById('errorMessage'),
        tooltip: document.getElementById('tooltip')
    };

    // --- 2. Initialize State ---
    const state = {
        cy: null,
        lastFile1: null,
        lastFile2: null,
        personRolesMap: new Map()
    };

    // --- App Initialization Logic ---
    async function initializeApp() {
        console.log("Initializing app...");

        // Define Core Loading Logic
        async function loadAndVisualize(filename1, filename2) {
            elements.errorMessage.textContent = '';
            elements.loadingMessage.style.display = 'block';
            elements.tooltip.style.display = 'none';

            if (state.cy) { state.cy.destroy(); state.cy = null; }
            elements.cyContainer.innerHTML = '';

            try {
                const isSameGame = (filename1 === filename2);
                let data1, data2;
                 if (isSameGame) { data1 = await fetchJsonFile(filename1); data2 = data1; }
                 else { [data1, data2] = await Promise.all([fetchJsonFile(filename1), fetchJsonFile(filename2)]); }

                const graphDataForVis = processGraphData(data1, data2, isSameGame, state.personRolesMap);

                const visualizerElements = {
                    cyContainer: elements.cyContainer,
                    tooltipElement: elements.tooltip,
                    errorMessageElement: elements.errorMessage
                };

                // Call visualizeGraph - relies on global cytoscape having the layout registered
                state.cy = visualizeGraph(graphDataForVis, visualizerElements, state.personRolesMap);

                if (!state.cy && !elements.errorMessage.textContent.startsWith('Error: Layout')) {
                    // If visualizeGraph failed for a reason other than 'No such layout'
                    elements.errorMessage.textContent = 'Error: Graph visualization failed.';
                    console.error("visualizeGraph failed to return a Cytoscape instance for an unknown reason.");
                 } else if (!state.cy) {
                    // Error message should already be set by visualizeGraph for layout issues
                    console.error("visualizeGraph failed, likely due to layout issue.");
                 }

            } catch (error) {
                 console.error("Error during load/process/visualize in main.js:", error);
                 elements.errorMessage.textContent = `Error: ${error.message}`;
                 elements.tooltip.style.display = 'none';
                 state.lastFile1 = null; state.lastFile2 = null;
                 if (state.cy) { state.cy.destroy(); state.cy = null; }
                 elements.cyContainer.innerHTML = '';
            } finally {
                elements.loadingMessage.style.display = 'none';
            }
        }

        // --- Setup UI ---
        populateDropdown(elements.fileSelect1, gameTitleMap);
        populateDropdown(elements.fileSelect2, gameTitleMap);
        const handleSelectionChange = createHandleSelectionChange(elements, state, loadAndVisualize);
        elements.fileSelect1.addEventListener('change', handleSelectionChange);
        elements.fileSelect2.addEventListener('change', handleSelectionChange);

        // --- Initial Load ---
        setDefaultSelections(elements, handleSelectionChange);
    }

    // --- Directly Initialize App ---
    // We are now *assuming* the script loading order (defer vs no defer)
    // guarantees cose-bilkent is registered on window.cytoscape before this runs.
    initializeApp();

}); // End DOMContentLoaded
