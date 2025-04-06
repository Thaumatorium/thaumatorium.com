// graphVisualizer.js
// Handles the initialization and rendering of the Cytoscape graph.

import { setupTooltips } from './tooltips.js'; // Import tooltip setup (assuming tap-only version)
import {
    NODE_TYPE_PARENT, NODE_TYPE_GAME, NODE_TYPE_PERSON, CLASS_COMPOUND_PARENT,
    CATEGORY_GAME1_ONLY, CATEGORY_GAME2_ONLY, CATEGORY_BOTH, CATEGORY_SINGLE_GAME // Ensure categories are available if needed by styles/logic
} from './config.js';

/**
 * Initializes and renders the graph using the globally available Cytoscape instance.
 * Positions Game nodes statically on the same horizontal line and uses layout
 * options with animation to group Person nodes around them via compound parents.
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
    errorMessageElement.textContent = '';
    errorMessageElement.style.display = 'none';
    if (!graphElements?.nodes || graphElements.nodes.length === 0) {
        const nonParentNodesCheck = graphElements?.nodes?.filter(n => n.data.type !== NODE_TYPE_PARENT) || [];
        if (nonParentNodesCheck.length === 0) { /* ... handle error ... */ return null; }
    } else {
        const nonParentNodesCheck = graphElements.nodes.filter(n => n.data.type !== NODE_TYPE_PARENT);
        if (nonParentNodesCheck.length === 0 && graphElements.nodes.length > 0) { /* ... handle error ... */ return null; }
    }


    // --- Layout Options ---
    const layoutOptions = {
        name: 'cose-bilkent',
        // General settings
        fit: true, // We lock games and fit after layout finishes
        padding: 70,

        // Animation Settings
        animate: 'end',
        animationDuration: 800,
        animationEasing: 'ease-out',

        // Parameters to Encourage Grouping
        nestingFactor: 0.9,
        gravity: 0.4,
        idealEdgeLength: 70,
        nodeRepulsion: 60000,

        // Other Cose-Bilkent settings
        quality: 'default',
        edgeElasticity: 0.45,
        numIter: 2500,
        randomize: true,
        nodeDimensionsIncludeLabels: true,
        packComponents: true,
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
                'border-width': 2,      // Make border slightly visible for DEBUGGING? Set to 0 for production.
                'border-color': '#ddd', // Light grey border for DEBUGGING?
                'border-style': 'dashed',// Dashed border for DEBUGGING?
                'label': '',
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
        console.log("Attempting to initialize Cytoscape instance...");

        // Create instance WITHOUT running the layout immediately
        const cyInstance = window.cytoscape({
            container: cyContainer,
            elements: graphElements,
            style: styles, // Apply corrected styles
            minZoom: 0.1,
            maxZoom: 3,
            wheelSensitivity: 0.2,
        });
        console.log("Cytoscape instance created.");

        // --- Position and Lock Game Nodes ---
        const gameNodes = cyInstance.nodes(`node[type="${NODE_TYPE_GAME}"]`);
        const width = cyInstance.width();
        const height = cyInstance.height();
        const yPosition = height * 0.45; // Games slightly above vertical center
        const xPadding = Math.max(80, Math.min(width / 3.5, 250));

        if (gameNodes.length === 1) {
            const gameNode = gameNodes[0];
            const position = { x: width / 2, y: height * 0.15 };
            gameNode.position(position);
            // gameNode.lock();
            console.log(`Locked single game node ${gameNode.id()} at model position`, position);
        } else if (gameNodes.length === 2) {
            gameNodes.forEach(node => {
                const gameIndex = node.data('gameIndex');
                let position;
                if (gameIndex === 1) {
                    position = { x: xPadding, y: yPosition };
                } else if (gameIndex === 2) {
                    position = { x: width - xPadding, y: yPosition };
                } else {
                    console.warn(`Game node ${node.id()} missing gameIndex, placing randomly.`);
                    position = { x: Math.random() * 1000, y: Math.random() * 1000 };
                }
                node.position(position);
                // node.lock();
                console.log(`Locked Game ${gameIndex} (${node.id()}) at model position`, position);
            });
        } else {
            console.log("No game nodes found to position and lock.");
        }


        // --- Run the Layout ---
        console.log("Initiating cose-bilkent layout run (animation)...");
        const layout = cyInstance.layout(layoutOptions);

        layout.promiseOn('layoutstart').then(() => {
            console.log("Layout animation started (nodes moving to final positions)...");
        });

        layout.promiseOn('layoutstop').then(() => {
            if (cyInstance.destroyed()) return;
            console.log("Layout animation stopped (nodes reached final positions).");
            // Fit the view AFTER the layout animation has finished
            cyInstance.animate({
                fit: { padding: 70 } // Use same padding as layout option
            }, { duration: 400 });
            console.log("Fitting view to final layout.");
        }).catch(err => {
            console.error("Layout execution failed:", err);
            errorMessageElement.textContent = `Layout Error: ${err.message}`;
            errorMessageElement.style.display = 'block';
        });

        layout.run(); // Start the layout process (including animation)

        // --- Setup Tooltips ---
        setupTooltips(cyInstance, tooltipElement, personRolesMap);
        console.log("Tooltips setup complete.");

        return cyInstance; // Success

    } catch (error) {
        console.error("Cytoscape initialization or pre-layout failed:", error);
        errorMessageElement.textContent = `Graph Initialization/Layout Error: ${error.message}`;
        errorMessageElement.style.display = 'block';
        tooltipElement.style.display = 'none';
        cyContainer.innerHTML = '';
        return null;
    }
}
