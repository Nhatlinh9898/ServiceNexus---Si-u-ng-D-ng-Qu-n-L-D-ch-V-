// Monitoring and Logging Utility
// Application performance monitoring, error tracking, and metrics collection

const fs = require('fs').promises;
const path = require('path');

class MonitoringSystem {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        requestsPerMinute: 0
      },
      database: {
        connections: 0,
        queries: 0,
        slowQueries: 0,
        averageQueryTime: 0,
        errors: 0
      },
      system: {
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        uptime: 0,
        activeConnections: 0
      },
      business: {
        activeUsers: 0,
        totalServices: 0,
        completedServices: 0,
        totalRevenue: 0,
        organizations: 0
      }
    };
    
    this.alerts = [];
    this.logs = [];
    this.startTime = Date.now();
    this.requestTimes = [];
    this.queryTimes = [];
    
    // Initialize monitoring
    this.initializeMonitoring();
  }

  initializeMonitoring() {
    // Set up periodic metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
      this.calculateDerivedMetrics();
      this.checkAlerts();
    }, 60000); // Every minute

    // Set up log rotation
    this.setupLogRotation();
    
    // Set up process monitoring
    this.setupProcessMonitoring();
    
    console.log('📊 Monitoring system initialized');
  }

  // Request monitoring
  trackRequest(req, res, responseTime) {
    this.metrics.requests.total++;
    
    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }
    
    // Track response time
    this.requestTimes.push(responseTime);
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift();
    }
    
    this.metrics.requests.averageResponseTime = 
      this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length;
    
    // Track slow requests (> 2 seconds)
    if (responseTime > 2000) {
      this.metrics.requests.slowRequests++;
      this.log('warn', 'Slow request detected', {
        url: req.url,
        method: req.method,
        responseTime,
        statusCode: res.statusCode
      });
    }
    
    // Log request details
    this.log('info', 'Request completed', {
      url: req.url,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  }

  // Database monitoring
  trackDatabaseQuery(query, duration, error = null) {
    this.metrics.database.queries++;
    
    this.queryTimes.push(duration);
    if (this.queryTimes.length > 1000) {
      this.queryTimes.shift();
    }
    
    this.metrics.database.averageQueryTime = 
      this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length;
    
    if (duration > 1000) {
      this.metrics.database.slowQueries++;
      this.log('warn', 'Slow database query detected', {
        query: query.substring(0, 200),
        duration,
        error: error?.message
      });
    }
    
    if (error) {
      this.metrics.database.errors++;
      this.log('error', 'Database query failed', {
        query: query.substring(0, 200),
        error: error.message
      });
    }
  }

  // System metrics collection
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.metrics.system.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    this.metrics.system.cpuUsage = cpuUsage.user / 1000000; // Percentage
    this.metrics.system.uptime = process.uptime();
    
    // Get disk usage (simplified)
    this.getDiskUsage().then(usage => {
      this.metrics.system.diskUsage = usage;
    }).catch(error => {
      console.error('Failed to get disk usage:', error);
    });
  }

  async getDiskUsage() {
    try {
      const stats = await fs.stat(process.cwd());
      return stats.size / 1024 / 1024; // MB
    } catch (error) {
      return 0;
    }
  }

  // Calculate derived metrics
  calculateDerivedMetrics() {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    
    // Requests per minute
    const recentRequests = this.logs.filter(log => 
      log.timestamp > now - timeWindow && log.type === 'info' && log.message.includes('Request completed')
    );
    this.metrics.requests.requestsPerMinute = recentRequests.length;
    
    // Error rate
    this.metrics.requests.errorRate = 
      (this.metrics.requests.error / this.metrics.requests.total) * 100;
    
    // Database error rate
    this.metrics.database.errorRate = 
      (this.metrics.database.errors / this.metrics.database.queries) * 100;
  }

  // Alert checking
  checkAlerts() {
    const alerts = [];
    
    // High error rate alert
    if (this.metrics.requests.errorRate > 10) {
      alerts.push({
        type: 'error_rate',
        severity: 'high',
        message: `High error rate: ${this.metrics.requests.errorRate.toFixed(2)}%`,
        value: this.metrics.requests.errorRate,
        threshold: 10
      });
    }
    
    // High response time alert
    if (this.metrics.requests.averageResponseTime > 2000) {
      alerts.push({
        type: 'response_time',
        severity: 'medium',
        message: `High average response time: ${this.metrics.requests.averageResponseTime.toFixed(0)}ms`,
        value: this.metrics.requests.averageResponseTime,
        threshold: 2000
      });
    }
    
    // High memory usage alert
    if (this.metrics.system.memoryUsage > 512) {
      alerts.push({
        type: 'memory_usage',
        severity: 'high',
        message: `High memory usage: ${this.metrics.system.memoryUsage.toFixed(2)}MB`,
        value: this.metrics.system.memoryUsage,
        threshold: 512
      });
    }
    
    // Database errors alert
    if (this.metrics.database.errorRate > 5) {
      alerts.push({
        type: 'database_errors',
        severity: 'high',
        message: `High database error rate: ${this.metrics.database.errorRate.toFixed(2)}%`,
        value: this.metrics.database.errorRate,
        threshold: 5
      });
    }
    
    // Store new alerts
    this.alerts = [...this.alerts, ...alerts];
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    // Send critical alerts
    alerts.forEach(alert => {
      if (alert.severity === 'high') {
        this.sendAlert(alert);
      }
    });
  }

  // Send alert (could integrate with external services)
  sendAlert(alert) {
    console.error('🚨 ALERT:', alert.message);
    
    // Here you could integrate with:
    // - Slack notifications
    // - Email alerts
    // - PagerDuty
    // - Discord webhooks
    // - Custom alerting services
    
    // Example: Send to Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      this.sendSlackAlert(alert);
    }
  }

  async sendSlackAlert(alert) {
    try {
      const fetch = require('node-fetch');
      
      const payload = {
        text: `🚨 ServiceNexus Alert: ${alert.message}`,
        attachments: [{
          color: alert.severity === 'high' ? 'danger' : 'warning',
          fields: [
            {
              title: 'Type',
              value: alert.type,
              short: true
            },
            {
              title: 'Severity',
              value: alert.severity,
              short: true
            },
            {
              title: 'Value',
              value: alert.value?.toString() || 'N/A',
              short: true
            },
            {
              title: 'Threshold',
              value: alert.threshold?.toString() || 'N/A',
              short: true
            },
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true
            }
          ]
        }]
      };
      
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  // Logging system
  log(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      pid: process.pid,
      hostname: require('os').hostname()
    };
    
    this.logs.push(logEntry);
    
    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs.shift();
    }
    
    // Write to file
    this.writeLogToFile(logEntry);
    
    // Console output
    const logMethod = console[level] || console.log;
    logMethod(`[${level.toUpperCase()}] ${message}`, meta);
  }

  async writeLogToFile(logEntry) {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
      
      await fs.mkdir(logDir, { recursive: true });
      
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  // Log rotation
  setupLogRotation() {
    // Clean up old log files daily
    setInterval(async () => {
      try {
        const logDir = path.join(process.cwd(), 'logs');
        const files = await fs.readdir(logDir);
        
        // Keep only last 30 days of logs
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        for (const file of files) {
          if (file.startsWith('app-') && file.endsWith('.log')) {
            const filePath = path.join(logDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < thirtyDaysAgo) {
              await fs.unlink(filePath);
              console.log(`Deleted old log file: ${file}`);
            }
          }
        }
      } catch (error) {
        console.error('Failed to rotate logs:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }

  // Process monitoring
  setupProcessMonitoring() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.log('error', 'Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      
      // Send critical alert
      this.sendAlert({
        type: 'uncaught_exception',
        severity: 'critical',
        message: `Uncaught exception: ${error.message}`,
        error: error.message,
        stack: error.stack
      });
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.log('error', 'Unhandled promise rejection', {
        reason: reason.toString(),
        promise: promise.toString()
      });
      
      // Send critical alert
      this.sendAlert({
        type: 'unhandled_rejection',
        severity: 'critical',
        message: `Unhandled promise rejection: ${reason}`,
        reason: reason.toString()
      });
    });
    
    // Handle process termination
    process.on('SIGTERM', () => {
      this.log('info', 'Process received SIGTERM');
      this.cleanup();
    });
    
    process.on('SIGINT', () => {
      this.log('info', 'Process received SIGINT');
      this.cleanup();
    });
  }

  // Cleanup on shutdown
  cleanup() {
    this.log('info', 'Monitoring system shutting down');
    
    // Generate final metrics report
    this.generateMetricsReport();
    
    // Close any open resources
    // Add cleanup logic here
  }

  // Generate metrics report
  generateMetricsReport() {
    const report = {
      timestamp: new Date().toISOString(),
      uptime: this.metrics.system.uptime,
      metrics: this.metrics,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      summary: {
        totalRequests: this.metrics.requests.total,
        errorRate: this.metrics.requests.errorRate,
        averageResponseTime: this.metrics.requests.averageResponseTime,
        memoryUsage: this.metrics.system.memoryUsage,
        databaseQueries: this.metrics.database.queries,
        databaseErrorRate: this.metrics.database.errorRate
      }
    };
    
    // Write report to file
    const reportFile = path.join(process.cwd(), 'logs', `metrics-report-${Date.now()}.json`);
    fs.writeFile(reportFile, JSON.stringify(report, null, 2))
      .then(() => {
        console.log(`📊 Metrics report generated: ${reportFile}`);
      })
      .catch(error => {
        console.error('Failed to generate metrics report:', error);
      });
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      alerts: this.alerts,
      recentLogs: this.logs.slice(-10)
    };
  }

  // Get health status
  getHealthStatus() {
    const issues = [];
    
    // Check error rate
    if (this.metrics.requests.errorRate > 10) {
      issues.push('High error rate');
    }
    
    // Check response time
    if (this.metrics.requests.averageResponseTime > 5000) {
      issues.push('Slow response time');
    }
    
    // Check memory usage
    if (this.metrics.system.memoryUsage > 1024) {
      issues.push('High memory usage');
    }
    
    // Check database errors
    if (this.metrics.database.errorRate > 10) {
      issues.push('Database errors');
    }
    
    const status = issues.length === 0 ? 'healthy' : 'unhealthy';
    
    return {
      status,
      issues,
      uptime: this.metrics.system.uptime,
      timestamp: new Date().toISOString()
    };
  }

  // Performance profiling
  startProfile(name) {
    const startTime = process.hrtime.bigint();
    
    return {
      end: () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        this.log('info', `Profile completed: ${name}`, {
          duration: `${duration.toFixed(2)}ms`
        });
        
        return duration;
      }
    };
  }

  // Custom metrics
  trackCustomMetric(name, value, unit = '') {
    if (!this.metrics.custom) {
      this.metrics.custom = {};
    }
    
    this.metrics.custom[name] = {
      value,
      unit,
      timestamp: new Date().toISOString()
    };
    
    this.log('info', `Custom metric tracked: ${name}`, {
      value,
      unit
    });
  }

  // Business metrics
  updateBusinessMetrics(metrics) {
    Object.assign(this.metrics.business, metrics);
    
    this.log('info', 'Business metrics updated', metrics);
  }

  // Export metrics in Prometheus format
  getPrometheusMetrics() {
    const metrics = [];
    
    // Request metrics
    metrics.push(
      '# HELP servicenexus_requests_total Total number of requests',
      '# TYPE servicenexus_requests_total counter',
      `servicenexus_requests_total ${this.metrics.requests.total}`,
      '',
      '# HELP servicenexus_requests_success Number of successful requests',
      '# TYPE servicenexus_requests_success counter',
      `servicenexus_requests_success ${this.metrics.requests.success}`,
      '',
      '# HELP servicenexus_requests_error Number of failed requests',
      '# TYPE servicenexus_requests_error counter',
      `servicenexus_requests_error ${this.metrics.requests.error}`,
      '',
      '# HELP servicenexus_response_time_average Average response time in milliseconds',
      '# TYPE servicenexus_response_time_average gauge',
      `servicenexus_response_time_average ${this.metrics.requests.averageResponseTime}`,
      '',
      '# HELP servicenexus_memory_usage Memory usage in MB',
      '# TYPE servicenexus_memory_usage gauge',
      `servicenexus_memory_usage ${this.metrics.system.memoryUsage}`,
      '',
      '# HELP servicenexus_database_queries_total Total database queries',
      '# TYPE servicenexus_database_queries_total counter',
      `servicenexus_database_queries_total ${this.metrics.database.queries}`,
      '',
      '# HELP servicenexus_database_errors_total Total database errors',
      '# TYPE servicenexus_database_errors_total counter',
      `servicenexus_database_errors_total ${this.metrics.database.errors}`
    );
    
    // Business metrics
    metrics.push(
      '# HELP servicenexus_active_users Number of active users',
      '# TYPE servicenexus_active_users gauge',
      `servicenexus_active_users ${this.metrics.business.activeUsers}`,
      '',
      '# HELP servicenexus_total_services Total number of services',
      '# TYPE servicenexus_total_services gauge',
      `servicenexus_total_services ${this.metrics.business.totalServices}`,
      '',
      '# HELP servicenexus_completed_services Number of completed services',
      '# TYPE servicenexus_completed_services gauge',
      `servicenexus_completed_services ${this.metrics.business.completedServices}`,
      '',
      '# HELP servicenexus_total_revenue Total revenue',
      '# TYPE servicenexus_total_revenue gauge',
      `servicexus_total_revenue ${this.metrics.business.totalRevenue}`
    );
    
    return metrics.join('\n') + '\n';
  }
}

// Create singleton instance
const monitoring = new MonitoringSystem();

module.exports = monitoring;
