// AI Model Manager - Quản lý model AI
// Giao diện quản lý và tải model

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class AIModelManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      modelsPath: config.modelsPath || './models',
      registryPath: config.registryPath || './models/registry.json',
      autoDownload: config.autoDownload || false,
      maxConcurrentDownloads: config.maxConcurrentDownloads || 3,
      ...config
    };
    
    this.models = new Map();
    this.registry = new Map();
    this.downloadQueue = [];
    this.activeDownloads = new Set();
    this.modelStats = new Map();
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('📦 Khởi tạo AI Model Manager...');
      
      // Tạo thư mục models
      await this.ensureModelsDirectory();
      
      // Load registry
      await this.loadRegistry();
      
      // Scan existing models
      await this.scanExistingModels();
      
      // Setup download monitoring
      this.setupDownloadMonitoring();
      
      console.log('✅ AI Model Manager đã sẵn sàng!');
      
    } catch (error) {
      console.error('❌ Lỗi khởi tạo AI Model Manager:', error);
      throw error;
    }
  }

  async ensureModelsDirectory() {
    try {
      await fs.access(this.config.modelsPath);
    } catch {
      await fs.mkdir(this.config.modelsPath, { recursive: true });
      console.log(`📁 Tạo thư mục models: ${this.config.modelsPath}`);
    }
  }

  async loadRegistry() {
    try {
      const registryData = await fs.readFile(this.config.registryPath, 'utf8');
      const registry = JSON.parse(registryData);
      
      for (const model of registry.models) {
        this.registry.set(model.id, model);
      }
      
      console.log(`📋 Đã tải ${this.registry.size} models từ registry`);
      
    } catch (error) {
      console.log('📋 Registry trống, tạo mới...');
      await this.createDefaultRegistry();
    }
  }

  async createDefaultRegistry() {
    const defaultModels = [
      {
        id: 'local-gpt-small',
        name: 'Local GPT Small',
        description: 'Model GPT nhỏ, nhẹ và nhanh',
        type: 'language',
        size: '100MB',
        url: 'https://example.com/models/local-gpt-small.bin',
        checksum: 'sha256:abc123...',
        capabilities: ['text-generation', 'analysis'],
        requirements: { ram: '2GB', storage: '500MB' }
      },
      {
        id: 'local-gpt-medium',
        name: 'Local GPT Medium',
        description: 'Model GPT vừa, cân bằng hiệu suất',
        type: 'language',
        size: '500MB',
        url: 'https://example.com/models/local-gpt-medium.bin',
        checksum: 'sha256:def456...',
        capabilities: ['text-generation', 'analysis', 'translation'],
        requirements: { ram: '4GB', storage: '2GB' }
      },
      {
        id: 'rule-ai-v1',
        name: 'Rule AI v1.0',
        description: 'AI dựa trên luật, không cần download',
        type: 'rule-based',
        size: '0MB',
        url: '',
        capabilities: ['rule-processing', 'decision-making'],
        requirements: { ram: '512MB', storage: '10MB' }
      },
      {
        id: 'pattern-ai-v1',
        name: 'Pattern AI v1.0',
        description: 'AI nhận diện mẫu',
        type: 'pattern-based',
        size: '0MB',
        url: '',
        capabilities: ['pattern-recognition', 'trend-analysis'],
        requirements: { ram: '1GB', storage: '50MB' }
      }
    ];

    for (const model of defaultModels) {
      this.registry.set(model.id, model);
    }

    await this.saveRegistry();
    console.log('📋 Đã tạo registry mặc định');
  }

  async saveRegistry() {
    const registryData = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      models: Array.from(this.registry.values())
    };

    await fs.writeFile(
      this.config.registryPath,
      JSON.stringify(registryData, null, 2)
    );
  }

  async scanExistingModels() {
    try {
      const modelDirs = await fs.readdir(this.config.modelsPath);
      
      for (const dir of modelDirs) {
        const modelPath = path.join(this.config.modelsPath, dir);
        const stat = await fs.stat(modelPath);
        
        if (stat.isDirectory()) {
          await this.loadModelFromDisk(dir);
        }
      }
      
      console.log(`📦 Đã quét ${this.models.size} models có sẵn`);
      
    } catch (error) {
      console.error('❌ Lỗi quét models:', error);
    }
  }

  async loadModelFromDisk(modelId) {
    try {
      const modelPath = path.join(this.config.modelsPath, modelId);
      const metadataPath = path.join(modelPath, 'metadata.json');
      
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      
      this.models.set(modelId, {
        ...metadata,
        path: modelPath,
        loaded: true,
        lastUsed: new Date().toISOString()
      });
      
      // Load stats
      this.loadModelStats(modelId);
      
    } catch (error) {
      console.warn(`⚠️ Không thể load model ${modelId}:`, error.message);
    }
  }

  loadModelStats(modelId) {
    try {
      const statsPath = path.join(this.config.modelsPath, modelId, 'stats.json');
      const stats = JSON.parse(require('fs').readFileSync(statsPath, 'utf8'));
      this.modelStats.set(modelId, stats);
    } catch {
      // Stats không tồn tại, tạo mới
      this.modelStats.set(modelId, {
        usageCount: 0,
        totalUsageTime: 0,
        averageResponseTime: 0,
        errors: 0,
        lastUsed: null
      });
    }
  }

  // Download model
  async downloadModel(modelId, options = {}) {
    const model = this.registry.get(modelId);
    
    if (!model) {
      throw new Error(`Model ${modelId} không tồn tại trong registry`);
    }

    if (this.models.has(modelId)) {
      console.log(`✅ Model ${modelId} đã có sẵn`);
      return this.models.get(modelId);
    }

    if (model.url === '') {
      // Model không cần download (rule-based, template-based)
      return await this.createVirtualModel(modelId, model);
    }

    // Thêm vào download queue
    return new Promise((resolve, reject) => {
      this.downloadQueue.push({
        modelId,
        model,
        options,
        resolve,
        reject
      });
      
      this.processDownloadQueue();
    });
  }

  async processDownloadQueue() {
    if (this.activeDownloads.size >= this.config.maxConcurrentDownloads) {
      return;
    }

    if (this.downloadQueue.length === 0) {
      return;
    }

    const downloadTask = this.downloadQueue.shift();
    this.activeDownloads.add(downloadTask.modelId);

    try {
      const result = await this.performDownload(downloadTask);
      downloadTask.resolve(result);
    } catch (error) {
      downloadTask.reject(error);
    } finally {
      this.activeDownloads.delete(downloadTask.modelId);
      
      // Process next in queue
      setTimeout(() => this.processDownloadQueue(), 100);
    }
  }

  async performDownload(downloadTask) {
    const { modelId, model } = downloadTask;
    
    console.log(`⬇️ Bắt đầu download model: ${model.name}`);
    this.emit('download_started', { modelId, model });

    try {
      // Tạo thư mục cho model
      const modelPath = path.join(this.config.modelsPath, modelId);
      await fs.mkdir(modelPath, { recursive: true });

      // Mock download (trong thực tế sẽ download từ URL)
      console.log(`📥 Đang download ${model.size}...`);
      await this.mockDownload(model);

      // Tạo metadata
      const metadata = {
        ...model,
        downloadedAt: new Date().toISOString(),
        version: model.version || '1.0.0'
      };

      await fs.writeFile(
        path.join(modelPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Tạo stats file
      await fs.writeFile(
        path.join(modelPath, 'stats.json'),
        JSON.stringify({
          usageCount: 0,
          totalUsageTime: 0,
          averageResponseTime: 0,
          errors: 0,
          lastUsed: null
        }, null, 2)
      );

      // Load model
      await this.loadModelFromDisk(modelId);

      console.log(`✅ Download hoàn thành: ${model.name}`);
      this.emit('download_completed', { modelId, model });

      return this.models.get(modelId);

    } catch (error) {
      console.error(`❌ Download thất bại ${modelId}:`, error);
      this.emit('download_failed', { modelId, model, error });
      throw error;
    }
  }

  async mockDownload(model) {
    // Simulate download progress
    const steps = 10;
    const delay = 1000 / steps; // 1 second total

    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      const progress = (i / steps) * 100;
      console.log(`📥 ${model.name}: ${progress.toFixed(1)}%`);
    }
  }

  async createVirtualModel(modelId, model) {
    const modelPath = path.join(this.config.modelsPath, modelId);
    await fs.mkdir(modelPath, { recursive: true });

    const metadata = {
      ...model,
      virtual: true,
      createdAt: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(modelPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    await fs.writeFile(
      path.join(modelPath, 'stats.json'),
      JSON.stringify({
        usageCount: 0,
        totalUsageTime: 0,
        averageResponseTime: 0,
        errors: 0,
        lastUsed: null
      }, null, 2)
    );

    this.models.set(modelId, {
      ...metadata,
      path: modelPath,
      loaded: true
    });

    console.log(`✅ Tạo virtual model: ${model.name}`);
    return this.models.get(modelId);
  }

  // Model management
  getAvailableModels() {
    return Array.from(this.registry.values()).map(model => ({
      ...model,
      downloaded: this.models.has(model.id),
      loaded: this.models.get(model.id)?.loaded || false,
      stats: this.modelStats.get(model.id) || null
    }));
  }

  getDownloadedModels() {
    return Array.from(this.models.entries()).map(([id, model]) => ({
      id,
      ...model,
      stats: this.modelStats.get(id) || null
    }));
  }

  async updateModelStats(modelId, usageData) {
    const stats = this.modelStats.get(modelId) || {
      usageCount: 0,
      totalUsageTime: 0,
      averageResponseTime: 0,
      errors: 0,
      lastUsed: null
    };

    stats.usageCount++;
    stats.totalUsageTime += usageData.responseTime || 0;
    stats.averageResponseTime = stats.totalUsageTime / stats.usageCount;
    stats.lastUsed = new Date().toISOString();

    if (usageData.error) {
      stats.errors++;
    }

    this.modelStats.set(modelId, stats);

    // Save to file
    try {
      const modelPath = path.join(this.config.modelsPath, modelId);
      await fs.writeFile(
        path.join(modelPath, 'stats.json'),
        JSON.stringify(stats, null, 2)
      );
    } catch (error) {
      console.warn(`⚠️ Không thể lưu stats cho model ${modelId}:`, error.message);
    }
  }

  async deleteModel(modelId) {
    const model = this.models.get(modelId);
    
    if (!model) {
      throw new Error(`Model ${modelId} không tồn tại`);
    }

    try {
      // Xóa thư mục model
      await fs.rm(model.path, { recursive: true, force: true });
      
      // Xóa khỏi memory
      this.models.delete(modelId);
      this.modelStats.delete(modelId);
      
      console.log(`🗑️ Đã xóa model: ${modelId}`);
      this.emit('model_deleted', modelId);
      
    } catch (error) {
      console.error(`❌ Lỗi xóa model ${modelId}:`, error);
      throw error;
    }
  }

  setupDownloadMonitoring() {
    // Monitor download progress
    setInterval(() => {
      if (this.activeDownloads.size > 0) {
        console.log(`⬇️ Đang download: ${Array.from(this.activeDownloads).join(', ')}`);
      }
    }, 5000);
  }

  // Registry management
  async addToRegistry(modelInfo) {
    const model = {
      id: modelInfo.id,
      name: modelInfo.name,
      description: modelInfo.description,
      type: modelInfo.type,
      size: modelInfo.size,
      url: modelInfo.url || '',
      checksum: modelInfo.checksum || '',
      capabilities: modelInfo.capabilities || [],
      requirements: modelInfo.requirements || {},
      version: modelInfo.version || '1.0.0',
      addedAt: new Date().toISOString()
    };

    this.registry.set(model.id, model);
    await this.saveRegistry();
    
    console.log(`📝 Đã thêm vào registry: ${model.name}`);
    this.emit('model_added_to_registry', model);
    
    return model;
  }

  async removeFromRegistry(modelId) {
    if (this.registry.has(modelId)) {
      this.registry.delete(modelId);
      await this.saveRegistry();
      
      console.log(`🗑️ Đã xóa khỏi registry: ${modelId}`);
      this.emit('model_removed_from_registry', modelId);
    }
  }

  // System status
  getSystemStatus() {
    return {
      totalModels: this.registry.size,
      downloadedModels: this.models.size,
      activeDownloads: this.activeDownloads.size,
      queueLength: this.downloadQueue.length,
      storageUsage: this.calculateStorageUsage(),
      mostUsed: this.getMostUsedModels()
    };
  }

  calculateStorageUsage() {
    let totalSize = 0;
    
    for (const model of this.models.values()) {
      if (model.size && typeof model.size === 'string') {
        const sizeInMB = parseInt(model.size);
        if (!isNaN(sizeInMB)) {
          totalSize += sizeInMB;
        }
      }
    }
    
    return {
      totalMB: totalSize,
      totalGB: (totalSize / 1024).toFixed(2),
      formatted: this.formatSize(totalSize * 1024 * 1024)
    };
  }

  formatSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getMostUsedModels() {
    const sorted = Array.from(this.modelStats.entries())
      .sort((a, b) => b[1].usageCount - a[1].usageCount)
      .slice(0, 5);
    
    return sorted.map(([id, stats]) => ({
      modelId: id,
      usageCount: stats.usageCount,
      averageResponseTime: stats.averageResponseTime
    }));
  }

  // Cleanup
  async cleanup() {
    // Cancel active downloads
    this.downloadQueue.length = 0;
    this.activeDownloads.clear();
    
    // Clear memory
    this.models.clear();
    this.registry.clear();
    this.modelStats.clear();
    
    console.log('🧹 AI Model Manager đã dọn dẹp');
  }
}

module.exports = AIModelManager;
