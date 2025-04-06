// graphVisualizer.js (Ensure NO cytoscape constructor parameter)

// (setupTooltips function ...)

/**
 * Initializes Cytoscape.js... Uses window.cytoscape.
 * @param {Object} graphElements - ...
 * @param {Object} domElements - ...
 * @param {Map<string, Set<string>>} personRolesMap - ...
 * @returns {Object|null} The initialized Cytoscape instance, or null on failure.
 */
// --- REMOVED cytoscapeConstructor parameter ---
export function visualizeGraph(graphElements, domElements, personRolesMap) {
    const { cyContainer, tooltipElement, errorMessageElement } = domElements;
    // ... (error checks ...)
    const baseErrorMessage = "No common contributors or data found for the selected combination.";
    if (!graphElements?.nodes || graphElements.nodes.length <= 3) { errorMessageElement.textContent = baseErrorMessage; cyContainer.innerHTML = ''; tooltipElement.style.display = 'none'; return null; }
    const nonParentNodes = graphElements.nodes.filter(n => n.data.type !== 'parent');
    if (nonParentNodes.length === 0) { errorMessageElement.textContent = baseErrorMessage; cyContainer.innerHTML = ''; tooltipElement.style.display = 'none'; return null; }


    // --- Layout options using cose-bilkent ---
    const layoutOptions = {
        name: 'cose-bilkent', // Using cose-bilkent now

        // General layout options
        fit: true,
        padding: 50,
        animate: 'end', // 'end' is generally preferred over true/false
        animationDuration: 500,
        // ... other general options ...

        // Cose-bilkent specific options:
        quality: 'default',
        nodeRepulsion: 45000, // ** Tune this **
        idealEdgeLength: 100, // ** Tune this **
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.4,
        numIter: 2500,
        randomize: true,
        // tile: true, // Optional
    };

    // Styles ...
    const styles = [ /* ... your styles ... */];
    styles.push({ selector: 'node', style: { 'label': 'data(label)', /*...*/ 'z-index': 2 } });
    // ... rest of styles ...
    styles.push({ selector: 'edge', style: { 'width': 1, /*...*/ 'z-index': 1 } });


    // --- Initialize Cytoscape ---
    try {
        if (typeof window.cytoscape === 'undefined') {
            throw new Error("Cytoscape library is not loaded or not available globally.");
        }

        // Use the global cytoscape directly
        const cyInstance = window.cytoscape({ // <<< USE window.cytoscape
            container: cyContainer,
            elements: graphElements,
            layout: layoutOptions, // Use the updated cose-bilkent options
            style: styles,
            // ... other cytoscape options ...
        });

        setupTooltips(cyInstance, tooltipElement, personRolesMap);
        return cyInstance;

    } catch (e) {
        if (e.message && e.message.includes("No such layout")) {
            errorMessageElement.textContent = `Error: Layout '${layoutOptions.name}' not found. Check script order/loading in HTML. ${e.message}`;
        } else {
            errorMessageElement.textContent = `Error: Failed to initialize graph. ${e.message}`;
        }
        console.error("Cytoscape initialization failed:", e);
        tooltipElement.style.display = 'none';
        cyContainer.innerHTML = '';
        return null;
    }
}

// (setupTooltips function remains the same)
function setupTooltips(cyInstance, tooltipElement, personRolesMap) {
    try {
        cyInstance.on('mouseover', 'node[type!="parent"]', function (evt) {
            const node = evt.target;
            const data = node.data();
            const originalEvent = evt.originalEvent;
            let htmlContent = `<strong>${data.label || 'Unknown'}</strong> (${data.type})`;

            if (data.type === 'Person') {
                if (data.category) {
                    let categoryText = data.category.replace(/_/g, ' ');
                    categoryText = categoryText.charAt(0).toUpperCase() + categoryText.slice(1);
                    htmlContent += `<br><span style="color: #555;">Contribution: ${categoryText}</span>`;
                }
                const roles = personRolesMap.get(data.id); // Use the passed-in map
                if (roles && roles.size > 0) {
                    htmlContent += `<br><span style="color: #555;">Role(s): ${[...roles].sort().join(', ')}</span>`;
                }
            }
            tooltipElement.innerHTML = htmlContent;
            tooltipElement.style.display = 'block';
            tooltipElement.style.left = `${originalEvent.pageX + 10}px`;
            tooltipElement.style.top = `${originalEvent.pageY + 10}px`;
        });

        cyInstance.on('mousemove', function (evt) {
            if (tooltipElement.style.display === 'block') {
                const originalEvent = evt.originalEvent;
                tooltipElement.style.left = `${originalEvent.pageX + 10}px`;
                tooltipElement.style.top = `${originalEvent.pageY + 10}px`;
            }
        });

        cyInstance.on('mouseout', 'node[type!="parent"]', function (evt) {
            const relatedTarget = evt.originalEvent.relatedTarget;
            if (!relatedTarget || relatedTarget.id !== tooltipElement.id) { tooltipElement.style.display = 'none'; }
        });
        cyInstance.on('mouseout', function (evt) {
            if (evt.target === cyInstance && tooltipElement.style.display === 'block') {
                const relatedTarget = evt.originalEvent.relatedTarget;
                if (!relatedTarget || relatedTarget.id !== tooltipElement.id) { tooltipElement.style.display = 'none'; }
            }
        });
        cyInstance.on('tap', function (event) { if (event.target === cyInstance) { tooltipElement.style.display = 'none'; } });

    } catch (e) {
        console.error("Error setting up Cytoscape tooltip listeners:", e);
        // errorMessageElement might not be passed, handle this if necessary
        // errorMessageElement.textContent = "Warning: Tooltip display might be limited.";
    }
}
