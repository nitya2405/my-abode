import { useState, useEffect, useCallback, useRef } from 'react';

interface UseImageEffectProps {
  imageData: ImageData | null;
  effectFn: (imageData: ImageData, params: any) => ImageData;
  params: any;
  debounceMs?: number;
}

export function useImageEffect({
  imageData,
  effectFn,
  params,
  debounceMs = 150
}: UseImageEffectProps) {
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const applyEffect = useCallback(() => {
    if (!imageData) return;

    setIsProcessing(true);
    
    // Use a small delay to allow UI to show "Processing..."
    setTimeout(() => {
      try {
        const result = effectFn(imageData, params);
        setProcessedImageData(result);
      } catch (error) {
        console.error('Effect processing failed:', error);
      } finally {
        setIsProcessing(false);
      }
    }, 10);
  }, [imageData, effectFn, params]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (imageData) {
      timeoutRef.current = setTimeout(applyEffect, debounceMs);
    } else {
      setProcessedImageData(null);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [imageData, params, debounceMs, applyEffect]);

  return { processedImageData, isProcessing };
}
