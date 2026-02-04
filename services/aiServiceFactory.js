// AI Service Factory - Factory Pattern cho AI Services
// Hỗ trợ chuyển đổi giữa Local AI và External API

const LocalAIService = require('./localAIService');
const logger = require('../utils/logger');

class AIServiceFactory {
  constructor() {
    this.services = new Map();
    this.defaultService = null;
    this.fallbackEnabled = true;
  }

  // Khởi tạo service
  async initialize(config = {}) {
    try {
      logger.info('🏭 Khởi tạo AI Service Factory...');

      // Đăng ký Local AI Service
      await this.registerService('local', new LocalAIService(config.local));

      // Đăng ký Gemini Service (nếu có API key)
      if (process.env.API_KEY) {
        const { getOperationalAdvice } = require('./geminiService');
        await this.registerService('gemini', {
          process: async (input, options) => ({
            model: 'gemini',
            response: await getOperationalAdvice(input.query, input.contextData),
            confidence: 0.9,
            timestamp: new Date().toISOString()
          })
        });
      }

      // Set default service
      this.defaultService = config.defaultService || 'local';
      
      logger.info(`✅ AI Service Factory sẵn sàng. Default: ${this.defaultService}`);
      logger.info(`📋 Services: ${Array.from(this.services.keys()).join(', ')}`);

    } catch (error) {
      logger.error('❌ Lỗi khởi tạo AI Service Factory:', error);
      throw error;
    }
  }

  // Đăng ký service mới
  async registerService(name, service) {
    if (typeof service === 'function') {
      service = new service();
    }

    if (service.initialize) {
      await service.initialize();
    }

    this.services.set(name, service);
    logger.info(`📝 Đã đăng ký service: ${name}`);
  }

  // Xử lý yêu cầu AI
  async process(input, options = {}) {
    const serviceName = options.service || this.defaultService;
    const service = this.services.get(serviceName);

    if (!service) {
      throw new Error(`AI Service ${serviceName} không tồn tại`);
    }

    try {
      // Thử xử lý với service được chọn
      const result = await service.process(input, options);
      
      logger.info(`✅ ${serviceName} xử lý thành công`);
      return result;

    } catch (error) {
      logger.error(`❌ ${serviceName} xử lý thất bại:`, error);

      // Fallback sang local service nếu được bật
      if (this.fallbackEnabled && serviceName !== 'local') {
        logger.info('🔄 Fallback sang Local AI Service...');
        try {
          const fallbackResult = await this.services.get('local').process(input, options);
          fallbackResult.fallback = true;
          fallbackResult.originalError = error.message;
          return fallbackResult;
        } catch (fallbackError) {
          logger.error('❌ Fallback cũng thất bại:', fallbackError);
        }
      }

      throw error;
    }
  }

  // Lấy danh sách services
  getAvailableServices() {
    return Array.from(this.services.keys()).map(name => ({
      name,
      isDefault: name === this.defaultService,
      type: this.services.get(name).constructor.name
    }));
  }

  // Thay đổi service mặc định
  setDefaultService(serviceName) {
    if (this.services.has(serviceName)) {
      this.defaultService = serviceName;
      logger.info(`🎯 Đổi default service thành: ${serviceName}`);
    } else {
      throw new Error(`Service ${serviceName} không tồn tại`);
    }
  }

  // Bật/tắt fallback
  setFallbackEnabled(enabled) {
    this.fallbackEnabled = enabled;
    logger.info(`🔄 Fallback ${enabled ? 'bật' : 'tắt'}`);
  }

  // Lấy status
  getStatus() {
    const services = {};
    
    for (const [name, service] of this.services) {
      services[name] = {
        type: service.constructor.name,
        status: service.getStatus ? service.getStatus() : 'unknown'
      };
    }

    return {
      defaultService: this.defaultService,
      fallbackEnabled: this.fallbackEnabled,
      services,
      totalServices: this.services.size
    };
  }

  // Cleanup
  async cleanup() {
    for (const [name, service] of this.services) {
      if (service.cleanup) {
        await service.cleanup();
      }
    }
    this.services.clear();
    logger.info('🧹 AI Service Factory đã dọn dẹp');
  }
}

// Singleton instance
const aiServiceFactory = new AIServiceFactory();

module.exports = aiServiceFactory;
