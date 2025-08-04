'use client'

import Image from 'next/image';
import { GameMap, TILE_MAPPING, TileSymbol, TileType, PlayerDirection } from '@/data/maps';

interface MapRendererProps {
  map: GameMap;
}

const TILE_SIZE = 64;

const getTileImage = (tileType: TileType): string => {
  switch (tileType) {
    case 'grass':
      return '/res/grass.png';
    case 'campfire':
      return '/res/campfire.png';
    default:
      return '/res/grass.png';
  }
};


const getPlayerRotation = (direction: PlayerDirection): number => {
  switch (direction) {
    case 'right':
      return 0; // Default direction, no rotation
    case 'up':
      return -90; // Left turn 90 degrees
    case 'left':
      return 180; // Left turn 180 degrees  
    case 'down':
      return 90; // Right turn 90 degrees
    default:
      return 0;
  }
};

export default function MapRenderer({ map }: MapRendererProps) {
  return (
    <div className="inline-block border-2 border-gray-400 bg-gray-100 relative">
      <div 
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${map.width}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${map.height}, ${TILE_SIZE}px)`,
          gap: 0
        }}
      >
        {map.tiles.flat().map((tileSymbol: TileSymbol, index: number) => {
          const tileType = TILE_MAPPING[tileSymbol];
          const imageSrc = getTileImage(tileType);
          
          return (
            <div
              key={index}
              className="relative"
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE
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
      
      {/* Dots overlay */}
      {map.dots && map.dots.map((dot, index) => (
        <div
          key={`dot-${index}`}
          className="absolute top-0 left-0 pointer-events-none z-5"
          style={{
            transform: `translate(${dot.col * TILE_SIZE}px, ${dot.row * TILE_SIZE}px)`,
            width: TILE_SIZE,
            height: TILE_SIZE
          }}
        >
          <Image
            src="/res/dot.gif"
            alt="Dot"
            width={TILE_SIZE}
            height={TILE_SIZE}
            className="object-cover"
            priority
          />
        </div>
      ))}

      {/* Player overlay */}
      {map.playerPosition && (
        <div
          className="absolute top-0 left-0 pointer-events-none z-10 transition-transform duration-300 ease-out"
          style={{
            transform: map.playerPosition.animationPosition 
              ? `translate(${map.playerPosition.animationPosition.x}px, ${map.playerPosition.animationPosition.y}px)`
              : `translate(${map.playerPosition.col * TILE_SIZE}px, ${map.playerPosition.row * TILE_SIZE}px)`,
            width: TILE_SIZE,
            height: TILE_SIZE
          }}
        >
          <div
            style={{
              transform: `rotate(${getPlayerRotation(map.playerPosition.direction)}deg)`,
              width: TILE_SIZE,
              height: TILE_SIZE,
              transformOrigin: 'center'
            }}
          >
            <Image
              src="/res/player.gif"
              alt="Player"
              width={TILE_SIZE}
              height={TILE_SIZE}
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}