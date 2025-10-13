"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: (error: React.SyntheticEvent<HTMLImageElement>) => void;
  unoptimized?: boolean;
  width?: number;
  height?: number;
}

/**
 * SafeImage component with robust error handling and fallback support
 * Prevents "Cannot read properties of undefined (reading 'dimensions')" errors
 */
export const SafeImage = React.forwardRef<HTMLImageElement, SafeImageProps>(
  (
    {
      src,
      alt,
      className = "",
      fallback = "/placeholder.svg",
      onLoad,
      onError,
      unoptimized = false,
      width,
      height,
      ...props
    },
    ref
  ) => {
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Update source when src prop changes
    useEffect(() => {
      if (src && src.trim() !== "") {
        setImgSrc(src);
        setHasError(false);
        setIsLoading(true);
      } else {
        setImgSrc(fallback);
        setHasError(false);
        setIsLoading(false);
      }
    }, [src, fallback]);

    const handleLoad = useCallback(() => {
      setIsLoading(false);
      setHasError(false);
      onLoad?.();
    }, [onLoad]);

    const handleError = useCallback(
      (error: React.SyntheticEvent<HTMLImageElement>) => {
        console.warn(`Failed to load image: ${imgSrc}`, error);

        if (!hasError && imgSrc !== fallback) {
          setImgSrc(fallback);
          setHasError(true);
        } else {
          setIsLoading(false);
          onError?.(error);
        }
      },
      [imgSrc, fallback, hasError, onError]
    );

    // If no valid source, use fallback immediately
    if (!imgSrc) {
      return (
        <div
          className={`bg-gray-200 flex items-center justify-center ${className}`}
          style={{ width, height }}
          {...props}
        >
          <span className="text-gray-400 text-xs">No Image</span>
        </div>
      );
    }

    return (
      <div className={`relative ${className}`} style={{ width, height }}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          </div>
        )}
        <img
          ref={(el) => {
            imgRef.current = el;
            if (typeof ref === 'function') {
              ref(el);
            } else if (ref) {
              ref.current = el;
            }
          }}
          src={imgSrc}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          onLoad={handleLoad}
          onError={handleError}
          style={{ width, height }}
          {...props}
        />
      </div>
    );
  }
);

SafeImage.displayName = "SafeImage";

export default SafeImage;