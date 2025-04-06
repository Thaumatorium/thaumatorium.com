// tooltips.js
// Sets up tooltip functionality for Cytoscape nodes.

import { NODE_TYPE_PARENT, NODE_TYPE_PERSON } from './config.js';

/**
 * Sets up mouseover/mousemove/mouseout event listeners on Cytoscape nodes
 * to display a tooltip with node information.
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

    try {
        // Show tooltip on node hover (excluding parent nodes)
        cyInstance.on('mouseover', `node[type!="${NODE_TYPE_PARENT}"]`, (evt) => {
            const node = evt.target;
            const data = node.data();
            const position = evt.renderedPosition; // Use rendered position for accuracy with zoom/pan
            let htmlContent = `<strong>${data.label || 'Unknown Node'}</strong>`;

            if (data.type) {
                htmlContent += ` (${data.type})`;
            }

            if (data.type === NODE_TYPE_PERSON) {
                // Display contribution category (derived in processor)
                if (data.category && data.category !== CATEGORY_OTHER) {
                    let categoryText = data.category.replace(/_/g, ' '); // Replace underscores
                    categoryText = categoryText.charAt(0).toUpperCase() + categoryText.slice(1); // Capitalize
                    htmlContent += `<br><span style="color: #555;">Contribution: ${categoryText}</span>`;
                }
                // Display roles from the map
                const roles = personRolesMap.get(data.id);
                if (roles && roles.size > 0) {
                    htmlContent += `<br><span style="color: #555;">Role(s): ${[...roles].sort().join(', ')}</span>`;
                }
            }
            // Future: Add more info for Game nodes if needed

            tooltipElement.innerHTML = htmlContent;
            tooltipElement.style.display = 'block';
            // Position relative to the graph container
            tooltipElement.style.left = `${position.x + 10}px`;
            tooltipElement.style.top = `${position.y + 10}px`;
        });

        // Update tooltip position on mouse move over a node
        cyInstance.on('mousemove', `node[type!="${NODE_TYPE_PARENT}"]`, (evt) => {
            if (tooltipElement.style.display === 'block') {
                const position = evt.renderedPosition;
                tooltipElement.style.left = `${position.x + 10}px`;
                tooltipElement.style.top = `${position.y + 10}px`;
            }
        });


        // Hide tooltip when mouse leaves a node or the graph area
        const hideTooltip = () => {
            tooltipElement.style.display = 'none';
        };

        cyInstance.on('mouseout', `node[type!="${NODE_TYPE_PARENT}"]`, hideTooltip);
        cyInstance.on('pan zoom resize', hideTooltip); // Hide on pan/zoom/resize
        cyInstance.on('tap', (event) => { // Hide on background tap
            if (event.target === cyInstance) {
                hideTooltip();
            }
        });
        // Hide if mouse leaves the container entirely (useful if hovering near edge)
        cyInstance.container().addEventListener('mouseleave', hideTooltip);


    } catch (e) {
        console.error("Error setting up Cytoscape tooltip listeners:", e);
        // Optional: display a non-fatal warning to the user if tooltips fail
        // const errorElement = document.getElementById('errorMessage'); // Or pass it in
        // if (errorElement) errorElement.textContent += " (Warning: Tooltip functionality may be limited)";
    }
}
