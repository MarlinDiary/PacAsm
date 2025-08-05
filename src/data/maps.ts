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

export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileSymbol[][];
  playerPosition?: PlayerPosition;
  dots?: { row: number; col: number }[];
}

export const MAPS: GameMap[] = [
  {
    id: 'level1',
    name: 'Level 1',
    width: 3,
    height: 1,
    tiles: [
      ['.', '.', '*']
    ],
    playerPosition: { row: 0, col: 0, direction: 'right' },
    dots: [{ row: 0, col: 1 }]
  }
];

export function getMap(id: string): GameMap | undefined {
  return MAPS.find(map => map.id === id);
}

export function getMapByLevel(levelId: string): GameMap | undefined {
  return MAPS.find(map => map.id === `level${levelId}`);
}