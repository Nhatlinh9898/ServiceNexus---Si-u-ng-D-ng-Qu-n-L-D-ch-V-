import React, { useState, useEffect } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import OperationsTable from './components/OperationsTable';
import IndustryManagement from './components/IndustryManagement';
import OrganizationManager from './components/OrganizationManager';
import AIConsultant from './components/AIConsultant';
import AIManagementDashboard from './src/components/AIManagementDashboard';
import AnalyticsDashboard from './src/components/AnalyticsDashboard';
import ReportsPage from './src/components/ReportsPage';
import CustomerManagement from './src/components/CustomerManagement';
import DataProcessingAI from './src/components/DataProcessingAI';
import { IndustryType, ServiceRecord, Status } from './types';
import { Bell, UserCircle } from 'lucide-react';

// Seed Data
const initialData: ServiceRecord[] = [
  // Basic Industries
  { id: '1', industry: IndustryType.RESTAURANT, title: 'Tiệc cưới 50 bàn', customerName: 'Nguyễn Văn A', amount: 150000000, status: Status.IN_PROGRESS, date: '2023-10-25', notes: 'Yêu cầu không cay', priority: 'High' },
  { id: '2', industry: IndustryType.HOTEL, title: 'Booking phòng VIP', customerName: 'Trần Thị B', amount: 5000000, status: Status.COMPLETED, date: '2023-10-24', notes: 'Checkin muộn', priority: 'Medium' },
  { id: '3', industry: IndustryType.BEAUTY, title: 'Liệu trình da toàn thân', customerName: 'Lê C', amount: 2000000, status: Status.PENDING, date: '2023-10-26', notes: 'Dị ứng phấn hoa', priority: 'Low' },
  { id: '4', industry: IndustryType.REPAIR, title: 'Bảo trì hệ thống lạnh', customerName: 'Công ty XYZ', amount: 12000000, status: Status.IN_PROGRESS, date: '2023-10-25', notes: 'Cần VAT', priority: 'High' },
  { id: '5', industry: IndustryType.LOGISTICS, title: 'Vận chuyển Hà Nội - SG', customerName: 'Shop ABC', amount: 800000, status: Status.COMPLETED, date: '2023-10-20', notes: 'Hàng dễ vỡ', priority: 'Medium' },
  { id: '6', industry: IndustryType.RESTAURANT, title: 'Đặt bàn tối 4 người', customerName: 'Phạm D', amount: 2000000, status: Status.PENDING, date: '2023-10-27', notes: '', priority: 'Low' },
  
  // Previous Specialized Industries
  { id: '7', industry: IndustryType.HEALTHCARE, title: 'Khám sức khỏe tổng quát', customerName: 'Nguyễn Văn E', amount: 3500000, status: Status.COMPLETED, date: '2023-10-28', notes: 'Lịch hẹn bác sĩ chuyên khoa', priority: 'High' },
  { id: '8', industry: IndustryType.EDUCATION, title: 'Đăng ký khóa IELTS 7.0', customerName: 'Lê Thị F', amount: 9500000, status: Status.IN_PROGRESS, date: '2023-10-29', notes: 'Học viên cần hỗ trợ thêm speaking', priority: 'Medium' },
  { id: '9', industry: IndustryType.REAL_ESTATE, title: 'Ký gửi bán căn hộ Q7', customerName: 'Trần Văn G', amount: 5000000000, status: Status.PENDING, date: '2023-10-30', notes: 'Cần chụp ảnh căn hộ', priority: 'High' },
  { id: '10', industry: IndustryType.EVENTS, title: 'Tổ chức Year End Party', customerName: 'Công ty TechGlobal', amount: 250000000, status: Status.IN_PROGRESS, date: '2023-11-01', notes: 'Chủ đề tương lai', priority: 'High' },
  { id: '11', industry: IndustryType.IT_SUPPORT, title: 'Bảo trì server định kỳ', customerName: 'Tập đoàn H', amount: 15000000, status: Status.COMPLETED, date: '2023-10-25', notes: 'Backup dữ liệu trước khi làm', priority: 'High' },

  // Specialized Industries 2
  { id: '12', industry: IndustryType.LEGAL, title: 'Tư vấn thành lập doanh nghiệp', customerName: 'Startup Alpha', amount: 5000000, status: Status.IN_PROGRESS, date: '2023-11-02', notes: 'Soạn thảo điều lệ công ty', priority: 'High' },
  { id: '13', industry: IndustryType.FINANCE, title: 'Quyết toán thuế năm 2023', customerName: 'Công ty Beta', amount: 20000000, status: Status.PENDING, date: '2023-11-03', notes: 'Kiểm tra hóa đơn đầu vào', priority: 'High' },
  { id: '14', industry: IndustryType.AGRICULTURE, title: 'Cung cấp giống lúa ST25', customerName: 'Hợp tác xã lúa vàng', amount: 50000000, status: Status.COMPLETED, date: '2023-10-20', notes: 'Giao hàng tại kho', priority: 'Medium' },
  { id: '15', industry: IndustryType.CONSTRUCTION, title: 'Thiết kế nội thất biệt thự', customerName: 'Anh K', amount: 150000000, status: Status.IN_PROGRESS, date: '2023-11-05', notes: 'Phong cách tân cổ điển', priority: 'High' },
  { id: '16', industry: IndustryType.MARKETING, title: 'Chiến dịch Facebook Ads', customerName: 'Shop Thời Trang M', amount: 30000000, status: Status.IN_PROGRESS, date: '2023-11-06', notes: 'Target đối tượng Gen Z', priority: 'Medium' },

  // Specialized Industries 3
  { id: '17', industry: IndustryType.MANUFACTURING, title: 'Gia công lô hàng 1000 chi tiết máy', customerName: 'Cơ khí Chính xác X', amount: 500000000, status: Status.IN_PROGRESS, date: '2023-11-07', notes: 'Dung sai 0.01mm', priority: 'High' },
  { id: '18', industry: IndustryType.TOURISM, title: 'Tour Nhật Bản 6N5Đ trọn gói', customerName: 'Đoàn khách Vietinbank', amount: 1200000000, status: Status.PENDING, date: '2023-11-15', notes: 'Cần visa khẩn', priority: 'High' },
  { id: '19', industry: IndustryType.SECURITY, title: 'Bảo vệ sự kiện ra mắt xe', customerName: 'Showroom Auto Z', amount: 25000000, status: Status.COMPLETED, date: '2023-11-01', notes: '10 vệ sĩ chuyên nghiệp', priority: 'Medium' },
  { id: '20', industry: IndustryType.FITNESS, title: 'Gói PT cá nhân 36 buổi', customerName: 'Chị Lan', amount: 18000000, status: Status.IN_PROGRESS, date: '2023-11-08', notes: 'Mục tiêu giảm 5kg', priority: 'Medium' },
  { id: '21', industry: IndustryType.PET_CARE, title: 'Spa & Cắt tỉa lông Poodle', customerName: 'Em Miu', amount: 500000, status: Status.COMPLETED, date: '2023-11-09', notes: 'Chó hơi dữ, cần rọ mõm', priority: 'Low' },

  // Specialized Industries 4
  { id: '22', industry: IndustryType.RETAIL, title: 'Nhập kho 500 iPhone 15', customerName: 'Apple Store VN', amount: 15000000000, status: Status.IN_PROGRESS, date: '2023-11-10', notes: 'Kiểm tra seal kỹ', priority: 'High' },
  { id: '23', industry: IndustryType.INSURANCE, title: 'Hợp đồng bảo hiểm nhân thọ', customerName: 'Nguyễn Thị N', amount: 25000000, status: Status.COMPLETED, date: '2023-11-11', notes: 'Gói bảo vệ trọn đời', priority: 'Medium' },
  { id: '24', industry: IndustryType.RECRUITMENT, title: 'Headhunt Giám đốc Marketing', customerName: 'Corp XYZ', amount: 50000000, status: Status.IN_PROGRESS, date: '2023-11-12', notes: 'Yêu cầu 10 năm kinh nghiệm', priority: 'High' },
  { id: '25', industry: IndustryType.CLEANING, title: 'Vệ sinh tòa nhà văn phòng', customerName: 'Building 123', amount: 15000000, status: Status.PENDING, date: '2023-11-13', notes: 'Làm việc cuối tuần', priority: 'Low' },
  { id: '26', industry: IndustryType.FASHION, title: 'Thiết kế BST Thu Đông', customerName: 'Brand ABC', amount: 80000000, status: Status.IN_PROGRESS, date: '2023-11-14', notes: 'Deadline tuần sau', priority: 'High' },

  // Specialized Industries 5
  { id: '27', industry: IndustryType.AUTOMOTIVE, title: 'Thuê xe Carnival 7 chỗ (3 ngày)', customerName: 'Công ty Du lịch T', amount: 6000000, status: Status.PENDING, date: '2023-11-15', notes: 'Giao xe tại sân bay', priority: 'Medium' },
  { id: '28', industry: IndustryType.ENTERTAINMENT, title: 'Sản xuất TVC Quảng cáo Tết', customerName: 'Nhãn hàng Y', amount: 500000000, status: Status.IN_PROGRESS, date: '2023-11-16', notes: 'Quay tại phim trường Q9', priority: 'High' },
  { id: '29', industry: IndustryType.PRINTING, title: 'In 5000 tờ rơi A5', customerName: 'Siêu thị Z', amount: 5000000, status: Status.COMPLETED, date: '2023-11-17', notes: 'Giấy C150 cán màng', priority: 'Low' },
  { id: '30', industry: IndustryType.CONSULTING, title: 'Tư vấn tái cấu trúc nhân sự', customerName: 'Tập đoàn K', amount: 200000000, status: Status.IN_PROGRESS, date: '2023-11-18', notes: 'Giai đoạn 1: Khảo sát', priority: 'High' },
  { id: '31', industry: IndustryType.ENERGY, title: 'Lắp đặt hệ thống điện mặt trời', customerName: 'Nhà máy P', amount: 1200000000, status: Status.PENDING, date: '2023-11-19', notes: 'Công suất 100kWp', priority: 'High' },

  // Specialized Industries 6
  { id: '32', industry: IndustryType.TELECOM, title: 'Lắp đặt Internet Cáp Quang', customerName: 'Chung cư Blue Sky', amount: 25000000, status: Status.IN_PROGRESS, date: '2023-11-20', notes: 'Thi công 50 ports', priority: 'Medium' },
  { id: '33', industry: IndustryType.DESIGN, title: 'Thiết kế Bộ nhận diện thương hiệu', customerName: 'Startup Foodie', amount: 35000000, status: Status.PENDING, date: '2023-11-21', notes: 'Phong cách tối giản', priority: 'High' },
  { id: '34', industry: IndustryType.TRANSLATION, title: 'Dịch thuật hồ sơ thầu (Anh-Việt)', customerName: 'Công ty Xây dựng M', amount: 12000000, status: Status.COMPLETED, date: '2023-11-22', notes: '500 trang kỹ thuật', priority: 'High' },
  { id: '35', industry: IndustryType.WAREHOUSING, title: 'Thuê kho mát 200m2 (Tháng 12)', customerName: 'Chuỗi Siêu thị S', amount: 80000000, status: Status.IN_PROGRESS, date: '2023-11-23', notes: 'Nhiệt độ 18-22 độ C', priority: 'Medium' },
  { id: '36', industry: IndustryType.ENVIRONMENT, title: 'Xử lý rác thải y tế', customerName: 'Bệnh viện Đa khoa T', amount: 45000000, status: Status.PENDING, date: '2023-11-24', notes: 'Quy trình khép kín', priority: 'High' },

  // Specialized Industries 7
  { id: '37', industry: IndustryType.MINING, title: 'Khai thác đá vôi lô B', customerName: 'Mỏ Đá Hà Nam', amount: 2500000000, status: Status.IN_PROGRESS, date: '2023-11-25', notes: 'Sản lượng 5000 tấn', priority: 'High' },
  { id: '38', industry: IndustryType.FISHERY, title: 'Thu mua tôm thẻ chân trắng', customerName: 'Hộ nuôi Cà Mau', amount: 850000000, status: Status.PENDING, date: '2023-11-26', notes: 'Size 30 con/kg', priority: 'Medium' },
  { id: '39', industry: IndustryType.FORESTRY, title: 'Trồng rừng keo lai 10ha', customerName: 'Dự án Xanh', amount: 350000000, status: Status.COMPLETED, date: '2023-11-27', notes: 'Nghiệm thu cây giống', priority: 'Low' },
  { id: '40', industry: IndustryType.CRAFTS, title: 'Xuất khẩu lô hàng mây tre đan', customerName: 'Đối tác EU', amount: 600000000, status: Status.IN_PROGRESS, date: '2023-11-28', notes: 'Đóng gói tiêu chuẩn', priority: 'High' },
  { id: '41', industry: IndustryType.RESEARCH, title: 'Nghiên cứu vacxin cúm gia cầm', customerName: 'Viện Thú Y', amount: 5000000000, status: Status.PENDING, date: '2023-11-29', notes: 'Thử nghiệm giai đoạn 2', priority: 'High' },

  // Specialized Industries 8
  { id: '42', industry: IndustryType.AVIATION, title: 'Bảo dưỡng động cơ Jet A1', customerName: 'Hãng Hàng không V', amount: 15000000000, status: Status.IN_PROGRESS, date: '2023-11-30', notes: 'Bảo dưỡng định kỳ cấp C', priority: 'High' },
  { id: '43', industry: IndustryType.IMPORT_EXPORT, title: 'Thông quan lô hàng điện tử', customerName: 'Công ty Tech Import', amount: 55000000, status: Status.COMPLETED, date: '2023-12-01', notes: 'HS Code 8517', priority: 'High' },
  { id: '44', industry: IndustryType.MEDIA, title: 'Sản xuất phóng sự truyền hình', customerName: 'Đài THVN', amount: 120000000, status: Status.IN_PROGRESS, date: '2023-12-02', notes: 'Chủ đề khởi nghiệp', priority: 'Medium' },
  { id: '45', industry: IndustryType.NON_PROFIT, title: 'Gây quỹ từ thiện Mùa Đông', customerName: 'Quỹ Vì Cộng Đồng', amount: 500000000, status: Status.PENDING, date: '2023-12-03', notes: 'Mục tiêu 1000 phần quà', priority: 'High' },
  { id: '46', industry: IndustryType.RENTAL, title: 'Cho thuê thiết bị âm thanh ánh sáng', customerName: 'Event Agency X', amount: 35000000, status: Status.COMPLETED, date: '2023-12-04', notes: 'Setup trước 2 ngày', priority: 'Medium' },

  // Specialized Industries 9 (New High-Tech)
  { id: '47', industry: IndustryType.BIOTECH, title: 'Phân tích trình tự Gen mẫu bệnh phẩm', customerName: 'Lab Gen Việt', amount: 15000000, status: Status.IN_PROGRESS, date: '2023-12-05', notes: 'Độ chính xác 99.9%', priority: 'High' },
  { id: '48', industry: IndustryType.ROBOTICS, title: 'Lập trình cánh tay robot hàn tự động', customerName: 'Nhà máy VinFast', amount: 850000000, status: Status.PENDING, date: '2023-12-06', notes: 'Tích hợp AI Vision', priority: 'High' },
  { id: '49', industry: IndustryType.SPACE, title: 'Xử lý dữ liệu ảnh vệ tinh viễn thám', customerName: 'Trung tâm Vũ trụ', amount: 2000000000, status: Status.COMPLETED, date: '2023-12-07', notes: 'Độ phân giải cao', priority: 'Medium' },
  { id: '50', industry: IndustryType.URBAN_PLANNING, title: 'Quy hoạch khu đô thị thông minh 50ha', customerName: 'Tập đoàn BĐS Sun', amount: 5000000000, status: Status.IN_PROGRESS, date: '2023-12-08', notes: 'Thiết kế cảnh quan xanh', priority: 'High' },
  { id: '51', industry: IndustryType.MUSEUM, title: 'Số hóa 3D cổ vật triều Nguyễn', customerName: 'Bảo tàng Lịch sử', amount: 300000000, status: Status.PENDING, date: '2023-12-09', notes: 'Tạo tour tham quan VR', priority: 'Low' },
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('DASHBOARD');
  const [currentIndustry, setCurrentIndustry] = useState<IndustryType | 'ALL'>('ALL');
  const [data, setData] = useState<ServiceRecord[]>(initialData);

  // CRUD Handlers
  const handleAdd = (record: Omit<ServiceRecord, 'id'>) => {
    const newRecord = { ...record, id: Date.now().toString() };
    setData([newRecord, ...data]);
  };

  const handleEdit = (id: string, updatedRecord: Partial<ServiceRecord>) => {
    setData(data.map(item => (item.id === id ? { ...item, ...updatedRecord } : item)));
  };

  const handleDelete = (id: string) => {
    if(confirm('Bạn có chắc chắn muốn xóa không?')) {
        setData(data.filter(item => item.id !== id));
    }
  };

  const getHeaderTitle = () => {
    if (currentView === 'DASHBOARD') return 'Bảng Điều Khiển Trung Tâm';
    if (currentView === 'AI_ASSISTANT') return 'Trợ Lý Tư Vấn Vận Hành';
    if (currentView === 'AI_MANAGEMENT') return 'AI Management Center';
    if (currentView === 'ORGANIZATION') return 'Sơ Đồ & Cơ Cấu Tổ Chức';
    if (currentView === 'OPERATIONS') {
        switch(currentIndustry) {
            case IndustryType.RESTAURANT: return 'Quản lý Nhà hàng & F&B';
            case IndustryType.HOTEL: return 'Quản lý Khách sạn & Lưu trú';
            case IndustryType.BEAUTY: return 'Quản lý Spa & Làm đẹp';
            case IndustryType.REPAIR: return 'Quản lý Bảo trì & Sửa chữa';
            case IndustryType.LOGISTICS: return 'Quản lý Vận chuyển & Kho bãi';
            case IndustryType.HEALTHCARE: return 'Quản lý Y tế & Phòng khám';
            case IndustryType.EDUCATION: return 'Quản lý Giáo dục & Đào tạo';
            case IndustryType.REAL_ESTATE: return 'Quản lý Bất động sản';
            case IndustryType.EVENTS: return 'Quản lý Sự kiện & Hội thảo';
            case IndustryType.IT_SUPPORT: return 'Dịch vụ CNTT & Hạ tầng';
            case IndustryType.LEGAL: return 'Dịch vụ Pháp lý & Luật';
            case IndustryType.FINANCE: return 'Dịch vụ Tài chính & Kế toán';
            case IndustryType.AGRICULTURE: return 'Quản lý Nông nghiệp & Trang trại';
            case IndustryType.CONSTRUCTION: return 'Quản lý Xây dựng & Kiến trúc';
            case IndustryType.MARKETING: return 'Quản lý Truyền thông & Marketing';
            case IndustryType.MANUFACTURING: return 'Quản lý Sản xuất & Gia công';
            case IndustryType.TOURISM: return 'Quản lý Du lịch & Lữ hành';
            case IndustryType.SECURITY: return 'Dịch vụ An ninh & Bảo vệ';
            case IndustryType.FITNESS: return 'Quản lý Thể thao & Fitness';
            case IndustryType.PET_CARE: return 'Dịch vụ Chăm sóc Thú cưng';
            case IndustryType.RETAIL: return 'Quản lý Bán lẻ & Cửa hàng';
            case IndustryType.INSURANCE: return 'Quản lý Dịch vụ Bảo hiểm';
            case IndustryType.RECRUITMENT: return 'Quản lý Tuyển dụng & Nhân sự';
            case IndustryType.CLEANING: return 'Dịch vụ Vệ sinh Công nghiệp';
            case IndustryType.FASHION: return 'Quản lý Thời trang & May mặc';
            case IndustryType.AUTOMOTIVE: return 'Quản lý Dịch vụ Ô tô & Xe';
            case IndustryType.ENTERTAINMENT: return 'Quản lý Giải trí & Nghệ thuật';
            case IndustryType.PRINTING: return 'Dịch vụ In ấn & Xuất bản';
            case IndustryType.CONSULTING: return 'Dịch vụ Tư vấn Chiến lược';
            case IndustryType.ENERGY: return 'Quản lý Năng lượng & Môi trường';
            case IndustryType.TELECOM: return 'Quản lý Viễn thông & Internet';
            case IndustryType.DESIGN: return 'Dịch vụ Thiết kế & Sáng tạo';
            case IndustryType.TRANSLATION: return 'Dịch vụ Dịch thuật & Ngôn ngữ';
            case IndustryType.WAREHOUSING: return 'Quản lý Kho bãi & Lưu trữ';
            case IndustryType.ENVIRONMENT: return 'Dịch vụ Môi trường & Xử lý thải';
            case IndustryType.MINING: return 'Quản lý Khai khoáng & Tài nguyên';
            case IndustryType.FISHERY: return 'Quản lý Thủy hải sản';
            case IndustryType.FORESTRY: return 'Quản lý Lâm nghiệp & Gỗ';
            case IndustryType.CRAFTS: return 'Quản lý Thủ công mỹ nghệ';
            case IndustryType.RESEARCH: return 'Quản lý Nghiên cứu & R&D';
            case IndustryType.AVIATION: return 'Dịch vụ Hàng không & Sân bay';
            case IndustryType.IMPORT_EXPORT: return 'Xuất Nhập Khẩu & Hải Quan';
            case IndustryType.MEDIA: return 'Truyền thông & Báo chí';
            case IndustryType.NON_PROFIT: return 'Tổ chức Phi lợi nhuận & NGO';
            case IndustryType.RENTAL: return 'Dịch vụ Cho thuê tài sản';
            case IndustryType.BIOTECH: return 'Công nghệ Sinh học & Gen';
            case IndustryType.ROBOTICS: return 'Robotics & Tự động hóa';
            case IndustryType.SPACE: return 'Công nghiệp Vũ trụ & Vệ tinh';
            case IndustryType.URBAN_PLANNING: return 'Quy hoạch & Phát triển Đô thị';
            case IndustryType.MUSEUM: return 'Quản lý Bảo tàng & Di sản';
            default: return 'Quản lý Vận hành';
        }
    }
    return 'ServiceNexus';
  };

  return (
    <Router>
      <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900">
        <Sidebar 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          currentIndustry={currentIndustry}
          onChangeIndustry={setCurrentIndustry}
        />

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm z-10">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">{getHeaderTitle()}</h1>
            <div className="flex items-center space-x-6">
              <div className="relative cursor-pointer text-gray-500 hover:text-indigo-600 transition-colors">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              </div>
              <div className="flex items-center space-x-3 pl-6 border-l border-gray-100 cursor-pointer group">
                 <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">Admin User</p>
                    <p className="text-xs text-gray-400">Super Admin</p>
                 </div>
                 <UserCircle size={32} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
            <div className="max-w-7xl mx-auto">
                {currentView === 'DASHBOARD' && (
                    <Dashboard data={data} />
                )}

                {currentView === 'AI_ASSISTANT' && (
                    <AIConsultant />
                )}

                {currentView === 'AI_MANAGEMENT' && (
                    <AIManagementDashboard />
                )}

                {currentView === 'ANALYTICS' && (
                    <AnalyticsDashboard />
                )}

                {currentView === 'REPORTS' && (
                    <ReportsPage />
                )}

                {currentView === 'CUSTOMERS' && (
                    <CustomerManagement />
                )}

                {currentView === 'DATA_PROCESSING' && (
                    <DataProcessingAI />
                )}

                {currentView === 'ORGANIZATION' && (
                    <OrganizationManager />
                )}

                {currentView === 'OPERATIONS' && currentIndustry !== 'ALL' && (
                    <IndustryManagement industry={currentIndustry as IndustryType} data={data}>
                        <OperationsTable 
                            data={data} 
                            industry={currentIndustry as IndustryType}
                            onAdd={handleAdd}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    </IndustryManagement>
                )}
            </div>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;