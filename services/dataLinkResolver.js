const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const { URL } = require('url');

class DataLinkResolver extends EventEmitter {
  constructor() {
    super();
    this.visitedUrls = new Set();
    this.processingUrls = new Map();
    this.failedUrls = new Map();
    this.downloadQueue = [];
    this.maxConcurrentDownloads = 5;
    this.maxDepth = 3;
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
    this.allowedDomains = new Set();
    this.blockedDomains = new Set();
    this.fileTypes = new Set(['json', 'csv', 'txt', 'xml', 'jsonl']);
    this.downloadStats = {
      totalUrls: 0,
      downloadedUrls: 0,
      failedUrls: 0,
      skippedUrls: 0,
      totalSize: 0,
      startTime: null,
      endTime: null,
      errors: []
    };
    this.infiniteLoopDetector = {
      urlPatterns: new Map(),
      maxRepeats: 3,
      suspiciousPatterns: new Set()
    };
  }

  // Initialize resolver
  async initialize() {
    try {
      await fs.mkdir('./data/linked', { recursive: true });
      await fs.mkdir('./data/linked/downloads', { recursive: true });
      await fs.mkdir('./data/linked/processed', { recursive: true });
      await fs.mkdir('./data/linked/errors', { recursive: true });
      
      console.log('✅ Data Link Resolver initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Data Link Resolver:', error);
      this.emit('error', error);
    }
  }

  // Resolve data links with infinite loop prevention
  async resolveDataLinks(seedUrls, options = {}) {
    try {
      const {
        maxDepth = this.maxDepth,
        maxConcurrentDownloads = this.maxConcurrentDownloads,
        allowedDomains = [],
        blockedDomains = [],
        fileTypes = Array.from(this.fileTypes),
        maxFileSize = this.maxFileSize,
        followRedirects = true,
        respectRobotsTxt = true,
        delayBetweenRequests = 1000
      } = options;

      this.downloadStats.startTime = Date.now();
      this.allowedDomains = new Set(allowedDomains);
      this.blockedDomains = new Set(blockedDomains);
      this.fileTypes = new Set(fileTypes);
      this.maxFileSize = maxFileSize;

      this.emit('resolutionStarted', { seedUrls, maxDepth });

      // Initialize queue with seed URLs
      for (const url of seedUrls) {
        this.addToQueue(url, 0);
      }

      // Process queue with depth control
      const results = await this.processQueue(maxDepth, maxConcurrentDownloads, delayBetweenRequests);

      this.downloadStats.endTime = Date.now();
      this.emit('resolutionCompleted', results);

      return results;

    } catch (error) {
      this.downloadStats.errors.push({
        timestamp: Date.now(),
        error: error.message,
        stack: error.stack
      });
      this.emit('resolutionError', error);
      throw error;
    }
  }

  // Add URL to queue with infinite loop detection
  addToQueue(url, depth, parentUrl = null) {
    // Check if already visited
    if (this.visitedUrls.has(url)) {
      this.downloadStats.skippedUrls++;
      return false;
    }

    // Check infinite loop patterns
    if (this.detectInfiniteLoop(url, parentUrl)) {
      console.warn(`⚠️ Infinite loop detected: ${url}`);
      this.downloadStats.skippedUrls++;
      return false;
    }

    // Check depth limit
    if (depth > this.maxDepth) {
      this.downloadStats.skippedUrls++;
      return false;
    }

    // Check domain restrictions
    const domain = new URL(url).hostname;
    if (this.blockedDomains.has(domain)) {
      this.downloadStats.skippedUrls++;
      return false;
    }

    if (this.allowedDomains.size > 0 && !this.allowedDomains.has(domain)) {
      this.downloadStats.skippedUrls++;
      return false;
    }

    // Add to queue
    this.downloadQueue.push({
      url,
      depth,
      parentUrl,
      addedTime: Date.now()
    });

    this.downloadStats.totalUrls++;
    return true;
  }

  // Detect infinite loops using pattern analysis
  detectInfiniteLoop(url, parentUrl) {
    if (!parentUrl) return false;

    // Create URL pattern (remove query parameters and fragments)
    const urlPattern = this.createUrlPattern(url);
    const parentPattern = this.createUrlPattern(parentUrl);

    // Track URL patterns
    if (!this.infiniteLoopDetector.urlPatterns.has(urlPattern)) {
      this.infiniteLoopDetector.urlPatterns.set(urlPattern, []);
    }

    const patternHistory = this.infiniteLoopDetector.urlPatterns.get(urlPattern);
    patternHistory.push({
      url,
      parentUrl,
      timestamp: Date.now()
    });

    // Check for repeating patterns
    if (patternHistory.length > this.infiniteLoopDetector.maxRepeats) {
      const recentPatterns = patternHistory.slice(-this.infiniteLoopDetector.maxRepeats);
      const uniqueParents = new Set(recentPatterns.map(p => p.parentUrl));
      
      if (uniqueParents.size <= 2) {
        // Same pattern repeating with few unique parents
        this.infiniteLoopDetector.suspiciousPatterns.add(urlPattern);
        return true;
      }
    }

    // Check for circular references
    const urlChain = this.buildUrlChain(url, parentUrl);
    if (this.hasCircularReference(urlChain)) {
      return true;
    }

    return false;
  }

  // Create URL pattern for loop detection
  createUrlPattern(url) {
    try {
      const urlObj = new URL(url);
      // Remove query parameters and fragments
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch (error) {
      return url;
    }
  }

  // Build URL chain for circular reference detection
  buildUrlChain(url, parentUrl) {
    const chain = [url];
    let current = parentUrl;
    
    while (current && chain.length < 10) {
      chain.push(current);
      // This would need to track parent relationships
      // For now, just return the current chain
      break;
    }
    
    return chain;
  }

  // Check for circular references
  hasCircularReference(chain) {
    const seen = new Set();
    for (const url of chain) {
      if (seen.has(url)) {
        return true;
      }
      seen.add(url);
    }
    return false;
  }

  // Process download queue
  async processQueue(maxDepth, maxConcurrentDownloads, delayBetweenRequests) {
    const results = [];
    const activeDownloads = new Map();

    while (this.downloadQueue.length > 0 || activeDownloads.size > 0) {
      // Start new downloads up to concurrency limit
      while (this.downloadQueue.length > 0 && activeDownloads.size < maxConcurrentDownloads) {
        const urlInfo = this.downloadQueue.shift();
        
        // Check if already visited
        if (this.visitedUrls.has(urlInfo.url)) {
          continue;
        }

        this.visitedUrls.add(urlInfo.url);
        
        const downloadPromise = this.processUrl(urlInfo);
        activeDownloads.set(urlInfo.url, downloadPromise);

        // Add delay between requests
        if (delayBetweenRequests > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
        }
      }

      // Wait for at least one download to complete
      if (activeDownloads.size > 0) {
        const completedPromises = await Promise.allSettled(Array.from(activeDownloads.values()));
        
        // Process completed downloads
        for (let i = 0; i < completedPromises.length; i++) {
          const promise = Array.from(activeDownloads.values())[i];
          const result = completedPromises[i];
          
          if (result.status === 'fulfilled') {
            results.push(result.value);
            
            // Extract new URLs from downloaded content
            if (result.value.links && result.value.depth < maxDepth) {
              for (const link of result.value.links) {
                this.addToQueue(link, result.value.depth + 1, result.value.url);
              }
            }
          } else {
            console.error(`Download failed: ${result.reason}`);
            this.downloadStats.failedUrls++;
          }
        }

        // Clear completed downloads
        activeDownloads.clear();
      }
    }

    return results;
  }

  // Process individual URL
  async processUrl(urlInfo) {
    const { url, depth, parentUrl } = urlInfo;
    
    try {
      this.emit('urlProcessingStarted', { url, depth, parentUrl });
      
      // Check file type
      const fileType = this.getFileType(url);
      if (!this.fileTypes.has(fileType)) {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Download file
      const downloadResult = await this.downloadFile(url);
      
      // Process downloaded file
      const processResult = await this.processDownloadedFile(downloadResult, {
        url,
        depth,
        parentUrl,
        fileType
      });

      // Extract links from content
      const links = await this.extractLinks(processResult.content, url);

      this.downloadStats.downloadedUrls++;
      this.downloadStats.totalSize += downloadResult.size;

      this.emit('urlProcessingCompleted', {
        url,
        depth,
        parentUrl,
        downloadResult,
        processResult,
        links: links.length
      });

      return {
        url,
        depth,
        parentUrl,
        fileType,
        downloadResult,
        processResult,
        links,
        success: true
      };

    } catch (error) {
      this.downloadStats.failedUrls++;
      this.failedUrls.set(url, error.message);
      
      this.emit('urlProcessingFailed', {
        url,
        depth,
        parentUrl,
        error: error.message
      });

      return {
        url,
        depth,
        parentUrl,
        error: error.message,
        success: false
      };
    }
  }

  // Download file with size limits
  async downloadFile(url) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > this.maxFileSize) {
      throw new Error(`File too large: ${contentLength} bytes`);
    }

    const filename = this.generateFilename(url);
    const downloadPath = path.join('./data/linked/downloads', filename);

    // Stream download with size monitoring
    const writeStream = createWriteStream(downloadPath);
    let downloadedBytes = 0;

    const reader = response.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      downloadedBytes += value.length;
      
      if (downloadedBytes > this.maxFileSize) {
        writeStream.destroy();
        await fs.unlink(downloadPath);
        throw new Error(`File size exceeded limit: ${downloadedBytes} bytes`);
      }
      
      writeStream.write(value);
    }

    writeStream.end();

    return {
      filename,
      downloadPath,
      size: downloadedBytes,
      contentType: response.headers.get('content-type'),
      lastModified: response.headers.get('last-modified')
    };
  }

  // Generate safe filename
  generateFilename(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = path.basename(pathname) || 'download';
      
      // Add timestamp to avoid conflicts
      const timestamp = Date.now();
      const extension = path.extname(filename);
      const name = path.basename(filename, extension);
      
      return `${name}_${timestamp}${extension}`;
    } catch (error) {
      return `download_${Date.now()}`;
    }
  }

  // Get file type from URL
  getFileType(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const extension = path.extname(pathname).toLowerCase().substring(1);
      return extension || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  // Process downloaded file
  async processDownloadedFile(downloadResult, metadata) {
    const { downloadPath, fileType } = downloadResult;
    const { url, depth, parentUrl } = metadata;

    let content = '';
    let processedData = null;

    try {
      // Read file content
      const fileContent = await fs.readFile(downloadPath, 'utf8');
      content = fileContent;

      // Process based on file type
      switch (fileType) {
        case 'json':
        case 'jsonl':
          processedData = this.processJsonContent(content);
          break;
        case 'csv':
          processedData = this.processCsvContent(content);
          break;
        case 'xml':
          processedData = this.processXmlContent(content);
          break;
        case 'txt':
          processedData = this.processTextContent(content);
          break;
        default:
          processedData = this.processGenericContent(content);
      }

      // Save processed data
      const processedFilename = this.generateProcessedFilename(url, fileType);
      const processedPath = path.join('./data/linked/processed', processedFilename);
      
      await fs.writeFile(processedPath, JSON.stringify({
        metadata,
        downloadResult,
        processedData,
        processedAt: new Date().toISOString()
      }, null, 2));

      return {
        content,
        processedData,
        processedPath,
        recordCount: Array.isArray(processedData) ? processedData.length : 1
      };

    } catch (error) {
      // Move to error folder
      const errorFilename = this.generateErrorFilename(url, fileType);
      const errorPath = path.join('./data/linked/errors', errorFilename);
      
      await fs.writeFile(errorPath, JSON.stringify({
        metadata,
        downloadResult,
        error: error.message,
        failedAt: new Date().toISOString()
      }, null, 2));

      throw error;
    }
  }

  // Process JSON content
  processJsonContent(content) {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      const records = [];
      
      for (const line of lines) {
        try {
          const record = JSON.parse(line);
          records.push(record);
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
      
      return records;
    } catch (error) {
      throw new Error(`JSON processing failed: ${error.message}`);
    }
  }

  // Process CSV content
  processCsvContent(content) {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) return [];
      
      const headers = lines[0].split(',').map(h => h.trim());
      const records = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const record = {};
        
        headers.forEach((header, index) => {
          record[header] = values[index] || null;
        });
        
        records.push(record);
      }
      
      return records;
    } catch (error) {
      throw new Error(`CSV processing failed: ${error.message}`);
    }
  }

  // Process XML content
  processXmlContent(content) {
    try {
      // Simple XML processing - in production, use a proper XML parser
      const records = [];
      const matches = content.match(/<record[^>]*>([\s\S]*?)<\/record>/g);
      
      if (matches) {
        for (const match of matches) {
          const record = { raw: match };
          records.push(record);
        }
      }
      
      return records;
    } catch (error) {
      throw new Error(`XML processing failed: ${error.message}`);
    }
  }

  // Process text content
  processTextContent(content) {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      const records = [];
      
      for (let i = 0; i < lines.length; i++) {
        records.push({
          id: i + 1,
          content: lines[i].trim(),
          lineNumber: i + 1
        });
      }
      
      return records;
    } catch (error) {
      throw new Error(`Text processing failed: ${error.message}`);
    }
  }

  // Process generic content
  processGenericContent(content) {
    return [{
      id: 1,
      content: content,
      size: content.length,
      type: 'generic'
    }];
  }

  // Extract links from content
  async extractLinks(content, baseUrl) {
    const links = new Set();
    
    try {
      // Extract URLs from content
      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
      const matches = content.match(urlRegex);
      
      if (matches) {
        for (const match of matches) {
          try {
            const url = new URL(match, baseUrl).toString();
            
            // Validate URL
            if (this.isValidUrl(url)) {
              links.add(url);
            }
          } catch (error) {
            // Skip invalid URLs
          }
        }
      }
      
      // Extract file references
      const fileRegex = /["']([^"']+\.(json|csv|txt|xml|jsonl))["']/g;
      const fileMatches = content.match(fileRegex);
      
      if (fileMatches) {
        for (const match of fileMatches) {
          const filename = match.replace(/['"]/g, '');
          try {
            const url = new URL(filename, baseUrl).toString();
            
            if (this.isValidUrl(url)) {
              links.add(url);
            }
          } catch (error) {
            // Skip invalid file references
          }
        }
      }
      
    } catch (error) {
      console.error('Link extraction error:', error);
    }
    
    return Array.from(links);
  }

  // Validate URL
  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  // Generate processed filename
  generateProcessedFilename(url, fileType) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = path.basename(pathname) || 'processed';
      const timestamp = Date.now();
      
      return `${filename}_${timestamp}_processed.json`;
    } catch (error) {
      return `processed_${timestamp}.json`;
    }
  }

  // Generate error filename
  generateErrorFilename(url, fileType) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = path.basename(pathname) || 'error';
      const timestamp = Date.now();
      
      return `${filename}_${timestamp}_error.json`;
    } catch (error) {
      return `error_${timestamp}.json`;
    }
  }

  // Get resolution statistics
  getResolutionStats() {
    return {
      ...this.downloadStats,
      duration: this.downloadStats.endTime ? 
        this.downloadStats.endTime - this.downloadStats.startTime : 
        Date.now() - this.downloadStats.startTime,
      visitedUrls: this.visitedUrls.size,
      failedUrls: this.failedUrls.size,
      suspiciousPatterns: this.infiniteLoopDetector.suspiciousPatterns.size,
      queueLength: this.downloadQueue.length
    };
  }

  // Get suspicious patterns
  getSuspiciousPatterns() {
    return Array.from(this.infiniteLoopDetector.suspiciousPatterns);
  }

  // Get failed URLs
  getFailedUrls() {
    return Array.from(this.failedUrls.entries()).map(([url, error]) => ({
      url,
      error
    }));
  }

  // Cleanup resources
  async cleanup() {
    this.downloadQueue = [];
    this.visitedUrls.clear();
    this.processingUrls.clear();
    this.failedUrls.clear();
    this.infiniteLoopDetector.urlPatterns.clear();
    this.infiniteLoopDetector.suspiciousPatterns.clear();
    
    console.log('✅ Data Link Resolver cleaned up');
    this.emit('cleanup');
  }
}

module.exports = DataLinkResolver;
