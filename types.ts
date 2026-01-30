export enum IndustryType {
  RESTAURANT = 'RESTAURANT', // Nhà hàng F&B
  HOTEL = 'HOTEL', // Khách sạn
  BEAUTY = 'BEAUTY', // Spa & Làm đẹp
  REPAIR = 'REPAIR', // Sửa chữa & Bảo trì
  LOGISTICS = 'LOGISTICS', // Vận chuyển
  HEALTHCARE = 'HEALTHCARE', // Y tế & Phòng khám
  EDUCATION = 'EDUCATION', // Giáo dục & Đào tạo
  REAL_ESTATE = 'REAL_ESTATE', // Bất động sản
  EVENTS = 'EVENTS', // Tổ chức sự kiện
  IT_SUPPORT = 'IT_SUPPORT', // Dịch vụ CNTT
  LEGAL = 'LEGAL', // Pháp lý & Luật
  FINANCE = 'FINANCE', // Tài chính & Kế toán
  AGRICULTURE = 'AGRICULTURE', // Nông nghiệp
  CONSTRUCTION = 'CONSTRUCTION', // Xây dựng
  MARKETING = 'MARKETING', // Marketing & Truyền thông
  MANUFACTURING = 'MANUFACTURING', // Sản xuất & Gia công
  TOURISM = 'TOURISM', // Du lịch & Lữ hành
  SECURITY = 'SECURITY', // An ninh & Bảo vệ
  FITNESS = 'FITNESS', // Thể thao & Thể hình
  PET_CARE = 'PET_CARE', // Dịch vụ thú cưng
  RETAIL = 'RETAIL', // Bán lẻ & Chuỗi cửa hàng
  INSURANCE = 'INSURANCE', // Bảo hiểm
  RECRUITMENT = 'RECRUITMENT', // Tuyển dụng & Nhân sự
  CLEANING = 'CLEANING', // Vệ sinh công nghiệp
  FASHION = 'FASHION', // Thời trang & May mặc
  AUTOMOTIVE = 'AUTOMOTIVE', // Dịch vụ Ô tô & Xe
  ENTERTAINMENT = 'ENTERTAINMENT', // Giải trí & Nghệ thuật
  PRINTING = 'PRINTING', // In ấn & Xuất bản
  CONSULTING = 'CONSULTING', // Tư vấn chiến lược
  ENERGY = 'ENERGY', // Năng lượng & Môi trường
  TELECOM = 'TELECOM', // Viễn thông & Internet
  DESIGN = 'DESIGN', // Thiết kế & Sáng tạo
  TRANSLATION = 'TRANSLATION', // Dịch thuật & Ngôn ngữ
  WAREHOUSING = 'WAREHOUSING', // Kho bãi & Lưu trữ
  ENVIRONMENT = 'ENVIRONMENT', // Môi trường & Xử lý thải
  MINING = 'MINING', // Khai khoáng & Tài nguyên
  FISHERY = 'FISHERY', // Thủy hải sản
  FORESTRY = 'FORESTRY', // Lâm nghiệp & Gỗ
  CRAFTS = 'CRAFTS', // Thủ công mỹ nghệ
  RESEARCH = 'RESEARCH', // Nghiên cứu R&D
  AVIATION = 'AVIATION', // Hàng không
  IMPORT_EXPORT = 'IMPORT_EXPORT', // Xuất nhập khẩu
  MEDIA = 'MEDIA', // Truyền thông & Báo chí
  NON_PROFIT = 'NON_PROFIT', // Phi lợi nhuận & NGO
  RENTAL = 'RENTAL', // Dịch vụ cho thuê
  BIOTECH = 'BIOTECH', // Công nghệ sinh học
  ROBOTICS = 'ROBOTICS', // Robotics & Tự động hóa
  SPACE = 'SPACE', // Công nghiệp Vũ trụ
  URBAN_PLANNING = 'URBAN_PLANNING', // Quy hoạch đô thị
  MUSEUM = 'MUSEUM' // Bảo tàng & Di sản
}

export enum Status {
  PENDING = 'PENDING', // Chờ xử lý
  IN_PROGRESS = 'IN_PROGRESS', // Đang thực hiện
  COMPLETED = 'COMPLETED', // Hoàn thành
  CANCELLED = 'CANCELLED' // Đã hủy
}

export interface ServiceRecord {
  id: string;
  industry: IndustryType;
  title: string; // Tên dịch vụ/đơn hàng
  customerName: string;
  amount: number; // Giá trị
  status: Status;
  date: string;
  notes: string;
  priority: 'Low' | 'Medium' | 'High';
}

export interface OperationalMetric {
  name: string;
  value: number;
  change: number; // Percentage change
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// --- New Types for Organization Management ---

export enum RoleLevel {
  C_LEVEL = 'C_LEVEL', // CEO, CFO, CTO
  DIRECTOR = 'DIRECTOR', // Giám đốc khối/Giám đốc dự án
  MANAGER = 'MANAGER', // Trưởng phòng/Chỉ huy trưởng/Quản đốc
  LEADER = 'LEADER', // Trưởng nhóm/Tổ trưởng/Giám sát
  SPECIALIST = 'SPECIALIST', // Chuyên viên/Kỹ sư
  WORKER = 'WORKER', // Nhân viên/Công nhân
  INTERN = 'INTERN' // Thực tập sinh
}

export enum DepartmentType {
  OFFICE = 'OFFICE', // Khối văn phòng
  FACTORY = 'FACTORY', // Nhà xưởng
  SITE = 'SITE' // Công trường
}

export interface Employee {
  id: string;
  name: string;
  avatar?: string;
  role: string; // Tên chức danh cụ thể (VD: Kế toán trưởng)
  level: RoleLevel;
  departmentId: string;
  siteId?: string; // Nếu làm việc tại công trường/nhà máy
  email: string;
  phone: string;
  status: 'Active' | 'OnLeave' | 'Resigned';
  jobDescription?: string; // AI Generated JD
}

export interface Department {
  id: string;
  name: string;
  type: DepartmentType;
  managerId?: string; // ID của trưởng phòng
  parentDeptId?: string; // ID phòng ban cha (nếu có)
  description?: string; // AI Generated Functions
}

export interface WorkSite {
  id: string;
  name: string;
  type: 'CONSTRUCTION_SITE' | 'FACTORY_PLANT';
  location: string;
  directorId: string; // Giám đốc dự án / Giám đốc nhà máy
  safetyRegulations?: string; // AI Generated Safety Rules
}