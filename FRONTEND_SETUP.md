# Frontend Setup Guide

## 📦 Dependencies cần cài đặt

### React & Core Dependencies
```bash
npm install react react-dom react-router-dom
```

### UI Components & Icons
```bash
npm install lucide-react
```

### TypeScript Types
```bash
npm install @types/react @types/react-dom @types/node
```

## 🔧 Cấu hình TypeScript

### Cập nhật tsconfig.json
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": [
      "dom",
      "dom.iterable",
      "es6"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": [
    "src",
    "components"
  ]
}
```

## 🚀 Chạy ứng dụng

### Development
```bash
npm run dev
```

### Build Production
```bash
npm run build
```

## 📋 Trạng thái hiện tại

### ✅ Đã hoàn thành
- ✅ Backend AI Center hoàn chỉnh
- ✅ Local AI Service (không cần API key)
- ✅ AI Plugin System
- ✅ AI Model Manager
- ✅ Enhanced Gemini Service (với fallback)
- ✅ Frontend AI Management Dashboard
- ✅ Navigation integration
- ✅ Routing setup

### ⏳ Cần hoàn thiện
- ⏳ Cài đặt React dependencies
- ⏳ Fix TypeScript configuration
- ⏳ Kết nối frontend với backend API
- ⏳ Testing hoàn chỉnh

## 🎯 Next Steps

1. **Cài đặt dependencies** theo danh sách trên
2. **Cấu hình TypeScript** nếu cần
3. **Test AI Management Dashboard**
4. **Kết nối với backend API endpoints**
5. **Test Local AI functionality**

## 🔗 API Endpoints

### AI Management
- `GET /api/ai/models` - Danh sách AI models
- `POST /api/ai/process` - Xử lý AI request
- `GET /api/ai/status` - Trạng thái hệ thống
- `POST /api/ai/models/download` - Download model
- `DELETE /api/ai/models/:id` - Xóa model

### Plugin Management
- `GET /api/ai/plugins` - Danh sách plugins
- `POST /api/ai/plugins/install` - Install plugin
- `DELETE /api/ai/plugins/:id` - Xóa plugin

## 📞 Hỗ trợ

Xem thêm: [AI_CENTER_GUIDE.md](./AI_CENTER_GUIDE.md)
