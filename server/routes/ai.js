// AI Routes
// AI-powered features and endpoints

const express = require('express');
const { AppError } = require('../middleware/errorHandler');
const { GoogleGenAI } = require('@google/genai');
const pool = require('../config/database');

const router = express.Router();

// Initialize Google AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// AI operational advice
router.post('/advice', async (req, res, next) => {
  try {
    const { query, context_data, organization_id } = req.body;
    
    if (!query) {
      return next(new AppError('Query is required', 400));
    }
    
    const systemPrompt = `Bạn là một chuyên gia tư vấn vận hành doanh nghiệp cao cấp (COO AI). 
    Bạn có kiến thức sâu rộng về tất cả các ngành dịch vụ (Nhà hàng, Khách sạn, Spa, v.v.).
    Hãy trả lời ngắn gọn, súc tích, chuyên nghiệp và đưa ra các bước hành động cụ thể.
    Định dạng câu trả lời bằng Markdown.`;
    
    const fullPrompt = context_data 
      ? `Dữ liệu hiện tại: ${context_data}\n\nCâu hỏi: ${query}` 
      : query;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: systemPrompt,
      }
    });
    
    const advice = response.text || "Xin lỗi, tôi không thể đưa ra lời khuyên lúc này.";
    
    // Log AI conversation
    if (organization_id) {
      await pool.query(`
        INSERT INTO ai_conversations (user_id, organization_id, session_id, message_type, content, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        1, // TODO: Replace with actual user ID from auth
        organization_id,
        `session_${Date.now()}`,
        'user',
        query,
        JSON.stringify({ context_data })
      ]);
      
      await pool.query(`
        INSERT INTO ai_conversations (user_id, organization_id, session_id, message_type, content, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        1,
        organization_id,
        `session_${Date.now()}`,
        'assistant',
        advice,
        JSON.stringify({ query, context_data })
      ]);
    }
    
    res.json({
      status: 'success',
      data: {
        advice,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Gemini API Error:', error);
    next(new AppError('Đã xảy ra lỗi khi kết nối với trợ lý AI. Vui lòng kiểm tra API Key.', 500));
  }
});

// Analyze service data
router.post('/analyze-services', async (req, res, next) => {
  try {
    const { organization_id, date_from, date_to } = req.body;
    
    if (!organization_id) {
      return next(new AppError('Organization ID is required', 400));
    }
    
    // Get service records for analysis
    let query = `
      SELECT title, industry_type, customer_name, amount, status, priority, date, notes
      FROM service_records
      WHERE organization_id = $1
    `;
    
    const params = [organization_id];
    let paramIndex = 2;
    
    if (date_from) {
      query += ` AND date >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }
    
    if (date_to) {
      query += ` AND date <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }
    
    query += ` ORDER BY date DESC LIMIT 50`;
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return next(new AppError('No service records found for analysis', 404));
    }
    
    const serviceData = JSON.stringify(result.rows.slice(0, 20)); // Limit context
    
    const prompt = `Phân tích danh sách các đơn dịch vụ sau đây và đưa ra 3 nhận xét quan trọng về hiệu suất vận hành và 3 đề xuất cải thiện. Tập trung vào doanh thu và trạng thái đơn hàng.`;
    
    const systemPrompt = `Bạn là chuyên gia phân tích dữ liệu kinh doanh. Hãy phân tích dữ liệu dịch vụ và đưa ra những nhận xét sâu sắc.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Dữ liệu dịch vụ: ${serviceData}\n\n${prompt}`,
      config: {
        systemInstruction: systemPrompt,
      }
    });
    
    const analysis = response.text || "Không thể phân tích dữ liệu.";
    
    // Store AI insight
    await pool.query(`
      INSERT INTO ai_insights (organization_id, insight_type, title, content, confidence_score, data_source)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      organization_id,
      'performance',
      'Service Performance Analysis',
      analysis,
      0.85,
      'service_records'
    ]);
    
    res.json({
      status: 'success',
      data: {
        analysis,
        records_analyzed: result.rows.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI Analysis Error:', error);
    next(new AppError('Failed to analyze service data', 500));
  }
});

// Generate organizational content
router.post('/generate-content', async (req, res, next) => {
  try {
    const { type, context } = req.body;
    
    if (!type || !context) {
      return next(new AppError('Content type and context are required', 400));
    }
    
    let prompt = '';
    let systemRole = '';
    let title = '';
    
    switch (type) {
      case 'JOB_DESCRIPTION':
        systemRole = 'Bạn là Giám đốc Nhân sự (CHRO) chuyên nghiệp.';
        prompt = `Hãy viết bản mô tả công việc (JD) ngắn gọn (3-5 gạch đầu dòng) cho vị trí: ${context.role} thuộc phòng ban/đơn vị ${context.departmentName}. Yêu cầu: Văn phong chuyên nghiệp, tập trung vào kết quả.`;
        title = `Job Description for ${context.role}`;
        break;
        
      case 'SAFETY_REGULATIONS':
        systemRole = 'Bạn là Giám đốc An toàn Lao động (HSE Manager).';
        prompt = `Hãy liệt kê 3-5 quy định an toàn quan trọng nhất cần tuân thủ tại: ${context.siteName} (Loại hình: ${context.siteType}, Địa điểm: ${context.location}). Viết ngắn gọn, dễ hiểu.`;
        title = `Safety Regulations for ${context.siteName}`;
        break;
        
      case 'DEPT_FUNCTIONS':
        systemRole = 'Bạn là Chuyên gia Tái cấu trúc Doanh nghiệp.';
        prompt = `Hãy liệt kê 3 chức năng & nhiệm vụ cốt lõi của phòng ban: ${context.deptName} (Loại hình: ${context.deptType}). Viết ngắn gọn.`;
        title = `Functions for ${context.deptName}`;
        break;
        
      default:
        return next(new AppError('Invalid content type', 400));
    }
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemRole,
      }
    });
    
    const content = response.text || "Không thể tạo nội dung.";
    
    res.json({
      status: 'success',
      data: {
        type,
        title,
        content,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Content Generation Error:', error);
    next(new AppError('Failed to generate content', 500));
  }
});

// Get AI conversation history
router.get('/conversations', async (req, res, next) => {
  try {
    const { organization_id, session_id, page = 1, limit = 20 } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT ac.*, u.email as user_email
      FROM ai_conversations ac
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (organization_id) {
      query += ` AND ac.organization_id = $${paramIndex}`;
      params.push(organization_id);
      paramIndex++;
    }
    
    if (session_id) {
      query += ` AND ac.session_id = $${paramIndex}`;
      params.push(session_id);
      paramIndex++;
    }
    
    query += ` ORDER BY ac.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM ai_conversations WHERE 1=1';
    const countParams = [];
    let countIndex = 1;
    
    if (organization_id) {
      countQuery += ` AND organization_id = $${countIndex}`;
      countParams.push(organization_id);
      countIndex++;
    }
    
    if (session_id) {
      countQuery += ` AND session_id = $${countIndex}`;
      countParams.push(session_id);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalConversations = parseInt(countResult.rows[0].count);
    
    res.json({
      status: 'success',
      data: {
        conversations: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalConversations,
          pages: Math.ceil(totalConversations / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get AI insights
router.get('/insights', async (req, res, next) => {
  try {
    const { organization_id, insight_type, page = 1, limit = 10 } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM ai_insights
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (organization_id) {
      query += ` AND organization_id = $${paramIndex}`;
      params.push(organization_id);
      paramIndex++;
    }
    
    if (insight_type) {
      query += ` AND insight_type = $${paramIndex}`;
      params.push(insight_type);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM ai_insights WHERE 1=1';
    const countParams = [];
    let countIndex = 1;
    
    if (organization_id) {
      countQuery += ` AND organization_id = $${countIndex}`;
      countParams.push(organization_id);
      countIndex++;
    }
    
    if (insight_type) {
      countQuery += ` AND insight_type = $${countIndex}`;
      countParams.push(insight_type);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const totalInsights = parseInt(countResult.rows[0].count);
    
    res.json({
      status: 'success',
      data: {
        insights: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalInsights,
          pages: Math.ceil(totalInsights / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Mark insight as actioned
router.patch('/insights/:id/action', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE ai_insights SET is_actioned = true WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return next(new AppError('Insight not found', 404));
    }
    
    res.json({
      status: 'success',
      message: 'Insight marked as actioned',
      data: {
        insight: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
