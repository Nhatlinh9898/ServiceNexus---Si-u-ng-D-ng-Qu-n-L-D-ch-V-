const express = require('express');
const BigDataProcessor = require('../services/bigDataProcessor');
const DataLinkResolver = require('../services/dataLinkResolver');
const router = express.Router();

// Initialize processors
const bigDataProcessor = new BigDataProcessor();
const dataLinkResolver = new DataLinkResolver();

// Initialize processors on startup
Promise.all([
  bigDataProcessor.initialize(),
  dataLinkResolver.initialize()
]).catch(console.error);

// Event listeners for Big Data Processor
bigDataProcessor.on('processingStarted', (data) => {
  console.log(`🚀 Big data processing started: ${data.source}`);
});

bigDataProcessor.on('processingCompleted', (result) => {
  console.log(`✅ Big data processing completed: ${result.outputPath}`);
});

bigDataProcessor.on('processingError', (error) => {
  console.error(`❌ Big data processing error:`, error);
});

bigDataProcessor.on('chunkCompleted', (data) => {
  console.log(`📊 Chunk completed: ${data.chunk.id} (${data.result.recordCount} records)`);
});

bigDataProcessor.on('downloadStarted', (data) => {
  console.log(`⬇️ Download started: ${data.url}`);
});

bigDataProcessor.on('downloadProgress', (data) => {
  console.log(`📥 Download progress: ${data.url} - ${data.progress.toFixed(1)}%`);
});

bigDataProcessor.on('downloadCompleted', (data) => {
  console.log(`✅ Download completed: ${data.url} -> ${data.downloadPath}`);
});

// Event listeners for Data Link Resolver
dataLinkResolver.on('resolutionStarted', (data) => {
  console.log(`🔗 Data link resolution started: ${data.seedUrls.length} URLs`);
});

dataLinkResolver.on('resolutionCompleted', (results) => {
  console.log(`✅ Data link resolution completed: ${results.length} URLs processed`);
});

dataLinkResolver.on('urlProcessingStarted', (data) => {
  console.log(`🔍 Processing URL: ${data.url} (depth: ${data.depth})`);
});

dataLinkResolver.on('urlProcessingCompleted', (data) => {
  console.log(`✅ URL processed: ${data.url} (${data.links.length} links found)`);
});

dataLinkResolver.on('urlProcessingFailed', (data) => {
  console.error(`❌ URL processing failed: ${data.url} - ${data.error}`);
});

// Middleware for request validation
const validateRequest = (req, res, next) => {
  try {
    if (!req.body && req.method !== 'GET') {
      return res.status(400).json({
        success: false,
        error: 'Request body is required'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Request validation failed'
    });
  }
};

// Process big data
router.post('/process', validateRequest, async (req, res) => {
  try {
    const { 
      source, 
      format = 'json',
      chunkSize = 10000,
      maxWorkers = 4,
      outputFormat = 'json',
      compression = true,
      validation = true,
      deduplication = true,
      dataTransformation = null
    } = req.body;
    
    if (!source) {
      return res.status(400).json({
        success: false,
        error: 'Source is required for big data processing'
      });
    }

    console.log('🔄 Starting big data processing...');
    const result = await bigDataProcessor.processBigData({
      source,
      format,
      chunkSize,
      maxWorkers,
      outputFormat,
      compression,
      validation,
      deduplication,
      dataTransformation
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Big data processing completed successfully'
    });
  } catch (error) {
    console.error('❌ Big data processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Resolve data links
router.post('/resolve-links', validateRequest, async (req, res) => {
  try {
    const { 
      seedUrls,
      maxDepth = 3,
      maxConcurrentDownloads = 5,
      allowedDomains = [],
      blockedDomains = [],
      fileTypes = ['json', 'csv', 'txt', 'xml', 'jsonl'],
      maxFileSize = 104857600, // 100MB
      followRedirects = true,
      respectRobotsTxt = true,
      delayBetweenRequests = 1000
    } = req.body;
    
    if (!seedUrls || !Array.isArray(seedUrls) || seedUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Seed URLs array is required'
      });
    }

    console.log(`🔗 Starting data link resolution for ${seedUrls.length} URLs...`);
    const result = await dataLinkResolver.resolveDataLinks(seedUrls, {
      maxDepth,
      maxConcurrentDownloads,
      allowedDomains,
      blockedDomains,
      fileTypes,
      maxFileSize,
      followRedirects,
      respectRobotsTxt,
      delayBetweenRequests
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Data link resolution completed successfully'
    });
  } catch (error) {
    console.error('❌ Data link resolution error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get big data processing statistics
router.get('/big-data/stats', async (req, res) => {
  try {
    const stats = bigDataProcessor.getProcessingStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Big data processing statistics retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Stats retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get data link resolution statistics
router.get('/links/stats', async (req, res) => {
  try {
    const stats = dataLinkResolver.getResolutionStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Data link resolution statistics retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Stats retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get suspicious patterns
router.get('/links/suspicious-patterns', async (req, res) => {
  try {
    const patterns = dataLinkResolver.getSuspiciousPatterns();
    
    res.json({
      success: true,
      data: {
        patterns: patterns,
        count: patterns.length
      },
      message: 'Suspicious patterns retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Suspicious patterns retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get failed URLs
router.get('/links/failed-urls', async (req, res) => {
  try {
    const failedUrls = dataLinkResolver.getFailedUrls();
    
    res.json({
      success: true,
      data: {
        failedUrls: failedUrls,
        count: failedUrls.length
      },
      message: 'Failed URLs retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Failed URLs retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validate file before processing
router.post('/validate-file', validateRequest, async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    const validation = await bigDataProcessor.validateFile(filePath);
    
    res.json({
      success: true,
      data: validation,
      message: 'File validation completed successfully'
    });
  } catch (error) {
    console.error('❌ File validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create processing plan
router.post('/create-plan', validateRequest, async (req, res) => {
  try {
    const { 
      filePath,
      format = 'json',
      chunkSize = 10000,
      maxWorkers = 4,
      outputFormat = 'json',
      compression = true,
      validation = true,
      deduplication = true,
      dataTransformation = null
    } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    const plan = await bigDataProcessor.createProcessingPlan(filePath, {
      format,
      chunkSize,
      maxWorkers,
      outputFormat,
      compression,
      validation,
      deduplication,
      dataTransformation
    });
    
    res.json({
      success: true,
      data: plan,
      message: 'Processing plan created successfully'
    });
  } catch (error) {
    console.error('❌ Processing plan creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Download and process data from URL
router.post('/download-and-process', validateRequest, async (req, res) => {
  try {
    const { 
      url,
      format = 'json',
      chunkSize = 10000,
      maxWorkers = 4,
      outputFormat = 'json',
      compression = true,
      validation = true,
      deduplication = true,
      maxRetries = 3,
      timeout = 30000
    } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    console.log(`⬇️ Downloading and processing: ${url}`);
    
    // First download the file
    const downloadPath = await bigDataProcessor.downloadData(url, {
      maxRetries,
      retryDelay: 1000,
      timeout,
      chunkSize: 1024 * 1024 // 1MB chunks
    });
    
    // Then process the downloaded file
    const result = await bigDataProcessor.processBigData({
      source: downloadPath,
      format,
      chunkSize,
      maxWorkers,
      outputFormat,
      compression,
      validation,
      deduplication
    });
    
    res.json({
      success: true,
      data: {
        downloadPath,
        processingResult: result
      },
      message: 'Download and processing completed successfully'
    });
  } catch (error) {
    console.error('❌ Download and process error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch process multiple files
router.post('/batch-process', validateRequest, async (req, res) => {
  try {
    const { 
      files,
      commonOptions = {}
    } = req.body;
    
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Files array is required'
      });
    }

    console.log(`🔄 Starting batch processing for ${files.length} files...`);
    
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await bigDataProcessor.processBigData({
          ...commonOptions,
          ...file
        });
        
        results.push({
          index: i,
          file: file.source || file.filePath,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          index: i,
          file: file.source || file.filePath,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results: results
      },
      message: 'Batch processing completed'
    });
  } catch (error) {
    console.error('❌ Batch processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get system status
router.get('/status', async (req, res) => {
  try {
    const bigDataStats = bigDataProcessor.getProcessingStats();
    const linkStats = dataLinkResolver.getResolutionStats();
    
    const status = {
      service: 'Big Data Processing Service',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      bigDataProcessor: {
        status: 'active',
        stats: bigDataStats
      },
      dataLinkResolver: {
        status: 'active',
        stats: linkStats
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };
    
    res.json({
      success: true,
      data: status,
      message: 'System status retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Status retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cleanup resources
router.post('/cleanup', async (req, res) => {
  try {
    await Promise.all([
      bigDataProcessor.cleanup(),
      dataLinkResolver.cleanup()
    ]);
    
    res.json({
      success: true,
      message: 'Big data processors cleaned up successfully'
    });
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const bigDataStats = bigDataProcessor.getProcessingStats();
    const linkStats = dataLinkResolver.getResolutionStats();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      bigDataProcessor: {
        active: bigDataStats.activeWorkers === 0,
        circuitBreakerState: bigDataStats.circuitBreakerState
      },
      dataLinkResolver: {
        active: linkStats.queueLength === 0,
        suspiciousPatterns: linkStats.suspiciousPatterns
      }
    };
    
    // Check if there are any issues
    if (bigDataStats.circuitBreakerState === 'OPEN' || 
        linkStats.suspiciousPatterns.size > 0 ||
        bigDataStats.errors.length > 10) {
      health.status = 'degraded';
    }
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      data: health,
      message: `Service status: ${health.status}`
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get processing queue status
router.get('/queue-status', async (req, res) => {
  try {
    const bigDataStats = bigDataProcessor.getProcessingStats();
    const linkStats = dataLinkResolver.getResolutionStats();
    
    const queueStatus = {
      bigDataProcessor: {
        queueLength: bigDataStats.activeWorkers,
        activeWorkers: bigDataStats.activeWorkers,
        completedChunks: bigDataStats.completedChunks.size,
        failedChunks: bigDataStats.failedChunks.size
      },
      dataLinkResolver: {
        queueLength: linkStats.queueLength,
        processingUrls: linkStats.processingUrls.size,
        visitedUrls: linkStats.visitedUrls.size,
        failedUrls: linkStats.failedUrls.size
      }
    };
    
    res.json({
      success: true,
      data: queueStatus,
      message: 'Queue status retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Queue status retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export processed data
router.get('/export/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { format = 'json' } = req.query;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }

    // This would implement actual file serving
    // For now, return the file path
    const filePath = `./data/bigdata/processed/${filename}`;
    
    res.json({
      success: true,
      data: {
        filePath: filePath,
        filename: filename,
        format: format
      },
      message: 'Export information retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
