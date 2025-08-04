export interface TileMapping {
  '|': 'wall' | 'corner';
  '.': 'grass';
  '*': 'campfire';
}

export type TileType = 'wall' | 'corner' | 'grass' | 'campfire';
export type TileSymbol = keyof TileMapping;

export const TILE_MAPPING: Record<TileSymbol, TileType> = {
  '|': 'wall',
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
    id: 'initial',
    name: 'Initial Map',
    width: 5,
    height: 3,
    tiles: [
      ['|', '|', '|', '|', '|'],
      ['|', '.', '.', '*', '|'],
      ['|', '|', '|', '|', '|']
    ],
    playerPosition: { row: 1, col: 1, direction: 'right' },
    dots: [{ row: 1, col: 2 }]
  }
];

export function getMap(id: string): GameMap | undefined {
  return MAPS.find(map => map.id === id);
}