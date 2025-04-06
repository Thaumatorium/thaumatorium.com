// tooltips.js
// Sets up tooltip functionality for Cytoscape nodes, displayed ONLY on tap/click of Person nodes.
// Tooltip persists until explicitly hidden and allows text selection.

import { NODE_TYPE_PERSON, CATEGORY_OTHER } from './config.js';

/**
 * Sets up tap event listeners on Cytoscape Person nodes
 * to display a tooltip with node information. Tooltip persists until hidden
 * by specific actions (tap elsewhere, pan, zoom). Allows text selection.
 *
 * @param {cytoscape.Core} cyInstance - The initialized Cytoscape instance.
 * @param {HTMLElement} tooltipElement - The DOM element to use for the tooltip.
 * @param {Map<string, Set<string>>} personRolesMap - Map of person ID to their roles.
 */
export function setupTooltips(cyInstance, tooltipElement, personRolesMap) {
    if (!cyInstance || !tooltipElement || !personRolesMap) {
        console.error("Tooltip setup missing required arguments.");
        return;
    }

    // --- Helper Functions ---

    /** Hides the tooltip */
    const hideTooltip = () => {
        tooltipElement.style.display = 'none';
    };

    /**
     * Shows the tooltip for a given node at a specific position.
     * @param {cytoscape.NodeSingular} node - The node to display info for.
     * @param {{x: number, y: number}} position - The rendered position {x, y} for the tooltip.
     */
    const showTooltipForTap = (node, position) => {
        const data = node.data();
        let htmlContent = `<strong>${data.label || 'Unknown Node'}</strong>`;

        if (data.type) {
            htmlContent += ` (${data.type})`;
        }

        if (data.type === NODE_TYPE_PERSON) {
            // Display contribution category
            if (data.category && data.category !== CATEGORY_OTHER) {
                let categoryText = data.category.replace(/_/g, ' ');
                categoryText = categoryText.charAt(0).toUpperCase() + categoryText.slice(1);
                htmlContent += `<br><span style="color: #aaa;">Contribution: ${categoryText}</span>`;
            }
            // Display roles
            const roles = personRolesMap.get(data.id);
            if (roles && roles.size > 0) {
                htmlContent += `<br><span style="color: #aaa;">Role(s): ${[...roles].sort().join(', ')}</span>`;
            } else {
                htmlContent += `<br><span style="color: #aaa;">(No specific role listed)</span>`;
            }
        }

        tooltipElement.innerHTML = htmlContent;
        tooltipElement.style.display = 'block';
        tooltipElement.style.left = `${position.x + 10}px`;
        tooltipElement.style.top = `${position.y + 10}px`;
    };

    // --- Event Listeners (Tap Only) ---

    try {
        // 1. Tap Handler (Show tooltip ONLY for Person nodes)
        cyInstance.on('tap', `node[type="${NODE_TYPE_PERSON}"]`, (evt) => {
            const node = evt.target;
            console.log(`Tapped Person: ${node.data().label} (ID: ${node.id()})`);
            showTooltipForTap(node, evt.renderedPosition);
        });

        // 2. Hide Triggers (Hide the tooltip shown by tap)
        cyInstance.on('pan zoom resize', hideTooltip); // Hide on graph interaction

        cyInstance.on('tap', (evt) => { // Hide on tap elsewhere
            if (evt.target === cyInstance || // Tapped background
                (evt.target.isNode() && evt.target.data('type') !== NODE_TYPE_PERSON) || // Tapped non-Person node
                evt.target.isEdge()) // Tapped an edge
            {
                hideTooltip();
            }
        });
    } catch (e) {
        console.error("Error setting up Cytoscape tap tooltip listeners:", e);
    }
}
