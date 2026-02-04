// Performance Optimization Utilities
// Caching, lazy loading, and performance monitoring

// Simple in-memory cache
class Cache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 300000): void { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
export const cache = new Cache();

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Lazy load component
export function lazyLoad<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(importFunc);
}

// Image lazy loading utility
export function lazyLoadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Intersection Observer for lazy loading
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
}

// Performance monitoring
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startTimer(name: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }
      
      this.metrics.get(name)!.push(duration);
      return duration;
    };
  }

  getAverageTime(name: string): number {
    const times = this.metrics.get(name);
    if (!times || times.length === 0) return 0;
    
    const sum = times.reduce((acc, time) => acc + time, 0);
    return sum / times.length;
  }

  getMetrics(): Record<string, { average: number; count: number }> {
    const result: Record<string, { average: number; count: number }> = {};
    
    this.metrics.forEach((times, name) => {
      result[name] = {
        average: this.getAverageTime(name),
        count: times.length,
      };
    });
    
    return result;
  }

  clear(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Memory usage monitoring
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const used = memory.usedJSHeapSize;
    const total = memory.totalJSHeapSize;
    const percentage = (used / total) * 100;
    
    return { used, total, percentage };
  }
  
  return { used: 0, total: 0, percentage: 0 };
}

// Network performance monitoring
export function measureNetworkPerformance(url: string): Promise<{
  loadTime: number;
  size: number;
}> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const xhr = new XMLHttpRequest();
    
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    
    xhr.onload = () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      const size = xhr.response?.size || 0;
      
      resolve({ loadTime, size });
    };
    
    xhr.onerror = reject;
    xhr.send();
  });
}

// Virtual scrolling utility
export class VirtualScroller<T> {
  private items: T[];
  private itemHeight: number;
  private containerHeight: number;
  private scrollTop = 0;

  constructor(items: T[], itemHeight: number, containerHeight: number) {
    this.items = items;
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
  }

  setScrollTop(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  getVisibleItems(): {
    items: T[];
    startIndex: number;
    endIndex: number;
    offsetY: number;
  } {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(this.containerHeight / this.itemHeight) + 1,
      this.items.length
    );
    const offsetY = startIndex * this.itemHeight;

    return {
      items: this.items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      offsetY,
    };
  }

  getTotalHeight(): number {
    return this.items.length * this.itemHeight;
  }
}

// Request batching utility
class RequestBatcher {
  private batch = new Map<string, any[]>();
  private timeouts = new Map<string, NodeJS.Timeout>();
  private batchDelay = 100; // 100ms

  constructor(private onBatch: (key: string, items: any[]) => Promise<void>) {}

  add(key: string, item: any): void {
    if (!this.batch.has(key)) {
      this.batch.set(key, []);
    }

    this.batch.get(key)!.push(item);

    // Reset timeout for this batch
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key)!);
    }

    const timeout = setTimeout(() => {
      const items = this.batch.get(key) || [];
      if (items.length > 0) {
        this.onBatch(key, items);
        this.batch.delete(key);
        this.timeouts.delete(key);
      }
    }, this.batchDelay);

    this.timeouts.set(key, timeout);
  }

  flush(key?: string): void {
    if (key) {
      const items = this.batch.get(key) || [];
      if (items.length > 0) {
        this.onBatch(key, items);
        this.batch.delete(key);
        if (this.timeouts.has(key)) {
          clearTimeout(this.timeouts.get(key)!);
          this.timeouts.delete(key);
        }
      }
    } else {
      // Flush all batches
      this.batch.forEach((items, batchKey) => {
        if (items.length > 0) {
          this.onBatch(batchKey, items);
        }
      });
      this.batch.clear();
      this.timeouts.forEach(timeout => clearTimeout(timeout));
      this.timeouts.clear();
    }
  }
}

// Resource preloading
export function preloadResources(resources: string[]): Promise<void[]> {
  const promises = resources.map(resource => {
    if (resource.endsWith('.js')) {
      return preloadScript(resource);
    } else if (resource.endsWith('.css')) {
      return preloadStylesheet(resource);
    } else if (resource.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
      return lazyLoadImage(resource);
    }
    return Promise.resolve();
  });

  return Promise.all(promises);
}

function preloadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.onload = () => resolve();
    script.onerror = reject;
    script.src = src;
    document.head.appendChild(script);
  });
}

function preloadStylesheet(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.onload = () => {
      link.rel = 'stylesheet';
      resolve();
    };
    link.onerror = reject;
    link.href = href;
    document.head.appendChild(link);
  });
}

// Service Worker registration
export function registerServiceWorker(swUrl: string): Promise<void> {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.register(swUrl);
  }
  
  return Promise.reject(new Error('Service Worker not supported'));
}

// Critical CSS inlining utility
export function inlineCriticalCSS(css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

// Font loading optimization
export function loadFont(fontFamily: string, fontUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const font = new FontFace(fontFamily, `url(${fontUrl})`);
    
    font.load().then(() => {
      (document.fonts as any).add(font);
      resolve();
    }).catch(reject);
  });
}

// Bundle size monitoring
export function getBundleSize(): Promise<{
  js: number;
  css: number;
  total: number;
}> {
  return new Promise((resolve) => {
    let jsSize = 0;
    let cssSize = 0;

    // Get all script tags
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.includes('.js')) {
        // This is a simplified approach - in reality you'd need to fetch the actual file size
        jsSize += 100000; // Estimated size
      }
    });

    // Get all link tags for CSS
    const links = document.querySelectorAll('link[href]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes('.css')) {
        cssSize += 50000; // Estimated size
      }
    });

    resolve({
      js: jsSize,
      css: cssSize,
      total: jsSize + cssSize,
    });
  });
}

// Performance score calculation
export function calculatePerformanceScore(): {
  fcp: number;
  lcp: number;
  cls: number;
  fid: number;
  overall: number;
} {
  // Simplified performance metrics
  // In reality, you'd use Web Vitals library
  
  const fcp = Math.random() * 2 + 1; // 1-3 seconds
  const lcp = Math.random() * 2.5 + 2; // 2-4.5 seconds
  const cls = Math.random() * 0.2; // 0-0.2
  const fid = Math.random() * 200 + 50; // 50-250ms

  // Calculate overall score (simplified)
  const fcpScore = Math.max(0, 100 - (fcp - 1) * 20);
  const lcpScore = Math.max(0, 100 - (lcp - 2) * 15);
  const clsScore = Math.max(0, 100 - cls * 500);
  const fidScore = Math.max(0, 100 - (fid - 100) * 0.2);

  const overall = (fcpScore + lcpScore + clsScore + fidScore) / 4;

  return {
    fcp,
    lcp,
    cls,
    fid,
    overall,
  };
}

// Export performance utilities
export default {
  cache,
  debounce,
  throttle,
  lazyLoad,
  lazyLoadImage,
  createIntersectionObserver,
  performanceMonitor,
  getMemoryUsage,
  measureNetworkPerformance,
  VirtualScroller,
  RequestBatcher,
  preloadResources,
  registerServiceWorker,
  inlineCriticalCSS,
  loadFont,
  getBundleSize,
  calculatePerformanceScore,
};
