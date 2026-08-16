import React from 'react';
import { useSpeciesImage } from '../utils/speciesImageCache';
import { Observation } from '../types';
import { Camera } from 'lucide-react';

interface SpeciesImageProps {
  scientificName: string;
  commonName?: string;
  fallbackPhotoUrl?: string;
  observations?: Observation[];
  className?: string;
  alt?: string;
  onClick?: (e: React.MouseEvent) => void;
  showFallbackIcon?: boolean;
}

export const SpeciesImage: React.FC<SpeciesImageProps> = ({
  scientificName,
  commonName,
  fallbackPhotoUrl,
  observations,
  className = "w-10 h-10 rounded-lg object-cover border border-[#d8d0c4] shrink-0 shadow-2xs",
  alt,
  onClick,
  showFallbackIcon = true
}) => {
  const imageUrl = useSpeciesImage(scientificName, fallbackPhotoUrl, observations);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt || commonName || scientificName}
        className={className}
        onClick={onClick}
        loading="lazy"
      />
    );
  }

  if (!showFallbackIcon) return null;

  return (
    <div
      onClick={onClick}
      className={`${className} bg-[#f4efe6] text-[#828d7e] flex items-center justify-center shrink-0 border border-[#e6dfd3]`}
      title={commonName || scientificName}
    >
      <Camera className="w-1/2 h-1/2 opacity-60 text-[#2e4a36]" />
    </div>
  );
};
