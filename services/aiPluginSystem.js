// AI Plugin System - Hệ thống plugin mở rộng cho AI
// Cho phép thêm các model AI mới một cách dễ dàng

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class AIPluginSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      pluginsPath: config.pluginsPath || './plugins/ai',
      autoLoad: config.autoLoad !== false,
      enableHotReload: config.enableHotReload || false,
      ...config
    };
    
    this.plugins = new Map();
    this.pluginRegistry = new Map();
    this.loadedPlugins = new Set();
    this.pluginHooks = new Map();
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🔌 Khởi tạo AI Plugin System...');
      
      // Tạo thư mục plugins
      await this.ensurePluginsDirectory();
      
      // Đăng ký hooks mặc định
      this.registerDefaultHooks();
      
      // Tự động tải plugins
      if (this.config.autoLoad) {
        await this.loadAllPlugins();
      }
      
      // Bật hot reload nếu cần
      if (this.config.enableHotReload) {
        this.enableHotReload();
      }
      
      console.log('✅ AI Plugin System đã sẵn sàng!');
      
    } catch (error) {
      console.error('❌ Lỗi khởi tạo AI Plugin System:', error);
      throw error;
    }
  }

  async ensurePluginsDirectory() {
    try {
      await fs.access(this.config.pluginsPath);
    } catch {
      await fs.mkdir(this.config.pluginsPath, { recursive: true });
      console.log(`📁 Tạo thư mục plugins: ${this.config.pluginsPath}`);
    }
  }

  registerDefaultHooks() {
    // Pre-processing hook
    this.pluginHooks.set('pre_process', []);
    
    // Post-processing hook
    this.pluginHooks.set('post_process', []);
    
    // Model loading hook
    this.pluginHooks.set('model_load', []);
    
    // Error handling hook
    this.pluginHooks.set('error_handling', []);
    
    // Cache management hook
    this.pluginHooks.set('cache_management', []);
  }

  // Đăng ký plugin
  async registerPlugin(pluginName, pluginConfig = {}) {
    try {
      const pluginPath = path.join(this.config.pluginsPath, pluginName);
      
      // Kiểm tra plugin tồn tại
      try {
        await fs.access(pluginPath);
      } catch {
        throw new Error(`Plugin ${pluginName} không tồn tại`);
      }

      // Load plugin
      const plugin = await this.loadPlugin(pluginPath, pluginConfig);
      
      // Validate plugin
      this.validatePlugin(plugin);
      
      // Register plugin
      this.plugins.set(pluginName, plugin);
      this.loadedPlugins.add(pluginName);
      
      // Setup plugin hooks
      if (plugin.hooks) {
        this.setupPluginHooks(pluginName, plugin.hooks);
      }
      
      console.log(`🔌 Đã đăng ký plugin: ${pluginName} v${plugin.version || '1.0.0'}`);
      this.emit('plugin_registered', { name: pluginName, plugin });
      
      return plugin;
      
    } catch (error) {
      console.error(`❌ Lỗi đăng ký plugin ${pluginName}:`, error);
      throw error;
    }
  }

  async loadPlugin(pluginPath, config) {
    try {
      // Load plugin main file
      const mainFile = path.join(pluginPath, 'index.js');
      const pluginModule = require(mainFile);
      
      // Create plugin instance
      const PluginClass = pluginModule.default || pluginModule;
      const plugin = new PluginClass(config);
      
      // Initialize plugin
      if (plugin.initialize) {
        await plugin.initialize();
      }
      
      return plugin;
      
    } catch (error) {
      throw new Error(`Lỗi load plugin: ${error.message}`);
    }
  }

  validatePlugin(plugin) {
    const requiredMethods = ['process', 'getName'];
    
    for (const method of requiredMethods) {
      if (typeof plugin[method] !== 'function') {
        throw new Error(`Plugin thiếu method: ${method}`);
      }
    }
    
    if (!plugin.getName()) {
      throw new Error('Plugin phải có tên');
    }
  }

  setupPluginHooks(pluginName, hooks) {
    for (const [hookName, hookFunction] of Object.entries(hooks)) {
      if (!this.pluginHooks.has(hookName)) {
        this.pluginHooks.set(hookName, []);
      }
      
      this.pluginHooks.get(hookName).push({
        plugin: pluginName,
        handler: hookFunction
      });
    }
  }

  async loadAllPlugins() {
    try {
      const pluginDirs = await fs.readdir(this.config.pluginsPath);
      
      for (const dir of pluginDirs) {
        const pluginPath = path.join(this.config.pluginsPath, dir);
        const stat = await fs.stat(pluginPath);
        
        if (stat.isDirectory()) {
          try {
            await this.registerPlugin(dir);
          } catch (error) {
            console.warn(`⚠️ Bỏ qua plugin ${dir}: ${error.message}`);
          }
        }
      }
      
      console.log(`🔌 Đã tải ${this.plugins.size} plugins`);
      
    } catch (error) {
      console.error('❌ Lỗi tải plugins:', error);
    }
  }

  // Xử lý với plugins
  async processWithPlugins(input, options = {}) {
    try {
      // Pre-processing hooks
      input = await this.executeHooks('pre_process', input, options);
      
      // Xử lý với plugin chính
      const pluginName = options.plugin || this.getDefaultPlugin();
      const plugin = this.plugins.get(pluginName);
      
      if (!plugin) {
        throw new Error(`Plugin ${pluginName} không tồn tại`);
      }
      
      let result = await plugin.process(input, options);
      
      // Post-processing hooks
      result = await this.executeHooks('post_process', result, options);
      
      return result;
      
    } catch (error) {
      // Error handling hooks
      const errorResult = await this.executeHooks('error_handling', error, { input, options });
      
      if (errorResult) {
        return errorResult;
      }
      
      throw error;
    }
  }

  async executeHooks(hookName, data, context = {}) {
    const hooks = this.pluginHooks.get(hookName) || [];
    let result = data;
    
    for (const hook of hooks) {
      try {
        result = await hook.handler(result, context);
      } catch (error) {
        console.warn(`⚠️ Hook ${hookName} từ plugin ${hook.plugin} lỗi:`, error.message);
      }
    }
    
    return result;
  }

  getDefaultPlugin() {
    // Trả về plugin đầu tiên có sẵn
    const firstPlugin = this.plugins.keys().next().value;
    return firstPlugin || 'local-gpt';
  }

  // Quản lý plugins
  getAvailablePlugins() {
    return Array.from(this.plugins.entries()).map(([name, plugin]) => ({
      name,
      displayName: plugin.getName(),
      version: plugin.version || '1.0.0',
      description: plugin.description || 'Không có mô tả',
      capabilities: plugin.capabilities || [],
      config: plugin.config || {}
    }));
  }

  getPluginStatus(pluginName) {
    const plugin = this.plugins.get(pluginName);
    
    if (!plugin) {
      return null;
    }
    
    return {
      name: pluginName,
      loaded: this.loadedPlugins.has(pluginName),
      status: plugin.getStatus ? plugin.getStatus() : 'active',
      metrics: plugin.getMetrics ? plugin.getMetrics() : {}
    };
  }

  async unloadPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    
    if (plugin && plugin.cleanup) {
      await plugin.cleanup();
    }
    
    this.plugins.delete(pluginName);
    this.loadedPlugins.delete(pluginName);
    
    // Remove hooks
    for (const [hookName, hooks] of this.pluginHooks) {
      this.pluginHooks.set(hookName, hooks.filter(h => h.plugin !== pluginName));
    }
    
    console.log(`🔌 Đã gỡ bỏ plugin: ${pluginName}`);
    this.emit('plugin_unloaded', pluginName);
  }

  async reloadPlugin(pluginName) {
    await this.unloadPlugin(pluginName);
    await this.registerPlugin(pluginName);
    console.log(`🔄 Đã tải lại plugin: ${pluginName}`);
  }

  // Hot reload
  enableHotReload() {
    const chokidar = require('chokidar');
    
    const watcher = chokidar.watch(this.config.pluginsPath, {
      ignored: /node_modules/,
      persistent: true
    });
    
    watcher.on('change', async (filePath) => {
      const pluginName = path.basename(path.dirname(filePath));
      
      if (this.plugins.has(pluginName)) {
        console.log(`🔄 Phát hiện thay đổi plugin ${pluginName}, tải lại...`);
        try {
          await this.reloadPlugin(pluginName);
        } catch (error) {
          console.error(`❌ Lỗi tải lại plugin ${pluginName}:`, error);
        }
      }
    });
    
    console.log('🔥 Hot reload đã bật');
  }

  // Tạo plugin mẫu
  async createPluginTemplate(pluginName, config = {}) {
    const pluginPath = path.join(this.config.pluginsPath, pluginName);
    
    try {
      await fs.mkdir(pluginPath, { recursive: true });
      
      // Tạo file index.js
      const indexContent = this.generatePluginTemplate(pluginName, config);
      await fs.writeFile(path.join(pluginPath, 'index.js'), indexContent);
      
      // Tạo package.json
      const packageContent = this.generatePackageTemplate(pluginName);
      await fs.writeFile(path.join(pluginPath, 'package.json'), packageContent);
      
      // Tạo README.md
      const readmeContent = this.generateReadmeTemplate(pluginName);
      await fs.writeFile(path.join(pluginPath, 'README.md'), readmeContent);
      
      console.log(`📝 Đã tạo plugin template: ${pluginName}`);
      
    } catch (error) {
      console.error(`❌ Lỗi tạo plugin template ${pluginName}:`, error);
      throw error;
    }
  }

  generatePluginTemplate(pluginName, config) {
    return `// ${pluginName} Plugin
// Generated by AI Plugin System

class ${pluginName.charAt(0).toUpperCase() + pluginName.slice(1)}Plugin {
  constructor(config = {}) {
    this.config = {
      // Plugin configuration
      ...config
    };
    
    this.version = '1.0.0';
    this.capabilities = ['text-processing'];
  }

  async initialize() {
    console.log('🚀 Khởi tạo ${pluginName} plugin...');
    // Plugin initialization logic
  }

  getName() {
    return '${pluginName}';
  }

  getDescription() {
    return '${config.description || 'Plugin AI tùy chỉnh'}';
  }

  async process(input, options = {}) {
    // Main processing logic
    console.log('🔄 Processing with ${pluginName} plugin...');
    
    // Example processing
    const result = {
      model: '${pluginName}',
      response: \`Processed by ${pluginName}: \${JSON.stringify(input)}\`,
      confidence: 0.8,
      timestamp: new Date().toISOString()
    };
    
    return result;
  }

  async getStatus() {
    return {
      status: 'active',
      uptime: Date.now(),
      config: this.config
    };
  }

  async getMetrics() {
    return {
      processed: 0,
      errors: 0,
      averageTime: 0
    };
  }

  async cleanup() {
    console.log('🧹 Dọn dẹp ${pluginName} plugin...');
  }

  // Plugin hooks
  hooks = {
    pre_process: async (input, context) => {
      // Pre-processing logic
      return input;
    },
    
    post_process: async (result, context) => {
      // Post-processing logic
      return result;
    },
    
    error_handling: async (error, context) => {
      // Error handling logic
      console.error('${pluginName} plugin error:', error);
      return null;
    }
  };
}

module.exports = ${pluginName.charAt(0).toUpperCase() + pluginName.slice(1)}Plugin;
`;
  }

  generatePackageTemplate(pluginName) {
    return JSON.stringify({
      name: pluginName,
      version: '1.0.0',
      description: `AI Plugin: ${pluginName}`,
      main: 'index.js',
      keywords: ['ai', 'plugin', 'automation'],
      author: 'AI Plugin System',
      license: 'MIT'
    }, null, 2);
  }

  generateReadmeTemplate(pluginName) {
    return `# ${pluginName} Plugin

## Mô tả
Plugin AI tùy chỉnh cho hệ thống AI Service.

## Cài đặt
Plugin được tự động tải bởi AI Plugin System.

## Sử dụng
\`\`\`javascript
const result = await aiService.process(input, {
  plugin: '${pluginName}'
});
\`\`\`

## Cấu hình
\`\`\`javascript
const config = {
  // Plugin options
};
\`\`\`

## Hooks
- \`pre_process\`: Xử lý trước
- \`post_process\`: Xử lý sau
- \`error_handling\`: Xử lý lỗi

## Phiên bản
- 1.0.0: Phiên bản đầu tiên
`;
  }

  // Cleanup
  async cleanup() {
    for (const [name, plugin] of this.plugins) {
      if (plugin.cleanup) {
        await plugin.cleanup();
      }
    }
    
    this.plugins.clear();
    this.loadedPlugins.clear();
    this.pluginHooks.clear();
    
    console.log('🧹 AI Plugin System đã dọn dẹp');
  }
}

module.exports = AIPluginSystem;
