import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Briefcase, 
  DollarSign, 
  Activity,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { servicesApi, organizationsApi, employeesApi } from '../utils/api';

interface DashboardStats {
  totalServices: number;
  completedServices: number;
  pendingServices: number;
  totalRevenue: number;
  activeEmployees: number;
  totalOrganizations: number;
  avgServiceValue: number;
  completionRate: number;
}

interface RecentActivity {
  id: string;
  type: 'service' | 'employee' | 'organization';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
  }[];
}

const EnhancedDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [chartData, setChartData] = useState<{
    revenue: ChartData;
    services: ChartData;
    industries: ChartData;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedOrganization, setSelectedOrganization] = useState('all');

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, selectedOrganization]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch services statistics
      const servicesStats = await servicesApi.getStats({
        date_from: getDateFromRange(dateRange),
        organization_id: selectedOrganization !== 'all' ? selectedOrganization : undefined
      });

      // Fetch employees statistics
      const employeesStats = await employeesApi.getStats({
        organization_id: selectedOrganization !== 'all' ? selectedOrganization : undefined
      });

      // Fetch organizations
      const organizationsResponse = await organizationsApi.getOrganizations({
        limit: '100'
      });

      // Process statistics
      const overview = servicesStats.data.overview;
      const employeeOverview = employeesStats.data.overview;

      const dashboardStats: DashboardStats = {
        totalServices: overview.total_services || 0,
        completedServices: overview.completed_services || 0,
        pendingServices: overview.pending_services || 0,
        totalRevenue: parseFloat(overview.total_revenue) || 0,
        activeEmployees: employeeOverview.active_employees || 0,
        totalOrganizations: organizationsResponse.data.pagination.total,
        avgServiceValue: parseFloat(overview.avg_service_value) || 0,
        completionRate: overview.total_services > 0 
          ? (overview.completed_services / overview.total_services) * 100 
          : 0
      };

      setStats(dashboardStats);

      // Process chart data
      const revenueData: ChartData = {
        labels: servicesStats.data.monthly_trend?.map((item: any) => 
          new Date(item.month).toLocaleDateString('vi-VN', { month: 'short' })
        ) || [],
        datasets: [{
          label: 'Doanh thu',
          data: servicesStats.data.monthly_trend?.map((item: any) => 
            parseFloat(item.revenue) || 0
          ) || [],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
        }]
      };

      const servicesData: ChartData = {
        labels: servicesStats.data.monthly_trend?.map((item: any) => 
          new Date(item.month).toLocaleDateString('vi-VN', { month: 'short' })
        ) || [],
        datasets: [{
          label: 'Số lượng dịch vụ',
          data: servicesStats.data.monthly_trend?.map((item: any) => 
            parseInt(item.services_count) || 0
          ) || [],
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgba(34, 197, 94, 1)',
        }]
      };

      const industriesData: ChartData = {
        labels: servicesStats.data.by_industry?.map((item: any) => item.industry_type) || [],
        datasets: [{
          label: 'Số lượng dịch vụ',
          data: servicesStats.data.by_industry?.map((item: any) => parseInt(item.count) || 0) || [],
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(236, 72, 153, 0.8)',
          ],
        }]
      };

      setChartData({
        revenue: revenueData,
        services: servicesData,
        industries: industriesData
      });

      // Simulate recent activity (in real app, this would come from API)
      setRecentActivity([
        {
          id: '1',
          type: 'service',
          title: 'Dịch vụ mới',
          description: 'Website Development Project đã được tạo',
          timestamp: '2 phút trước',
          status: 'success'
        },
        {
          id: '2',
          type: 'employee',
          title: 'Nhân viên mới',
          description: 'John Developer đã tham gia công ty',
          timestamp: '1 giờ trước',
          status: 'info'
        },
        {
          id: '3',
          type: 'service',
          title: 'Hoàn thành dịch vụ',
          description: 'Restaurant Event đã hoàn thành',
          timestamp: '3 giờ trước',
          status: 'success'
        },
        {
          id: '4',
          type: 'organization',
          title: 'Cập nhật tổ chức',
          description: 'Tech Solutions đã cập nhật thông tin',
          timestamp: '5 giờ trước',
          status: 'warning'
        }
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateFromRange = (range: string): string => {
    const now = new Date();
    const daysAgo = parseInt(range.replace('d', '')) || 7;
    const fromDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return fromDate.toISOString().split('T')[0];
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color = 'blue',
    trend 
  }: {
    title: string;
    value: string | number;
    change?: number;
    icon: any;
    color?: string;
    trend?: 'up' | 'down';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500'
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {change !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                {Math.abs(change)}%
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Chào mừng trở lại, {user?.first_name} {user?.last_name}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">7 ngày qua</option>
                <option value="30d">30 ngày qua</option>
                <option value="90d">90 ngày qua</option>
                <option value="365d">1 năm qua</option>
              </select>
              
              <button
                onClick={fetchDashboardData}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Làm mới
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Tổng dịch vụ"
            value={formatNumber(stats?.totalServices || 0)}
            change={15}
            icon={Briefcase}
            color="blue"
            trend="up"
          />
          
          <StatCard
            title="Doanh thu"
            value={formatCurrency(stats?.totalRevenue || 0)}
            change={8}
            icon={DollarSign}
            color="green"
            trend="up"
          />
          
          <StatCard
            title="Nhân viên"
            value={formatNumber(stats?.activeEmployees || 0)}
            change={5}
            icon={Users}
            color="purple"
            trend="up"
          />
          
          <StatCard
            title="Tỷ lệ hoàn thành"
            value={`${stats?.completionRate?.toFixed(1) || 0}%`}
            change={12}
            icon={Activity}
            color="yellow"
            trend="up"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Doanh thu</h2>
              <LineChart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                <p>Biểu đồ doanh thu</p>
                <p className="text-sm">(Chart component sẽ được tích hợp)</p>
              </div>
            </div>
          </div>

          {/* Services Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Dịch vụ</h2>
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <PieChart className="w-12 h-12 mx-auto mb-2" />
                <p>Biểu đồ dịch vụ</p>
                <p className="text-sm">(Chart component sẽ được tích hợp)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h2>
                <Activity className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-100' :
                      activity.status === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      {activity.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : activity.status === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
            
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                <Briefcase className="w-4 h-4 mr-2" />
                Tạo dịch vụ mới
              </button>
              
              <button className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                <Users className="w-4 h-4 mr-2" />
                Thêm nhân viên
              </button>
              
              <button className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                <Calendar className="w-4 h-4 mr-2" />
                Xem lịch
              </button>
              
              <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Xuất báo cáo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
