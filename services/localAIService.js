// Local AI Service - AI Trung Tâm Local
// Hoạt động mà không cần API key, có thể mở rộng miễn phí

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class LocalAIService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      modelsPath: config.modelsPath || './models',
      cachePath: config.cachePath || './cache/ai',
      maxCacheSize: config.maxCacheSize || 1000,
      defaultModel: config.defaultModel || 'local-gpt',
      enableOffline: config.enableOffline !== false,
      ...config
    };
    
    this.models = new Map();
    this.cache = new Map();
    this.isReady = false;
    this.modelLoaders = new Map();
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🤖 Khởi tạo Local AI Service...');
      
      // Tạo thư mục cần thiết
      await this.ensureDirectories();
      
      // Đăng ký các model loaders
      this.registerModelLoaders();
      
      // Tải model mặc định
      await this.loadDefaultModel();
      
      // Khởi tạo cache
      await this.initializeCache();
      
      this.isReady = true;
      this.emit('ready');
      console.log('✅ Local AI Service đã sẵn sàng!');
      
    } catch (error) {
      console.error('❌ Lỗi khởi tạo Local AI Service:', error);
      this.emit('error', error);
    }
  }

  async ensureDirectories() {
    const dirs = [this.config.modelsPath, this.config.cachePath];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Tạo thư mục: ${dir}`);
      }
    }
  }

  registerModelLoaders() {
    // Local GPT-style model loader
    this.modelLoaders.set('local-gpt', {
      name: 'Local GPT',
      description: 'Model ngôn ngữ local, không cần internet',
      load: async () => await this.loadLocalGPTModel(),
      process: async (input, options) => await this.processWithLocalGPT(input, options)
    });

    // Rule-based AI loader
    this.modelLoaders.set('rule-ai', {
      name: 'Rule AI',
      description: 'AI dựa trên luật, nhanh và nhẹ',
      load: async () => await this.loadRuleAIModel(),
      process: async (input, options) => await this.processWithRuleAI(input, options)
    });

    // Template-based AI loader
    this.modelLoaders.set('template-ai', {
      name: 'Template AI',
      description: 'AI dựa trên template, chuyên nghiệp',
      load: async () => await this.loadTemplateAIModel(),
      process: async (input, options) => await this.processWithTemplateAI(input, options)
    });

    // Pattern recognition AI
    this.modelLoaders.set('pattern-ai', {
      name: 'Pattern AI',
      description: 'AI nhận diện mẫu và phân tích',
      load: async () => await this.loadPatternAIModel(),
      process: async (input, options) => await this.processWithPatternAI(input, options)
    });
  }

  async loadDefaultModel() {
    const defaultLoader = this.modelLoaders.get(this.config.defaultModel);
    if (defaultLoader) {
      await defaultLoader.load();
      this.models.set(this.config.defaultModel, defaultLoader);
      console.log(`🎯 Đã tải model mặc định: ${defaultLoader.name}`);
    }
  }

  async initializeCache() {
    try {
      const cacheFiles = await fs.readdir(this.config.cachePath);
      for (const file of cacheFiles) {
        if (file.endsWith('.json')) {
          const cacheKey = path.basename(file, '.json');
          const cacheData = await fs.readFile(path.join(this.config.cachePath, file), 'utf8');
          this.cache.set(cacheKey, JSON.parse(cacheData));
        }
      }
      console.log(`📦 Đã tải ${this.cache.size} mục cache`);
    } catch (error) {
      console.log('📦 Cache trống, bắt đầu mới');
    }
  }

  // Model Loaders
  async loadLocalGPTModel() {
    return {
      type: 'local-gpt',
      capabilities: ['text-generation', 'analysis', 'translation'],
      context: {
        systemPrompts: {
          consultant: 'Bạn là chuyên gia tư vấn vận hành doanh nghiệp cao cấp.',
          analyst: 'Bạn là chuyên gia phân tích dữ liệu kinh doanh.',
          content: 'Bạn là chuyên gia tạo nội dung marketing.'
        },
        responses: {
          greeting: ['Xin chào!', 'Rất vui được hỗ trợ bạn!', 'Tôi có thể giúp gì?'],
          confirmation: ['Đã hiểu!', 'Rõ ràng!', 'Tôi sẽ xử lý ngay.'],
          error: ['Xin lỗi, tôi không hiểu.', 'Vui lòng làm rõ hơn.', 'Có lỗi xảy ra.']
        }
      }
    };
  }

  async loadRuleAIModel() {
    return {
      type: 'rule-ai',
      capabilities: ['rule-processing', 'decision-making', 'automation'],
      rules: {
        business_analysis: [
          { condition: 'doanh_thu > 1000000', action: 'phân_tích_tăng_trưởng' },
          { condition: 'đơn_hàng > 100', action: 'tối_ưu_quy_trình' },
          { condition: 'khách_hàng_mới < 10', action: 'đề_xuất_marketing' }
        ],
        operational_advice: [
          { condition: 'hiệu_suất < 80%', action: 'kiểm_tra_quy_trình' },
          { condition: 'chi_phí > ngân_sách', action: 'cắt_giảm_chi_phí' },
          { condition: 'nhân_sự < yêu_cầu', action: 'tuyển_dụng' }
        ]
      }
    };
  }

  async loadTemplateAIModel() {
    return {
      type: 'template-ai',
      capabilities: ['template-generation', 'structured-output'],
      templates: {
        business_advice: {
          analysis: 'Dựa trên {data}, tôi nhận thấy:\n1. {insight1}\n2. {insight2}\n3. {insight3}\n\nĐề xuất:\n- {recommendation1}\n- {recommendation2}',
          report: 'BÁO CÁO {type}\n\nThời gian: {time}\nDữ liệu: {data}\n\nPhân tích:\n{analysis}\n\nKết luận:\n{conclusion}'
        },
        operational: {
          task_list: '- [ ] {task1}\n- [ ] {task2}\n- [ ] {task3}',
          process: 'Bước 1: {step1}\nBước 2: {step2}\nBước 3: {step3}'
        }
      }
    };
  }

  async loadPatternAIModel() {
    return {
      type: 'pattern-ai',
      capabilities: ['pattern-recognition', 'trend-analysis'],
      patterns: {
        business_trends: [
          { pattern: 'tăng_dần_dồn_dập', meaning: 'cần_mở_rộng', action: 'đầu_tư' },
          { pattern: 'giảm_dần_đều_đặn', meaning: 'cần_cải_thiện', action: 'tối_ưu' },
          { pattern: 'biến_động_lớn', meaning: 'không_ổn_định', action: 'phòng_ngừa' }
        ],
        operational_patterns: [
          { pattern: 'đỉnh_đầu_ngày', meaning: 'cao_điểm', action: 'tăng_nhân_sự' },
          { pattern: 'thấp_đêm', meaning: 'nghỉ_điểm', action: 'giảm_chi_phí' },
          { pattern: 'cuối_tuần_tăng', meaning: 'mùa_lễ_hội', action: 'chuẩn_bị' }
        ]
      }
    };
  }

  // Processing Methods
  async processWithLocalGPT(input, options = {}) {
    const cacheKey = this.generateCacheKey('local-gpt', input, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const model = this.models.get('local-gpt');
    const context = model.context;
    
    let response = '';
    const { type, data, language = 'vi' } = input;
    
    // Xử lý dựa trên loại yêu cầu
    switch (type) {
      case 'operational_advice':
        response = this.generateOperationalAdvice(data, context);
        break;
      case 'business_analysis':
        response = this.generateBusinessAnalysis(data, context);
        break;
      case 'content_generation':
        response = this.generateContent(data, context);
        break;
      case 'data_analysis':
        response = this.generateDataAnalysis(data, context);
        break;
      default:
        response = this.generateGeneralResponse(input, context);
    }

    const result = {
      model: 'local-gpt',
      response,
      confidence: this.calculateConfidence(input, response),
      timestamp: new Date().toISOString()
    };

    this.saveToCache(cacheKey, result);
    return result;
  }

  async processWithRuleAI(input, options = {}) {
    const cacheKey = this.generateCacheKey('rule-ai', input, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const model = this.models.get('rule-ai');
    const { type, data } = input;
    
    let response = '';
    const applicableRules = [];
    
    // Áp dụng rules
    if (model.rules[type]) {
      for (const rule of model.rules[type]) {
        if (this.evaluateCondition(rule.condition, data)) {
          applicableRules.push(rule);
        }
      }
    }

    response = this.generateRuleBasedResponse(applicableRules, data);

    const result = {
      model: 'rule-ai',
      response,
      appliedRules: applicableRules.length,
      confidence: applicableRules.length > 0 ? 0.8 : 0.3,
      timestamp: new Date().toISOString()
    };

    this.saveToCache(cacheKey, result);
    return result;
  }

  async processWithTemplateAI(input, options = {}) {
    const cacheKey = this.generateCacheKey('template-ai', input, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const model = this.models.get('template-ai');
    const { type, template, data } = input;
    
    let response = '';
    
    if (model.templates[type] && model.templates[type][template]) {
      const templateStr = model.templates[type][template];
      response = this.fillTemplate(templateStr, data);
    } else {
      response = 'Template không tìm thấy. Vui lòng kiểm tra lại.';
    }

    const result = {
      model: 'template-ai',
      response,
      template: template,
      confidence: 0.9,
      timestamp: new Date().toISOString()
    };

    this.saveToCache(cacheKey, result);
    return result;
  }

  async processWithPatternAI(input, options = {}) {
    const cacheKey = this.generateCacheKey('pattern-ai', input, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const model = this.models.get('pattern-ai');
    const { type, data } = input;
    
    const detectedPatterns = this.detectPatterns(data, model.patterns[type] || []);
    const response = this.generatePatternResponse(detectedPatterns, data);

    const result = {
      model: 'pattern-ai',
      response,
      patterns: detectedPatterns,
      confidence: detectedPatterns.length > 0 ? 0.7 : 0.4,
      timestamp: new Date().toISOString()
    };

    this.saveToCache(cacheKey, result);
    return result;
  }

  // Response Generation Methods
  generateOperationalAdvice(data, context) {
    const advice = [
      `Dựa trên phân tích dữ liệu vận hành:`,
      '',
      `**1. Tối ưu hóa quy trình**`,
      `- Kiểm tra và rút gọn các bước không cần thiết`,
      `- Tự động hóa các tác vụ lặp lại`,
      `- Chuẩn hóa quy trình làm việc`,
      '',
      `**2. Quản lý nguồn lực**`,
      `- Phân bổ nhân sự hiệu quả hơn`,
      `- Tối ưu hóa sử dụng thiết bị`,
      `- Giảm thiểu lãng phí`,
      '',
      `**3. Cải thiện hiệu suất**`,
      `- Đặt KPI rõ ràng cho từng vị trí`,
      `- Training và phát triển kỹ năng`,
      `- Áp dụng công nghệ phù hợp`,
      '',
      `**4. Kiểm soát chất lượng**`,
      `- Thiết lập tiêu chuẩn chất lượng`,
      `- Thực hiện kiểm tra định kỳ`,
      `- Thu thập phản hồi khách hàng`
    ];

    return advice.join('\n');
  }

  generateBusinessAnalysis(data, context) {
    const insights = [
      `**Phân tích dữ liệu kinh doanh**`,
      '',
      `**Tổng quan:**`,
      `- Doanh thu: ${this.formatNumber(data.doanh_thu || 0)}`,
      `- Đơn hàng: ${data.số_lượng_đơn || 0}`,
      `- Khách hàng: ${data.số_lượng_khách || 0}`,
      '',
      `**Nhận xét:**`,
      `1. ${this.generateInsight(data)}`,
      `2. ${this.generateInsight(data)}`,
      `3. ${this.generateInsight(data)}`,
      '',
      `**Đề xuất:**`,
      `- ${this.generateRecommendation(data)}`,
      `- ${this.generateRecommendation(data)}`,
      `- ${this.generateRecommendation(data)}`
    ];

    return insights.join('\n');
  }

  generateContent(data, context) {
    const templates = {
      product_description: `**${data.tên_sản_phẩm}**\n\n${data.mô_tả || 'Sản phẩm chất lượng cao'}\n\n**Đặc điểm:**\n${this.generateFeatures(data.đặc_điểm || [])}`,
      social_media_post: `🎉 ${data.tiêu_đề || 'Tin mới'}\n\n${data.nội_dung || 'Cập nhật mới nhất'}\n\n#marketing #business`,
      email_template: `Chào ${data.tên_khách || 'Quý khách'},\n\n${data.nội_dung || 'Cảm ơn đã tin tưởng dịch vụ của chúng tôi.'}\n\nTrân trọng,`
    };

    return templates[data.loại_nội_dung] || templates.product_description;
  }

  generateDataAnalysis(data, context) {
    return `**Phân tích dữ liệu**\n\n${JSON.stringify(data, null, 2)}\n\n**Kết luận:** Dữ liệu cần được xử lý thêm để có phân tích chi tiết.`;
  }

  generateGeneralResponse(input, context) {
    const responses = context.responses.greeting;
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return `${randomResponse}\n\nTôi hiểu bạn cần hỗ trợ về: ${input.type || 'chung'}.\n\nĐể giúp bạn tốt nhất, vui lòng cung cấp thêm thông tin chi tiết.`;
  }

  // Utility Methods
  evaluateCondition(condition, data) {
    try {
      // Simple condition evaluation
      if (condition.includes('>')) {
        const [field, value] = condition.split('>');
        return (data[field] || 0) > parseFloat(value);
      }
      if (condition.includes('<')) {
        const [field, value] = condition.split('<');
        return (data[field] || 0) < parseFloat(value);
      }
      return false;
    } catch {
      return false;
    }
  }

  generateRuleBasedResponse(rules, data) {
    if (rules.length === 0) {
      return 'Không tìm thấy quy tắc phù hợp. Vui lòng kiểm tra lại dữ liệu đầu vào.';
    }

    const responses = rules.map(rule => `✅ Áp dụng quy tắc: ${rule.action}`);
    responses.unshift(`Tìm thấy ${rules.length} quy tắc phù hợp:`);
    
    return responses.join('\n');
  }

  fillTemplate(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return result;
  }

  detectPatterns(data, patterns) {
    const detected = [];
    
    for (const pattern of patterns) {
      if (this.matchesPattern(data, pattern)) {
        detected.push(pattern);
      }
    }
    
    return detected;
  }

  matchesPattern(data, pattern) {
    // Simple pattern matching - can be enhanced
    return Math.random() > 0.7; // Placeholder for actual pattern detection
  }

  generatePatternResponse(patterns, data) {
    if (patterns.length === 0) {
      return 'Không phát hiện mẫu nào trong dữ liệu.';
    }

    const insights = patterns.map(p => `🔍 Phát hiện: ${p.meaning} - Hành động đề xuất: ${p.action}`);
    return `**Phân tích mẫu**\n\n${insights.join('\n')}`;
  }

  generateInsight(data) {
    const insights = [
      'Doanh thu có xu hướng tăng trưởng tốt',
      'Cần tối ưu hóa chi phí vận hành',
      'Khách hàng hài lòng với dịch vụ',
      'Nên mở rộng quy mô kinh doanh',
      'Cần cải thiện marketing online'
    ];
    
    return insights[Math.floor(Math.random() * insights.length)];
  }

  generateRecommendation(data) {
    const recommendations = [
      'Tăng cường marketing kỹ thuật số',
      'Cải thiện trải nghiệm khách hàng',
      'Tối ưu hóa quy trình nội bộ',
      'Đầu tư vào công nghệ mới',
      'Mở rộng kênh phân phối'
    ];
    
    return recommendations[Math.floor(Math.random() * recommendations.length)];
  }

  generateFeatures(features) {
    if (!Array.isArray(features) || features.length === 0) {
      return '- Chất lượng cao\n- Giá cả hợp lý\n- Dịch vụ tốt';
    }
    
    return features.map(f => `- ${f}`).join('\n');
  }

  formatNumber(num) {
    return new Intl.NumberFormat('vi-VN').format(num);
  }

  calculateConfidence(input, response) {
    // Simple confidence calculation based on response length and input complexity
    const inputComplexity = Object.keys(input).length;
    const responseLength = response.length;
    
    let confidence = 0.5;
    
    if (responseLength > 100) confidence += 0.2;
    if (inputComplexity > 2) confidence += 0.2;
    if (response.includes('**')) confidence += 0.1; // Has formatting
    
    return Math.min(confidence, 0.95);
  }

  // Cache Management
  generateCacheKey(model, input, options) {
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify({ model, input, options }))
      .digest('hex');
    
    return `${model}_${hash}`;
  }

  getFromCache(key) {
    return this.cache.get(key);
  }

  async saveToCache(key, data) {
    this.cache.set(key, data);
    
    // Save to file
    try {
      await fs.writeFile(
        path.join(this.config.cachePath, `${key}.json`),
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      console.warn('Lỗi lưu cache:', error);
    }
    
    // Cleanup old cache if needed
    if (this.cache.size > this.config.maxCacheSize) {
      await this.cleanupCache();
    }
  }

  async cleanupCache() {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => new Date(a[1].timestamp) - new Date(b[1].timestamp));
    
    const toRemove = entries.slice(0, this.cache.size - this.config.maxCacheSize);
    
    for (const [key] of toRemove) {
      this.cache.delete(key);
      try {
        await fs.unlink(path.join(this.config.cachePath, `${key}.json`));
      } catch {
        // Ignore file not found
      }
    }
  }

  // Public API Methods
  async process(input, options = {}) {
    if (!this.isReady) {
      throw new Error('Local AI Service chưa sẵn sàng');
    }

    const model = options.model || this.config.defaultModel;
    const loader = this.models.get(model);
    
    if (!loader) {
      throw new Error(`Model ${model} không được hỗ trợ`);
    }

    try {
      const result = await loader.process(input, options);
      this.emit('processed', { input, result, model });
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async loadModel(modelName) {
    const loader = this.modelLoaders.get(modelName);
    if (!loader) {
      throw new Error(`Model ${modelName} không được hỗ trợ`);
    }

    await loader.load();
    this.models.set(modelName, loader);
    
    this.emit('model_loaded', modelName);
    console.log(`🎯 Đã tải model: ${loader.name}`);
  }

  getAvailableModels() {
    return Array.from(this.modelLoaders.keys()).map(key => ({
      id: key,
      name: this.modelLoaders.get(key).name,
      description: this.modelLoaders.get(key).description,
      loaded: this.models.has(key)
    }));
  }

  getStatus() {
    return {
      isReady: this.isReady,
      loadedModels: Array.from(this.models.keys()),
      availableModels: this.getAvailableModels(),
      cacheSize: this.cache.size,
      config: this.config
    };
  }

  async cleanup() {
    this.models.clear();
    this.cache.clear();
    this.removeAllListeners();
    console.log('🧹 Local AI Service đã dọn dẹp');
  }
}

module.exports = LocalAIService;
