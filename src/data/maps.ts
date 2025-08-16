export interface TileMapping {
  '%': 'air';
  ' ': 'grass';
  '.': 'dot';
  'o': 'energizer';
}

export type TileType = 'air' | 'grass' | 'dot' | 'energizer';
export type TileSymbol = keyof TileMapping;

export const TILE_MAPPING: Record<TileSymbol, TileType> = {
  '%': 'air',
  ' ': 'grass',
  '.': 'dot',
  'o': 'energizer'
};

export type PlayerDirection = 'right' | 'up' | 'left' | 'down';

export interface PlayerPosition {
  row: number;
  col: number;
  direction: PlayerDirection;
  animationPosition?: {
    x: number;
    y: number;
  };
  shouldAnimate?: boolean;
  teleportAnimation?: 'fade-out' | 'fade-in';
}

export interface WaterBackground {
  tilesX: number;
  tilesY: number;
}

export interface GhostAnimationState {
  direction?: PlayerDirection;
  animationPosition?: {
    x: number;
    y: number;
  };
  shouldAnimate?: boolean;
  teleportAnimation?: 'fade-out' | 'fade-in';
}

export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize?: number;
  tiles: TileSymbol[][];
  waterBackground?: WaterBackground;
  initialCode?: string;
  // Entity positions (separate from tile data)
  playerPosition: { row: number; col: number; direction: PlayerDirection };
  ghostPositions: { row: number; col: number }[];
  ghostPreviousPositions?: { row: number; col: number }[]; // Track previous positions for smart movement
  // Animation states (separate from tile data)
  playerAnimation?: {
    direction: PlayerDirection;
    animationPosition?: {
      x: number;
      y: number;
    };
    shouldAnimate?: boolean;
    teleportAnimation?: 'fade-out' | 'fade-in';
  };
  ghostAnimations?: GhostAnimationState[]; // Animation state for each ghost
  // Game state
  gameOver?: boolean; // Game over due to collision
}

// Raw map data for Level 1 (without P and G)
const LEVEL1_RAW_MAP = `
%%%%%%%%%%%%%%%%%%%%
%....%........%....%
%.%%.%.%%%%%%.%.%%.%
%.%..............%.%
%.%.%%.%%  %%.%%.%.%
%......%    %......%
%.%.%%.%%%%%%.%%.%.%
%.%..............%.%
%.%%.%.%%%%%%.%.%%.%
%....%... ....%....%
%%%%%%%%%%%%%%%%%%%%`;

function parseMapFromString(mapString: string): TileSymbol[][] {
  const lines = mapString.trim().split('\n');
  return lines.map(line => line.split('') as TileSymbol[]);
}

export const MAPS: GameMap[] = [
  {
    id: 'level1',
    name: 'Level 1',
    width: 20,
    height: 11,
    tileSize: 20,
    tiles: parseMapFromString(LEVEL1_RAW_MAP),
    playerPosition: { row: 9, col: 9, direction: 'right' },
    ghostPositions: [{ row: 5, col: 8 }, { row: 5, col: 11 }],
    waterBackground: { tilesX: 72, tilesY: 71 },
    initialCode: `LDR   R0, =0x00030000
MOV   R1, #4
STR   R1, [R0]`,
  }
];

export function getMap(id: string): GameMap | undefined {
  return MAPS.find(map => map.id === id);
}

export function getMapByLevel(levelId: string): GameMap | undefined {
  return MAPS.find(map => map.id === `level${levelId}`);
}

// Helper functions to extract information from map
export function getPlayerPosition(map: GameMap): { row: number; col: number; direction: PlayerDirection } | null {
  return map.playerPosition;
}

export function getDots(map: GameMap): { row: number; col: number }[] {
  const dots: { row: number; col: number }[] = [];
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      if (map.tiles[row][col] === '.') {
        dots.push({ row, col });
      }
    }
  }
  return dots;
}

export function getEnergizers(map: GameMap): { row: number; col: number }[] {
  const energizers: { row: number; col: number }[] = [];
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      if (map.tiles[row][col] === 'o') {
        energizers.push({ row, col });
      }
    }
  }
  return energizers;
}

export function getGhosts(map: GameMap): { row: number; col: number }[] {
  return map.ghostPositions;
}