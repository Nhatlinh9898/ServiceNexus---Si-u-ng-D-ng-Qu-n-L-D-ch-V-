# Big Data Processor Guide

## 🎯 **Tổng Quan**

Big Data Processor là hệ thống AI chuyên sâu để xử lý hàng tỷ tỷ file với khả năng:
- **Massive Data Processing**: Xử lý dữ liệu quy mô lớn với chunking và parallel processing
- **Data Link Resolution**: Tải và xử lý dữ liệu liên kết với infinite loop prevention
- **Infinite Loop Prevention**: Ngăn chặn vòng lặp vô hạn thông qua pattern detection
- **Memory Management**: Quản lý bộ nhớ hiệu quả với worker threads
- **Fault Tolerance**: Xử lý lỗi và recovery mechanisms

## 🚀 **Tính Năng Chính**

### **1. Big Data Processing**
- **Chunk-based Processing**: Chia dữ liệu thành chunks để xử lý song song
- **Multi-threaded Processing**: Sử dụng worker threads để tối ưu performance
- **Memory Optimization**: Quản lý bộ nhớ với streaming và garbage collection
- **Format Support**: Hỗ trợ JSON, CSV, XML, TXT, JSONL formats
- **Data Validation**: Validate và clean data tự động
- **Deduplication**: Loại bỏ dữ liệu trùng lặp
- **Compression**: Nén dữ liệu để tiết kiệm storage

### **2. Data Link Resolution**
- **Recursive Crawling**: Đệ quy tải dữ liệu từ nhiều URLs
- **Infinite Loop Prevention**: Phát hiện và ngăn chặn vòng lặp vô hạn
- **Pattern Detection**: Phân tích URL patterns để detect suspicious behavior
- **Domain Filtering**: Lọc domains cho phép và chặn
- **File Type Filtering**: Chỉ tải các file types được chỉ định
- **Size Limiting**: Giới hạn kích thước file để tránh memory overflow
- **Rate Limiting**: Kiểm soát tốc độ tải để tránh bị block

### **3. Circuit Breaker Pattern**
- **Failure Detection**: Tự động detect khi service không available
- **Circuit States**: CLOSED, OPEN, HALF_OPEN states
- **Automatic Recovery**: Tự động phục hồi khi service available
- **Fallback Mechanisms**: Alternative processing paths

### **4. Advanced Features**
- **Progress Tracking**: Real-time progress monitoring
- **Error Handling**: Comprehensive error logging và recovery
- **Performance Metrics**: Detailed performance analytics
- **Resource Monitoring**: CPU, memory, disk usage tracking
- **Scalability**: Horizontal scaling support

## 📁 **Cấu Trúc Hệ Thống**

```
services/
├── bigDataProcessor.js      # Core big data processing engine
└── dataLinkResolver.js      # Data link resolution engine

server/routes/
└── big-data.js              # API endpoints for big data processing

src/components/
└── BigDataProcessor.tsx     # Frontend management interface

data/bigdata/                 # Local storage
├── chunks/                  # Processed data chunks
├── downloads/               # Downloaded files
├── processed/               # Final processed data
└── errors/                  # Error logs
```

## 🔧 **API Endpoints**

### **Big Data Processing**
- `POST /api/big-data/process` - Process big data file
- `POST /api/big-data/download-and-process` - Download và process URL
- `POST /api/big-data/batch-process` - Batch process multiple files
- `POST /api/big-data/validate-file` - Validate file trước processing
- `POST /api/big-data/create-plan` - Create processing plan
- `GET /api/big-data/big-data/stats` - Big data processing statistics

### **Data Link Resolution**
- `POST /api/big-data/resolve-links` - Resolve data links
- `GET /api/big-data/links/stats` - Link resolution statistics
- `GET /api/big-data/links/suspicious-patterns` - Suspicious patterns
- `GET /api/big-data/links/failed-urls` - Failed URLs list

### **System Management**
- `GET /api/big-data/status` - System status
- `GET /api/big-data/health` - Health check
- `GET /api/big-data/queue-status` - Queue status
- `POST /api/big-data/cleanup` - Cleanup resources
- `GET /api/big-data/export/:filename` - Export processed data

## 💻 **Frontend Interface**

### **Main Features**
- **2 Main Tabs**: Big Data Processing, Link Resolution
- **Configuration Panel**: Advanced configuration options
- **Real-time Monitoring**: Live progress tracking
- **Statistics Dashboard**: Comprehensive metrics display
- **Error Handling**: User-friendly error messages

### **User Interface**
- **Processing Configuration**: Chunk size, workers, formats, etc.
- **Link Resolution Setup**: Seed URLs, depth limits, filters
- **Progress Visualization**: Real-time progress bars và charts
- **System Health**: Circuit breaker status, resource usage
- **Advanced Options**: Fine-tuning parameters

## 🎯 **Sử Dụng**

### **1. Process Big Data File**
```javascript
// Frontend
const processBigData = async (config) => {
  const response = await fetch('/api/big-data/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'https://example.com/large-dataset.json',
      format: 'json',
      chunkSize: 10000,
      maxWorkers: 4,
      outputFormat: 'json',
      compression: true,
      validation: true,
      deduplication: true
    })
  });
  
  const result = await response.json();
  console.log('Processing started:', result.data);
};

// Monitor progress
const monitorProgress = async () => {
  const response = await fetch('/api/big-data/big-data/stats');
  const stats = await response.json();
  console.log('Progress:', stats.data);
};
```

### **2. Resolve Data Links**
```javascript
// Frontend
const resolveDataLinks = async (config) => {
  const response = await fetch('/api/big-data/resolve-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seedUrls: [
        'https://example.com/data.json',
        'https://example.org/more-data.csv'
      ],
      maxDepth: 3,
      maxConcurrentDownloads: 5,
      allowedDomains: ['example.com', 'example.org'],
      fileTypes: ['json', 'csv', 'txt'],
      maxFileSize: 104857600, // 100MB
      delayBetweenRequests: 1000
    })
  });
  
  const result = await response.json();
  console.log('Link resolution started:', result.data);
};
```

### **3. Download and Process URL**
```javascript
// Frontend
const downloadAndProcess = async (url) => {
  const response = await fetch('/api/big-data/download-and-process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: url,
      format: 'json',
      chunkSize: 5000,
      maxWorkers: 2,
      outputFormat: 'json',
      compression: true,
      maxRetries: 3,
      timeout: 30000
    })
  });
  
  const result = await response.json();
  console.log('Download and process result:', result.data);
};
```

### **4. Batch Processing**
```javascript
// Frontend
const batchProcess = async (files) => {
  const response = await fetch('/api/big-data/batch-process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: [
        {
          source: 'https://example.com/data1.json',
          format: 'json',
          chunkSize: 10000
        },
        {
          source: 'https://example.com/data2.csv',
          format: 'csv',
          chunkSize: 5000
        }
      ],
      commonOptions: {
        compression: true,
        validation: true,
        deduplication: true
      }
    })
  });
  
  const result = await response.json();
  console.log('Batch processing result:', result.data);
};
```

### **5. Backend Usage**
```javascript
const BigDataProcessor = require('./services/bigDataProcessor');
const DataLinkResolver = require('./services/dataLinkResolver');

// Initialize processors
const bigDataProcessor = new BigDataProcessor();
const dataLinkResolver = new DataLinkResolver();

await bigDataProcessor.initialize();
await dataLinkResolver.initialize();

// Process big data
const result = await bigDataProcessor.processBigData({
  source: 'https://example.com/large-dataset.json',
  format: 'json',
  chunkSize: 10000,
  maxWorkers: 4,
  compression: true,
  validation: true,
  deduplication: true
});

// Resolve data links
const linkResult = await dataLinkResolver.resolveDataLinks([
  'https://example.com/data.json'
], {
  maxDepth: 3,
  maxConcurrentDownloads: 5,
  fileTypes: ['json', 'csv'],
  maxFileSize: 104857600
});
```

## 📊 **Data Formats**

### **Input Formats**
```json
// JSON/JSONL
{"id": 1, "name": "John", "age": 30}
{"id": 2, "name": "Jane", "age": 25}

// CSV
id,name,age
1,John,30
2,Jane,25

// XML
<records>
  <record id="1" name="John" age="30" />
  <record id="2" name="Jane" age="25" />
</records>

// TXT
Record 1: John, 30
Record 2: Jane, 25
```

### **Output Formats**
```json
// Processed JSON
{
  "metadata": {
    "source": "https://example.com/data.json",
    "processedAt": "2024-01-01T00:00:00Z",
    "recordCount": 1000000
  },
  "data": [
    {"id": 1, "name": "John", "age": 30, "processed": true},
    {"id": 2, "name": "Jane", "age": 25, "processed": true}
  ]
}
```

## 🔒 **Infinite Loop Prevention**

### **Pattern Detection Algorithm**
```javascript
// URL Pattern Creation
const createUrlPattern = (url) => {
  const urlObj = new URL(url);
  return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
};

// Loop Detection
const detectInfiniteLoop = (url, parentUrl) => {
  const urlPattern = createUrlPattern(url);
  const parentPattern = createUrlPattern(parentUrl);
  
  // Track pattern history
  if (!patternHistory.has(urlPattern)) {
    patternHistory.set(urlPattern, []);
  }
  
  const history = patternHistory.get(urlPattern);
  history.push({ url, parentUrl, timestamp: Date.now() });
  
  // Check for repeating patterns
  if (history.length > maxRepeats) {
    const recentPatterns = history.slice(-maxRepeats);
    const uniqueParents = new Set(recentPatterns.map(p => p.parentUrl));
    
    if (uniqueParents.size <= 2) {
      return true; // Infinite loop detected
    }
  }
  
  return false;
};
```

### **Circular Reference Detection**
```javascript
const hasCircularReference = (urlChain) => {
  const seen = new Set();
  for (const url of urlChain) {
    if (seen.has(url)) {
      return true; // Circular reference detected
    }
    seen.add(url);
  }
  return false;
};
```

### **Suspicious Pattern Detection**
```javascript
const suspiciousPatterns = [
  /\/\d+\/\d+\/\d+/,  // Deep numeric paths
  /\?page=\d+&page=\d+/,  // Duplicate pagination
  /\/repeat\/repeat\/repeat/,  // Repeating segments
  /\?id=\d+&id=\d+/  // Duplicate parameters
];

const isSuspiciousPattern = (url) => {
  return suspiciousPatterns.some(pattern => pattern.test(url));
};
```

## 🛠️ **Configuration**

### **Environment Variables**
```bash
# Big Data Processing
BIG_DATA_CHUNK_SIZE=10000
BIG_DATA_MAX_WORKERS=4
BIG_DATA_MAX_FILE_SIZE=104857600
BIG_DATA_COMPRESSION=true
BIG_DATA_VALIDATION=true

# Link Resolution
LINK_MAX_DEPTH=3
LINK_MAX_CONCURRENT_DOWNLOADS=5
LINK_MAX_FILE_SIZE=104857600
LINK_DELAY_BETWEEN_REQUESTS=1000
LINK_RESPECT_ROBOTS_TXT=true

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=60000
CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS=3
```

### **Advanced Configuration**
```javascript
const bigDataProcessor = new BigDataProcessor({
  chunkSize: 10000,
  maxConcurrentWorkers: 4,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  compression: true,
  validation: true,
  deduplication: true,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000,
    halfOpenMaxCalls: 3
  }
});

const dataLinkResolver = new DataLinkResolver({
  maxDepth: 3,
  maxConcurrentDownloads: 5,
  allowedDomains: ['example.com', 'trusted-site.org'],
  blockedDomains: ['spam-site.com'],
  fileTypes: ['json', 'csv', 'txt'],
  maxFileSize: 100 * 1024 * 1024,
  delayBetweenRequests: 1000,
  infiniteLoopDetector: {
    maxRepeats: 3,
    suspiciousPatterns: new Set()
  }
});
```

## 🚨 **Error Handling**

### **Common Errors**
- **File Too Large**: File vượt giới hạn kích thước
- **Memory Overflow**: Vượt giới hạn bộ nhớ
- **Network Timeout**: Request timeout
- **Circuit Breaker Open**: Service không available
- **Infinite Loop Detected**: Phát hiện vòng lặp vô hạn
- **Invalid Format**: File format không hợp lệ

### **Error Recovery**
```javascript
// Retry Mechanism
const retryOperation = async (operation, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Circuit Breaker Pattern
const executeWithCircuitBreaker = async (operation) => {
  if (circuitBreaker.state === 'OPEN') {
    throw new Error('Circuit breaker is OPEN');
  }
  
  try {
    const result = await operation();
    circuitBreaker.reset();
    return result;
  } catch (error) {
    circuitBreaker.recordFailure();
    throw error;
  }
};
```

## 📈 **Performance Optimization**

### **Memory Management**
- **Streaming Processing**: Xử lý dữ liệu theo luồng
- **Garbage Collection**: Dọn dẹp bộ nhớ tự động
- **Object Pooling**: Tái sử dụng objects
- **Memory Monitoring**: Theo dõi sử dụng bộ nhớ

### **Processing Optimization**
- **Parallel Processing**: Xử lý song song chunks
- **Chunk Size Tuning**: Tối ưu kích thước chunk
- **Worker Thread Pool**: Quản lý worker threads hiệu quả
- **Load Balancing**: Phân phối workload

### **Network Optimization**
- **Connection Pooling**: Tái sử dụng connections
- **Rate Limiting**: Kiểm soát tốc độ request
- **Request Batching**: Gom nhóm requests
- **Compression**: Nén dữ liệu truyền tải

## 🔧 **Troubleshooting**

### **Performance Issues**
1. **Slow Processing**: Tăng số lượng workers, giảm chunk size
2. **Memory Leaks**: Monitor memory usage, restart workers
3. **Network Timeouts**: Tăng timeout values, retry mechanism
4. **Infinite Loops**: Check pattern detection, adjust thresholds

### **Data Issues**
1. **Invalid Format**: Validate input format, use robust parsers
2. **Large Files**: Increase chunk size, use streaming
3. **Corrupted Data**: Implement data validation and recovery
4. **Encoding Issues**: Handle different character encodings

### **System Issues**
1. **Disk Space**: Monitor disk usage, implement cleanup
2. **CPU Usage**: Optimize algorithms, use efficient data structures
3. **Network Issues**: Implement retry logic, circuit breaker
4. **Resource Exhaustion**: Monitor resources, implement limits

## 📚 **Examples**

### **Process Large JSON Dataset**
```javascript
const processLargeDataset = async () => {
  const processor = new BigDataProcessor();
  await processor.initialize();
  
  const result = await processor.processBigData({
    source: 'https://example.com/large-dataset.json',
    format: 'json',
    chunkSize: 50000, // 50k records per chunk
    maxWorkers: 8, // 8 worker threads
    outputFormat: 'json',
    compression: true,
    validation: true,
    deduplication: true,
    dataTransformation: (record) => ({
      ...record,
      processed_at: new Date().toISOString(),
      normalized_name: record.name.toLowerCase().trim()
    })
  });
  
  console.log(`Processed ${result.recordCount} records`);
  console.log(`Output saved to: ${result.outputPath}`);
};
```

### **Crawl Data from Multiple Sources**
```javascript
const crawlMultipleSources = async () => {
  const resolver = new DataLinkResolver();
  await resolver.initialize();
  
  const result = await resolver.resolveDataLinks([
    'https://api.example.com/users',
    'https://data.example.org/products',
    'https://files.example.net/reports'
  ], {
    maxDepth: 2,
    maxConcurrentDownloads: 3,
    allowedDomains: ['example.com', 'example.org', 'example.net'],
    fileTypes: ['json', 'csv'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    delayBetweenRequests: 2000,
    followRedirects: true,
    respectRobotsTxt: true
  });
  
  console.log(`Downloaded ${result.length} files`);
  console.log(`Total size: ${formatFileSize(result.reduce((sum, r) => sum + r.downloadResult.size, 0))}`);
};
```

### **Batch Processing with Error Handling**
```javascript
const batchProcessWithErrorHandling = async (files) => {
  const processor = new BigDataProcessor();
  await processor.initialize();
  
  const results = [];
  const errors = [];
  
  for (const file of files) {
    try {
      const result = await processor.processBigData({
        source: file.url,
        format: file.format,
        chunkSize: 10000,
        maxWorkers: 2,
        outputFormat: 'json',
        compression: true,
        validation: true,
        deduplication: true
      });
      
      results.push(result);
    } catch (error) {
      errors.push({
        file: file.url,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  console.log(`Successfully processed: ${results.length} files`);
  console.log(`Failed: ${errors.length} files`);
  
  return { results, errors };
};
```

## 🎯 **Best Practices**

### **Data Processing**
- **Start Small**: Test với small datasets trước khi scale up
- **Monitor Resources**: Theo dõi CPU, memory, disk usage
- **Validate Input**: Validate data format và structure
- **Handle Errors Gracefully**: Implement robust error handling
- **Use Streaming**: Process large files theo luồng

### **Link Resolution**
- **Respect Robots.txt**: Tuân thủ robots.txt rules
- **Rate Limiting**: Không overload target servers
- **Domain Filtering**: Chỉ crawl trusted domains
- **Size Limits**: Set reasonable file size limits
- **Loop Prevention**: Implement strong loop detection

### **System Design**
- **Scalability**: Design cho horizontal scaling
- **Reliability**: Implement fault tolerance
- **Monitoring**: Comprehensive logging và metrics
- **Security**: Validate inputs, sanitize outputs
- **Performance**: Optimize cho large datasets

---

## 🎯 **Kết Luận**

Big Data Processor cung cấp giải pháp toàn diện cho việc xử lý dữ liệu quy mô lớn với:
- **Massive Data Processing**: Xử lý hàng tỷ tỷ file hiệu quả
- **Infinite Loop Prevention**: Ngăn chặn vòng lặp vô hạn thông minh
- **Data Link Resolution**: Tải và xử lý dữ liệu liên kết tự động
- **Fault Tolerance**: Xử lý lỗi và recovery mechanisms
- **Performance Optimization**: Tối ưu hóa cho large-scale processing

Hệ thống được thiết kế để xử lý dữ liệu cực lớn một cách an toàn, hiệu quả và có khả năng mở rộng.
