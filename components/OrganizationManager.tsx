import React, { useState } from 'react';
import { Department, DepartmentType, Employee, RoleLevel, WorkSite } from '../types';
import { 
  Users, Building, HardHat, Factory, User, 
  ChevronRight, MapPin, Briefcase, Mail, Phone,
  Layout, Shield, Settings, CircleUser, Plus, Edit2, Trash2, X, Save, Sparkles, Loader2,
  Stethoscope, GraduationCap, Utensils, ShoppingBag, Clapperboard, Truck, HeartPulse, Palette
} from 'lucide-react';
import { generateOrgContent } from '../services/geminiService';

// --- INITIAL MOCK DATA: MULTI-INDUSTRY CONGLOMERATE ---

const initialDepartments: Department[] = [
  // === LEVEL 1: CORPORATE HQ (ĐẦU NÃO TẬP ĐOÀN) ===
  { id: 'HQ_BOARD', name: 'Hội Đồng Quản Trị (Board of Directors)', type: DepartmentType.OFFICE, description: 'Cơ quan quyền lực cao nhất, định hướng chiến lược đa ngành.' },
  { id: 'HQ_CEO', name: 'Ban Tổng Giám Đốc Tập Đoàn', type: DepartmentType.OFFICE, parentDeptId: 'HQ_BOARD', description: 'Điều hành toàn bộ hoạt động của các công ty thành viên.' },
  
  // Shared Services (Khối Hỗ Trợ Chung)
  { id: 'HQ_HR', name: 'Khối Nhân Sự & Văn Hóa (CHRO)', type: DepartmentType.OFFICE, parentDeptId: 'HQ_CEO', description: 'Quản trị nhân tài và văn hóa doanh nghiệp toàn tập đoàn.' },
  { id: 'HQ_FIN', name: 'Khối Tài Chính & Đầu Tư (CFO)', type: DepartmentType.OFFICE, parentDeptId: 'HQ_CEO', description: 'Quản lý dòng tiền, đầu tư và kiểm toán nội bộ.' },
  { id: 'HQ_TECH', name: 'Khối Công Nghệ & Chuyển Đổi Số (CTO)', type: DepartmentType.OFFICE, parentDeptId: 'HQ_CEO', description: 'Xây dựng hạ tầng ERP, AI và Super App ServiceNexus.' },

  // === LEVEL 2: INDUSTRY DIVISIONS (CÁC KHỐI NGÀNH DỌC) ===

  // 1. HEALTHCARE DIVISION (KHỐI Y TẾ)
  { id: 'DIV_HEALTH', name: 'Khối Y Tế & Chăm Sóc Sức Khỏe', type: DepartmentType.OFFICE, parentDeptId: 'HQ_CEO', description: 'Quản lý hệ thống bệnh viện và phòng khám.' },
  { id: 'DEPT_MED_BOARD', name: 'Hội Đồng Y Khoa', type: DepartmentType.OFFICE, parentDeptId: 'DIV_HEALTH', description: 'Thẩm định chuyên môn và phác đồ điều trị.' },
  { id: 'DEPT_CLINICAL', name: 'Khối Lâm Sàng', type: DepartmentType.SITE, parentDeptId: 'DIV_HEALTH', description: 'Bao gồm các khoa Nội, Ngoại, Sản, Nhi.' },
  { id: 'DEPT_PHARMA', name: 'Khoa Dược & Vật Tư Y Tế', type: DepartmentType.SITE, parentDeptId: 'DIV_HEALTH', description: 'Quản lý thuốc và thiết bị y tế.' },

  // 2. HOSPITALITY & F&B DIVISION (KHỐI DỊCH VỤ)
  { id: 'DIV_HOSPITALITY', name: 'Khối Khách Sạn & Ẩm Thực', type: DepartmentType.OFFICE, parentDeptId: 'HQ_CEO', description: 'Vận hành chuỗi khách sạn và nhà hàng.' },
  { id: 'DEPT_CULINARY', name: 'Trung Tâm Nghiên Cứu Ẩm Thực (R&D Kitchen)', type: DepartmentType.OFFICE, parentDeptId: 'DIV_HOSPITALITY', description: 'Sáng tạo thực đơn và kiểm soát chất lượng món ăn.' },
  { id: 'DEPT_HK', name: 'Bộ Phận Buồng Phòng (Housekeeping)', type: DepartmentType.SITE, parentDeptId: 'DIV_HOSPITALITY', description: 'Đảm bảo vệ sinh và tiêu chuẩn phòng nghỉ.' },
  { id: 'DEPT_FO', name: 'Bộ Phận Tiền Sảnh (Front Office)', type: DepartmentType.SITE, parentDeptId: 'DIV_HOSPITALITY', description: 'Lễ tân, đặt phòng và chăm sóc khách hàng.' },

  // 3. RETAIL & COMMERCE (KHỐI BÁN LẺ)
  { id: 'DIV_RETAIL', name: 'Khối Bán Lẻ & Thương Mại', type: DepartmentType.OFFICE, parentDeptId: 'HQ_CEO', description: 'Vận hành chuỗi siêu thị và cửa hàng tiện lợi.' },
  { id: 'DEPT_STORE_OPS', name: 'Phòng Vận Hành Cửa Hàng', type: DepartmentType.OFFICE, parentDeptId: 'DIV_RETAIL', description: 'Quản lý hiệu suất và nhân sự tại các điểm bán.' },
  { id: 'DEPT_VM', name: 'Phòng Trưng Bày (Visual Merchandising)', type: DepartmentType.OFFICE, parentDeptId: 'DIV_RETAIL', description: 'Thiết kế layout và hình ảnh cửa hàng.' },

  // 4. EDUCATION (KHỐI GIÁO DỤC)
  { id: 'DIV_EDU', name: 'Khối Giáo Dục & Đào Tạo', type: DepartmentType.OFFICE, parentDeptId: 'HQ_CEO', description: 'Hệ thống trường học và trung tâm kỹ năng.' },
  { id: 'DEPT_ACADEMIC', name: 'Ban Chuyên Môn Đào Tạo', type: DepartmentType.OFFICE, parentDeptId: 'DIV_EDU', description: 'Xây dựng chương trình học và kiểm định chất lượng.' },
  { id: 'DEPT_ADMISSION', name: 'Phòng Tuyển Sinh & Truyền Thông', type: DepartmentType.OFFICE, parentDeptId: 'DIV_EDU', description: 'Tư vấn và thu hút học viên.' },

  // 5. MANUFACTURING & LOGISTICS (KHỐI SẢN XUẤT)
  { id: 'DIV_MANU', name: 'Khối Sản Xuất & Chuỗi Cung Ứng', type: DepartmentType.FACTORY, parentDeptId: 'HQ_CEO', description: 'Nhà máy và kho vận.' },
  { id: 'DEPT_PROD', name: 'Phòng Quản Lý Sản Xuất', type: DepartmentType.FACTORY, parentDeptId: 'DIV_MANU', description: 'Lên kế hoạch và giám sát dây chuyền.' },
  { id: 'DEPT_QAQC', name: 'Phòng Quản Lý Chất Lượng (QA/QC)', type: DepartmentType.FACTORY, parentDeptId: 'DIV_MANU', description: 'Kiểm tra chất lượng đầu vào/ra.' },
];

const initialWorkSites: WorkSite[] = [
  // Healthcare Sites
  { id: 'SITE_HOSPITAL_1', name: 'Bệnh Viện Đa Khoa Quốc Tế ServiceNexus', type: 'FACTORY_PLANT', location: 'Q7, TP.HCM', directorId: 'EMP_MED_DIR', safetyRegulations: '- Tuân thủ quy trình kiểm soát nhiễm khuẩn.\n- Phân loại rác thải y tế đúng quy định.\n- 5K trong môi trường bệnh viện.' },
  
  // Hospitality Sites
  { id: 'SITE_RESORT_1', name: 'ServiceNexus Luxury Resort & Spa', type: 'CONSTRUCTION_SITE', location: 'Nha Trang, Khánh Hòa', directorId: 'EMP_GM_RESORT', safetyRegulations: '- Quy định vệ sinh an toàn thực phẩm ISO 22000.\n- Quy trình PCCC khu vực bếp và phòng khách.\n- Cứu hộ hồ bơi túc trực 24/7.' },
  
  // Retail Sites
  { id: 'SITE_MALL_1', name: 'Trung Tâm Thương Mại MegaMall', type: 'FACTORY_PLANT', location: 'Cầu Giấy, Hà Nội', directorId: 'EMP_MALL_MGR', safetyRegulations: '- Kiểm tra an toàn điện gian hàng.\n- Quy trình xử lý sự cố thang cuốn.\n- Bảo vệ tài sản khách hàng.' },
  
  // Manufacturing Sites
  { id: 'SITE_FACTORY_1', name: 'Nhà Máy Sản Xuất Công Nghệ Cao', type: 'FACTORY_PLANT', location: 'Bình Dương', directorId: 'EMP_FAC_DIR', safetyRegulations: '- Bắt buộc giày bảo hộ và mũ cứng.\n- Không vận hành máy khi chưa đào tạo.\n- Tuân thủ 5S.' },
  
  // Education Sites
  { id: 'SITE_SCHOOL_1', name: 'Trường Quốc Tế ServiceNexus Academy', type: 'CONSTRUCTION_SITE', location: 'Ecopark, Hưng Yên', directorId: 'EMP_PRINCIPAL', safetyRegulations: '- Giám sát an toàn sân chơi.\n- Quy trình đưa đón học sinh bằng xe bus.\n- An toàn thực phẩm bếp ăn bán trú.' },
];

const initialEmployees: Employee[] = [
  // === C-LEVEL (HQ) ===
  { id: 'EMP_CEO', name: 'Nguyễn Thái Bình', role: 'Group CEO - Tổng Giám Đốc Tập Đoàn', level: RoleLevel.C_LEVEL, departmentId: 'HQ_CEO', email: 'ceo@nexus.com', phone: '0901.111.111', status: 'Active' },
  { id: 'EMP_CTO', name: 'Phạm Minh Công', role: 'Group CTO - GĐ Công Nghệ', level: RoleLevel.C_LEVEL, departmentId: 'HQ_TECH', email: 'cto@nexus.com', phone: '0901.222.222', status: 'Active' },
  
  // === HEALTHCARE PERSONNEL ===
  { id: 'EMP_MED_DIR', name: 'GS.BS. Trần Văn Y', role: 'Giám Đốc Bệnh Viện', level: RoleLevel.DIRECTOR, departmentId: 'DIV_HEALTH', siteId: 'SITE_HOSPITAL_1', email: 'med_dir@nexus.com', phone: '0902.111.001', status: 'Active' },
  { id: 'EMP_DOC_1', name: 'BS. Lê Cứu Thương', role: 'Trưởng Khoa Cấp Cứu', level: RoleLevel.MANAGER, departmentId: 'DEPT_CLINICAL', siteId: 'SITE_HOSPITAL_1', email: 'doc1@nexus.com', phone: '0902.111.002', status: 'Active' },
  { id: 'EMP_NURSE_1', name: 'Nguyễn Thị Tá', role: 'Điều Dưỡng Trưởng', level: RoleLevel.LEADER, departmentId: 'DEPT_CLINICAL', siteId: 'SITE_HOSPITAL_1', email: 'nurse@nexus.com', phone: '0902.111.003', status: 'Active' },
  
  // === HOSPITALITY PERSONNEL ===
  { id: 'EMP_GM_RESORT', name: 'Michael Truong', role: 'General Manager (GM)', level: RoleLevel.DIRECTOR, departmentId: 'DIV_HOSPITALITY', siteId: 'SITE_RESORT_1', email: 'gm@nexus.com', phone: '0903.111.001', status: 'Active' },
  { id: 'EMP_EXEC_CHEF', name: 'Gordon Pham', role: 'Executive Chef (Bếp Trưởng)', level: RoleLevel.MANAGER, departmentId: 'DEPT_CULINARY', siteId: 'SITE_RESORT_1', email: 'chef@nexus.com', phone: '0903.111.002', status: 'Active' },
  { id: 'EMP_HK_MGR', name: 'Lê Thị Sạch', role: 'Housekeeping Manager', level: RoleLevel.MANAGER, departmentId: 'DEPT_HK', siteId: 'SITE_RESORT_1', email: 'hk@nexus.com', phone: '0903.111.003', status: 'Active' },

  // === RETAIL PERSONNEL ===
  { id: 'EMP_MALL_MGR', name: 'Hoàng Bán Lẻ', role: 'Giám Đốc TTTM', level: RoleLevel.DIRECTOR, departmentId: 'DIV_RETAIL', siteId: 'SITE_MALL_1', email: 'mall@nexus.com', phone: '0904.111.001', status: 'Active' },
  { id: 'EMP_STORE_MGR', name: 'Vũ Cửa Hàng', role: 'Store Manager', level: RoleLevel.MANAGER, departmentId: 'DEPT_STORE_OPS', siteId: 'SITE_MALL_1', email: 'store@nexus.com', phone: '0904.111.002', status: 'Active' },
  { id: 'EMP_VM', name: 'Trần Decor', role: 'Visual Merchandiser', level: RoleLevel.SPECIALIST, departmentId: 'DEPT_VM', siteId: 'SITE_MALL_1', email: 'vm@nexus.com', phone: '0904.111.003', status: 'Active' },

  // === EDUCATION PERSONNEL ===
  { id: 'EMP_PRINCIPAL', name: 'TS. Nhà Giáo', role: 'Hiệu Trưởng', level: RoleLevel.DIRECTOR, departmentId: 'DIV_EDU', siteId: 'SITE_SCHOOL_1', email: 'principal@nexus.com', phone: '0905.111.001', status: 'Active' },
  { id: 'EMP_TEACHER_1', name: 'Cô Lan Anh', role: 'Giáo Viên Chủ Nhiệm', level: RoleLevel.SPECIALIST, departmentId: 'DEPT_ACADEMIC', siteId: 'SITE_SCHOOL_1', email: 'teacher@nexus.com', phone: '0905.111.002', status: 'Active' },
  
  // === MANUFACTURING PERSONNEL ===
  { id: 'EMP_FAC_DIR', name: 'Kỹ Sư Bách', role: 'Giám Đốc Nhà Máy', level: RoleLevel.DIRECTOR, departmentId: 'DIV_MANU', siteId: 'SITE_FACTORY_1', email: 'factory@nexus.com', phone: '0906.111.001', status: 'Active' },
  { id: 'EMP_QA_LEAD', name: 'Phạm Soi', role: 'Trưởng Phòng QA', level: RoleLevel.MANAGER, departmentId: 'DEPT_QAQC', siteId: 'SITE_FACTORY_1', email: 'qa@nexus.com', phone: '0906.111.002', status: 'Active' },
  { id: 'EMP_WORKER_1', name: 'Nguyễn Văn Thợ', role: 'Công Nhân Kỹ Thuật', level: RoleLevel.WORKER, departmentId: 'DEPT_PROD', siteId: 'SITE_FACTORY_1', email: '', phone: '0906.111.003', status: 'Active' },
];

type ModalType = 'DEPARTMENT' | 'SITE' | 'EMPLOYEE' | null;

const OrganizationManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'HIERARCHY' | 'SITES' | 'EMPLOYEES'>('HIERARCHY');
  
  // Data States
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [workSites, setWorkSites] = useState<WorkSite[]>(initialWorkSites);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);

  // Modal States
  const [modalType, setModalType] = useState<ModalType>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form Data States (Generic)
  const [deptForm, setDeptForm] = useState<Partial<Department>>({});
  const [siteForm, setSiteForm] = useState<Partial<WorkSite>>({});
  const [empForm, setEmpForm] = useState<Partial<Employee>>({});

  // --- AI HANDLERS ---
  const handleAIGenerate = async (field: 'DEPT' | 'SITE' | 'EMP') => {
    setIsGenerating(true);
    if (field === 'DEPT' && deptForm.name) {
      const content = await generateOrgContent('DEPT_FUNCTIONS', { deptName: deptForm.name, deptType: deptForm.type });
      setDeptForm(prev => ({ ...prev, description: content }));
    } else if (field === 'SITE' && siteForm.name) {
      const content = await generateOrgContent('SAFETY_REGULATIONS', { siteName: siteForm.name, siteType: siteForm.type, location: siteForm.location });
      setSiteForm(prev => ({ ...prev, safetyRegulations: content }));
    } else if (field === 'EMP' && empForm.role) {
      const deptName = departments.find(d => d.id === empForm.departmentId)?.name || 'Chưa xác định';
      const content = await generateOrgContent('JOB_DESCRIPTION', { role: empForm.role, departmentName: deptName });
      setEmpForm(prev => ({ ...prev, jobDescription: content }));
    }
    setIsGenerating(false);
  };

  // --- CRUD HELPERS ---
  const handleDelete = (id: string, type: 'DEPARTMENT' | 'SITE' | 'EMPLOYEE') => {
    if (!confirm('Bạn có chắc chắn muốn xóa mục này?')) return;
    if (type === 'DEPARTMENT') setDepartments(prev => prev.filter(d => d.id !== id));
    else if (type === 'SITE') setWorkSites(prev => prev.filter(s => s.id !== id));
    else if (type === 'EMPLOYEE') setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const openModal = (type: ModalType, data: any = null) => {
    setModalType(type);
    setIsEditing(!!data);
    if (type === 'DEPARTMENT') {
      setDeptForm(data || { name: '', type: DepartmentType.OFFICE, parentDeptId: '', description: '' });
    } else if (type === 'SITE') {
      setSiteForm(data || { name: '', type: 'CONSTRUCTION_SITE', location: '', directorId: '', safetyRegulations: '' });
    } else if (type === 'EMPLOYEE') {
      setEmpForm(data || { 
        name: '', role: '', level: RoleLevel.SPECIALIST, 
        departmentId: departments[0]?.id, status: 'Active',
        email: '', phone: '', jobDescription: ''
      });
    }
  };

  const handleSave = () => {
    const timestamp = Date.now();
    if (modalType === 'DEPARTMENT') {
      if (isEditing) setDepartments(prev => prev.map(d => d.id === deptForm.id ? { ...d, ...deptForm } as Department : d));
      else setDepartments([...departments, { ...deptForm, id: `DEP${timestamp}` } as Department]);
    } else if (modalType === 'SITE') {
      if (isEditing) setWorkSites(prev => prev.map(s => s.id === siteForm.id ? { ...s, ...siteForm } as WorkSite : s));
      else setWorkSites([...workSites, { ...siteForm, id: `SITE${timestamp}` } as WorkSite]);
    } else if (modalType === 'EMPLOYEE') {
      if (isEditing) setEmployees(prev => prev.map(e => e.id === empForm.id ? { ...e, ...empForm } as Employee : e));
      else setEmployees([...employees, { ...empForm, id: `EMP${timestamp}` } as Employee]);
    }
    setModalType(null);
  };

  // --- VISUAL HELPERS ---
  const getLevelColor = (level: RoleLevel) => {
    switch(level) {
      case RoleLevel.C_LEVEL: return 'bg-purple-100 text-purple-700 border-purple-200';
      case RoleLevel.DIRECTOR: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case RoleLevel.MANAGER: return 'bg-blue-100 text-blue-700 border-blue-200';
      case RoleLevel.LEADER: return 'bg-teal-100 text-teal-700 border-teal-200';
      case RoleLevel.SPECIALIST: return 'bg-gray-100 text-gray-700 border-gray-200';
      case RoleLevel.WORKER: return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getDeptIcon = (name: string, type: DepartmentType) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('y tế') || lowerName.includes('dược')) return <Stethoscope size={24} />;
    if (lowerName.includes('giáo dục') || lowerName.includes('đào tạo')) return <GraduationCap size={24} />;
    if (lowerName.includes('ẩm thực') || lowerName.includes('bếp')) return <Utensils size={24} />;
    if (lowerName.includes('bán lẻ') || lowerName.includes('shop') || lowerName.includes('vm')) return <ShoppingBag size={24} />;
    if (lowerName.includes('truyền thông') || lowerName.includes('media')) return <Clapperboard size={24} />;
    if (lowerName.includes('vận chuyển') || lowerName.includes('kho')) return <Truck size={24} />;
    if (lowerName.includes('sản xuất') || type === DepartmentType.FACTORY) return <Factory size={24} />;
    if (lowerName.includes('xây dựng') || type === DepartmentType.SITE) return <HardHat size={24} />;
    if (lowerName.includes('công nghệ') || lowerName.includes('tech')) return <Briefcase size={24} />;
    if (lowerName.includes('nhân sự')) return <Users size={24} />;
    
    return <Building size={24} />;
  };

  const renderHierarchyNode = (dept: Department, level: number = 0) => {
    const deptEmployees = employees.filter(e => e.departmentId === dept.id && e.level !== RoleLevel.WORKER);
    const subDepts = departments.filter(d => d.parentDeptId === dept.id);

    return (
      <div key={dept.id} className={`ml-${Math.min(level * 6, 24)} mb-4 animate-fade-in group`}>
        <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative">
           <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openModal('DEPARTMENT', dept)} className="p-1 hover:bg-gray-100 rounded text-indigo-600"><Edit2 size={16}/></button>
              {subDepts.length === 0 && (
                 <button onClick={() => handleDelete(dept.id, 'DEPARTMENT')} className="p-1 hover:bg-gray-100 rounded text-red-500"><Trash2 size={16}/></button>
              )}
           </div>

           <div className={`p-3 rounded-lg ${
             dept.type === DepartmentType.OFFICE ? 'bg-blue-50 text-blue-600' : 
             dept.type === DepartmentType.FACTORY ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
           }`}>
             {getDeptIcon(dept.name, dept.type)}
           </div>
           <div className="flex-1">
             <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-bold text-gray-800">{dept.name}</h4>
                <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-500 mr-12">{dept.type}</span>
             </div>
             {dept.description && <p className="text-sm text-gray-500 mb-3 italic">{dept.description.substring(0, 100)}...</p>}
             
             <div className="space-y-2">
                {deptEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => openModal('EMPLOYEE', emp)}>
                    <CircleUser size={16} className="text-gray-400"/>
                    <span className="font-semibold text-gray-700">{emp.name}</span>
                    <ChevronRight size={14} className="text-gray-300"/>
                    <span className={`text-xs px-2 py-0.5 rounded border ${getLevelColor(emp.level)}`}>
                      {emp.role}
                    </span>
                  </div>
                ))}
                {deptEmployees.length === 0 && <span className="text-xs text-gray-400 italic">Chưa có nhân sự chủ chốt</span>}
             </div>
           </div>
        </div>
        
        {subDepts.length > 0 && (
          <div className="mt-4 border-l-2 border-gray-200 pl-4 ml-8">
            {subDepts.map(sub => renderHierarchyNode(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderSiteHierarchy = (site: WorkSite) => {
    const siteStaff = employees.filter(e => e.siteId === site.id);
    const directors = siteStaff.filter(e => e.level === RoleLevel.DIRECTOR);
    const managers = siteStaff.filter(e => e.level === RoleLevel.MANAGER);
    const others = siteStaff.filter(e => e.level !== RoleLevel.DIRECTOR && e.level !== RoleLevel.MANAGER);

    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 animate-fade-in relative group hover:border-indigo-300 transition-colors">
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={() => openModal('SITE', site)} className="p-1 hover:bg-gray-100 rounded text-indigo-600"><Edit2 size={16}/></button>
           <button onClick={() => handleDelete(site.id, 'SITE')} className="p-1 hover:bg-gray-100 rounded text-red-500"><Trash2 size={16}/></button>
        </div>

        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
           <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
             {site.name.includes('Bệnh Viện') ? <Stethoscope size={24}/> : 
              site.name.includes('Trường') ? <GraduationCap size={24}/> :
              site.name.includes('TTTM') ? <ShoppingBag size={24}/> :
              site.type === 'FACTORY_PLANT' ? <Factory size={24} /> : <HardHat size={24} />}
           </div>
           <div>
             <h3 className="text-xl font-bold text-gray-800">{site.name}</h3>
             <div className="flex items-center gap-1 text-gray-500 text-sm">
                <MapPin size={14} /> {site.location}
             </div>
           </div>
        </div>

        {site.safetyRegulations && (
          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-100 text-sm text-amber-900">
             <div className="font-semibold flex items-center gap-2 mb-2"><Shield size={14}/> Nội quy & An toàn</div>
             <div className="whitespace-pre-line">{site.safetyRegulations}</div>
          </div>
        )}

        <div className="space-y-6">
            <div className="text-center">
              <div className="inline-block p-4 bg-indigo-50 rounded-xl border-2 border-indigo-100 min-w-[250px]">
                 <h5 className="text-xs font-bold text-indigo-500 uppercase mb-2">Ban Giám Đốc / Điều Hành</h5>
                 {directors.length > 0 ? directors.map(d => (
                    <div key={d.id} className="font-bold text-gray-800 text-lg mb-1">{d.name} <br/><span className="text-sm font-normal text-gray-600">{d.role}</span></div>
                 )) : <span className="text-gray-400 italic text-sm">Chưa có giám đốc</span>}
              </div>
              <div className="h-8 w-0.5 bg-gray-300 mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {managers.map(m => (
                 <div key={m.id} className="flex flex-col items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="font-semibold text-blue-900">{m.name}</div>
                    <div className="text-xs text-blue-600 mb-2">{m.role}</div>
                    <div className="w-full h-px bg-blue-200 my-1"></div>
                    <div className="text-xs text-blue-800 italic">Quản lý cấp trung</div>
                 </div>
               ))}
            </div>

            {others.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                 <h6 className="text-sm font-semibold text-gray-500 mb-2">Nhân sự khác tại cơ sở:</h6>
                 <div className="flex flex-wrap gap-2">
                    {others.map(o => (
                      <span key={o.id} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 border border-gray-200 flex items-center gap-1">
                        <User size={10}/> {o.name} ({o.role})
                      </span>
                    ))}
                 </div>
              </div>
            )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative pb-20">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Sơ Đồ Tổ Chức Tập Đoàn Đa Ngành</h2>
           <p className="text-gray-500">Quản lý nhân sự các khối: Y tế, Giáo dục, Bán lẻ, Sản xuất & Dịch vụ</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'HIERARCHY' && (
             <button onClick={() => openModal('DEPARTMENT')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
               <Plus size={18} /> Thêm Phòng Ban
             </button>
          )}
          {activeTab === 'SITES' && (
             <button onClick={() => openModal('SITE')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
               <Plus size={18} /> Thêm Cơ Sở
             </button>
          )}
          {activeTab === 'EMPLOYEES' && (
             <button onClick={() => openModal('EMPLOYEE')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
               <Plus size={18} /> Thêm Nhân Sự
             </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit">
           <button onClick={() => setActiveTab('HIERARCHY')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'HIERARCHY' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Sơ đồ Tập Đoàn</button>
           <button onClick={() => setActiveTab('SITES')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'SITES' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Cơ Sở Vận Hành</button>
           <button onClick={() => setActiveTab('EMPLOYEES')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'EMPLOYEES' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>Toàn Bộ Nhân Sự</button>
      </div>

      {activeTab === 'HIERARCHY' && (
        <div className="grid grid-cols-1 gap-6">
           {departments.filter(d => !d.parentDeptId).map(root => renderHierarchyNode(root))}
        </div>
      )}

      {activeTab === 'SITES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {workSites.map(site => renderSiteHierarchy(site))}
        </div>
      )}

      {activeTab === 'EMPLOYEES' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="overflow-x-auto">
           <table className="w-full text-left">
             <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
               <tr>
                 <th className="px-6 py-4">Nhân sự</th>
                 <th className="px-6 py-4">Chức danh</th>
                 <th className="px-6 py-4">Phòng ban</th>
                 <th className="px-6 py-4">Liên hệ</th>
                 <th className="px-6 py-4 text-center">Trạng thái</th>
                 <th className="px-6 py-4 text-right">Thao tác</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
               {employees.map(emp => (
                 <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                             {emp.name ? emp.name.split(' ').pop()?.substring(0,2).toUpperCase() : '??'}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 block">{emp.name}</span>
                            {emp.jobDescription && <span className="text-[10px] text-green-600 flex items-center gap-1"><Sparkles size={10}/> Đã có JD</span>}
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">
                        {emp.role} <br/>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getLevelColor(emp.level)}`}>{emp.level}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                       {departments.find(d => d.id === emp.departmentId)?.name}
                       {emp.siteId && <div className="text-xs text-indigo-500 font-medium mt-1">@ {workSites.find(s => s.id === emp.siteId)?.name}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                       <div className="flex items-center gap-1"><Mail size={12}/> {emp.email || 'N/A'}</div>
                       <div className="flex items-center gap-1 mt-1"><Phone size={12}/> {emp.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-block w-2 h-2 rounded-full ${emp.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2">
                          <button onClick={() => openModal('EMPLOYEE', emp)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                          <button onClick={() => handleDelete(emp.id, 'EMPLOYEE')} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                       </div>
                    </td>
                 </tr>
               ))}
             </tbody>
           </table>
           </div>
        </div>
      )}

      {/* --- CRUD MODAL --- */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-lg text-gray-800">
                  {isEditing ? 'Chỉnh sửa ' : 'Thêm mới '} 
                  {modalType === 'DEPARTMENT' ? 'Phòng Ban' : modalType === 'SITE' ? 'Cơ Sở' : 'Nhân Sự'}
                </h3>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
              </div>
              
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                 {/* DEPARTMENT FORM */}
                 {modalType === 'DEPARTMENT' && (
                   <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên Phòng Ban</label>
                        <input className="input-field w-full border border-gray-300 rounded-lg p-2" value={deptForm.name || ''} onChange={e => setDeptForm({...deptForm, name: e.target.value})} />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Loại Hình</label>
                         <select className="w-full border border-gray-300 rounded-lg p-2" value={deptForm.type} onChange={e => setDeptForm({...deptForm, type: e.target.value as DepartmentType})}>
                           {Object.values(DepartmentType).map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị cấp trên (nếu có)</label>
                         <select className="w-full border border-gray-300 rounded-lg p-2" value={deptForm.parentDeptId || ''} onChange={e => setDeptForm({...deptForm, parentDeptId: e.target.value})}>
                            <option value="">-- Là cấp cao nhất (Trực thuộc HĐQT/CEO) --</option>
                            {departments.filter(d => d.id !== deptForm.id).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                         </select>
                      </div>
                      <div>
                         <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Chức năng & Nhiệm vụ</label>
                            <button 
                              type="button"
                              onClick={() => handleAIGenerate('DEPT')} 
                              disabled={!deptForm.name || isGenerating}
                              className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                            >
                               {isGenerating ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} AI Gợi ý
                            </button>
                         </div>
                         <textarea 
                           className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                           rows={3} 
                           value={deptForm.description || ''} 
                           onChange={e => setDeptForm({...deptForm, description: e.target.value})}
                           placeholder="AI có thể giúp bạn viết mô tả chức năng..."
                         />
                      </div>
                   </>
                 )}

                 {/* SITE FORM */}
                 {modalType === 'SITE' && (
                   <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên Cơ Sở (Bệnh viện, Trường, Nhà máy...)</label>
                        <input className="w-full border border-gray-300 rounded-lg p-2" value={siteForm.name || ''} onChange={e => setSiteForm({...siteForm, name: e.target.value})} />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Loại Hình</label>
                         <select className="w-full border border-gray-300 rounded-lg p-2" value={siteForm.type} onChange={e => setSiteForm({...siteForm, type: e.target.value as any})}>
                           <option value="CONSTRUCTION_SITE">Công Trường / Dự Án</option>
                           <option value="FACTORY_PLANT">Nhà Máy / Cơ Sở Cố Định</option>
                         </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Địa Chỉ / Vị Trí</label>
                        <input className="w-full border border-gray-300 rounded-lg p-2" value={siteForm.location || ''} onChange={e => setSiteForm({...siteForm, location: e.target.value})} />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Giám Đốc / Chỉ Huy Trưởng</label>
                         <select className="w-full border border-gray-300 rounded-lg p-2" value={siteForm.directorId || ''} onChange={e => setSiteForm({...siteForm, directorId: e.target.value})}>
                            <option value="">-- Chọn Nhân Sự --</option>
                            {employees.filter(e => e.level === RoleLevel.DIRECTOR || e.level === RoleLevel.MANAGER).map(e => (
                               <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                            ))}
                         </select>
                      </div>
                      <div>
                         <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Nội quy & An toàn</label>
                            <button 
                              type="button"
                              onClick={() => handleAIGenerate('SITE')} 
                              disabled={!siteForm.name || isGenerating}
                              className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                            >
                               {isGenerating ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} AI Soạn thảo
                            </button>
                         </div>
                         <textarea 
                           className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                           rows={4} 
                           value={siteForm.safetyRegulations || ''} 
                           onChange={e => setSiteForm({...siteForm, safetyRegulations: e.target.value})}
                           placeholder="Bấm nút AI để tự động tạo quy định an toàn..."
                         />
                      </div>
                   </>
                 )}

                 {/* EMPLOYEE FORM */}
                 {modalType === 'EMPLOYEE' && (
                   <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên</label>
                        <input className="w-full border border-gray-300 rounded-lg p-2" value={empForm.name || ''} onChange={e => setEmpForm({...empForm, name: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chức danh (Role)</label>
                            <input className="w-full border border-gray-300 rounded-lg p-2" value={empForm.role || ''} onChange={e => setEmpForm({...empForm, role: e.target.value})} placeholder="VD: Bác sĩ, Bếp trưởng..." />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cấp bậc</label>
                            <select className="w-full border border-gray-300 rounded-lg p-2" value={empForm.level} onChange={e => setEmpForm({...empForm, level: e.target.value as RoleLevel})}>
                               {Object.values(RoleLevel).map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                         </div>
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Phòng Ban Trực Thuộc</label>
                         <select className="w-full border border-gray-300 rounded-lg p-2" value={empForm.departmentId} onChange={e => setEmpForm({...empForm, departmentId: e.target.value})}>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Làm việc tại (Tùy chọn)</label>
                         <select className="w-full border border-gray-300 rounded-lg p-2" value={empForm.siteId || ''} onChange={e => setEmpForm({...empForm, siteId: e.target.value})}>
                            <option value="">-- Văn phòng chính / HQ --</option>
                            {workSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                         </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input className="w-full border border-gray-300 rounded-lg p-2" value={empForm.email || ''} onChange={e => setEmpForm({...empForm, email: e.target.value})} />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                            <input className="w-full border border-gray-300 rounded-lg p-2" value={empForm.phone || ''} onChange={e => setEmpForm({...empForm, phone: e.target.value})} />
                         </div>
                      </div>
                      <div>
                         <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Mô tả công việc (JD)</label>
                            <button 
                              type="button"
                              onClick={() => handleAIGenerate('EMP')} 
                              disabled={!empForm.role || isGenerating}
                              className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 disabled:opacity-50"
                            >
                               {isGenerating ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} AI Tạo JD
                            </button>
                         </div>
                         <textarea 
                           className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                           rows={5} 
                           value={empForm.jobDescription || ''} 
                           onChange={e => setEmpForm({...empForm, jobDescription: e.target.value})}
                           placeholder="Bấm nút AI để tự động tạo JD cho vị trí này..."
                         />
                      </div>
                   </>
                 )}
              </div>

              <div className="p-4 border-t border-gray-100 flex gap-3 justify-end bg-gray-50">
                 <button onClick={() => setModalType(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Hủy</button>
                 <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                    <Save size={18}/> Lưu thay đổi
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationManager;
