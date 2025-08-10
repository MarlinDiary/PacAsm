export interface TileMapping {
  '.': 'grass';
  '*': 'campfire';
}

export type TileType = 'grass' | 'campfire';
export type TileSymbol = keyof TileMapping;

export const TILE_MAPPING: Record<TileSymbol, TileType> = {
  '.': 'grass', 
  '*': 'campfire'
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
  playerPosition?: PlayerPosition;
  dots?: { row: number; col: number }[];
  waterBackground?: WaterBackground;
  initialCode?: string;
  hint?: string;
}

export const MAPS: GameMap[] = [
  {
    id: 'level1',
    name: 'Level 1',
    width: 3,
    height: 1,
    tileSize: 64,
    tiles: [
      ['.', '.', '.']
    ],
    playerPosition: { row: 0, col: 0, direction: 'right' },
    dots: [{ row: 0, col: 2 }],
    waterBackground: { tilesX: 35, tilesY: 35 },
    initialCode: `LDR   R0, =0x00030000
MOV   R1, #4
STR   R1, [R0]`,
    hint: 'Move right twice'
  }
];

export function getMap(id: string): GameMap | undefined {
  return MAPS.find(map => map.id === id);
}

export function getMapByLevel(levelId: string): GameMap | undefined {
  return MAPS.find(map => map.id === `level${levelId}`);
}