'use client'

import Image from 'next/image';
import { GameMap, TILE_MAPPING, TileSymbol, TileType } from '@/data/maps';

interface MapRendererProps {
  map: GameMap;
}

const TILE_SIZE = 64;

const getTileImage = (tileType: TileType, row: number, col: number, mapWidth: number, mapHeight: number): string => {
  switch (tileType) {
    case 'grass':
      return '/res/grass.png';
    case 'campfire':
      return '/res/campfire.png';
    case 'wall':
      if (row === 0 && col === 0) {
        return '/res/corner.png';
      }
      if (row === 0 && col === mapWidth - 1) {
        return '/res/corner.png';
      }
      if (row === mapHeight - 1 && col === 0) {
        return '/res/corner.png';
      }
      if (row === mapHeight - 1 && col === mapWidth - 1) {
        return '/res/corner.png';
      }
      return '/res/wall.png';
    case 'corner':
      return '/res/corner.png';
    default:
      return '/res/grass.png';
  }
};

const getTileRotation = (tileType: TileType, row: number, col: number, mapWidth: number, mapHeight: number): number => {
  if (tileType === 'wall' || tileType === 'corner') {
    // Corners
    if (row === 0 && col === 0) {
      return 0; // Top-left corner (default)
    }
    if (row === 0 && col === mapWidth - 1) {
      return 90; // Top-right corner
    }
    if (row === mapHeight - 1 && col === mapWidth - 1) {
      return 180; // Bottom-right corner
    }
    if (row === mapHeight - 1 && col === 0) {
      return 270; // Bottom-left corner
    }
    
    // Walls
    if (row === 0) {
      return 90; // Top wall
    }
    if (col === mapWidth - 1) {
      return 180; // Right wall
    }
    if (row === mapHeight - 1) {
      return 270; // Bottom wall
    }
    if (col === 0) {
      return 0; // Left wall (default)
    }
  }
  return 0;
};

export default function MapRenderer({ map }: MapRendererProps) {
  return (
    <div className="inline-block border-2 border-gray-400 bg-gray-100">
      <div 
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${map.width}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${map.height}, ${TILE_SIZE}px)`,
          gap: 0
        }}
      >
        {map.tiles.flat().map((tileSymbol: TileSymbol, index: number) => {
          const row = Math.floor(index / map.width);
          const col = index % map.width;
          const tileType = TILE_MAPPING[tileSymbol];
          const imageSrc = getTileImage(tileType, row, col, map.width, map.height);
          const rotation = getTileRotation(tileType, row, col, map.width, map.height);
          
          return (
            <div
              key={index}
              className="relative"
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined
              }}
            >
              <Image
                src={imageSrc}
                alt={`${tileType} tile`}
                width={TILE_SIZE}
                height={TILE_SIZE}
                className="object-cover"
                priority
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}