# Table Analysis AI Guide

## 🎯 **Tổng Quan**

Table Analysis AI là hệ thống AI chuyên sâu để xử lý và phân tích dữ liệu dạng bảng với khả năng:
- **Column Agent**: Phân tích từng cột dữ liệu
- **Row Agent**: Phân tích từng hàng dữ liệu  
- **Matrix Operations**: Các phép toán ma trận nâng cao
- **Table Data Agent**: Xử lý và chuyển đổi dữ liệu bảng

## 🚀 **Tính Năng Chính**

### **1. Table Data Processing**
- **Multi-format Support**: JSON, CSV, Excel
- **Auto-detection**: Tự động nhận diện định dạng
- **Data Validation**: Kiểm tra tính toàn vẹn dữ liệu
- **Format Conversion**: Chuyển đổi giữa các định dạng

### **2. Column Analysis**
- **Statistical Analysis**: Thống kê mô tả, phân phối, outlier
- **Pattern Detection**: Phát hiện xu hướng, chu kỳ, mùa vụ
- **Data Quality**: Đánh giá chất lượng dữ liệu
- **Type Detection**: Nhận diện kiểu dữ liệu

### **3. Row Analysis**
- **Row Profiling**: Hồ sơ chi tiết từng hàng
- **Similarity Detection**: Tìm hàng tương đồng
- **Anomaly Detection**: Phát hiện hàng bất thường
- **Position Analysis**: Phân tích vị trí trong dataset

### **4. Matrix Operations**
- **Basic Operations**: Nhân, chuyển vị, định thức, nghịch đảo
- **Statistical Operations**: Trung bình, độ lệch chuẩn
- **Correlation Matrix**: Ma trận tương quan
- **Advanced Analytics**: Phân tích ma trận chuyên sâu

## 📁 **Cấu Trúc Hệ Thống**

```
services/
├── tableDataAgent.js      # Core table processing engine
├── columnAgent.js         # Column analysis specialist
└── rowAgent.js           # Row analysis specialist

server/routes/
└── table-analysis.js      # API endpoints for table analysis

src/components/
└── TableAnalysisAI.tsx   # Frontend interface

data/tables/              # Local table storage
└── metadata/              # Table metadata
```

## 🔧 **API Endpoints**

### **Table Processing**
- `POST /api/table-analysis/parse` - Phân tích dữ liệu bảng
- `POST /api/table-analysis/analyze` - Phân tích toàn bộ bảng
- `POST /api/table-analysis/validate` - Kiểm tra dữ liệu

### **Column Analysis**
- `POST /api/table-analysis/column/analyze` - Phân tích cột cụ thể
- `GET /api/table-analysis/column/metadata` - Metadata cột

### **Row Analysis**
- `POST /api/table-analysis/row/analyze` - Phân tích hàng cụ thể
- `POST /api/table-analysis/row/similarity` - Tìm hàng tương đồng

### **Matrix Operations**
- `POST /api/table-analysis/to-matrix` - Chuyển đổi sang ma trận
- `POST /api/table-analysis/from-matrix` - Chuyển đổi từ ma trận
- `POST /api/table-analysis/matrix/multiply` - Nhân ma trận
- `POST /api/table-analysis/matrix/transpose` - Chuyển vị ma trận
- `POST /api/table-analysis/matrix/determinant` - Tính định thức
- `POST /api/table-analysis/matrix/inverse` - Tính ma trận nghịch đảo
- `POST /api/table-analysis/matrix/statistics` - Thống kê ma trận
- `POST /api/table-analysis/correlation` - Ma trận tương quan

### **Data Management**
- `POST /api/table-analysis/save` - Lưu bảng dữ liệu
- `GET /api/table-analysis/load/:filename` - Tải bảng dữ liệu
- `GET /api/table-analysis/list` - Danh sách bảng đã lưu
- `DELETE /api/table-analysis/delete/:filename` - Xóa bảng dữ liệu

### **Batch Operations**
- `POST /api/table-analysis/batch-analyze` - Phân tích hàng loạt
- `GET /api/table-analysis/status` - Trạng thái hệ thống

## 💻 **Frontend Interface**

### **Main Features**
- **Upload & Parse**: Tải và phân tích dữ liệu đa định dạng
- **Interactive Analysis**: Phân tích tương tác cột/hàng
- **Matrix Operations**: Giao diện ma trận trực quan
- **Data Management**: Quản lý dữ liệu đã lưu
- **Real-time Processing**: Xử lý real-time với progress tracking

### **User Interface**
- **4 Main Tabs**: Upload & Parse, Analyze, Matrix Operations, Saved Tables
- **Drag & Drop**: Upload file dễ dàng
- **Data Preview**: Xem trước dữ liệu với search/filter
- **Results Display**: Hiển thị kết quả phân tích chi tiết
- **Export Options**: Xuất kết quả đa định dạng

## 🎯 **Sử Dụng**

### **1. Upload và Phân Tích Bảng**
```javascript
// Frontend
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = JSON.parse(e.target.result);
    setTableData(data);
  };
  reader.readAsText(file);
};

const analyzeTable = async () => {
  const response = await fetch('/api/table-analysis/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: tableData,
      analysisType: 'comprehensive'
    })
  });
  const result = await response.json();
};
```

### **2. Phân Tích Cột Dữ Liệu**
```javascript
const analyzeColumn = async (columnName) => {
  const response = await fetch('/api/table-analysis/column/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: tableData,
      columnName: columnName,
      analysisType: 'comprehensive'
    })
  });
  const result = await response.json();
  console.log('Column analysis:', result.data);
};
```

### **3. Phân Tích Hàng Dữ Liệu**
```javascript
const analyzeRow = async (rowIndex) => {
  const response = await fetch('/api/table-analysis/row/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: tableData,
      rowIndex: rowIndex,
      analysisType: 'comprehensive'
    })
  });
  const result = await response.json();
  console.log('Row analysis:', result.data);
};
```

### **4. Phép Toán Ma Trận**
```javascript
// Convert to matrix
const matrixResponse = await fetch('/api/table-analysis/to-matrix', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: tableData,
    includeHeaders: true
  })
});
const { matrix } = await matrixResponse.json();

// Matrix operations
const transposeResponse = await fetch('/api/table-analysis/matrix/transpose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ matrix })
});
const { result } = await transposeResponse.json();
```

### **5. Backend Usage**
```javascript
const TableDataAgent = require('./services/tableDataAgent');
const ColumnAgent = require('./services/columnAgent');
const RowAgent = require('./services/rowAgent');

// Initialize agents
const tableAgent = new TableDataAgent();
const columnAgent = new ColumnAgent();
const rowAgent = new RowAgent();

// Parse table data
const parsedData = await tableAgent.parseTableData(csvData, 'csv');

// Analyze column
const columnAnalysis = await columnAgent.analyzeColumn(data, 'price');

// Analyze row
const rowAnalysis = await rowAgent.analyzeRow(data, 0);

// Matrix operations
const matrix = tableAgent.tableToMatrix(data);
const transposed = tableAgent.matrixTranspose(matrix);
```

## 📊 **Data Formats**

### **Input Table Format**
```json
[
  {
    "id": 1,
    "name": "Product A",
    "price": 100.50,
    "category": "Electronics",
    "date": "2024-01-01",
    "in_stock": true
  },
  {
    "id": 2,
    "name": "Product B", 
    "price": 75.25,
    "category": "Books",
    "date": "2024-01-02",
    "in_stock": false
  }
]
```

### **CSV Format**
```csv
id,name,price,category,date,in_stock
1,Product A,100.50,Electronics,2024-01-01,true
2,Product B,75.25,Books,2024-01-02,false
```

### **Column Analysis Result**
```json
{
  "columnName": "price",
  "analysisType": "comprehensive",
  "timestamp": "2024-01-01T00:00:00Z",
  "metadata": {
    "type": "number",
    "count": 1000,
    "uniqueCount": 850,
    "nullCount": 0,
    "completeness": "100%"
  },
  "results": {
    "statistics": {
      "mean": 87.75,
      "median": 85.00,
      "stdDev": 15.25,
      "min": 25.50,
      "max": 150.00
    },
    "distribution": {
      "histogram": [...],
      "normality": {
        "isNormal": true,
        "skewness": 0.15,
        "kurtosis": -0.25
      }
    },
    "patterns": [
      {
        "type": "trend",
        "direction": "increasing",
        "strength": 0.75
      }
    ],
    "anomalies": [
      {
        "type": "outlier",
        "value": 150.00,
        "zScore": 4.1
      }
    ]
  }
}
```

### **Row Analysis Result**
```json
{
  "rowIndex": 0,
  "analysisType": "comprehensive",
  "timestamp": "2024-01-01T00:00:00Z",
  "row": {
    "id": 1,
    "name": "Product A",
    "price": 100.50
  },
  "results": {
    "profile": {
      "summary": {
        "totalColumns": 5,
        "numericColumns": 1,
        "stringColumns": 2,
        "dateColumns": 1,
        "nullColumns": 0
      },
      "characteristics": {
        "density": "100%",
        "complexity": {
          "score": 3.5,
          "level": "medium"
        }
      }
    },
    "comparison": {
      "position": {
        "percentile": "25.0%",
        "rank": 1
      },
      "statistics": {
        "price": {
          "value": 100.50,
          "percentile": "75.0%",
          "position": "above_average"
        }
      }
    },
    "similarity": {
      "totalSimilar": 3,
      "nearDuplicates": 0,
      "similarRows": [...]
    }
  }
}
```

## 🔒 **Advanced Features**

### **Pattern Detection**
- **Sequential Patterns**: Phát hiện chuỗi số học
- **Cyclical Patterns**: Phát hiện chu kỳ lặp lại
- **Seasonal Patterns**: Phát hiện xu hướng mùa vụ
- **Trend Analysis**: Phân tích xu hướng dài hạn

### **Anomaly Detection**
- **Statistical Outliers**: Outlier theo IQR, Z-score
- **Pattern Anomalies**: Bất thường trong pattern
- **Data Quality Issues**: Lỗi chất lượng dữ liệu
- **Temporal Anomalies**: Bất thường về thời gian

### **Matrix Analytics**
- **Eigenvalues/Eigenvectors**: Giá trị riêng, vector riêng
- **SVD (Singular Value Decomposition)**: Phân rã giá trị kỳ dị
- **PCA (Principal Component Analysis)**: Phân tích thành phần chính
- **Correlation Analysis**: Phân tích tương quan

## 🛠️ **Configuration**

### **Environment Variables**
```bash
# Table analysis settings
TABLE_DATA_PATH=./data/tables
MAX_TABLE_SIZE=100MB
MAX_MATRIX_SIZE=1000x1000

# Analysis settings
DEFAULT_ANALYSIS_TYPE=comprehensive
ENABLE_CACHING=true
CACHE_TTL=3600

# Performance settings
MAX_CONCURRENT_ANALYSES=5
ANALYSIS_TIMEOUT=30000
```

### **Advanced Configuration**
```javascript
const tableAgent = new TableDataAgent({
  dataPath: './custom-tables',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  enableCaching: true,
  cacheTTL: 3600
});
```

## 🚨 **Error Handling**

### **Common Errors**
- **Invalid Format**: File không đúng định dạng
- **Large Dataset**: Dữ liệu quá lớn
- **Memory Limit**: Vượt bộ nhớ cho phép
- **Matrix Incompatible**: Kích thước ma trận không tương thích

### **Error Responses**
```json
{
  "success": false,
  "error": "Invalid table format",
  "code": "INVALID_FORMAT",
  "details": "Expected array of objects"
}
```

## 📈 **Performance Optimization**

### **Memory Management**
- **Streaming Processing**: Xử lý dữ liệu lớn theo luồng
- **Chunked Analysis**: Phân tích theo từng phần
- **Memory Pooling**: Tái sử dụng bộ nhớ
- **Garbage Collection**: Dọn dẹp bộ nhớ tự động

### **Caching Strategy**
- **Result Caching**: Cache kết quả phân tích
- **Metadata Caching**: Cache metadata bảng
- **Pattern Caching**: Cache pattern đã phát hiện
- **LRU Eviction**: Xóa cache cũ nhất

### **Parallel Processing**
- **Column Parallel**: Phân tích song song các cột
- **Row Batch**: Xử lý hàng theo batch
- **Matrix Optimization**: Tối ưu ma trận song song
- **Worker Threads**: Sử dụng worker threads

## 🔧 **Troubleshooting**

### **Performance Issues**
1. **Slow Analysis**: Giảm kích thước dataset
2. **Memory Overflow**: Sử dụng streaming processing
3. **Timeout Errors**: Tăng timeout hoặc chia nhỏ analysis
4. **Large Matrix**: Sử dụng sparse matrix libraries

### **Data Quality Issues**
1. **Missing Values**: Xử lý null/undefined values
2. **Type Inconsistency**: Chuẩn hóa kiểu dữ liệu
3. **Duplicate Rows**: Loại bỏ hàng trùng lặp
4. **Format Errors**: Kiểm tra và sửa định dạng

### **Matrix Issues**
1. **Singular Matrix**: Kiểm tra determinant trước khi invert
2. **Large Matrices**: Sử dụng numerical libraries
3. **Precision Loss**: Sử dụng decimal libraries
4. **Memory Issues**: Sử dụng sparse matrices

## 📚 **Examples**

### **Basic Table Analysis**
```javascript
const data = [
  { id: 1, name: "A", value: 100 },
  { id: 2, name: "B", value: 200 }
];

const analysis = await tableAgent.analyzeTable(data);
console.log('Table insights:', analysis.insights);
```

### **Column Pattern Detection**
```javascript
const columnAnalysis = await columnAgent.analyzeColumn(data, 'value');
console.log('Patterns:', columnAnalysis.results.patterns);
```

### **Row Similarity Search**
```javascript
const rowAnalysis = await rowAgent.analyzeRow(data, 0);
console.log('Similar rows:', rowAnalysis.results.similarity.similarRows);
```

### **Matrix Operations**
```javascript
const matrix = tableAgent.tableToMatrix(data);
const transposed = tableAgent.matrixTranspose(matrix);
const product = tableAgent.matrixMultiply(matrix, transposed);
```

### **Advanced Analytics**
```javascript
// Correlation matrix
const correlation = tableAgent.correlationMatrix(data);

// Matrix eigenvalues (would require additional library)
const eigenvalues = calculateEigenvalues(correlation);

// PCA (would require additional library)
const pca = performPCA(correlation);
```

## 🎯 **Best Practices**

### **Data Preparation**
- **Clean Data**: Loại bỏ null/invalid values
- **Consistent Types**: Đảm thiểu kiểu dữ liệu
- **Proper Headers**: Sử dụng headers mô tả
- **Reasonable Size**: Giới hạn kích thước dataset

### **Analysis Strategy**
- **Start Simple**: Bắt đầu với phân tích cơ bản
- **Iterative Approach**: Phân tích từng bước
- **Validate Results**: Kiểm tra kết quả hợp lý
- **Document Findings**: Ghi chú phát hiện

### **Performance**
- **Use Caching**: Cache kết quả thường dùng
- **Batch Processing**: Xử lý theo batch
- **Monitor Memory**: Theo dõi sử dụng bộ nhớ
- **Optimize Queries**: Tối ưu query和分析

---

## 🎯 **Kết Luận**

Table Analysis AI cung cấp giải pháp toàn diện cho việc phân tích dữ liệu dạng bảng với:
- **Column Agent**: Phân tích chuyên sâu từng cột
- **Row Agent**: Phân tích chi tiết từng hàng  
- **Matrix Operations**: Các phép toán ma trận nâng cao
- **AI-powered Insights**: Phát hiện pattern và anomaly tự động

Hệ thống được thiết kế để xử lý dữ liệu lớn, hiệu suất cao và dễ dàng tích hợp vào các ứng dụng hiện có.
