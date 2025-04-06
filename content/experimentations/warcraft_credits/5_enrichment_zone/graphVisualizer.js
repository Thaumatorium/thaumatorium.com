// graphVisualizer.js
// Handles the initialization and rendering of the Cytoscape graph.

import { setupTooltips } from './tooltips.js'; // Import tooltip setup
import { NODE_TYPE_PARENT, NODE_TYPE_GAME, NODE_TYPE_PERSON, CLASS_COMPOUND_PARENT } from './config.js';

/**
 * Initializes and renders the graph using the globally available Cytoscape instance.
 * Assumes Cytoscape core and necessary layout extensions (e.g., cose-bilkent)
 * have been loaded via script tags in the HTML before this module runs.
 *
 * @param {Object} graphElements - Object containing { nodes: Array, edges: Array }.
 * @param {Object} domElements - Object containing references to key DOM elements
 *   { cyContainer, tooltipElement, errorMessageElement }.
 * @param {Map<string, Set<string>>} personRolesMap - Map of person ID to their roles.
 * @returns {cytoscape.Core | null} The initialized Cytoscape instance, or null on failure.
 */
export function visualizeGraph(graphElements, domElements, personRolesMap) {
    const { cyContainer, tooltipElement, errorMessageElement } = domElements;
    const baseErrorMessage = "No common contributors or relevant data found for the selected combination.";

    // --- Initial Data Validation ---
    // Clear previous errors first
    errorMessageElement.textContent = '';
    errorMessageElement.style.display = 'none';

    if (!graphElements?.nodes || graphElements.nodes.length <= 3) { // <= 3 accounts for parent nodes
        errorMessageElement.textContent = baseErrorMessage;
        errorMessageElement.style.display = 'block';
        cyContainer.innerHTML = '';
        tooltipElement.style.display = 'none';
        return null;
    }
    const nonParentNodes = graphElements.nodes.filter(n => n.data.type !== NODE_TYPE_PARENT);
    if (nonParentNodes.length === 0) {
        errorMessageElement.textContent = baseErrorMessage;
        errorMessageElement.style.display = 'block';
        cyContainer.innerHTML = '';
        tooltipElement.style.display = 'none';
        return null;
    }

    // --- Layout Options ---
    const layoutOptions = {
        name: 'cose-bilkent', // The layout name Cytoscape will look for
        // General layout settings
        fit: true,
        padding: 50,
        animate: 'end',
        animationDuration: 500,
        // Cose-bilkent specific tuning:
        quality: 'default',
        nodeRepulsion: 45000,
        idealEdgeLength: 100,
        edgeElasticity: 0.45,
        nestingFactor: 0.1, // Controls tightness of compound node packing
        gravity: 0.4,
        numIter: 2500,
        randomize: true,
        // tile: true, // Usually not needed unless performance is an issue
        // Avoid overlap - important for readability
        nodeDimensionsIncludeLabels: true, // Consider label size in layout
        packComponents: true, // Try to pack disconnected components closer
    };

    // --- Cytoscape Styles ---
    // (Styles remain the same as your previous version)
    const styles = [
        {
            selector: 'node', style: {
                'label': 'data(label)',
                'width': 'mapData(degree, 0, 10, 20, 60)', // Example: size based on connections
                'height': 'mapData(degree, 0, 10, 20, 60)',
                'font-size': '10px',
                'text-valign': 'bottom',
                'text-halign': 'center',
                'background-color': '#555', // Default node color
                'color': '#000',
                'text-outline-width': 1,
                'text-outline-color': '#fff',
                'z-index': 2,
                 'min-zoomed-font-size': 8, // Keep labels readable when zoomed out
            }
        },
        {
            selector: `node[type='${NODE_TYPE_GAME}']`, style: { // Style Game nodes
                'background-color': '#3498db', // Blue for games
                'shape': 'rectangle',
                'width': '80px',
                'height': '40px',
                'font-weight': 'bold',
                 'font-size': '12px',
            }
        },
        {
            selector: `node[type='${NODE_TYPE_PERSON}']`, style: { // Default Person style
                'background-color': '#f1c40f', // Yellow for people
                'shape': 'ellipse', // Default shape is ellipse
            }
        },
        // Specific person categories override default color
        { selector: '.game1-only', style: { 'background-color': '#e67e22' } }, // Orange for game 1 only
        { selector: '.game2-only', style: { 'background-color': '#9b59b6' } }, // Purple for game 2 only
        { selector: '.worked-on-both', style: { 'background-color': '#2ecc71' } }, // Green for both
        { selector: '.single-game-node', style: { 'background-color': '#1abc9c' } }, // Turquoise for single game view
        {
            selector: `.${CLASS_COMPOUND_PARENT}`, style: { // Style compound parents
                'background-opacity': 0, // Make invisible
                'border-width': 0,
                'label': '', // No label shown
                // 'padding': '10px' // Optional: adds invisible padding inside compound nodes
            }
        },
        {
            selector: 'edge', style: {
                'width': 1,
                'line-color': '#ccc',
                'curve-style': 'bezier', // Or 'haystack' for performance with many edges
                'z-index': 1,
                 'opacity': 0.7,
            }
        },
         // Style for highlighted elements (e.g., on hover, handled by events)
         { selector: ':selected', style: { 'border-width': 3, 'border-color': '#333' } },
         { selector: '.hover', style: { 'background-color': 'red' } }, // Example, if needed
    ];


    // --- Initialize Cytoscape ---
    try {
        // Check ONLY for the core Cytoscape object.
        // Rely on the Cytoscape constructor call below to handle layout registration errors.
        if (typeof window.cytoscape === 'undefined') {
            throw new Error("Cytoscape core library (window.cytoscape) not found. Check script loading in HTML.");
        }
        console.log("Attempting to initialize Cytoscape instance...");

        // Cytoscape constructor implicitly uses the global instance.
        // If 'cose-bilkent' layout is not registered when this runs, IT WILL THROW an error.
        const cyInstance = window.cytoscape({
            container: cyContainer,
            elements: graphElements,
            layout: layoutOptions, // Request the cose-bilkent layout
            style: styles,
            minZoom: 0.1,
            maxZoom: 3,
            wheelSensitivity: 0.2, // Adjust zoom sensitivity if needed
        });

        console.log("Cytoscape instance created successfully.");

        // Setup tooltips using the imported function
        setupTooltips(cyInstance, tooltipElement, personRolesMap);
        console.log("Tooltips setup complete.");

        return cyInstance; // Success

    } catch (error) {
        // This block catches errors from the window.cytoscape() call,
        // including the "layout not found" error.
        console.error("Cytoscape initialization failed:", error);

        // Display the specific error message from Cytoscape or our core check.
        errorMessageElement.textContent = `Graph Initialization Error: ${error.message}`;
        errorMessageElement.style.display = 'block'; // Make sure error is visible

        // Cleanup UI state on failure
        tooltipElement.style.display = 'none';
        cyContainer.innerHTML = ''; // Clear container

        return null; // Indicate failure
    }
}
