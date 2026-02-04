# AI Trung Tâm Local - Hướng Dẫn Sử Dụng

## Tổng Quan

Hệ thống AI trung tâm local cho phép bạn chạy AI mà không cần API key, có thể mở rộng miễn phí và hoạt động hoàn toàn offline.

## Tính Năng Chính

### 🚀 Local AI Service
- **Không cần API key**: Hoạt động hoàn toàn local
- **Nhiều model types**: Language, Rule-based, Pattern-based, Template-based
- **Auto-fallback**: Tự động chuyển sang local khi API không khả dụng
- **Caching thông minh**: Lưu trữ kết quả để tăng tốc độ

### 🔌 Plugin System
- **Mở rộng dễ dàng**: Thêm các model AI mới qua plugin
- **Hot reload**: Tự động tải lại plugin khi có thay đổi
- **Template generator**: Tự động tạo template plugin mới
- **Hook system**: Tùy chỉnh luồng xử lý

### 📦 Model Management
- **Download manager**: Quản lý tải model tự động
- **Registry system**: Đăng ký và quản lý các model
- **Stats tracking**: Theo dõi hiệu suất và usage
- **Storage optimization**: Tối ưu hóa dung lượng lưu trữ

## Cài Đặt

### 1. Khởi tạo hệ thống

```javascript
const aiServiceFactory = require('./services/aiServiceFactory');

await aiServiceFactory.initialize({
  defaultService: 'local', // hoặc 'gemini' nếu có API key
  local: {
    modelsPath: './models',
    cachePath: './cache/ai',
    enableOffline: true
  }
});
```

### 2. Sử dụng AI Service

```javascript
// Tư vấn vận hành
const advice = await aiServiceFactory.process({
  type: 'operational_advice',
  query: 'Làm sao để tối ưu hóa quy trình?',
  contextData: 'dữ liệu doanh nghiệp'
});

// Phân tích dữ liệu
const analysis = await aiServiceFactory.process({
  type: 'business_analysis',
  data: {
    doanh_thu: 1000000,
    đơn_hàng: 150,
    khách_hàng: 80
  }
});

// Tạo nội dung
const content = await aiServiceFactory.process({
  type: 'content_generation',
  contentType: 'product_description',
  context: {
    tên_sản_phẩm: 'Dịch vụ ABC',
    mô_tả: 'Dịch vụ chất lượng cao'
  }
});
```

## Các Model AI Có Sẵn

### 1. Local GPT
- **local-gpt-small**: 100MB, nhanh và nhẹ
- **local-gpt-medium**: 500MB, cân bằng hiệu suất
- Khả năng: Text generation, analysis, translation

### 2. Rule AI
- **rule-ai-v1**: Không cần download, cực nhẹ
- Khả năng: Rule processing, decision making, automation

### 3. Pattern AI
- **pattern-ai-v1**: Nhận diện mẫu và xu hướng
- Khả năng: Pattern recognition, trend analysis

### 4. Template AI
- **template-ai-v1**: Dựa trên template, chuyên nghiệp
- Khả năng: Template generation, structured output

## API Endpoints

### System Status
```http
GET /api/ai/status
```

### AI Processing
```http
POST /api/ai/advice
POST /api/ai/analyze  
POST /api/ai/generate
POST /api/ai/batch
```

### Model Management
```http
GET /api/ai/models
POST /api/ai/models/:modelId/download
DELETE /api/ai/models/:modelId
```

### Service Management
```http
GET /api/ai/services
POST /api/ai/services/:serviceName/set-default
```

### Plugin Management
```http
GET /api/ai/plugins
POST /api/ai/plugins/:pluginName/register
DELETE /api/ai/plugins/:pluginName
POST /api/ai/plugins/create
```

## Tạo Plugin Mới

### 1. Sử dụng API

```http
POST /api/ai/plugins/create
{
  "pluginName": "my-custom-ai",
  "config": {
    "description": "Plugin AI tùy chỉnh"
  }
}
```

### 2. Tạo thủ công

Tạo thư mục `./plugins/ai/my-custom-ai` với file `index.js`:

```javascript
class MyCustomAI {
  constructor(config) {
    this.config = config;
  }

  getName() {
    return 'my-custom-ai';
  }

  async process(input, options) {
    // Logic xử lý AI của bạn
    return {
      model: 'my-custom-ai',
      response: 'Kết quả xử lý',
      confidence: 0.9
    };
  }

  async cleanup() {
    // Dọn dẹp resources
  }
}

module.exports = MyCustomAI;
```

## Cấu Hình

### Environment Variables
```bash
# Optional: Gemini API key (nếu muốn dùng Gemini)
GEMINI_API_KEY=your_api_key_here

# Local AI config
AI_MODELS_PATH=./models
AI_CACHE_PATH=./cache/ai
AI_ENABLE_OFFLINE=true
```

### Config Options
```javascript
const config = {
  // Local AI Service
  local: {
    modelsPath: './models',
    cachePath: './cache/ai',
    maxCacheSize: 1000,
    defaultModel: 'local-gpt',
    enableOffline: true
  },
  
  // Model Manager
  modelManager: {
    modelsPath: './models',
    autoDownload: false,
    maxConcurrentDownloads: 3
  },
  
  // Plugin System
  pluginSystem: {
    pluginsPath: './plugins/ai',
    autoLoad: true,
    enableHotReload: false
  }
};
```

## Ví Dụ Sử Dụng

### 1. Tư vấn vận hành doanh nghiệp

```javascript
const advice = await aiServiceFactory.process({
  type: 'operational_advice',
  query: 'Làm sao để giảm chi phí vận hành?',
  contextData: JSON.stringify({
    chi_phí_hiện_tại: 5000000,
    nhân_sự: 20,
    doanh_thu: 15000000
  })
});

console.log(advice.response);
// Output: Gợi ý chi tiết về tối ưu hóa chi phí
```

### 2. Phân tích dữ liệu bán hàng

```javascript
const analysis = await aiServiceFactory.process({
  type: 'data_analysis',
  data: {
    sản_phẩm: ['A', 'B', 'C'],
    doanh_số: [1000, 2000, 1500],
    khách_hàng: [50, 80, 60]
  }
});

console.log(analysis.response);
// Output: Phân tích xu hướng và đề xuất
```

### 3. Tạo nội dung marketing

```javascript
const content = await aiServiceFactory.process({
  type: 'content_generation',
  contentType: 'social_media_post',
  context: {
    tiêu_đề: 'Khuyến mãi tháng 1',
    nội_dung: 'Giảm giá 20% tất cả sản phẩm',
    loại_nội_dung: 'social_media_post'
  }
});

console.log(content.response);
// Output: Bài đăng social media đã format
```

## Monitoring và Debug

### 1. System Health Check
```http
GET /api/ai/health
```

### 2. Performance Metrics
```javascript
const status = aiServiceFactory.getStatus();
console.log('Services:', status.services);
console.log('Default:', status.defaultService);
```

### 3. Model Statistics
```javascript
const modelStats = modelManager.getSystemStatus();
console.log('Total models:', modelStats.totalModels);
console.log('Downloaded:', modelStats.downloadedModels);
console.log('Storage usage:', modelStats.storageUsage);
```

## Troubleshooting

### Common Issues

1. **Plugin không load được**
   - Kiểm tra đường dẫn plugin
   - Verify plugin structure
   - Check console logs

2. **Model download thất bại**
   - Kiểm tra kết nối internet
   - Verify URL trong registry
   - Check storage space

3. **AI response chậm**
   - Enable caching
   - Use smaller models
   - Check system resources

### Debug Mode
```javascript
// Enable debug logging
process.env.DEBUG = 'ai:*';

// Check detailed status
const detailedStatus = await aiServiceFactory.process({
  type: 'debug_info'
});
```

## Best Practices

1. **Model Selection**: Chọn model phù hợp với use case
2. **Caching**: Enable cache cho frequently used queries
3. **Fallback**: Configure fallback cho reliability
4. **Monitoring**: Track performance và usage
5. **Security**: Validate input data
6. **Resources**: Monitor memory và storage usage

## Roadmap

- [ ] Integration với Hugging Face models
- [ ] GPU acceleration support
- [ ] Advanced caching strategies
- [ ] Model fine-tuning interface
- [ ] Multi-language support
- [ ] Real-time streaming responses
- [ ] Advanced analytics dashboard

## Support

Nếu gặp vấn đề, vui lòng:
1. Check logs trong console
2. Verify configuration
3. Test với simple examples
4. Check system resources
5. Report issue với detailed information

---

**AI Trung Tâm Local** - AI mạnh mẽ, không cần API key, mở rộng miễn phí! 🚀
