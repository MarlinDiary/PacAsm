export interface TileMapping {
  '%': 'air';
  ' ': 'grass';
  '.': 'dot';
  'o': 'energizer';
  'P': 'player';
  'G': 'ghost';
}

export type TileType = 'air' | 'grass' | 'dot' | 'energizer' | 'player' | 'ghost';
export type TileSymbol = keyof TileMapping;

export const TILE_MAPPING: Record<TileSymbol, TileType> = {
  '%': 'air',
  ' ': 'grass',
  '.': 'dot',
  'o': 'energizer',
  'P': 'player',
  'G': 'ghost'
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

export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize?: number;
  tiles: TileSymbol[][];
  waterBackground?: WaterBackground;
  initialCode?: string;
  // Player animation state (separate from tile data)
  playerAnimation?: {
    direction: PlayerDirection;
    animationPosition?: {
      x: number;
      y: number;
    };
    shouldAnimate?: boolean;
    teleportAnimation?: 'fade-out' | 'fade-in';
  };
}

export const MAPS: GameMap[] = [
  {
    id: 'level1',
    name: 'Level 1',
    width: 3,
    height: 1,
    tileSize: 64,
    tiles: [
      ['P', ' ', '.']
    ],
    waterBackground: { tilesX: 35, tilesY: 35 },
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

// Helper functions to extract information from map tiles
export function getPlayerPosition(map: GameMap): { row: number; col: number; direction: PlayerDirection } | null {
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      if (map.tiles[row][col] === 'P') {
        return { row, col, direction: 'right' }; // Default direction
      }
    }
  }
  return null;
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
  const ghosts: { row: number; col: number }[] = [];
  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      if (map.tiles[row][col] === 'G') {
        ghosts.push({ row, col });
      }
    }
  }
  return ghosts;
}