# AI Orchestrator Guide

## 🎯 **Tổng Quan**

AI Orchestrator là hệ thống điều phối trung tâm cho các AI agents local, cho phép:
- **Agent Management**: Quản lý và điều phối các AI agents
- **Workflow Execution**: Thực thi workflows tự động
- **Task Queue**: Hàng đợi và quản lý tasks
- **Real-time Monitoring**: Giám sát real-time performance
- **Resource Optimization**: Tối ưu hóa sử dụng tài nguyên

## 🚀 **Tính Năng Chính**

### **1. Agent Management**
- **Multi-Agent Support**: Table Data, Column, Row, Visualization Agents
- **Capability Mapping**: Đánh giá và quản lý capabilities của từng agent
- **Health Monitoring**: Kiểm tra sức khỏe và status của agents
- **Load Balancing**: Phân phối workload giữa agents
- **Failover Handling**: Xử lý khi agent gặp lỗi

### **2. Workflow System**
- **Predefined Workflows**: Comprehensive, Quick Analysis, Deep Dive, Visualization
- **Custom Workflows**: Tạo workflows tùy chỉnh
- **Step-by-Step Execution**: Thực thi tuần tự các steps
- **Conditional Logic**: Logic điều kiện trong workflows
- **Parallel Processing**: Xử lý song song khi có thể

### **3. Task Management**
- **Queue System**: Hàng đợi task với priority
- **Status Tracking**: Theo dõi status real-time
- **Progress Monitoring**: Hiển thị progress chi tiết
- **Error Handling**: Xử lý lỗi và retry mechanism
- **Cancellation**: Hủy task đang chạy

### **4. Performance Monitoring**
- **Real-time Metrics**: Performance metrics real-time
- **Agent Performance**: Theo dõi performance từng agent
- **System Health**: Health check toàn hệ thống
- **Resource Usage**: Monitor CPU, memory usage
- **Bottleneck Detection**: Phát hiện bottlenecks

## 📁 **Cấu Trúc Hệ Thống**

```
services/
└── aiOrchestrator.js       # Core orchestrator engine

server/routes/
└── ai-orchestrator.js      # API endpoints for orchestration

src/components/
└── AIOrchestrator.tsx     # Frontend management interface

AI Agents:
├── TableDataAgent.js      # Table processing agent
├── ColumnAgent.js         # Column analysis agent
├── RowAgent.js           # Row analysis agent
└── VisualizationAgent.js # Visualization agent
```

## 🔧 **API Endpoints**

### **Workflow Execution**
- `POST /api/ai-orchestrator/execute` - Thực thi workflow
- `POST /api/ai-orchestrator/batch` - Batch execution
- `POST /api/ai-orchestrator/agent/:agentName/:action` - Direct agent action

### **Task Management**
- `GET /api/ai-orchestrator/tasks` - Danh sách tasks
- `GET /api/ai-orchestrator/task/:taskId` - Task details
- `DELETE /api/ai-orchestrator/task/:taskId` - Cancel task

### **System Monitoring**
- `GET /api/ai-orchestrator/agents` - Agent status
- `GET /api/ai-orchestrator/workflows` - Available workflows
- `GET /api/ai-orchestrator/performance` - Performance metrics
- `GET /api/ai-orchestrator/health` - System health
- `GET /api/ai-orchestrator/stats` - System statistics

### **Workflow Management**
- `POST /api/ai-orchestrator/workflow/create` - Create custom workflow
- `DELETE /api/ai-orchestrator/workflow/:name` - Delete workflow

## 💻 **Frontend Interface**

### **Main Features**
- **4 Main Tabs**: Overview, Workflows, Tasks, Agents
- **Real-time Updates**: Auto-refresh với live status
- **Task Monitoring**: Detailed task progress tracking
- **Agent Status**: Real-time agent health monitoring
- **Quick Actions**: One-click workflow execution

### **User Interface**
- **Dashboard Overview**: System status và metrics
- **Workflow Library**: Available workflows với execution buttons
- **Task Queue**: Real-time task monitoring với controls
- **Agent Panel**: Individual agent status và capabilities
- **Performance Charts**: Visual performance metrics

## 🎯 **Sử Dụng**

### **1. Execute Workflow**
```javascript
// Frontend
const executeWorkflow = async (workflowName, data, options) => {
  const response = await fetch('/api/ai-orchestrator/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflow: workflowName,
      data: data,
      options: options
    })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('Task ID:', result.data.taskId);
    // Monitor task progress
    monitorTask(result.data.taskId);
  }
};

// Monitor task progress
const monitorTask = async (taskId) => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/ai-orchestrator/task/${taskId}`);
    const task = await response.json();
    
    console.log('Task status:', task.data.status);
    
    if (task.data.status === 'completed' || task.data.status === 'failed') {
      clearInterval(interval);
      console.log('Task completed:', task.data);
    }
  }, 1000);
};
```

### **2. Direct Agent Action**
```javascript
// Execute specific agent action
const executeAgentAction = async (agentName, action, data) => {
  const response = await fetch(`/api/ai-orchestrator/agent/${agentName}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: data,
      options: {}
    })
  });
  
  const result = await response.json();
  return result.data;
};

// Example: Analyze column
const result = await executeAgentAction('column', 'column_analysis', {
  tableData: [...],
  columnName: 'price'
});
```

### **3. Batch Execution**
```javascript
// Execute multiple workflows
const batchExecute = async (workflows) => {
  const response = await fetch('/api/ai-orchestrator/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflows: workflows.map(w => ({
        workflow: w.name,
        data: w.data,
        options: w.options
      }))
    })
  });
  
  const result = await response.json();
  console.log('Batch results:', result.data);
};

// Usage
batchExecute([
  { name: 'quick_analysis', data: { sample: true } },
  { name: 'comprehensive_analysis', data: { sample: true } }
]);
```

### **4. Create Custom Workflow**
```javascript
// Create custom workflow
const createWorkflow = async () => {
  const workflow = {
    name: 'custom_data_pipeline',
    description: 'Custom data processing pipeline',
    steps: [
      { agent: 'tableData', action: 'parse_table', required: true },
      { agent: 'tableData', action: 'analyze_table', required: true },
      { agent: 'column', action: 'column_analysis', required: true },
      { agent: 'visualization', action: 'chart_generation', required: false }
    ]
  };
  
  const response = await fetch('/api/ai-orchestrator/workflow/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow)
  });
  
  const result = await response.json();
  console.log('Workflow created:', result.data);
};
```

### **5. Backend Usage**
```javascript
const AIOrchestrator = require('./services/aiOrchestrator');

// Initialize orchestrator
const orchestrator = new AIOrchestrator();

// Event listeners
orchestrator.on('taskStarted', (task) => {
  console.log(`Task started: ${task.id}`);
});

orchestrator.on('stepCompleted', (data) => {
  console.log(`Step completed: ${data.step.agent}.${data.step.action}`);
});

orchestrator.on('taskCompleted', (task) => {
  console.log(`Task completed: ${task.id} in ${task.duration}ms`);
});

// Execute workflow
const taskId = await orchestrator.executeWorkflow('comprehensive_analysis', {
  data: [...],
  options: { analysisType: 'deep' }
});

// Get task status
const taskStatus = orchestrator.getTaskStatus(taskId);

// Get agent status
const agentStatus = orchestrator.getAgentStatus();

// Get performance metrics
const performance = orchestrator.getPerformance();
```

## 📊 **Predefined Workflows**

### **1. Comprehensive Analysis**
```javascript
{
  name: 'comprehensive_analysis',
  description: 'Complete analysis of tabular data with visualizations',
  steps: [
    { agent: 'tableData', action: 'parse_table', required: true },
    { agent: 'tableData', action: 'analyze_table', required: true },
    { agent: 'column', action: 'column_analysis', required: true },
    { agent: 'row', action: 'row_analysis', required: true },
    { agent: 'visualization', action: 'chart_generation', required: false },
    { agent: 'visualization', action: 'diagram_creation', required: false }
  ]
}
```

### **2. Quick Analysis**
```javascript
{
  name: 'quick_analysis',
  description: 'Fast analysis with basic insights',
  steps: [
    { agent: 'tableData', action: 'parse_table', required: true },
    { agent: 'tableData', action: 'analyze_table', required: true },
    { agent: 'visualization', action: 'chart_generation', required: false }
  ]
}
```

### **3. Deep Dive**
```javascript
{
  name: 'deep_dive',
  description: 'In-depth analysis with pattern detection',
  steps: [
    { agent: 'tableData', action: 'parse_table', required: true },
    { agent: 'tableData', action: 'analyze_table', required: true },
    { agent: 'column', action: 'column_analysis', required: true },
    { agent: 'column', action: 'pattern_detection', required: true },
    { agent: 'row', action: 'row_analysis', required: true },
    { agent: 'row', action: 'similarity_detection', required: true },
    { agent: 'visualization', action: 'chart_generation', required: false },
    { agent: 'visualization', action: 'diagram_creation', required: false }
  ]
}
```

## 🔒 **Advanced Features**

### **Event-Driven Architecture**
- **Event Emission**: Real-time event notifications
- **Event Listeners**: Custom event handling
- **Progress Events**: Step-by-step progress updates
- **Error Events**: Error notifications and recovery

### **Resource Management**
- **Memory Optimization**: Automatic memory cleanup
- **CPU Load Balancing**: Distribute workload efficiently
- **Connection Pooling**: Reuse agent connections
- **Cache Management**: Intelligent result caching

### **Error Handling**
- **Retry Mechanism**: Automatic retry on failures
- **Fallback Strategies**: Alternative execution paths
- **Error Recovery**: Graceful error handling
- **Logging**: Comprehensive error logging

### **Performance Optimization**
- **Parallel Processing**: Execute independent steps in parallel
- **Lazy Loading**: Load agents on demand
- **Result Caching**: Cache frequently used results
- **Queue Optimization**: Intelligent task scheduling

## 🛠️ **Configuration**

### **Environment Variables**
```bash
# Orchestrator settings
ORCHESTRATOR_MAX_CONCURRENT_TASKS=5
ORCHESTRATOR_TASK_TIMEOUT=300000
ORCHESTRATOR_RETRY_ATTEMPTS=3
ORCHESTRATOR_CACHE_ENABLED=true

# Agent settings
AGENT_HEALTH_CHECK_INTERVAL=30000
AGENT_RESPONSE_TIMEOUT=10000
AGENT_MAX_RESTARTS=3

# Performance settings
PERFORMANCE_MONITORING_ENABLED=true
METRICS_RETENTION_DAYS=30
SYSTEM_ALERTS_ENABLED=true
```

### **Advanced Configuration**
```javascript
const orchestrator = new AIOrchestrator({
  maxConcurrentTasks: 10,
  taskTimeout: 300000,
  retryAttempts: 3,
  cacheEnabled: true,
  performanceMonitoring: true,
  eventLogging: true,
  agents: {
    tableData: { maxConcurrent: 3, timeout: 60000 },
    column: { maxConcurrent: 2, timeout: 45000 },
    row: { maxConcurrent: 2, timeout: 45000 },
    visualization: { maxConcurrent: 1, timeout: 120000 }
  }
});
```

## 🚨 **Error Handling**

### **Common Errors**
- **Agent Unavailable**: Agent không sẵn sàng
- **Workflow Not Found**: Workflow không tồn tại
- **Task Timeout**: Task quá thời gian
- **Memory Limit**: Vượt giới hạn bộ nhớ
- **Data Validation**: Dữ liệu không hợp lệ

### **Error Responses**
```json
{
  "success": false,
  "error": "Agent 'tableData' is not available",
  "code": "AGENT_UNAVAILABLE",
  "details": {
    "agent": "tableData",
    "status": "error",
    "lastError": "Connection timeout"
  }
}
```

## 📈 **Performance Monitoring**

### **Key Metrics**
- **Task Throughput**: Số tasks hoàn thành/giờ
- **Agent Utilization**: Tỷ lệ sử dụng agents
- **Average Response Time**: Thời gian phản hồi trung bình
- **Error Rate**: Tỷ lệ lỗi
- **Queue Length**: Độ dài hàng đợi

### **Monitoring Dashboard**
```javascript
// Real-time metrics
const metrics = {
  tasks: {
    total: 1250,
    completed: 1180,
    failed: 45,
    running: 25
  },
  agents: {
    tableData: { status: 'ready', utilization: 0.75 },
    column: { status: 'ready', utilization: 0.60 },
    row: { status: 'ready', utilization: 0.45 },
    visualization: { status: 'busy', utilization: 0.90 }
  },
  performance: {
    averageProcessingTime: 2500,
    throughput: 45.2,
    errorRate: 0.036
  }
};
```

## 🔧 **Troubleshooting**

### **Performance Issues**
1. **Slow Task Execution**: Kiểm tra agent load, tăng concurrency
2. **Memory Leaks**: Monitor memory usage, restart agents
3. **Queue Backlog**: Tăng số lượng concurrent tasks
4. **Agent Timeouts**: Tăng timeout values

### **Agent Issues**
1. **Agent Not Responding**: Restart agent, check connections
2. **High Error Rate**: Check agent health, review logs
3. **Resource Exhaustion**: Monitor CPU/memory usage
4. **Configuration Errors**: Validate agent configurations

### **Workflow Issues**
1. **Workflow Stuck**: Check step dependencies, cancel and retry
2. **Invalid Steps**: Validate workflow definitions
3. **Data Flow Issues**: Check data passing between steps
4. **Circular Dependencies**: Review workflow logic

## 📚 **Examples**

### **Data Processing Pipeline**
```javascript
// Create custom data processing workflow
const dataPipeline = {
  name: 'data_processing_pipeline',
  description: 'End-to-end data processing pipeline',
  steps: [
    { agent: 'tableData', action: 'parse_table', required: true },
    { agent: 'tableData', action: 'data_validation', required: true },
    { agent: 'column', action: 'quality_assessment', required: true },
    { agent: 'row', action: 'anomaly_detection', required: true },
    { agent: 'tableData', action: 'format_conversion', required: true },
    { agent: 'visualization', action: 'chart_generation', required: false }
  ]
};

// Execute with real data
const taskId = await orchestrator.executeWorkflow('data_processing_pipeline', {
  source: 'database',
  query: 'SELECT * FROM sales_data WHERE date >= "2024-01-01"',
  options: {
    validation: 'strict',
    visualization: 'auto'
  }
});
```

### **Real-time Analytics**
```javascript
// Real-time data analysis workflow
const analyticsWorkflow = {
  name: 'realtime_analytics',
  description: 'Real-time analytics with visualization',
  steps: [
    { agent: 'tableData', action: 'parse_table', required: true },
    { agent: 'column', action: 'statistical_analysis', required: true },
    { agent: 'row', action: 'pattern_recognition', required: true },
    { agent: 'visualization', action: 'chart_generation', required: true }
  ]
};

// Execute with streaming data
const streamTask = await orchestrator.executeWorkflow('realtime_analytics', {
  stream: 'kafka',
  topic: 'user_events',
  window: '5m',
  options: {
    realTime: true,
    autoRefresh: true
  }
});
```

### **Batch Processing**
```javascript
// Process multiple datasets
const datasets = [
  { name: 'sales_q1', data: salesDataQ1 },
  { name: 'sales_q2', data: salesDataQ2 },
  { name: 'sales_q3', data: salesDataQ3 },
  { name: 'sales_q4', data: salesDataQ4 }
];

const batchTasks = datasets.map(dataset => ({
  workflow: 'comprehensive_analysis',
  data: dataset.data,
  options: {
    datasetName: dataset.name,
    outputFormat: 'json',
    includeVisualization: true
  }
}));

// Execute batch
const batchResult = await fetch('/api/ai-orchestrator/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ workflows: batchTasks })
});
```

## 🎯 **Best Practices**

### **Workflow Design**
- **Modular Steps**: Keep steps focused and reusable
- **Error Handling**: Include error handling in each step
- **Data Validation**: Validate data between steps
- **Resource Management**: Consider resource requirements

### **Performance Optimization**
- **Parallel Execution**: Use parallel processing when possible
- **Caching**: Cache intermediate results
- **Load Balancing**: Distribute workload evenly
- **Monitoring**: Monitor performance continuously

### **System Design**
- **Scalability**: Design for horizontal scaling
- **Reliability**: Include failover mechanisms
- **Maintainability**: Keep code clean and documented
- **Security**: Implement proper authentication and authorization

---

## 🎯 **Kết Luận**

AI Orchestrator cung cấp giải pháp toàn diện cho việc điều phối AI agents local với:
- **Multi-Agent Coordination**: Quản lý nhiều AI agents hiệu quả
- **Workflow Automation**: Tự động hóa workflows phức tạp
- **Real-time Monitoring**: Giám sát và quản lý real-time
- **Performance Optimization**: Tối ưu hóa hiệu suất hệ thống
- **Scalable Architecture**: Kiến trúc có khả năng mở rộng

Hệ thống được thiết kế để dễ dàng tích hợp, mở rộng và bảo trì, cung cấp nền tảng vững chắc cho các ứng dụng AI phức tạp.
