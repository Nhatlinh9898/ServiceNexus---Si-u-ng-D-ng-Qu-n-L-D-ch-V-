const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const { createGzip, createGunzip } = require('zlib');
const readline = require('readline');

class BigDataProcessor extends EventEmitter {
  constructor() {
    super();
    this.chunkSize = 10000; // Process 10,000 records at a time
    this.maxConcurrentWorkers = 4;
    this.processingQueue = [];
    this.activeWorkers = new Map();
    this.completedChunks = new Map();
    this.failedChunks = new Set();
    this.processingStats = {
      totalFiles: 0,
      processedFiles: 0,
      totalRecords: 0,
      processedRecords: 0,
      failedRecords: 0,
      startTime: null,
      endTime: null,
      errors: []
    };
    this.downloadQueue = [];
    this.activeDownloads = new Map();
    this.maxConcurrentDownloads = 3;
    this.dataStorage = new Map();
    this.circuitBreaker = {
      failureCount: 0,
      failureThreshold: 5,
      resetTimeout: 60000,
      lastFailureTime: null,
      state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    };
  }

  // Initialize processor
  async initialize() {
    try {
      // Create directories
      await fs.mkdir('./data/bigdata', { recursive: true });
      await fs.mkdir('./data/bigdata/chunks', { recursive: true });
      await fs.mkdir('./data/bigdata/downloads', { recursive: true });
      await fs.mkdir('./data/bigdata/processed', { recursive: true });
      await fs.mkdir('./data/bigdata/errors', { recursive: true });
      
      console.log('✅ Big Data Processor initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Big Data Processor:', error);
      this.emit('error', error);
    }
  }

  // Process large dataset with chunking and parallel processing
  async processBigData(config) {
    try {
      const {
        source,
        format = 'json',
        chunkSize = this.chunkSize,
        maxWorkers = this.maxConcurrentWorkers,
        outputFormat = 'json',
        compression = true,
        validation = true,
        deduplication = true,
        dataTransformation = null
      } = config;

      this.processingStats.startTime = Date.now();
      this.emit('processingStarted', { source, format });

      // Step 1: Download data if needed
      let dataPath = source;
      if (source.startsWith('http')) {
        dataPath = await this.downloadData(source);
      }

      // Step 2: Validate file exists and get metadata
      const fileStats = await this.validateFile(dataPath);
      this.processingStats.totalFiles = 1;
      this.processingStats.totalRecords = fileStats.estimatedRecords;

      // Step 3: Create processing plan
      const processingPlan = await this.createProcessingPlan(dataPath, {
        format,
        chunkSize,
        maxWorkers,
        outputFormat,
        compression,
        validation,
        deduplication,
        dataTransformation
      });

      // Step 4: Execute processing plan
      const results = await this.executeProcessingPlan(processingPlan);

      // Step 5: Merge results and finalize
      const finalResult = await this.mergeResults(results, {
        outputFormat,
        compression,
        deduplication
      });

      this.processingStats.endTime = Date.now();
      this.processingStats.processedFiles = 1;
      this.processingStats.processedRecords = finalResult.recordCount;

      this.emit('processingCompleted', finalResult);
      return finalResult;

    } catch (error) {
      this.processingStats.errors.push({
        timestamp: Date.now(),
        error: error.message,
        stack: error.stack
      });
      this.emit('processingError', error);
      throw error;
    }
  }

  // Download data with circuit breaker and retry logic
  async downloadData(url, options = {}) {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      timeout = 30000,
      chunkSize = 1024 * 1024 // 1MB chunks
    } = options;

    const filename = path.basename(new URL(url).pathname) || `download_${Date.now()}`;
    const downloadPath = path.join('./data/bigdata/downloads', filename);

    // Check circuit breaker
    if (this.circuitBreaker.state === 'OPEN') {
      if (Date.now() - this.circuitBreaker.lastFailureTime > this.circuitBreaker.resetTimeout) {
        this.circuitBreaker.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - download blocked');
      }
    }

    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        this.emit('downloadStarted', { url, attempt: attempt + 1 });
        
        const response = await fetch(url, {
          signal: AbortSignal.timeout(timeout)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const totalSize = contentLength ? parseInt(contentLength) : 0;

        // Create write stream
        const writeStream = createWriteStream(downloadPath);
        let downloadedBytes = 0;

        // Download with progress tracking
        const reader = response.body.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          writeStream.write(value);
          downloadedBytes += value.length;
          
          // Emit progress
          if (totalSize > 0) {
            const progress = (downloadedBytes / totalSize) * 100;
            this.emit('downloadProgress', {
              url,
              downloadedBytes,
              totalSize,
              progress
            });
          }
        }

        writeStream.end();
        
        // Reset circuit breaker on success
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.state = 'CLOSED';

        this.emit('downloadCompleted', { url, downloadPath, downloadedBytes });
        return downloadPath;

      } catch (error) {
        attempt++;
        this.circuitBreaker.failureCount++;
        this.circuitBreaker.lastFailureTime = Date.now();

        if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
          this.circuitBreaker.state = 'OPEN';
        }

        if (attempt >= maxRetries) {
          this.emit('downloadFailed', { url, error, attempts: attempt });
          throw new Error(`Download failed after ${maxRetries} attempts: ${error.message}`);
        }

        this.emit('downloadRetry', { url, attempt, error });
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  // Validate file and estimate records
  async validateFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      let estimatedRecords = 0;
      let format = 'unknown';

      // Detect format and estimate records
      if (filePath.endsWith('.json') || filePath.endsWith('.jsonl')) {
        format = 'json';
        estimatedRecords = await this.estimateJsonRecords(filePath);
      } else if (filePath.endsWith('.csv')) {
        format = 'csv';
        estimatedRecords = await this.estimateCsvRecords(filePath);
      } else if (filePath.endsWith('.txt')) {
        format = 'text';
        estimatedRecords = await this.estimateTextRecords(filePath);
      }

      return {
        filePath,
        fileSize,
        format,
        estimatedRecords,
        isValid: true
      };
    } catch (error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
  }

  // Estimate records in JSON file
  async estimateJsonRecords(filePath) {
    let count = 0;
    const fileStream = createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          JSON.parse(line);
          count++;
        } catch (e) {
          // Skip invalid lines
        }
      }
      
      // Sample first 1000 lines for estimation
      if (count >= 1000) {
        break;
      }
    }

    // Estimate total based on sample
    const stats = await fs.stat(filePath);
    const avgLineSize = stats.size / count;
    const estimatedTotal = Math.floor(stats.size / avgLineSize);

    return estimatedTotal;
  }

  // Estimate records in CSV file
  async estimateCsvRecords(filePath) {
    let count = 0;
    const fileStream = createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let firstLine = true;
    for await (const line of rl) {
      if (firstLine) {
        firstLine = false;
        continue; // Skip header
      }
      
      if (line.trim()) {
        count++;
      }
      
      if (count >= 1000) {
        break;
      }
    }

    const stats = await fs.stat(filePath);
    const avgLineSize = stats.size / (count + 1); // +1 for header
    const estimatedTotal = Math.floor(stats.size / avgLineSize) - 1; // -1 for header

    return estimatedTotal;
  }

  // Estimate records in text file
  async estimateTextRecords(filePath) {
    const stats = await fs.stat(filePath);
    // Assume average record size of 100 bytes
    return Math.floor(stats.size / 100);
  }

  // Create processing plan with chunking strategy
  async createProcessingPlan(filePath, options) {
    const {
      format,
      chunkSize,
      maxWorkers,
      outputFormat,
      compression,
      validation,
      deduplication,
      dataTransformation
    } = options;

    const fileStats = await fs.stat(filePath);
    const totalChunks = Math.ceil(fileStats.size / (chunkSize * 1000)); // Rough estimation

    const plan = {
      filePath,
      format,
      totalChunks,
      chunkSize,
      maxWorkers,
      outputFormat,
      compression,
      validation,
      deduplication,
      dataTransformation,
      chunks: []
    };

    // Create chunk definitions
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min((i + 1) * chunkSize, totalChunks);
      
      plan.chunks.push({
        id: `chunk_${i}`,
        index: i,
        start,
        end,
        status: 'pending',
        workerId: null,
        startTime: null,
        endTime: null,
        recordCount: 0,
        error: null
      });
    }

    this.emit('processingPlanCreated', plan);
    return plan;
  }

  // Execute processing plan with worker threads
  async executeProcessingPlan(plan) {
    const results = [];
    const workerPromises = [];

    // Create worker pool
    for (let i = 0; i < plan.maxWorkers; i++) {
      const workerPromise = this.createWorker(i, plan);
      workerPromises.push(workerPromise);
    }

    // Wait for all workers to complete
    const workerResults = await Promise.allSettled(workerPromises);
    
    // Collect results
    workerResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      } else {
        console.error(`Worker ${index} failed:`, result.reason);
        this.processingStats.errors.push({
          timestamp: Date.now(),
          worker: index,
          error: result.reason.message
        });
      }
    });

    return results;
  }

  // Create worker thread
  async createWorker(workerId, plan) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: {
          workerId,
          plan,
          isWorker: true
        }
      });

      this.activeWorkers.set(workerId, worker);

      worker.on('message', (message) => {
        if (message.type === 'chunkCompleted') {
          this.emit('chunkCompleted', message.data);
        } else if (message.type === 'chunkFailed') {
          this.emit('chunkFailed', message.data);
        } else if (message.type === 'workerCompleted') {
          this.activeWorkers.delete(workerId);
          resolve(message.data.results);
        }
      });

      worker.on('error', (error) => {
        this.activeWorkers.delete(workerId);
        reject(error);
      });

      worker.on('exit', (code) => {
        this.activeWorkers.delete(workerId);
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  // Process chunk in worker thread
  async processChunk(chunkData, options) {
    const {
      format,
      validation,
      deduplication,
      dataTransformation,
      compression
    } = options;

    try {
      let records = [];
      let processedRecords = [];

      // Parse records based on format
      switch (format) {
        case 'json':
          records = this.parseJsonChunk(chunkData);
          break;
        case 'csv':
          records = this.parseCsvChunk(chunkData);
          break;
        case 'text':
          records = this.parseTextChunk(chunkData);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Validate records
      if (validation) {
        records = this.validateRecords(records);
      }

      // Apply data transformation
      if (dataTransformation) {
        records = this.transformRecords(records, dataTransformation);
      }

      // Deduplicate records
      if (deduplication) {
        records = this.deduplicateRecords(records);
      }

      // Compress if needed
      let compressedData = null;
      if (compression) {
        compressedData = await this.compressData(records);
      }

      return {
        records,
        compressedData,
        recordCount: records.length,
        success: true
      };

    } catch (error) {
      throw new Error(`Chunk processing failed: ${error.message}`);
    }
  }

  // Parse JSON chunk
  parseJsonChunk(chunkData) {
    const records = [];
    const lines = chunkData.toString().split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const record = JSON.parse(line);
          records.push(record);
        } catch (e) {
          // Skip invalid JSON lines
          this.processingStats.failedRecords++;
        }
      }
    }
    
    return records;
  }

  // Parse CSV chunk
  parseCsvChunk(chunkData) {
    const records = [];
    const lines = chunkData.toString().split('\n');
    let headers = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim());
      
      if (i === 0) {
        headers = values;
      } else {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || null;
        });
        records.push(record);
      }
    }
    
    return records;
  }

  // Parse text chunk
  parseTextChunk(chunkData) {
    const records = [];
    const lines = chunkData.toString().split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        records.push({
          id: records.length + 1,
          content: line.trim(),
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return records;
  }

  // Validate records
  validateRecords(records) {
    return records.filter(record => {
      // Basic validation
      return record !== null && 
             typeof record === 'object' && 
             Object.keys(record).length > 0;
    });
  }

  // Transform records
  transformRecords(records, transformation) {
    return records.map(record => {
      try {
        // Apply transformation function
        if (typeof transformation === 'function') {
          return transformation(record);
        } else if (typeof transformation === 'object') {
          // Apply field transformations
          const transformed = { ...record };
          Object.entries(transformation).forEach(([field, transform]) => {
            if (typeof transform === 'function') {
              transformed[field] = transform(record[field]);
            }
          });
          return transformed;
        }
        return record;
      } catch (e) {
        // Return original record if transformation fails
        return record;
      }
    });
  }

  // Deduplicate records
  deduplicateRecords(records) {
    const seen = new Set();
    const deduplicated = [];
    
    for (const record of records) {
      const key = JSON.stringify(record);
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(record);
      }
    }
    
    return deduplicated;
  }

  // Compress data
  async compressData(records) {
    const jsonString = JSON.stringify(records);
    return new Promise((resolve, reject) => {
      createGzip()(Buffer.from(jsonString), (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  // Merge results from all chunks
  async mergeResults(results, options) {
    const {
      outputFormat,
      compression,
      deduplication
    } = options;

    let allRecords = [];
    let totalRecordCount = 0;

    // Collect all records
    for (const result of results) {
      if (result.success) {
        allRecords.push(...result.records);
        totalRecordCount += result.recordCount;
      }
    }

    // Final deduplication
    if (deduplication) {
      allRecords = this.deduplicateRecords(allRecords);
    }

    // Create output file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join('./data/bigdata/processed', `processed_${timestamp}.${outputFormat}`);

    await this.writeOutputFile(allRecords, outputPath, outputFormat, compression);

    return {
      outputPath,
      recordCount: allRecords.length,
      originalRecordCount: totalRecordCount,
      compression,
      format: outputFormat,
      processingTime: Date.now() - this.processingStats.startTime
    };
  }

  // Write output file
  async writeOutputFile(records, outputPath, format, compression) {
    let outputData = '';

    switch (format) {
      case 'json':
        outputData = records.map(record => JSON.stringify(record)).join('\n');
        break;
      case 'jsonl':
        outputData = records.map(record => JSON.stringify(record)).join('\n');
        break;
      case 'csv':
        if (records.length > 0) {
          const headers = Object.keys(records[0]);
          outputData = headers.join(',') + '\n';
          outputData += records.map(record => 
            headers.map(header => record[header] || '').join(',')
          ).join('\n');
        }
        break;
      default:
        throw new Error(`Unsupported output format: ${format}`);
    }

    if (compression) {
      const compressed = await this.compressData([{ data: outputData }]);
      await fs.writeFile(outputPath + '.gz', compressed);
    } else {
      await fs.writeFile(outputPath, outputData);
    }
  }

  // Get processing statistics
  getProcessingStats() {
    return {
      ...this.processingStats,
      duration: this.processingStats.endTime ? 
        this.processingStats.endTime - this.processingStats.startTime : 
        Date.now() - this.processingStats.startTime,
      activeWorkers: this.activeWorkers.size,
      circuitBreakerState: this.circuitBreaker.state
    };
  }

  // Cleanup resources
  async cleanup() {
    // Terminate all workers
    for (const [workerId, worker] of this.activeWorkers) {
      worker.terminate();
    }
    this.activeWorkers.clear();

    // Clear data
    this.processingQueue = [];
    this.completedChunks.clear();
    this.failedChunks.clear();
    this.dataStorage.clear();

    console.log('✅ Big Data Processor cleaned up');
    this.emit('cleanup');
  }
}

// Worker thread execution
if (!isMainThread && workerData.isWorker) {
  const { workerId, plan } = workerData;
  const processor = new BigDataProcessor();

  async function processChunks() {
    const results = [];

    for (const chunk of plan.chunks) {
      try {
        // Read chunk data
        const chunkData = await fs.readFile(plan.filePath, {
          start: chunk.start * 1000,
          end: chunk.end * 1000
        });

        // Process chunk
        const result = await processor.processChunk(chunkData, plan);
        
        chunk.status = 'completed';
        chunk.recordCount = result.recordCount;
        
        parentPort.postMessage({
          type: 'chunkCompleted',
          data: {
            workerId,
            chunk,
            result
          }
        });

        results.push(result);

      } catch (error) {
        chunk.status = 'failed';
        chunk.error = error.message;
        
        parentPort.postMessage({
          type: 'chunkFailed',
          data: {
            workerId,
            chunk,
            error: error.message
          }
        });
      }
    }

    parentPort.postMessage({
      type: 'workerCompleted',
      data: {
        workerId,
        results
      }
    });
  }

  processChunks().catch(error => {
    parentPort.postMessage({
      type: 'workerError',
      data: {
        workerId,
        error: error.message
      }
    });
  });
}

module.exports = BigDataProcessor;
