import React from 'react';
import { 
  LayoutDashboard, Utensils, Hotel, Scissors, Wrench, Truck, Settings, Bot,
  Stethoscope, GraduationCap, Building2, CalendarDays, Monitor,
  Scale, Calculator, Sprout, HardHat, Megaphone,
  Factory, Plane, ShieldCheck, Dumbbell, PawPrint,
  ShoppingBag, Umbrella, UserPlus, SprayCan, Shirt,
  Car, Clapperboard, Printer, Briefcase, Zap,
  Wifi, PenTool, Languages, Warehouse, Recycle,
  Pickaxe, Fish, Trees, Hammer, FlaskConical,
  Rocket, Globe, Tv, Heart, Key,
  Dna, Cpu, Satellite, Map, Landmark,
  Network, Users
} from 'lucide-react';
import { IndustryType } from '../types';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  currentIndustry: IndustryType | 'ALL';
  onChangeIndustry: (ind: IndustryType | 'ALL') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, currentIndustry, onChangeIndustry }) => {
  
  const navItemClass = (isActive: boolean) => 
    `flex items-center space-x-3 px-4 py-3 cursor-pointer rounded-lg transition-colors duration-200 ${
      isActive 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col text-slate-300 border-r border-slate-800">
      <div className="p-6 flex items-center space-x-2 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <span className="font-bold text-white text-xl">S</span>
        </div>
        <span className="text-xl font-bold text-white tracking-wide">ServiceNexus</span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Tổng quan</div>
        
        <div onClick={() => onChangeView('DASHBOARD')} className={navItemClass(currentView === 'DASHBOARD')}>
          <LayoutDashboard size={20} />
          <span>Bảng điều khiển</span>
        </div>

        <div onClick={() => onChangeView('ORGANIZATION')} className={navItemClass(currentView === 'ORGANIZATION')}>
          <Network size={20} />
          <span>Cơ Cấu Tổ Chức</span>
        </div>

        <div onClick={() => onChangeView('AI_ASSISTANT')} className={navItemClass(currentView === 'AI_ASSISTANT')}>
          <Bot size={20} />
          <span>Trợ lý Vận hành AI</span>
        </div>

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Ngành Dịch Vụ Cơ Bản</div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.RESTAURANT); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.RESTAURANT)}
        >
          <Utensils size={20} />
          <span>Nhà hàng (F&B)</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.HOTEL); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.HOTEL)}
        >
          <Hotel size={20} />
          <span>Khách sạn</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.BEAUTY); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.BEAUTY)}
        >
          <Scissors size={20} />
          <span>Làm đẹp & Spa</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.REPAIR); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.REPAIR)}
        >
          <Wrench size={20} />
          <span>Bảo trì & Sửa chữa</span>
        </div>

         <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.LOGISTICS); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.LOGISTICS)}
        >
          <Truck size={20} />
          <span>Vận chuyển</span>
        </div>

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Dịch Vụ Chuyên Môn</div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.HEALTHCARE); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.HEALTHCARE)}
        >
          <Stethoscope size={20} />
          <span>Y tế & Phòng khám</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.EDUCATION); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.EDUCATION)}
        >
          <GraduationCap size={20} />
          <span>Giáo dục & Đào tạo</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.REAL_ESTATE); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.REAL_ESTATE)}
        >
          <Building2 size={20} />
          <span>Bất động sản</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.EVENTS); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.EVENTS)}
        >
          <CalendarDays size={20} />
          <span>Tổ chức sự kiện</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.IT_SUPPORT); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.IT_SUPPORT)}
        >
          <Monitor size={20} />
          <span>Dịch vụ CNTT</span>
        </div>

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Doanh Nghiệp & Sản Xuất</div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.LEGAL); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.LEGAL)}
        >
          <Scale size={20} />
          <span>Pháp lý & Luật</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.FINANCE); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.FINANCE)}
        >
          <Calculator size={20} />
          <span>Tài chính & Kế toán</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.AGRICULTURE); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.AGRICULTURE)}
        >
          <Sprout size={20} />
          <span>Nông nghiệp</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.CONSTRUCTION); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.CONSTRUCTION)}
        >
          <HardHat size={20} />
          <span>Xây dựng & Kiến trúc</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.MARKETING); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.MARKETING)}
        >
          <Megaphone size={20} />
          <span>Media & Marketing</span>
        </div>

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Sản Xuất & Đời Sống</div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.MANUFACTURING); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.MANUFACTURING)}
        >
          <Factory size={20} />
          <span>Sản xuất & Gia công</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.TOURISM); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.TOURISM)}
        >
          <Plane size={20} />
          <span>Du lịch & Lữ hành</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.SECURITY); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.SECURITY)}
        >
          <ShieldCheck size={20} />
          <span>An ninh & Bảo vệ</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.FITNESS); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.FITNESS)}
        >
          <Dumbbell size={20} />
          <span>Thể thao & Fitness</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.PET_CARE); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.PET_CARE)}
        >
          <PawPrint size={20} />
          <span>Dịch vụ Thú cưng</span>
        </div>

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Dịch Vụ Mở Rộng</div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.RETAIL); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.RETAIL)}
        >
          <ShoppingBag size={20} />
          <span>Bán lẻ & Cửa hàng</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.INSURANCE); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.INSURANCE)}
        >
          <Umbrella size={20} />
          <span>Bảo hiểm</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.RECRUITMENT); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.RECRUITMENT)}
        >
          <UserPlus size={20} />
          <span>Tuyển dụng & Nhân sự</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.CLEANING); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.CLEANING)}
        >
          <SprayCan size={20} />
          <span>Vệ sinh Công nghiệp</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.FASHION); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.FASHION)}
        >
          <Shirt size={20} />
          <span>Thời trang & May mặc</span>
        </div>

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Công Nghiệp & Sáng Tạo</div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.AUTOMOTIVE); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.AUTOMOTIVE)}
        >
          <Car size={20} />
          <span>Dịch vụ Ô tô & Xe</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.ENTERTAINMENT); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.ENTERTAINMENT)}
        >
          <Clapperboard size={20} />
          <span>Giải trí & Nghệ thuật</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.PRINTING); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.PRINTING)}
        >
          <Printer size={20} />
          <span>In ấn & Xuất bản</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.CONSULTING); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.CONSULTING)}
        >
          <Briefcase size={20} />
          <span>Tư vấn Chiến lược</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.ENERGY); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.ENERGY)}
        >
          <Zap size={20} />
          <span>Năng lượng & Môi trường</span>
        </div>

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Hạ Tầng & Tiện Ích</div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.TELECOM); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.TELECOM)}
        >
          <Wifi size={20} />
          <span>Viễn thông & Internet</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.DESIGN); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.DESIGN)}
        >
          <PenTool size={20} />
          <span>Thiết kế & Sáng tạo</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.TRANSLATION); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.TRANSLATION)}
        >
          <Languages size={20} />
          <span>Dịch thuật</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.WAREHOUSING); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.WAREHOUSING)}
        >
          <Warehouse size={20} />
          <span>Kho bãi & Lưu trữ</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.ENVIRONMENT); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.ENVIRONMENT)}
        >
          <Recycle size={20} />
          <span>Môi trường</span>
        </div>

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Tài Nguyên & Nghiên Cứu</div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.MINING); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.MINING)}
        >
          <Pickaxe size={20} />
          <span>Khai khoáng & Tài nguyên</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.FISHERY); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.FISHERY)}
        >
          <Fish size={20} />
          <span>Thủy hải sản</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.FORESTRY); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.FORESTRY)}
        >
          <Trees size={20} />
          <span>Lâm nghiệp & Gỗ</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.CRAFTS); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.CRAFTS)}
        >
          <Hammer size={20} />
          <span>Thủ công mỹ nghệ</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.RESEARCH); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.RESEARCH)}
        >
          <FlaskConical size={20} />
          <span>Nghiên cứu & R&D</span>
        </div>

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Thương Mại & Cộng Đồng</div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.AVIATION); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.AVIATION)}
        >
          <Rocket size={20} />
          <span>Hàng không</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.IMPORT_EXPORT); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.IMPORT_EXPORT)}
        >
          <Globe size={20} />
          <span>Xuất Nhập Khẩu</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.MEDIA); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.MEDIA)}
        >
          <Tv size={20} />
          <span>Truyền thông & Báo chí</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.NON_PROFIT); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.NON_PROFIT)}
        >
          <Heart size={20} />
          <span>Phi Lợi Nhuận & NGO</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.RENTAL); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.RENTAL)}
        >
          <Key size={20} />
          <span>Dịch vụ Cho thuê</span>
        </div>

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Khoa Học & Công Nghệ Cao</div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.BIOTECH); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.BIOTECH)}
        >
          <Dna size={20} />
          <span>Công nghệ Sinh học</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.ROBOTICS); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.ROBOTICS)}
        >
          <Cpu size={20} />
          <span>Robotics & Tự động hóa</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.SPACE); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.SPACE)}
        >
          <Satellite size={20} />
          <span>Công nghiệp Vũ trụ</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.URBAN_PLANNING); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.URBAN_PLANNING)}
        >
          <Map size={20} />
          <span>Quy hoạch Đô thị</span>
        </div>

        <div 
          onClick={() => { onChangeView('OPERATIONS'); onChangeIndustry(IndustryType.MUSEUM); }} 
          className={navItemClass(currentView === 'OPERATIONS' && currentIndustry === IndustryType.MUSEUM)}
        >
          <Landmark size={20} />
          <span>Bảo tàng & Di sản</span>
        </div>

      </div>

      <div className="p-4 border-t border-slate-800">
        <div className={navItemClass(false)}>
          <Settings size={20} />
          <span>Cài đặt hệ thống</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;