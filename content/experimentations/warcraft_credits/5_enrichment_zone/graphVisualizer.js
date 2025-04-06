// graphVisualizer.js
// Handles the initialization and rendering of the Cytoscape graph.
// Uses cose-bilkent layout with high nestingFactor to group nodes within parents.
// Game nodes are NOT locked or manually positioned.

import { setupTooltips } from './tooltips.js'; // Import tooltip setup (assuming tap-only, selectable text version)
import {
    NODE_TYPE_PARENT, NODE_TYPE_GAME, NODE_TYPE_PERSON, CLASS_COMPOUND_PARENT,
    // Categories might not be directly used here but are part of the data structure
    CATEGORY_GAME1_ONLY, CATEGORY_GAME2_ONLY, CATEGORY_BOTH, CATEGORY_SINGLE_GAME
} from './config.js';

/**
 * Initializes and renders the graph using the globally available Cytoscape instance.
 * Relies on the cose-bilkent layout algorithm and a high nestingFactor to
 * position nodes, grouping Person nodes within their compound parents.
 * Assumes Cytoscape core and necessary layout extensions are loaded.
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
    errorMessageElement.textContent = '';
    errorMessageElement.style.display = 'none';
    // Check if graphElements or nodes are missing, or if nodes array exists but is empty
    if (!graphElements?.nodes || graphElements.nodes.length === 0) {
        const nonParentNodesCheck = graphElements?.nodes?.filter(n => n.data.type !== NODE_TYPE_PARENT) || [];
        if (nonParentNodesCheck.length === 0) {
            errorMessageElement.textContent = baseErrorMessage;
            errorMessageElement.style.display = 'block';
            cyContainer.innerHTML = '';
            tooltipElement.style.display = 'none';
            console.log("Validation failed: No nodes or only parent nodes found (initial check).");
            return null;
        }
    } else {
        // Check specifically if only parent nodes exist (e.g., length 3 but all are parents)
        const nonParentNodesCheck = graphElements.nodes.filter(n => n.data.type !== NODE_TYPE_PARENT);
        // Check if nonParentNodesCheck is empty *AND* the original array wasn't (meaning it only had parents)
        if (nonParentNodesCheck.length === 0) {
            errorMessageElement.textContent = baseErrorMessage;
            errorMessageElement.style.display = 'block';
            cyContainer.innerHTML = '';
            tooltipElement.style.display = 'none';
            console.log("Validation failed: Graph contains only parent nodes.");
            return null;
        }
    }


    // --- Layout Options ---
    // These options will be passed directly to the Cytoscape constructor
    const layoutOptions = {
        name: 'cose-bilkent',
        // General settings
        fit: true, // Fit the graph to the viewport after layout
        padding: 60, // Padding around the fitted graph

        // Animation Settings
        animate: 'end', // Animate node movement
        animationDuration: 800,
        animationEasing: 'ease-out',

        // Parameters to Encourage Grouping WITHIN PARENTS
        nestingFactor: 0.9,   // KEEP HIGH: Strong pull towards parent boundaries
        gravity: 0.25,        // Lower gravity might allow groups to spread more naturally
        idealEdgeLength: 100, // Increase edge length slightly to allow more space
        nodeRepulsion: 55000, // Adjust repulsion as needed

        // Other Cose-Bilkent settings
        quality: 'default',
        edgeElasticity: 0.45,
        numIter: 2500,
        randomize: true, // Start nodes at random positions
        nodeDimensionsIncludeLabels: true,
        packComponents: true, // Important to keep the 3 groups somewhat together if disconnected
    };

    // --- Cytoscape Styles ---
    const styles = [
        // --- CORRECTED DEGREE MAPPING ---
        {
            // Base style for ALL nodes
            selector: 'node', style: {
                'label': 'data(label)',
                // Set a reasonable DEFAULT size here
                'width': '25px',
                'height': '25px',
                'font-size': '9px', // Adjusted font size
                'text-valign': 'bottom',
                'text-halign': 'center',
                'background-color': '#555',
                'color': '#000',
                'text-outline-width': 1,
                'text-outline-color': '#fff',
                'z-index': 2,
                'min-zoomed-font-size': 8,
            }
        },
        {
            // Override size ONLY for nodes with a 'degree' data property
            selector: 'node[degree]', style: {
                'width': 'mapData(degree, 0, 10, 15, 45)', // Map size based on degree
                'height': 'mapData(degree, 0, 10, 15, 45)',// Map size based on degree
            }
        },
        // --- END CORRECTION ---

        // Specific node types override base styles and potentially degree-based size
        {
            selector: `node[type='${NODE_TYPE_GAME}']`, style: {
                'background-color': '#3498db',
                'shape': 'rectangle',
                'width': '80px', // Game nodes get fixed size override
                'height': '40px',// Game nodes get fixed size override
                'font-weight': 'bold',
                'font-size': '12px',
            }
        },
        {
            selector: `node[type='${NODE_TYPE_PERSON}']`, style: { // Default Person style (color/shape)
                'background-color': '#f1c40f',
                'shape': 'ellipse',
                // Size is handled by base 'node' and 'node[degree]' selectors
            }
        },
        // Specific person categories override default color
        { selector: '.game1-only', style: { 'background-color': '#e67e22' } },
        { selector: '.game2-only', style: { 'background-color': '#9b59b6' } },
        { selector: '.worked-on-both', style: { 'background-color': '#2ecc71' } },
        { selector: '.single-game-node', style: { 'background-color': '#1abc9c' } },
        // Compound Parent style (invisible)
        {
            selector: `.${CLASS_COMPOUND_PARENT}`, style: {
                'background-opacity': 0,
                'label': '',
                // debug settings:
                'border-width': 0,
                // 'border-color': '#ddd',
                // 'border-style': 'dashed',
            }
        },
        // Edge style
        {
            selector: 'edge', style: {
                'width': 0.8, // Thinner edge
                'line-color': '#ccc',
                'curve-style': 'bezier',
                'z-index': 1,
                'opacity': 0.6, // Slightly more transparent
                'target-arrow-shape': 'triangle',
                'target-arrow-color': '#ccc',
                'arrow-scale': 0.5,
            }
        },
        // Style for selected nodes
        { selector: ':selected', style: { 'border-width': 3, 'border-color': '#333' } },
    ];


    // --- Initialize Cytoscape ---
    try {
        if (typeof window.cytoscape === 'undefined') {
            throw new Error("Cytoscape core library (window.cytoscape) not found.");
        }
        console.log("Attempting to initialize Cytoscape instance with layout...");

        // Create instance AND run layout immediately using constructor options
        const cyInstance = window.cytoscape({
            container: cyContainer,
            elements: graphElements,
            style: styles,
            layout: layoutOptions, // Pass layout options here
            minZoom: 0.1,
            maxZoom: 3,
            wheelSensitivity: 0.2,
        });
        console.log("Cytoscape instance created and layout initiated.");

        cyInstance.one('layoutstop', () => {
            console.log("Layout animation stopped.");
            // Any actions needed AFTER layout finishes can go here (e.g., extra analysis)
        });


        // --- Setup Tooltips ---
        // Setup happens concurrently while layout might still be animating
        setupTooltips(cyInstance, tooltipElement, personRolesMap);
        console.log("Tooltips setup complete.");

        return cyInstance; // Success

    } catch (error) {
        // Catch errors during initialization or the initial layout run
        console.error("Cytoscape initialization or layout failed:", error);
        errorMessageElement.textContent = `Graph Initialization/Layout Error: ${error.message}`;
        errorMessageElement.style.display = 'block';
        tooltipElement.style.display = 'none';
        cyContainer.innerHTML = '';
        return null;
    }
}
