import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ServiceRecord, Status, IndustryType } from '../types';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

interface DashboardProps {
  data: ServiceRecord[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  
  // Basic KPI calculations
  const totalRevenue = data.reduce((sum, item) => sum + (item.status === Status.COMPLETED ? item.amount : 0), 0);
  const activeOrders = data.filter(item => item.status === Status.IN_PROGRESS || item.status === Status.PENDING).length;
  const completedOrders = data.filter(item => item.status === Status.COMPLETED).length;

  // Chart Data Preparation
  const industryData = Object.values(IndustryType).map(ind => ({
    name: ind,
    value: data.filter(d => d.industry === ind).length,
    revenue: data.filter(d => d.industry === ind && d.status === Status.COMPLETED).reduce((sum, i) => sum + i.amount, 0)
  }));

  const statusData = Object.values(Status).map(s => ({
    name: s,
    value: data.filter(d => d.status === s).length
  }));

  const CardKPI = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CardKPI 
          title="Tổng doanh thu" 
          value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)} 
          icon={DollarSign} 
          color="bg-green-500" 
        />
        <CardKPI 
          title="Đơn đang xử lý" 
          value={activeOrders} 
          icon={Activity} 
          color="bg-blue-500" 
        />
        <CardKPI 
          title="Đơn hoàn thành" 
          value={completedOrders} 
          icon={TrendingUp} 
          color="bg-indigo-500" 
        />
        <CardKPI 
          title="Tổng Khách hàng" 
          value={new Set(data.map(d => d.customerName)).size} 
          icon={Users} 
          color="bg-orange-500" 
        />
      </div>

      {/* Charts Section 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
          <h3 className="font-semibold text-gray-800 mb-6">Doanh thu theo Ngành</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={industryData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000000}M`} />
              <Tooltip 
                formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
                cursor={{ fill: '#f3f4f6' }}
              />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
          <h3 className="font-semibold text-gray-800 mb-6">Phân bổ trạng thái đơn hàng</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
