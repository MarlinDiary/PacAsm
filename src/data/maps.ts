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

export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileSymbol[][];
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
    ]
  }
];

export function getMap(id: string): GameMap | undefined {
  return MAPS.find(map => map.id === id);
}