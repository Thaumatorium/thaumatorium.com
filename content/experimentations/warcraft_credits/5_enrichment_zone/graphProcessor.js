// graphProcessor.js
// Processes raw graph data into a format suitable for Cytoscape visualization

import { generatePersonId } from './dataUtils.js';
import { parentG1Id, parentG2Id, parentBothId } from './config.js';

/**
 * Processes raw graph data from one or two files to determine nodes and edges
 * for the final visualization, categorizing people based on game involvement.
 * Populates the shared personRolesMap.
 * @param {Object} data1 - Parsed JSON data for the first file.
 * @param {Object} data2 - Parsed JSON data for the second file (can be same as data1).
 * @param {boolean} isSameGame - True if data1 and data2 represent the same game.
 * @param {Map<string, Set<string>>} personRolesMap - Shared map to store roles per person ID. Will be modified.
 * @returns {{nodes: Array, edges: Array}} Object containing arrays of nodes and edges for Cytoscape.
 */
export function processGraphData(data1, data2, isSameGame, personRolesMap) {
    personRolesMap.clear(); // Clear roles from previous run before processing
    const nodesMap = new Map();
    const finalEdges = [];
    const personGames = new Map();
    const edgesSet = new Set();
    let identifiedGameId1 = null;
    let identifiedGameId2 = null;
    const rolesMap = new Map(); // Temporary map for role IDs to labels

    // --- Inner function to process a single data source ---
    const processSingleData = (data, fileIndex) => {
        // (Keep the detailed logic from Part 5 of the previous split)
        if (!data?.nodes || !data.edges) {
            console.warn(`Input data ${fileIndex} is missing nodes or edges.`);
            return;
        }
        const originalNodesById = new Map(data.nodes.filter(n => n?.id).map(n => [n.id, n]));
        let currentGameId = null;

        // Pass 1: Process Nodes
        data.nodes.forEach(node => {
            if (!node?.id || !node.label) return;
            let nodeId = node.id;
            const nodeLabel = node.properties?.name || nodeId;
            const nodeType = node.label;
            const classes = nodeType.toLowerCase();

            if (nodeType === 'Person') {
                if (!nodeLabel) return;
                nodeId = generatePersonId(nodeLabel);
            }
            if (!nodesMap.has(nodeId)) {
                nodesMap.set(nodeId, { data: { id: nodeId, label: nodeLabel, type: nodeType, properties: node.properties }, classes });
            }
            if (nodeType === 'Game') {
                currentGameId = node.id;
                if (fileIndex === 1) identifiedGameId1 = currentGameId; else identifiedGameId2 = currentGameId;
                const gameNode = nodesMap.get(node.id);
                if (gameNode) gameNode.data.category = 'game';
            } else if (nodeType === 'Role') {
                rolesMap.set(node.id, nodeLabel);
            }
        });
        if (!currentGameId) console.warn(`No 'Game' node found in input data ${fileIndex}.`);

        // Pass 2: Process Edges
        data.edges.forEach(edge => {
            if (!edge?.source || !edge.target || !edge.label) return;
            const sourceNodeOriginal = originalNodesById.get(edge.source);
            const targetNodeOriginal = originalNodesById.get(edge.target);
            if (!sourceNodeOriginal || !targetNodeOriginal) return;

            if (edge.label === 'WORKED_ON' && sourceNodeOriginal.label === 'Person' && targetNodeOriginal.label === 'Game') {
                const personName = sourceNodeOriginal.properties?.name; if (!personName) return;
                const personNodeId = generatePersonId(personName);
                const gameNodeId = edge.target;

                if (nodesMap.has(personNodeId) && nodesMap.has(gameNodeId)) {
                    if (!personGames.has(personNodeId)) personGames.set(personNodeId, new Set());
                    personGames.get(personNodeId).add(gameNodeId);
                    const edgeSetKey = `${personNodeId}->${gameNodeId}`;
                    if (!edgesSet.has(edgeSetKey)) {
                        finalEdges.push({ data: { id: `edge_${personNodeId}_${gameNodeId}`, source: personNodeId, target: gameNodeId, label: edge.label } });
                        edgesSet.add(edgeSetKey);
                    }
                }
            } else if (edge.label === 'HAS_ROLE' && sourceNodeOriginal.label === 'Person' && targetNodeOriginal.label === 'Role') {
                const personName = sourceNodeOriginal.properties?.name; if (!personName) return;
                const personNodeId = generatePersonId(personName);
                const roleId = edge.target;
                const roleLabel = rolesMap.get(roleId);
                // Populate the shared personRolesMap here
                if (nodesMap.has(personNodeId) && roleLabel) {
                    if (!personRolesMap.has(personNodeId)) personRolesMap.set(personNodeId, new Set());
                    personRolesMap.get(personNodeId).add(roleLabel);
                }
            }
        });
    };
    // --- End of inner function ---

    processSingleData(data1, 1);
    if (!isSameGame) processSingleData(data2, 2); else identifiedGameId2 = identifiedGameId1;

    // --- Final Node and Edge Assembly ---
    const finalNodes = [];
    finalNodes.push({ data: { id: parentG1Id, label: 'Game 1 Only', type: 'parent' }, classes: 'compound-parent' });
    finalNodes.push({ data: { id: parentG2Id, label: 'Game 2 Only', type: 'parent' }, classes: 'compound-parent' });
    finalNodes.push({ data: { id: parentBothId, label: isSameGame ? 'Contributors' : 'Both Games', type: 'parent' }, classes: 'compound-parent' });

    let personsAdded = 0;
    let gamesAdded = 0;
    nodesMap.forEach((node, nodeId) => {
        if (node.data.type === 'Person') {
            const games = personGames.get(nodeId) || new Set();
            const onG1 = identifiedGameId1 && games.has(identifiedGameId1);
            const onG2 = identifiedGameId2 && games.has(identifiedGameId2);
            let category = 'other', parent = null;

            if (isSameGame) { if (onG1) { category = 'single_game'; node.classes += ' single-game-node'; parent = parentBothId; } }
            else {
                if (onG1 && onG2) { category = 'both'; node.classes += ' worked-on-both'; parent = parentBothId; }
                else if (onG1) { category = 'game1_only'; node.classes += ' game1-only'; parent = parentG1Id; }
                else if (onG2) { category = 'game2_only'; node.classes += ' game2-only'; parent = parentG2Id; }
            }

            if (category !== 'other') {
                node.data.category = category; node.data.parent = parent;
                finalNodes.push(node); personsAdded++;
            }
        } else if (node.data.type === 'Game') {
            if (nodeId === identifiedGameId1 || nodeId === identifiedGameId2) {
                finalNodes.push(node); gamesAdded++;
            }
        }
    });

    const finalNodeIds = new Set(finalNodes.map(n => n.data.id));
    const finalEdgesFiltered = finalEdges.filter(edge =>
        finalNodeIds.has(edge.data.source) && finalNodeIds.has(edge.data.target)
    );

    return { nodes: finalNodes, edges: finalEdgesFiltered };
}
