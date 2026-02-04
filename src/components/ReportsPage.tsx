import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';

interface Report {
  id: string;
  title: string;
  type: 'financial' | 'operational' | 'customer' | 'performance' | 'custom';
  status: 'generating' | 'completed' | 'failed';
  createdAt: string;
  generatedAt?: string;
  fileSize?: number;
  downloadUrl?: string;
  parameters: {
    dateRange: {
      start: string;
      end: string;
    };
    industries?: string[];
    format: 'pdf' | 'excel' | 'csv';
    includeCharts?: boolean;
  };
  createdBy: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'financial' | 'operational' | 'customer' | 'performance';
  parameters: {
    required: string[];
    optional: string[];
  };
  icon: React.ComponentType<any>;
}

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchTemplates();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports');
      setReports(response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await apiClient.get('/reports/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleCreateReport = async (template: ReportTemplate, parameters: any) => {
    try {
      const response = await apiClient.post('/reports/generate', {
        templateId: template.id,
        parameters,
        createdBy: user?.id
      });
      
      setReports(prev => [response.data, ...prev]);
      setShowCreateModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to create report:', error);
    }
  };

  const handleDownloadReport = async (report: Report) => {
    try {
      const response = await apiClient.get(`/reports/${report.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.title}.${report.parameters.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    try {
      await apiClient.delete(`/reports/${reportId}`);
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || report.type === filterType;
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'generating': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'financial': return <DollarSign className="w-4 h-4" />;
      case 'operational': return <BarChart3 className="w-4 h-4" />;
      case 'customer': return <Users className="w-4 h-4" />;
      case 'performance': return <TrendingUp className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Generate and manage business reports</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>New Report</span>
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white rounded-lg shadow-sm border hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="financial">Financial</option>
            <option value="operational">Operational</option>
            <option value="customer">Customer</option>
            <option value="performance">Performance</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="generating">Generating</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <div key={report.id} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {getTypeIcon(report.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{report.title}</h3>
                  <p className="text-sm text-gray-600 capitalize">{report.type}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(report.status)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                  {report.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Created:</span>
                <span className="text-gray-900">{formatDate(report.createdAt)}</span>
              </div>

              {report.generatedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Generated:</span>
                  <span className="text-gray-900">{formatDate(report.generatedAt)}</span>
                </div>
              )}

              {report.fileSize && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Size:</span>
                  <span className="text-gray-900">{formatFileSize(report.fileSize)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Format:</span>
                <span className="text-gray-900 uppercase">{report.parameters.format}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {report.status === 'completed' && (
                  <button
                    onClick={() => handleDownloadReport(report)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => handleDeleteReport(report.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Create New Report</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedTemplate(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {!selectedTemplate ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Select Report Template</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <template.icon className="w-5 h-5 text-blue-600" />
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <ReportParametersForm
                  template={selectedTemplate}
                  onSubmit={(parameters) => handleCreateReport(selectedTemplate, parameters)}
                  onCancel={() => setSelectedTemplate(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Report Parameters Form Component
interface ReportParametersFormProps {
  template: ReportTemplate;
  onSubmit: (parameters: any) => void;
  onCancel: () => void;
}

const ReportParametersForm: React.FC<ReportParametersFormProps> = ({
  template,
  onSubmit,
  onCancel
}) => {
  const [parameters, setParameters] = useState({
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    industries: [] as string[],
    format: 'pdf' as 'pdf' | 'excel' | 'csv',
    includeCharts: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(parameters);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Configure {template.name}
      </h3>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={parameters.dateRange.start}
              onChange={(e) => setParameters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: e.target.value }
              }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={parameters.dateRange.end}
              onChange={(e) => setParameters(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: e.target.value }
              }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Format */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Output Format
        </label>
        <div className="flex space-x-4">
          {(['pdf', 'excel', 'csv'] as const).map(format => (
            <label key={format} className="flex items-center">
              <input
                type="radio"
                value={format}
                checked={parameters.format === format}
                onChange={(e) => setParameters(prev => ({
                  ...prev,
                  format: e.target.value as any
                }))}
                className="mr-2"
              />
              <span className="capitalize">{format}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Include Charts */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={parameters.includeCharts}
            onChange={(e) => setParameters(prev => ({
              ...prev,
              includeCharts: e.target.checked
            }))}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700">Include Charts</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Generate Report
        </button>
      </div>
    </form>
  );
};

export default ReportsPage;
