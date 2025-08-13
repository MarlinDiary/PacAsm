'use client'

import Image from 'next/image';
import { GameMap, TILE_MAPPING, TileSymbol, TileType, PlayerDirection } from '@/data/maps';

interface MapRendererProps {
  map: GameMap;
}

const DEFAULT_TILE_SIZE = 64;

const getTileImage = (tileType: TileType): string | null => {
  switch (tileType) {
    case 'grass':
      return '/res/grass.png';
    case 'air':
      return null; // No image for air tiles
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
      return 0; // No rotation for left, we'll use scaleX instead
    case 'down':
      return 90; // Right turn 90 degrees
    default:
      return 0;
  }
};

const getPlayerTransform = (direction: PlayerDirection): string => {
  switch (direction) {
    case 'right':
      return 'rotate(0deg)'; // Default direction, no rotation
    case 'up':
      return 'rotate(-90deg)'; // Left turn 90 degrees
    case 'left':
      return 'rotate(0deg) scaleX(-1)'; // Horizontal flip instead of 180° rotation
    case 'down':
      return 'rotate(90deg)'; // Right turn 90 degrees
    default:
      return 'rotate(0deg)';
  }
};

export default function MapRenderer({ map }: MapRendererProps) {
  const tileSize = map.tileSize || DEFAULT_TILE_SIZE;
  
  return (
    <div className="inline-block relative">
      <div 
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${map.width}, ${tileSize}px)`,
          gridTemplateRows: `repeat(${map.height}, ${tileSize}px)`,
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
                width: tileSize,
                height: tileSize
              }}
            >
              {imageSrc && (
                <Image
                  src={imageSrc}
                  alt={`${tileType} tile`}
                  width={tileSize}
                  height={tileSize}
                  className="object-cover pointer-events-none select-none"
                  style={{
                    filter: 'var(--tile-filter)'
                  }}
                  priority
                />
              )}
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
            transform: `translate(${dot.col * tileSize}px, ${dot.row * tileSize}px)`,
            width: tileSize,
            height: tileSize
          }}
        >
          <Image
            src="/res/dot.gif"
            alt="Dot"
            width={tileSize}
            height={tileSize}
            className="object-cover"
            priority
          />
        </div>
      ))}

      {/* Player overlay */}
      {map.playerPosition && (
        <div
          className={`absolute top-0 left-0 pointer-events-none z-10 ${
            map.playerPosition.shouldAnimate ? 'transition-transform duration-300 ease-out' : ''
          }`}
          style={{
            transform: map.playerPosition.animationPosition 
              ? `translate(${map.playerPosition.animationPosition.x}px, ${map.playerPosition.animationPosition.y}px)`
              : `translate(${map.playerPosition.col * tileSize}px, ${map.playerPosition.row * tileSize}px)`,
            width: tileSize,
            height: tileSize
          }}
        >
          <div
            className={
              map.playerPosition.teleportAnimation === 'fade-out' 
                ? 'animate-teleport-fade-out' 
                : map.playerPosition.teleportAnimation === 'fade-in'
                ? 'animate-teleport-fade-in'
                : ''
            }
            style={{
              transform: !map.playerPosition.teleportAnimation 
                ? getPlayerTransform(map.playerPosition.direction)
                : undefined,
              '--rotation': `${getPlayerRotation(map.playerPosition.direction)}deg`,
              '--scale-x': map.playerPosition.direction === 'left' ? '-1' : '1',
              width: tileSize,
              height: tileSize,
              transformOrigin: 'center'
            } as React.CSSProperties}
          >
            <Image
              src="/res/player.gif"
              alt="Player"
              width={tileSize}
              height={tileSize}
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}