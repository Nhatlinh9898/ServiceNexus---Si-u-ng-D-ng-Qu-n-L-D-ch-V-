# Visualization AI Guide

## 🎯 **Tổng Quan**

Visualization AI là hệ thống AI chuyên sâu để tạo biểu đồ, sơ đồ, mô hình và kiến trúc với khả năng:
- **Chart Generation**: Tạo biểu đồ đa dạng (bar, line, pie, scatter, etc.)
- **Diagram Creation**: Tạo sơ đồ (flowchart, mindmap, orgchart, timeline, etc.)
- **Architecture Design**: Tạo sơ đồ kiến trúc (system, microservices, cloud, etc.)
- **3D Modeling**: Tạo mô hình 3D tương tác

## 🚀 **Tính Năng Chính**

### **1. Chart Generation**
- **15+ Chart Types**: Bar, Line, Pie, Scatter, Bubble, Radar, Heatmap, Treemap, etc.
- **Interactive Charts**: Zoom, pan, hover effects, animations
- **Custom Styling**: Colors, themes, labels, legends
- **Export Options**: PNG, SVG, HTML formats
- **Real-time Updates**: Dynamic data binding

### **2. Diagram Creation**
- **9+ Diagram Types**: Flowchart, Mindmap, Orgchart, Timeline, Network, etc.
- **Auto Layout**: Intelligent node positioning
- **Drag & Drop**: Interactive diagram editing
- **Connection Types**: Arrows, lines, curved paths
- **Export Formats**: SVG, PNG, PDF

### **3. Architecture Design**
- **7+ Architecture Types**: System, Microservices, Cloud, Security, etc.
- **Component Library**: Pre-built architecture components
- **Connection Mapping**: Data flow and service connections
- **Layer Visualization**: Multi-layer architecture views
- **Documentation**: Auto-generated architecture docs

### **4. 3D Modeling**
- **Interactive 3D**: Rotate, zoom, pan controls
- **Multiple Formats**: OBJ, STL, GLTF support
- **Lighting & Materials**: Realistic rendering
- **Animation Support**: Keyframe animations
- **Export Options**: 3D files, images, web viewers

## 📁 **Cấu Trúc Hệ Thống**

```
services/
└── visualizationAgent.js    # Core visualization engine

server/routes/
└── visualization.js         # API endpoints for visualization

src/components/
└── VisualizationAI.tsx     # Frontend interface

data/visualizations/         # Local storage
├── charts/                  # Generated charts
├── diagrams/                # Generated diagrams
├── architectures/           # Architecture diagrams
└── models/                  # 3D models
```

## 🔧 **API Endpoints**

### **Chart Generation**
- `POST /api/visualization/chart` - Tạo biểu đồ
- `GET /api/visualization/chart-types` - Danh sách loại biểu đồ
- `POST /api/visualization/sample-data` - Tạo dữ liệu mẫu

### **Diagram Creation**
- `POST /api/visualization/diagram` - Tạo sơ đồ
- `GET /api/visualization/diagram-types` - Danh sách loại sơ đồ

### **Architecture Design**
- `POST /api/visualization/architecture` - Tạo kiến trúc
- `GET /api/visualization/architecture-types` - Danh sách loại kiến trúc

### **3D Modeling**
- `POST /api/visualization/model` - Tạo mô hình 3D

### **Data Management**
- `GET /api/visualization/list` - Danh sách visualizations
- `DELETE /api/visualization/:type/:filename` - Xóa visualization
- `GET /api/visualization/stats` - Thống kê
- `POST /api/visualization/batch` - Tạo hàng loạt
- `GET /api/visualization/status` - Trạng thái hệ thống

### **Utilities**
- `POST /api/visualization/validate` - Kiểm tra dữ liệu
- `GET /api/visualization/export/:type/:filename` - Export visualization

## 💻 **Frontend Interface**

### **Main Features**
- **4 Main Tabs**: Charts, Diagrams, Architectures, 3D Models
- **Type Selection**: Dropdown cho từng loại visualization
- **Data Input**: JSON editor với syntax highlighting
- **Sample Data Generator**: Tự động tạo dữ liệu mẫu
- **Real-time Preview**: Xem trước visualization
- **Export Options**: Download trong nhiều định dạng

### **User Interface**
- **Responsive Design**: Tương thích mọi thiết bị
- **Interactive Controls**: Drag, drop, zoom, pan
- **Color Themes**: Multiple visualization themes
- **Progress Tracking**: Real-time generation progress
- **Error Handling**: User-friendly error messages

## 🎯 **Sử Dụng**

### **1. Tạo Biểu Đồ**
```javascript
// Frontend
const chartData = [
  { x: "Jan", y: 100 },
  { x: "Feb", y: 150 },
  { x: "Mar", y: 120 }
];

const generateChart = async () => {
  const response = await fetch('/api/visualization/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: chartData,
      options: {
        type: 'bar',
        title: 'Monthly Sales',
        interactive: true
      }
    })
  });
  const result = await response.json();
  console.log('Chart generated:', result.data);
};
```

### **2. Tạo Sơ Đồ**
```javascript
const diagramData = {
  nodes: [
    { id: 'start', label: 'Start' },
    { id: 'process', label: 'Process' },
    { id: 'end', label: 'End' }
  ],
  edges: [
    { from: 'start', to: 'process', label: 'Flow' },
    { from: 'process', to: 'end', label: 'Complete' }
  ]
};

const generateDiagram = async () => {
  const response = await fetch('/api/visualization/diagram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: diagramData,
      options: {
        type: 'flowchart',
        layout: 'vertical',
        theme: 'default'
      }
    })
  });
  const result = await response.json();
};
```

### **3. Tạo Kiến Trúc**
```javascript
const architectureData = {
  components: [
    { id: 'frontend', name: 'Frontend', type: 'service' },
    { id: 'backend', name: 'Backend', type: 'service' },
    { id: 'database', name: 'Database', type: 'database' }
  ],
  connections: [
    { from: 'frontend', to: 'backend', type: 'api' },
    { from: 'backend', to: 'database', type: 'query' }
  ]
};

const generateArchitecture = async () => {
  const response = await fetch('/api/visualization/architecture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: architectureData,
      options: {
        type: 'system',
        style: 'modern'
      }
    })
  });
  const result = await response.json();
};
```

### **4. Tạo Mô Hình 3D**
```javascript
const modelData = {
  vertices: [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]
  ],
  faces: [
    [0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]
  ]
};

const generateModel = async () => {
  const response = await fetch('/api/visualization/model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: modelData,
      options: {
        type: '3d',
        format: 'obj'
      }
    })
  });
  const result = await response.json();
};
```

### **5. Backend Usage**
```javascript
const VisualizationAgent = require('./services/visualizationAgent');

// Initialize agent
const vizAgent = new VisualizationAgent();
await vizAgent.initialize();

// Generate chart
const chart = await vizAgent.generateChart(data, {
  type: 'bar',
  title: 'Sales Data',
  interactive: true
});

// Generate diagram
const diagram = await vizAgent.generateDiagram(data, {
  type: 'flowchart',
  layout: 'vertical'
});

// Generate architecture
const architecture = await vizAgent.generateArchitecture(data, {
  type: 'system',
  style: 'modern'
});

// Generate 3D model
const model = await vizAgent.generateModel(data, {
  type: '3d',
  format: 'obj'
});
```

## 📊 **Data Formats**

### **Chart Data Format**
```json
[
  {
    "x": "Category A",
    "y": 100,
    "color": "#ff6b6b"
  },
  {
    "x": "Category B", 
    "y": 150,
    "color": "#4ecdc4"
  }
]
```

### **Diagram Data Format**
```json
{
  "nodes": [
    {
      "id": "node1",
      "label": "Start Process",
      "type": "start",
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "node2",
      "label": "Decision",
      "type": "decision",
      "position": { "x": 300, "y": 100 }
    }
  ],
  "edges": [
    {
      "from": "node1",
      "to": "node2",
      "label": "Yes",
      "type": "arrow"
    }
  ]
}
```

### **Architecture Data Format**
```json
{
  "components": [
    {
      "id": "web-server",
      "name": "Web Server",
      "type": "service",
      "layer": "presentation"
    },
    {
      "id": "api-gateway",
      "name": "API Gateway", 
      "type": "gateway",
      "layer": "application"
    },
    {
      "id": "database",
      "name": "Database",
      "type": "database",
      "layer": "data"
    }
  ],
  "connections": [
    {
      "from": "web-server",
      "to": "api-gateway",
      "type": "http",
      "protocol": "REST"
    },
    {
      "from": "api-gateway",
      "to": "database",
      "type": "database",
      "protocol": "SQL"
    }
  ]
}
```

### **3D Model Data Format**
```json
{
  "vertices": [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1]
  ],
  "faces": [
    [0, 1, 2],
    [0, 1, 3],
    [1, 2, 4],
    [2, 3, 4]
  ],
  "normals": [
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, -1]
  ],
  "uvs": [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1]
  ]
}
```

## 🔒 **Advanced Features**

### **Chart Customization**
- **Color Schemes**: Pre-defined and custom color palettes
- **Animations**: Entrance, update, and exit animations
- **Interactions**: Click, hover, drag events
- **Responsive Design**: Auto-resize for different screens
- **Accessibility**: ARIA labels and keyboard navigation

### **Diagram Features**
- **Auto Layout**: Force-directed, hierarchical, circular layouts
- **Node Styling**: Custom shapes, colors, icons
- **Edge Routing**: Orthogonal, curved, straight connections
- **Grouping**: Node clustering and hierarchy
- **Templates**: Pre-built diagram templates

### **Architecture Capabilities**
- **Multi-layer Views**: Separate layers for different concerns
- **Component Libraries**: Reusable architecture components
- **Connection Types**: Data flow, API calls, event streams
- **Security Zones**: DMZ, internal, external zones
- **Deployment Views**: Production, staging, development

### **3D Model Features**
- **Material System**: PBR materials, textures, lighting
- **Animation System**: Skeletal animation, morph targets
- **Camera Controls**: Orbit, fly, first-person controls
- **Lighting**: Directional, point, spot lights
- **Export Formats**: OBJ, STL, GLTF, FBX

## 🛠️ **Configuration**

### **Environment Variables**
```bash
# Visualization settings
VIZ_OUTPUT_PATH=./data/visualizations
VIZ_MAX_FILE_SIZE=50MB
VIZ_CACHE_ENABLED=true
VIZ_CACHE_TTL=3600

# Chart settings
VIZ_DEFAULT_CHART_THEME=default
VIZ_ANIMATION_DURATION=1000
VIZ_MAX_DATA_POINTS=10000

# 3D settings
VIZ_3D_RENDERER=webgl
VIZ_3D_MAX_VERTICES=100000
VIZ_3D_MAX_FACES=50000
```

### **Advanced Configuration**
```javascript
const vizAgent = new VisualizationAgent({
  outputPath: './custom-visualizations',
  maxFileSize: 100 * 1024 * 1024, // 100MB
  enableCaching: true,
  cacheTTL: 7200,
  chartDefaults: {
    theme: 'dark',
    animation: true,
    interactive: true
  },
  modelDefaults: {
    renderer: 'webgl',
    antialiasing: true,
    shadows: true
  }
});
```

## 🚨 **Error Handling**

### **Common Errors**
- **Invalid Data Format**: Data không đúng định dạng
- **Large Dataset**: Dữ liệu quá lớn để xử lý
- **Unsupported Type**: Loại visualization không hỗ trợ
- **Memory Limit**: Vượt giới hạn bộ nhớ
- **File Generation**: Lỗi tạo file output

### **Error Responses**
```json
{
  "success": false,
  "error": "Invalid chart data format",
  "code": "INVALID_DATA_FORMAT",
  "details": {
    "field": "data",
    "expected": "array of objects with x and y fields",
    "received": "string"
  }
}
```

## 📈 **Performance Optimization**

### **Rendering Optimization**
- **Canvas Optimization**: Hardware acceleration
- **Level of Detail**: Simplified geometry for distant objects
- **Frustum Culling**: Only render visible objects
- **Batch Rendering**: Group similar draw calls
- **Texture Atlasing**: Combine textures for efficiency

### **Memory Management**
- **Object Pooling**: Reuse objects instead of creating new ones
- **Garbage Collection**: Manual cleanup of unused resources
- **Streaming**: Load large datasets in chunks
- **Compression**: Compress generated files
- **Caching**: Cache frequently used visualizations

### **Network Optimization**
- **Lazy Loading**: Load visualizations on demand
- **Progressive Loading**: Load low-res first, then high-res
- **CDN Integration**: Serve static assets from CDN
- **Compression**: Gzip compression for responses
- **HTTP Caching**: Proper cache headers

## 🔧 **Troubleshooting**

### **Performance Issues**
1. **Slow Rendering**: Giảm complexity, enable hardware acceleration
2. **Memory Leaks**: Check object cleanup, use profiling tools
3. **Large Datasets**: Use data sampling, pagination
4. **Browser Crashes**: Reduce vertex count, enable web workers

### **Quality Issues**
1. **Low Resolution**: Increase render resolution
2. **Aliasing**: Enable anti-aliasing
3. **Color Banding**: Use higher color depth
4. **Artifacts**: Check texture settings, filtering

### **Export Issues**
1. **File Size**: Optimize geometry, compress textures
2. **Format Compatibility**: Check target format support
3. **Missing Assets**: Ensure all resources are included
4. **Corruption**: Verify file integrity

## 📚 **Examples**

### **Business Dashboard**
```javascript
const dashboardData = {
  sales: [
    { month: 'Jan', value: 45000 },
    { month: 'Feb', value: 52000 },
    { month: 'Mar', value: 48000 }
  ],
  customers: [
    { type: 'New', count: 120 },
    { type: 'Returning', count: 340 }
  ]
};

// Generate multiple charts
const charts = await Promise.all([
  vizAgent.generateChart(dashboardData.sales, {
    type: 'line',
    title: 'Sales Trend'
  }),
  vizAgent.generateChart(dashboardData.customers, {
    type: 'pie',
    title: 'Customer Distribution'
  })
]);
```

### **System Architecture**
```javascript
const microservices = {
  components: [
    { id: 'api-gateway', name: 'API Gateway', type: 'gateway' },
    { id: 'user-service', name: 'User Service', type: 'service' },
    { id: 'order-service', name: 'Order Service', type: 'service' },
    { id: 'payment-service', name: 'Payment Service', type: 'service' },
    { id: 'user-db', name: 'User DB', type: 'database' },
    { id: 'order-db', name: 'Order DB', type: 'database' }
  ],
  connections: [
    { from: 'api-gateway', to: 'user-service' },
    { from: 'api-gateway', to: 'order-service' },
    { from: 'order-service', to: 'payment-service' },
    { from: 'user-service', to: 'user-db' },
    { from: 'order-service', to: 'order-db' }
  ]
};

const architecture = await vizAgent.generateArchitecture(microservices, {
  type: 'microservices',
  style: 'modern'
});
```

### **3D Product Visualization**
```javascript
const productModel = {
  vertices: [
    // Product geometry vertices
  ],
  faces: [
    // Product mesh faces
  ],
  materials: {
    diffuse: '#ff6b6b',
    metallic: 0.1,
    roughness: 0.3
  }
};

const model = await vizAgent.generateModel(productModel, {
  type: '3d',
  format: 'obj',
  options: {
    showWireframe: false,
    showAxes: true,
    backgroundColor: '#f0f0f0'
  }
});
```

## 🎯 **Best Practices**

### **Data Preparation**
- **Clean Data**: Remove null/invalid values
- **Consistent Format**: Standardize data structure
- **Appropriate Scale**: Normalize data ranges
- **Descriptive Labels**: Use clear, meaningful labels

### **Design Principles**
- **Color Harmony**: Use complementary color schemes
- **Visual Hierarchy**: Emphasize important elements
- **Consistency**: Maintain consistent styling
- **Accessibility**: Ensure color contrast and readability

### **Performance**
- **Optimize Geometry**: Reduce unnecessary vertices
- **Use LOD**: Level of detail for complex models
- **Batch Operations**: Group similar operations
- **Profile Regularly**: Monitor performance metrics

### **User Experience**
- **Loading States**: Show progress indicators
- **Error Handling**: Provide clear error messages
- **Responsive Design**: Adapt to different screen sizes
- **Interactive Feedback**: Provide visual feedback

---

## 🎯 **Kết Luận**

Visualization AI cung cấp giải pháp toàn diện cho việc tạo visualization với:
- **Chart Generation**: 15+ loại biểu đồ tương tác
- **Diagram Creation**: 9+ loại sơ đồ chuyên nghiệp
- **Architecture Design**: 7+ loại kiến trúc hệ thống
- **3D Modeling**: Mô hình 3D tương tác cao

Hệ thống được thiết kế để dễ sử dụng, hiệu suất cao và tích hợp dễ dàng vào các ứng dụng hiện có với đầy đủ tính năng export, customization và real-time interaction.
