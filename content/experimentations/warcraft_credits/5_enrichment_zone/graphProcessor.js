// graphProcessor.js
// Processes raw graph data into nodes and edges suitable for Cytoscape.

import { generatePersonId } from './dataUtils.js';
import {
    parentG1Id, parentG2Id, parentBothId,
    NODE_TYPE_PERSON, NODE_TYPE_GAME, NODE_TYPE_ROLE, NODE_TYPE_PARENT,
    EDGE_LABEL_WORKED_ON, EDGE_LABEL_HAS_ROLE,
    CLASS_COMPOUND_PARENT, CLASS_SINGLE_GAME, CLASS_WORKED_BOTH,
    CLASS_GAME1_ONLY, CLASS_GAME2_ONLY,
    CATEGORY_GAME, CATEGORY_SINGLE_GAME, CATEGORY_BOTH,
    CATEGORY_GAME1_ONLY, CATEGORY_GAME2_ONLY, CATEGORY_OTHER
} from './config.js';

/**
 * Processes raw graph data from one or two JSON objects.
 * Identifies common personnel, assigns them to categories (game 1 only, game 2 only, both),
 * and structures the data for Cytoscape, including compound parent nodes.
 * Populates the shared personRolesMap with roles for each person ID.
 *
 * @param {Object} data1 - Parsed JSON graph data for the first selected game.
 * @param {Object} data2 - Parsed JSON graph data for the second selected game (can be same as data1).
 * @param {boolean} isSameGame - Indicates if data1 and data2 represent the same game file.
 * @param {Map<string, Set<string>>} personRolesMap - A Map instance passed by reference.
 *        Will be cleared and populated with person ID -> Set<Role Name>.
 * @returns {{nodes: Array, edges: Array}} Object containing arrays of nodes and edges formatted for Cytoscape.
 * @throws {Error} If input data is fundamentally invalid.
 */
export function processGraphData(data1, data2, isSameGame, personRolesMap) {
    if (!data1 || !data2) {
        throw new Error("Invalid input data provided to processGraphData.");
    }

    // --- State Initialization ---
    personRolesMap.clear(); // Ensure clean slate for roles
    const nodesMap = new Map(); // Map<NodeId, CytoscapeNodeObject> - Stores potential nodes
    const personGames = new Map(); // Map<PersonId, Set<GameId>> - Tracks which games a person worked on
    const finalEdges = []; // Array<CytoscapeEdgeObject> - Stores potential edges
    const edgesSet = new Set(); // Set<string> - Prevents duplicate edges ("source->target")
    let identifiedGameId1 = null;
    let identifiedGameId2 = null;
    const rolesTempMap = new Map(); // Temporary Map<RoleId, RoleName> - Used during processing

    // --- Helper Function to Process a Single Data Source ---
    const processDataSource = (data, fileIndex) => {
        if (!data?.nodes || !data.edges) {
            console.warn(`Input data source ${fileIndex} is missing 'nodes' or 'edges' array.`);
            return; // Allow processing to continue if one file is valid
        }

        const originalNodesById = new Map(
            data.nodes.filter(n => n?.id).map(n => [n.id, n])
        );
        let currentGameId = null;

        // Pass 1: Process Nodes - Identify Games, Roles, and potential Person nodes
        data.nodes.forEach(node => {
            if (!node?.id || !node.label) return; // Skip nodes without id or label type

            const nodeLabel = node.properties?.name || node.id; // Prefer name property, fallback to ID
            const nodeType = node.label; // e.g., 'Person', 'Game', 'Role'

            let nodeId = node.id; // Use original ID unless it's a Person
            let cytoscapeNodeData = { id: nodeId, label: nodeLabel, type: nodeType, properties: node.properties };
            let classes = nodeType.toLowerCase(); // Basic class based on type

            switch (nodeType) {
                case NODE_TYPE_PERSON:
                    if (!node.properties?.name) return; // Skip persons without a name
                    nodeId = generatePersonId(node.properties.name); // Use consistent generated ID
                    cytoscapeNodeData.id = nodeId; // Update ID in data object
                    cytoscapeNodeData.label = node.properties.name; // Ensure label is the name
                    break;
                case NODE_TYPE_GAME:
                    currentGameId = node.id;
                    if (fileIndex === 1) identifiedGameId1 = currentGameId;
                    else identifiedGameId2 = currentGameId;
                    cytoscapeNodeData.category = CATEGORY_GAME;
                    cytoscapeNodeData.gameIndex = fileIndex;
                    break;
                case NODE_TYPE_ROLE:
                    rolesTempMap.set(node.id, nodeLabel); // Store Role ID -> Role Name mapping
                    return; // Role nodes are not directly added to the final graph
                default:
                    // Handle other node types if necessary
                    break;
            }

            // Add/update node in our central map if it's a Game or Person
            if (nodeType === NODE_TYPE_GAME || nodeType === NODE_TYPE_PERSON) {
                if (!nodesMap.has(nodeId)) {
                    nodesMap.set(nodeId, { data: cytoscapeNodeData, classes: classes });
                }
                // Update existing node if needed
                else if (nodeType === NODE_TYPE_GAME) {
                    const existingNode = nodesMap.get(nodeId);
                    existingNode.data.category = CATEGORY_GAME;
                    existingNode.data.gameIndex = fileIndex;
                }
            }
        });

        if (!currentGameId) {
            console.warn(`No '${NODE_TYPE_GAME}' node found in data source ${fileIndex}. Comparisons might be affected.`);
        }


        // Pass 2: Process Edges - Identify relationships (WORKED_ON, HAS_ROLE)
        data.edges.forEach(edge => {
            if (!edge?.source || !edge.target || !edge.label) return;

            const sourceNodeOriginal = originalNodesById.get(edge.source);
            const targetNodeOriginal = originalNodesById.get(edge.target);
            if (!sourceNodeOriginal || !targetNodeOriginal) return; // Skip edges with missing nodes

            const sourceNodeType = sourceNodeOriginal.label;
            const targetNodeType = targetNodeOriginal.label;

            // Person --WORKED_ON-> Game relationship
            if (edge.label === EDGE_LABEL_WORKED_ON && sourceNodeType === NODE_TYPE_PERSON && targetNodeType === NODE_TYPE_GAME) {
                const personName = sourceNodeOriginal.properties?.name;
                if (!personName) return;
                const personNodeId = generatePersonId(personName);
                const gameNodeId = edge.target; // Game ID is the target

                // If both person and game nodes exist in our map
                if (nodesMap.has(personNodeId) && nodesMap.has(gameNodeId)) {
                    // Track which games this person worked on
                    if (!personGames.has(personNodeId)) personGames.set(personNodeId, new Set());
                    personGames.get(personNodeId).add(gameNodeId);

                    // Add edge to Cytoscape data, preventing duplicates
                    const edgeSetKey = `${personNodeId}->${gameNodeId}`;
                    if (!edgesSet.has(edgeSetKey)) {
                        finalEdges.push({
                            data: {
                                id: `edge_${personNodeId}_${gameNodeId}`,
                                source: personNodeId,
                                target: gameNodeId,
                                label: edge.label // Keep label for potential future use
                            }
                        });
                        edgesSet.add(edgeSetKey);
                    }
                }
            }
            // Person --HAS_ROLE-> Role relationship
            else if (edge.label === EDGE_LABEL_HAS_ROLE && sourceNodeType === NODE_TYPE_PERSON && targetNodeType === NODE_TYPE_ROLE) {
                const personName = sourceNodeOriginal.properties?.name;
                if (!personName) return;
                const personNodeId = generatePersonId(personName);
                const roleId = edge.target;
                const roleLabel = rolesTempMap.get(roleId); // Get role name from our temp map

                // If the person node exists and we found the role name
                if (nodesMap.has(personNodeId) && roleLabel) {
                    // Populate the shared personRolesMap (passed by reference)
                    if (!personRolesMap.has(personNodeId)) personRolesMap.set(personNodeId, new Set());
                    personRolesMap.get(personNodeId).add(roleLabel);
                }
            }
        });
    }; // --- End of processDataSource ---

    // --- Process Both Data Sources ---
    processDataSource(data1, 1);
    if (!isSameGame) {
        processDataSource(data2, 2);
    } else {
        identifiedGameId2 = identifiedGameId1;
        // Ensure gameIndex is set correctly for single game view
        if (identifiedGameId1 && nodesMap.has(identifiedGameId1)) {
            nodesMap.get(identifiedGameId1).data.gameIndex = 1; // Assign index 1 for single view
        }
    }

    // --- Assemble Final Nodes and Edges for Cytoscape ---
    const finalNodes = [];

    // Add Compound Parent Nodes first
    finalNodes.push({ data: { id: parentG1Id, label: 'Game 1 Only', type: NODE_TYPE_PARENT }, classes: CLASS_COMPOUND_PARENT });
    finalNodes.push({ data: { id: parentG2Id, label: 'Game 2 Only', type: NODE_TYPE_PARENT }, classes: CLASS_COMPOUND_PARENT });
    finalNodes.push({ data: { id: parentBothId, label: isSameGame ? 'Contributors' : 'Both Games', type: NODE_TYPE_PARENT }, classes: CLASS_COMPOUND_PARENT });


    // Add Game and Person nodes, categorizing Persons
    nodesMap.forEach((nodeData, nodeId) => {
        const node = nodeData.data; // The actual data part for Cytoscape

        if (node.type === NODE_TYPE_PERSON) {
            const gamesWorkedOn = personGames.get(nodeId) || new Set();
            const onGame1 = identifiedGameId1 && gamesWorkedOn.has(identifiedGameId1);
            const onGame2 = identifiedGameId2 && gamesWorkedOn.has(identifiedGameId2);

            let category = CATEGORY_OTHER;
            let parent = null;
            let specificClass = '';

            if (isSameGame) {
                // Single game view: only show people who worked on *this* game
                if (onGame1) { // Check onGame1 (since gameId1 and gameId2 are the same)
                    category = CATEGORY_SINGLE_GAME;
                    parent = parentBothId; // All contributors go in the 'Both' (center) parent
                    specificClass = CLASS_SINGLE_GAME;
                }
            } else {
                // Two different games view: categorize by involvement
                if (onGame1 && onGame2) {
                    category = CATEGORY_BOTH;
                    parent = parentBothId;
                    specificClass = CLASS_WORKED_BOTH;
                } else if (onGame1) {
                    category = CATEGORY_GAME1_ONLY;
                    parent = parentG1Id;
                    specificClass = CLASS_GAME1_ONLY;
                } else if (onGame2) {
                    category = CATEGORY_GAME2_ONLY;
                    parent = parentG2Id;
                    specificClass = CLASS_GAME2_ONLY;
                }
            }

            // Only add the person node if they belong to a relevant category
            if (category !== CATEGORY_OTHER) {
                node.category = category; // Store the category for styling/tooltips
                node.parent = parent;     // Assign to compound parent
                nodeData.classes += ` ${specificClass}`; // Add specific class for styling
                finalNodes.push(nodeData);
            }
        } else if (node.type === NODE_TYPE_GAME) {
            // Only add the game nodes that were actually selected/identified
            if (nodeId === identifiedGameId1 || (!isSameGame && nodeId === identifiedGameId2)) {
                // Parent assignment logic remains the same...
                if (!isSameGame) {
                    if (nodeId === identifiedGameId1) node.parent = parentG1Id;
                    if (nodeId === identifiedGameId2) node.parent = parentG2Id;
                } else {
                    node.parent = parentBothId; // Center the single game node parent
                }
                finalNodes.push(nodeData);
            }
        }
        // Other node types (like Role) are processed but not added directly
    });

    // Filter Edges: Only include edges connecting nodes that are in the finalNodes list
    const finalNodeIds = new Set(finalNodes.map(n => n.data.id));
    const finalEdgesFiltered = finalEdges.filter(edge =>
        finalNodeIds.has(edge.data.source) && finalNodeIds.has(edge.data.target)
    );

    // --- Return final structure ---
    return { nodes: finalNodes, edges: finalEdgesFiltered };
}
