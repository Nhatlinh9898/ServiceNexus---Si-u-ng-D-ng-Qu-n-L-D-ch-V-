// Enhanced Gemini Service với Local AI Fallback
// Tự động chuyển sang Local AI khi không có API key

import { IndustryType, ServiceRecord } from "../types";
import aiServiceFactory from './aiServiceFactory';

// Backward compatibility functions
export const getOperationalAdvice = async (
  query: string, 
  contextData?: string
): Promise<string> => {
  try {
    // Thử với AI Service Factory
    const result = await aiServiceFactory.process({
      type: 'operational_advice',
      query,
      contextData
    }, {
      service: process.env.API_KEY ? 'gemini' : 'local'
    });

    return result.response;
  } catch (error) {
    console.error("AI Service Error:", error);
    return "Đã xảy ra lỗi khi kết nối với trợ lý AI. Vui lòng thử lại sau.";
  }
};

export const generateMockData = async (industry: IndustryType, count: number): Promise<ServiceRecord[]> => {
  try {
    const result = await aiServiceFactory.process({
      type: 'data_generation',
      industry,
      count
    }, {
      service: 'local'
    });

    return result.data || [];
  } catch (error) {
    console.error("Mock data generation error:", error);
    return [];
  }
};

export const analyzeData = async (records: ServiceRecord[]): Promise<string> => {
  try {
    const summary = JSON.stringify(records.slice(0, 20));
    const result = await aiServiceFactory.process({
      type: 'data_analysis',
      query: 'Phân tích danh sách các đơn dịch vụ sau đây và đưa ra 3 nhận xét quan trọng về hiệu suất vận hành và 3 đề xuất cải thiện. Tập trung vào doanh thu và trạng thái đơn hàng.',
      contextData: summary
    }, {
      service: process.env.API_KEY ? 'gemini' : 'local'
    });

    return result.response;
  } catch (error) {
    console.error("Data analysis error:", error);
    return "Không thể phân tích dữ liệu.";
  }
};

// Organization AI Generators với Local AI fallback
export type OrgContentType = 'JOB_DESCRIPTION' | 'SAFETY_REGULATIONS' | 'DEPT_FUNCTIONS';

export const generateOrgContent = async (type: OrgContentType, context: any): Promise<string> => {
  try {
    let query = "";
    let systemRole = "";

    if (type === 'JOB_DESCRIPTION') {
      systemRole = "Bạn là Giám đốc Nhân sự (CHRO) chuyên nghiệp.";
      query = `Hãy viết bản mô tả công việc (JD) ngắn gọn (3-5 gạch đầu dòng) cho vị trí: ${context.role} thuộc phòng ban/đơn vị ${context.departmentName}. Yêu cầu: Văn phong chuyên nghiệp, tập trung vào kết quả.`;
    } 
    else if (type === 'SAFETY_REGULATIONS') {
      systemRole = "Bạn là Giám đốc An toàn Lao động (HSE Manager).";
      query = `Hãy liệt kê 3-5 quy định an toàn quan trọng nhất cần tuân thủ tại: ${context.siteName} (Loại hình: ${context.siteType}, Địa điểm: ${context.location}). Viết ngắn gọn, dễ hiểu.`;
    }
    else if (type === 'DEPT_FUNCTIONS') {
      systemRole = "Bạn là Chuyên gia Tái cấu trúc Doanh nghiệp.";
      query = `Hãy liệt kê 3 chức năng & nhiệm vụ cốt lõi của phòng ban: ${context.deptName} (Loại hình: ${context.deptType}). Viết ngắn gọn.`;
    }

    const result = await aiServiceFactory.process({
      type: 'content_generation',
      query,
      systemRole,
      contentType: type
    }, {
      service: process.env.API_KEY ? 'gemini' : 'local'
    });

    return result.response;
  } catch (error) {
    console.error("Org content generation error:", error);
    return "Lỗi kết nối AI.";
  }
};

// Initialize AI Service Factory khi import
aiServiceFactory.initialize({
  defaultService: process.env.API_KEY ? 'gemini' : 'local',
  local: {
    modelsPath: './models',
    cachePath: './cache/ai',
    enableOffline: true
  }
}).catch(console.error);
