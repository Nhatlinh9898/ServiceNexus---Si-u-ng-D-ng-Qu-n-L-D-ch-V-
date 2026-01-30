import { GoogleGenAI } from "@google/genai";
import { ServiceRecord, IndustryType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Generic AI consultant helper
export const getOperationalAdvice = async (
  query: string, 
  contextData?: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const systemPrompt = `Bạn là một chuyên gia tư vấn vận hành doanh nghiệp cao cấp (COO AI). 
    Bạn có kiến thức sâu rộng về tất cả các ngành dịch vụ (Nhà hàng, Khách sạn, Spa, v.v.).
    Hãy trả lời ngắn gọn, súc tích, chuyên nghiệp và đưa ra các bước hành động cụ thể.
    Định dạng câu trả lời bằng Markdown.`;

    const fullPrompt = contextData 
      ? `Dữ liệu hiện tại: ${contextData}\n\nCâu hỏi: ${query}` 
      : query;

    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    return response.text || "Xin lỗi, tôi không thể đưa ra lời khuyên lúc này.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Đã xảy ra lỗi khi kết nối với trợ lý AI. Vui lòng kiểm tra API Key.";
  }
};

// Function to generate fake data for demo purposes
export const generateMockData = async (industry: IndustryType, count: number): Promise<ServiceRecord[]> => {
    return []; 
};

export const analyzeData = async (records: ServiceRecord[]): Promise<string> => {
    try {
        const summary = JSON.stringify(records.slice(0, 20)); // Limit context
        const prompt = `Phân tích danh sách các đơn dịch vụ sau đây và đưa ra 3 nhận xét quan trọng về hiệu suất vận hành và 3 đề xuất cải thiện. Tập trung vào doanh thu và trạng thái đơn hàng.`;
        
        return await getOperationalAdvice(prompt, summary);
    } catch (e) {
        return "Không thể phân tích dữ liệu.";
    }
}

// --- Organization AI Generators ---

export type OrgContentType = 'JOB_DESCRIPTION' | 'SAFETY_REGULATIONS' | 'DEPT_FUNCTIONS';

export const generateOrgContent = async (type: OrgContentType, context: any): Promise<string> => {
  try {
    let prompt = "";
    let systemRole = "";

    if (type === 'JOB_DESCRIPTION') {
      systemRole = "Bạn là Giám đốc Nhân sự (CHRO) chuyên nghiệp.";
      prompt = `Hãy viết bản mô tả công việc (JD) ngắn gọn (3-5 gạch đầu dòng) cho vị trí: ${context.role} thuộc phòng ban/đơn vị ${context.departmentName}. Yêu cầu: Văn phong chuyên nghiệp, tập trung vào kết quả.`;
    } 
    else if (type === 'SAFETY_REGULATIONS') {
      systemRole = "Bạn là Giám đốc An toàn Lao động (HSE Manager).";
      prompt = `Hãy liệt kê 3-5 quy định an toàn quan trọng nhất cần tuân thủ tại: ${context.siteName} (Loại hình: ${context.siteType}, Địa điểm: ${context.location}). Viết ngắn gọn, dễ hiểu.`;
    }
    else if (type === 'DEPT_FUNCTIONS') {
      systemRole = "Bạn là Chuyên gia Tái cấu trúc Doanh nghiệp.";
      prompt = `Hãy liệt kê 3 chức năng & nhiệm vụ cốt lõi của phòng ban: ${context.deptName} (Loại hình: ${context.deptType}). Viết ngắn gọn.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemRole,
      }
    });

    return response.text || "Không thể tạo nội dung.";
  } catch (error) {
    console.error("Gemini Org Gen Error:", error);
    return "Lỗi kết nối AI.";
  }
};