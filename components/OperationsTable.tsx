import React, { useState } from 'react';
import { ServiceRecord, Status, IndustryType } from '../types';
import { Edit2, Trash2, Plus, Filter, Search, MoreHorizontal, BrainCircuit } from 'lucide-react';
import { analyzeData } from '../services/geminiService';

interface OperationsTableProps {
  data: ServiceRecord[];
  industry: IndustryType;
  onAdd: (record: Omit<ServiceRecord, 'id'>) => void;
  onEdit: (id: string, record: Partial<ServiceRecord>) => void;
  onDelete: (id: string) => void;
}

const OperationsTable: React.FC<OperationsTableProps> = ({ data, industry, onAdd, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ServiceRecord>>({
    customerName: '',
    title: '',
    amount: 0,
    status: Status.PENDING,
    priority: 'Medium',
    notes: ''
  });

  const filteredData = data.filter(item => 
    item.industry === industry && 
    (item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     item.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (record?: ServiceRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData(record);
    } else {
      setEditingRecord(null);
      setFormData({
        customerName: '',
        title: '',
        amount: 0,
        status: Status.PENDING,
        priority: 'Medium',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecord) {
      onEdit(editingRecord.id, formData);
    } else {
      onAdd({
        ...formData as ServiceRecord,
        industry: industry,
        date: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    const result = await analyzeData(filteredData);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  }

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.COMPLETED: return 'bg-green-100 text-green-800';
      case Status.IN_PROGRESS: return 'bg-blue-100 text-blue-800';
      case Status.PENDING: return 'bg-yellow-100 text-yellow-800';
      case Status.CANCELLED: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm khách hàng, dịch vụ..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
           <button 
            onClick={handleAnalyze}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <BrainCircuit size={18} />
            <span>{isAnalyzing ? 'Đang phân tích...' : 'AI Phân tích'}</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter size={18} />
            <span>Lọc</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Plus size={18} />
            <span>Tạo mới</span>
          </button>
        </div>
      </div>

      {/* AI Insight Box */}
      {analysisResult && (
         <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 animate-fade-in">
           <div className="flex items-center gap-2 mb-3">
             <BrainCircuit className="text-indigo-600" />
             <h3 className="font-semibold text-indigo-900">AI Insight - Phân tích vận hành</h3>
           </div>
           <div className="prose prose-sm text-indigo-900 max-w-none">
             <div dangerouslySetInnerHTML={{__html: analysisResult.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}} />
           </div>
           <button onClick={() => setAnalysisResult(null)} className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800">Đóng phân tích</button>
         </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Mã / Dịch vụ</th>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Giá trị (VND)</th>
                <th className="px-6 py-4">Độ ưu tiên</th>
                <th className="px-6 py-4">Ngày tạo</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length > 0 ? filteredData.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{record.title}</span>
                      <span className="text-xs text-gray-400">#{record.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{record.customerName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(record.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold ${
                      record.priority === 'High' ? 'text-red-600' : 
                      record.priority === 'Medium' ? 'text-yellow-600' : 'text-blue-600'
                    }`}>
                      {record.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{record.date}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleOpenModal(record)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDelete(record.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    Không có dữ liệu nào phù hợp. Hãy thêm mới!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-lg text-gray-800">
                {editingRecord ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên dịch vụ / Đơn hàng</label>
                <input 
                  required
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên khách hàng</label>
                <input 
                  required
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.customerName}
                  onChange={e => setFormData({...formData, customerName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị (VND)</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Độ ưu tiên</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value as any})}
                  >
                    <option value="Low">Thấp</option>
                    <option value="Medium">Trung bình</option>
                    <option value="High">Cao</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as Status})}
                  >
                    {Object.values(Status).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú vận hành</label>
                <textarea 
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Thông tin thêm..."
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md"
                >
                  {editingRecord ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsTable;
