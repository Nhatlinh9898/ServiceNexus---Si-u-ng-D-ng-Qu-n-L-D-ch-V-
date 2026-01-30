import React from 'react';
import { IndustryType, ServiceRecord, Status } from '../types';
import { 
  Briefcase, TrendingUp, AlertCircle, CheckCircle, 
  Plus, FileText, Settings, Users, ArrowUpRight,
  Zap, Activity, Box, Clipboard
} from 'lucide-react';

interface IndustryManagementProps {
  industry: IndustryType;
  data: ServiceRecord[];
  children: React.ReactNode;
}

interface IndustryTheme {
  name: string;
  color: string;
  gradient: string;
  primaryMetric: string;
  secondaryMetric: string;
  actionLabels: string[];
  description: string;
}

const getIndustryTheme = (type: IndustryType): IndustryTheme => {
  // Mapping logic to create specialized environments
  const defaultTheme: IndustryTheme = {
    name: 'Quản Lý Vận Hành',
    color: 'text-gray-600',
    gradient: 'from-gray-500 to-gray-700',
    primaryMetric: 'Tổng Yêu Cầu',
    secondaryMetric: 'Hiệu Suất',
    actionLabels: ['Tạo Yêu Cầu', 'Xuất Báo Cáo', 'Cấu Hình'],
    description: 'Hệ thống quản lý dịch vụ tổng hợp'
  };

  switch (type) {
    // F&B & Hospitality
    case IndustryType.RESTAURANT:
      return {
        name: 'Trung Tâm Điều Hành F&B',
        color: 'text-orange-600',
        gradient: 'from-orange-500 to-red-600',
        primaryMetric: 'Đơn Đặt Bàn',
        secondaryMetric: 'Tỷ Lệ Lấp Đầy',
        actionLabels: ['Thêm Món Mới', 'Đặt Bàn Nhanh', 'Kho Nguyên Liệu'],
        description: 'Quản lý bếp, đặt bàn và kho hàng thực phẩm'
      };
    case IndustryType.HOTEL:
      return {
        name: 'Hệ Thống Quản Lý Lưu Trú',
        color: 'text-blue-600',
        gradient: 'from-blue-500 to-indigo-600',
        primaryMetric: 'Phòng Đã Đặt',
        secondaryMetric: 'Công Suất Phòng',
        actionLabels: ['Check-in Khách', 'Dọn Phòng', 'Dịch Vụ Phòng'],
        description: 'Quản lý buồng phòng, check-in/out và dịch vụ khách hàng'
      };
    
    // Healthcare
    case IndustryType.HEALTHCARE:
    case IndustryType.BIOTECH:
      return {
        name: 'Hệ Thống Thông Tin Y Tế',
        color: 'text-teal-600',
        gradient: 'from-teal-500 to-emerald-600',
        primaryMetric: 'Bệnh Nhân',
        secondaryMetric: 'Ca Cấp Cứu',
        actionLabels: ['Tiếp Nhận BN', 'Lịch Khám', 'Hồ Sơ Bệnh Án'],
        description: 'Quản lý hồ sơ bệnh nhân, lịch khám và xét nghiệm'
      };

    // Construction & Real Estate & Urban
    case IndustryType.CONSTRUCTION:
    case IndustryType.REAL_ESTATE:
    case IndustryType.URBAN_PLANNING:
      return {
        name: 'Quản Lý Dự Án & Công Trình',
        color: 'text-amber-600',
        gradient: 'from-amber-500 to-yellow-600',
        primaryMetric: 'Hạng Mục',
        secondaryMetric: 'Tiến Độ',
        actionLabels: ['Cập Nhật Tiến Độ', 'Vật Tư', 'Bản Vẽ'],
        description: 'Theo dõi tiến độ thi công, vật tư và thiết kế'
      };

    // Tech & High-Tech
    case IndustryType.IT_SUPPORT:
    case IndustryType.ROBOTICS:
    case IndustryType.SPACE:
      return {
        name: 'Trung Tâm Chỉ Huy Công Nghệ',
        color: 'text-violet-600',
        gradient: 'from-violet-500 to-purple-600',
        primaryMetric: 'Tickets',
        secondaryMetric: 'Uptime',
        actionLabels: ['Deploy', 'Monitor', 'Debug Log'],
        description: 'Giám sát hệ thống, triển khai và xử lý sự cố'
      };

    // Logistics & Trade
    case IndustryType.LOGISTICS:
    case IndustryType.IMPORT_EXPORT:
    case IndustryType.AVIATION:
    case IndustryType.WAREHOUSING:
      return {
        name: 'Hệ Thống Logistics & Chuỗi Cung Ứng',
        color: 'text-sky-600',
        gradient: 'from-sky-500 to-cyan-600',
        primaryMetric: 'Lô Hàng',
        secondaryMetric: 'Vận Tải',
        actionLabels: ['Tạo Vận Đơn', 'Kiểm Kho', 'Theo Dõi Lộ Trình'],
        description: 'Quản lý kho bãi, vận chuyển và thủ tục hải quan'
      };

    // Finance & Legal
    case IndustryType.FINANCE:
    case IndustryType.LEGAL:
    case IndustryType.INSURANCE:
      return {
        name: 'Hệ Thống Nghiệp Vụ Chuyên Môn',
        color: 'text-slate-700',
        gradient: 'from-slate-600 to-gray-800',
        primaryMetric: 'Hồ Sơ Vụ Việc',
        secondaryMetric: 'Xử Lý',
        actionLabels: ['Hồ Sơ Mới', 'Thẩm Định', 'Lưu Trữ'],
        description: 'Quản lý hồ sơ, hợp đồng và quy trình nghiệp vụ'
      };

    default:
      return defaultTheme;
  }
};

const IndustryManagement: React.FC<IndustryManagementProps> = ({ industry, data, children }) => {
  const theme = getIndustryTheme(industry);
  const filteredData = data.filter(d => d.industry === industry);
  
  const totalItems = filteredData.length;
  const activeItems = filteredData.filter(d => d.status === Status.IN_PROGRESS || d.status === Status.PENDING).length;
  const completedItems = filteredData.filter(d => d.status === Status.COMPLETED).length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Specialized Header */}
      <div className={`rounded-2xl p-6 bg-gradient-to-r ${theme.gradient} text-white shadow-lg relative overflow-hidden`}>
        <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-10 -translate-y-10">
          <Briefcase size={200} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Zap size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{theme.name}</h2>
          </div>
          <p className="text-white/80 max-w-xl">{theme.description}</p>
          
          <div className="mt-8 flex gap-4">
             {theme.actionLabels.map((label, idx) => (
               <button 
                key={idx}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg backdrop-blur-sm transition-all text-sm font-medium"
               >
                 {idx === 0 ? <Plus size={16} /> : idx === 1 ? <FileText size={16} /> : <Settings size={16} />}
                 {label}
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* Contextual Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase">{theme.primaryMetric}</p>
            <h4 className={`text-2xl font-bold mt-1 ${theme.color}`}>{totalItems}</h4>
          </div>
          <div className="p-3 bg-gray-50 rounded-full text-gray-400">
            <Box size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase">Đang Xử Lý</p>
            <h4 className="text-2xl font-bold mt-1 text-blue-600">{activeItems}</h4>
          </div>
          <div className="p-3 bg-blue-50 rounded-full text-blue-500">
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase">Hoàn Thành</p>
            <h4 className="text-2xl font-bold mt-1 text-green-600">{completedItems}</h4>
          </div>
          <div className="p-3 bg-green-50 rounded-full text-green-500">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase">{theme.secondaryMetric}</p>
            <div className="flex items-baseline gap-2">
               <h4 className="text-2xl font-bold mt-1 text-gray-800">{completionRate}%</h4>
               <span className="text-xs text-green-500 font-medium flex items-center">
                 <ArrowUpRight size={12} /> +2.4%
               </span>
            </div>
          </div>
          <div className="p-3 bg-purple-50 rounded-full text-purple-500">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* Main Content Area (The Table) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1">
        {children}
      </div>
    </div>
  );
};

export default IndustryManagement;
