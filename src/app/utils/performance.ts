// Performance monitoring utilities for catalog generation

export const isLowEndDevice = (): boolean => {
  // Check for various indicators of low-end devices
  if (typeof window === 'undefined') return false;

  // Check navigator.hardwareConcurrency (CPU cores)
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
    return true;
  }

  // Check device memory if available
  if ('deviceMemory' in navigator && (navigator as any).deviceMemory <= 2) {
    return true;
  }

  // Check if it's a mobile device
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return true;
  }

  // Check connection speed if available
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
      return true;
    }
  }

  return false;
};

export const getOptimalSettings = () => {
  const isLowEnd = isLowEndDevice();
  
  return {
    maxProductsPerLoad: isLowEnd ? 20 : 50,
    maxProductsPerPage: isLowEnd ? 2 : 4, // For print pages
    imageLoadDelay: isLowEnd ? 300 : 100,
    printDelay: isLowEnd ? 3000 : 1500,
    maxSelectedProducts: isLowEnd ? 10 : 30,
    enableLazyLoading: isLowEnd,
    reducedAnimations: isLowEnd
  };
};

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

export const measurePerformance = (name: string, fn: () => void) => {
  if (typeof window === 'undefined' || !window.performance) {
    fn();
    return;
  }

  const start = performance.now();
  fn();
  const end = performance.now();
  // Log warning for slow operations on low-end devices
  if (isLowEndDevice() && (end - start) > 1000) {
    console.warn(`⚠️ Slow operation detected on low-end device: ${name}`);
  }
};

export const preloadImages = async (urls: string[], maxConcurrent = 3): Promise<void> => {
  if (!urls.length) return;

  const chunks = [];
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    chunks.push(urls.slice(i, i + maxConcurrent));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map((url) => 
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Don't fail on error, just continue
          img.src = url;
        })
      )
    );
    
    // Small delay between chunks to avoid overwhelming the browser
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};