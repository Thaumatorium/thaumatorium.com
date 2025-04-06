// config.js
// Configuration constants for the game credits visualizer.

/**
 * Maps internal data filenames to user-friendly game titles.
 * @const {Object<string, string>}
 */
export const gameTitleMap = {
    'game_Wc1_Ovh_Credits_graph.json': 'Warcraft 1: Orcs vs Humans',
    'game_Wc2_Btdp_Credits_graph.json': 'Warcraft 2: Beyond the Dark Portal',
    'game_Wc2_Tod_Credits_graph.json': 'Warcraft 2: Tides of Darkness',
    'game_Wc3_Roc_Credits_graph.json': 'Warcraft 3: Reign of Chaos',
    'game_Wc3_Tft_Credits_graph.json': 'Warcraft 3: The Frozen Throne',
    'game_Wow_0_graph.json': 'WoW: Classic (Vanilla)',
    'game_Wow_1_Tbc_graph.json': 'WoW: The Burning Crusade',
    'game_Wow_2_Wotlk_graph.json': 'WoW: Wrath of the Lich King',
    'game_Wow_3_Cata_graph.json': 'WoW: Cataclysm',
    'game_Wow_4_Mop_graph.json': 'WoW: Mists of Pandaria',
    'game_Wow_5_Wod_graph.json': 'WoW: Warlords of Draenor',
    'game_Wow_6_Legion_graph.json': 'WoW: Legion',
    'game_Wow_7_Bfa_graph.json': 'WoW: Battle for Azeroth',
    'game_Wow_8_Shadowlands_graph.json': 'WoW: Shadowlands',
    'game_Wow_9_Dragonflight_graph.json': 'WoW: Dragonflight',
};

// IDs for Cytoscape compound parent nodes.
export const parentG1Id = 'parent_game1';
export const parentG2Id = 'parent_game2';
export const parentBothId = 'parent_both';

// Node types used in graph processing and styling.
export const NODE_TYPE_PERSON = 'Person';
export const NODE_TYPE_GAME = 'Game';
export const NODE_TYPE_ROLE = 'Role';
export const NODE_TYPE_PARENT = 'parent'; // Cytoscape compound parent type

// Edge labels
export const EDGE_LABEL_WORKED_ON = 'WORKED_ON';
export const EDGE_LABEL_HAS_ROLE = 'HAS_ROLE';

// CSS Classes / Categories
export const CLASS_COMPOUND_PARENT = 'compound-parent';
export const CLASS_SINGLE_GAME = 'single-game-node';
export const CLASS_WORKED_BOTH = 'worked-on-both';
export const CLASS_GAME1_ONLY = 'game1-only';
export const CLASS_GAME2_ONLY = 'game2-only';
export const CATEGORY_GAME = 'game';
export const CATEGORY_SINGLE_GAME = 'single_game';
export const CATEGORY_BOTH = 'both';
export const CATEGORY_GAME1_ONLY = 'game1_only';
export const CATEGORY_GAME2_ONLY = 'game2_only';
export const CATEGORY_OTHER = 'other'; // For persons not matching criteria
