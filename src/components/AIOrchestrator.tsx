import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Settings, 
  Activity, 
  Zap, 
  Target, 
  Shield, 
  Database, 
  BarChart3, 
  GitBranch, 
  Layers, 
  Cube, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  Package, 
  Server, 
  Monitor, 
  Cpu, 
  HardDrive, 
  Globe, 
  Router, 
  ShieldCheck, 
  Key, 
  Truck, 
  Calendar, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  Save, 
  Plus, 
  Minus, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  MoreVertical, 
  Filter, 
  Search, 
  Bell, 
  Info, 
  HelpCircle, 
  Terminal,
  Network,
  Workflow,
  Bot,
  Sparkles
} from 'lucide-react';

interface Task {
  id: string;
  workflow: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  duration?: number;
  steps: Step[];
  results: any;
  error?: string;
}

interface Step {
  agent: string;
  action: string;
  data: any;
  duration: number;
  status: 'success' | 'failed';
  error?: string;
}

interface Agent {
  name: string;
  capabilities: string[];
  status: 'ready' | 'busy' | 'error';
  lastUsed?: string;
}

interface Workflow {
  name: string;
  description: string;
  steps: number;
  estimatedTime: number;
}

const AIOrchestrator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'workflows' | 'tasks' | 'agents'>('overview');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [workflows, setWorkflows] = useState<Record<string, Workflow>>({});
  const [performance, setPerformance] = useState<any>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  useEffect(() => {
    fetchSystemData();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      if (realTimeUpdates) {
        fetchSystemData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [realTimeUpdates]);

  const fetchSystemData = async () => {
    try {
      const [tasksRes, agentsRes, workflowsRes, perfRes] = await Promise.all([
        fetch('/api/ai-orchestrator/tasks'),
        fetch('/api/ai-orchestrator/agents'),
        fetch('/api/ai-orchestrator/workflows'),
        fetch('/api/ai-orchestrator/performance')
      ]);

      const tasksData = await tasksRes.json();
      const agentsData = await agentsRes.json();
      const workflowsData = await workflowsRes.json();
      const perfData = await perfRes.json();

      if (tasksData.success) setTasks(tasksData.data.tasks || []);
      if (agentsData.success) setAgents(agentsData.data);
      if (workflowsData.success) setWorkflows(workflowsData.data);
      if (perfData.success) setPerformance(perfData.data);
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    }
  };

  const executeWorkflow = async (workflowName: string, data: any, options: any = {}) => {
    setIsExecuting(true);
    try {
      const response = await fetch('/api/ai-orchestrator/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: workflowName,
          data: data,
          options: options
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Workflow queued: ${result.data.taskId}`);
        await fetchSystemData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Workflow execution failed:', error);
      alert(`Execution failed: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const cancelTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/ai-orchestrator/task/${taskId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Task cancelled successfully');
        await fetchSystemData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Task cancellation failed:', error);
      alert(`Cancellation failed: ${error.message}`);
    }
  };

  const getTaskIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled': return <Square className="w-4 h-4 text-gray-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAgentIcon = (agentName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      tableData: <Database className="w-4 h-4" />,
      column: <BarChart3 className="w-4 h-4" />,
      row: <GitBranch className="w-4 h-4" />,
      visualization: <Cube className="w-4 h-4" />
    };
    return iconMap[agentName] || <Bot className="w-4 h-4" />;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.workflow.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Orchestrator</h1>
          <p className="text-gray-600 mt-1">Local AI system coordination and workflow management</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setRealTimeUpdates(!realTimeUpdates)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              realTimeUpdates ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{realTimeUpdates ? 'Live' : 'Paused'}</span>
          </button>
          
          <button
            onClick={fetchSystemData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Overview</span>
          </button>
          
          <button
            onClick={() => setActiveTab('workflows')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'workflows'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>Workflows</span>
          </button>
          
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'tasks'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Tasks</span>
          </button>
          
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'agents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Agents</span>
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* System Status */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{Object.keys(agents).length}</div>
                  <div className="text-sm text-gray-600">Total Agents</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Object.values(agents).filter(a => a.status === 'ready').length}
                  </div>
                  <div className="text-sm text-gray-600">Ready</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {tasks.filter(t => t.status === 'running').length}
                  </div>
                  <div className="text-sm text-gray-600">Running</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{Object.keys(workflows).length}</div>
                  <div className="text-sm text-gray-600">Workflows</div>
                </div>
              </div>
            </div>

            {/* Recent Tasks */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
              
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTaskIcon(task.status)}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{task.workflow}</div>
                        <div className="text-xs text-gray-500">{task.id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {task.duration ? formatDuration(task.duration) : 'Processing...'}
                      </div>
                    </div>
                  </div>
                ))}
                
                {tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tasks yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => executeWorkflow('quick_analysis', { sample: true })}
                  disabled={isExecuting}
                  className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <Zap className="w-6 h-6 text-blue-600" />
                  <span className="text-sm">Quick Analysis</span>
                </button>
                
                <button
                  onClick={() => executeWorkflow('comprehensive_analysis', { sample: true })}
                  disabled={isExecuting}
                  className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <Brain className="w-6 h-6 text-green-600" />
                  <span className="text-sm">Comprehensive</span>
                </button>
                
                <button
                  onClick={() => executeWorkflow('deep_dive', { sample: true })}
                  disabled={isExecuting}
                  className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <Target className="w-6 h-6 text-purple-600" />
                  <span className="text-sm">Deep Dive</span>
                </button>
                
                <button
                  onClick={() => executeWorkflow('visualization_only', { sample: true })}
                  disabled={isExecuting}
                  className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <Cube className="w-6 h-6 text-orange-600" />
                  <span className="text-sm">Visualization</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Tasks</span>
                  <span className="text-lg font-semibold text-gray-900">{performance.totalTasks || 0}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="text-lg font-semibold text-green-600">{performance.completedTasks || 0}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Failed</span>
                  <span className="text-lg font-semibold text-red-600">{performance.failedTasks || 0}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Time</span>
                  <span className="text-lg font-semibold text-blue-600">
                    {performance.averageProcessingTime ? formatDuration(performance.averageProcessingTime) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Agent Status */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Status</h3>
              
              <div className="space-y-3">
                {Object.entries(agents).map(([name, agent]) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getAgentIcon(name)}
                      <span className="text-sm font-medium text-gray-700 capitalize">{name}</span>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      agent.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {agent.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Available Workflows</h3>
            <button
              onClick={() => executeWorkflow('comprehensive_analysis', { sample: true })}
              disabled={isExecuting}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>Execute Sample</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(workflows).map(([name, workflow]) => (
              <div key={name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                  <Workflow className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{workflow.steps} steps</span>
                  <span>~{formatDuration(workflow.estimatedTime)}</span>
                </div>
                <button
                  onClick={() => executeWorkflow(name, { sample: true })}
                  disabled={isExecuting}
                  className="w-full mt-3 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  <Play className="w-3 h-3" />
                  <span>Execute</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl shadow-sm border">
          {/* Task Filters */}
          <div className="p-6 border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="divide-y">
            {filteredTasks.map((task) => (
              <div key={task.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getTaskIcon(task.status)}
                    <div>
                      <div className="font-medium text-gray-900">{task.workflow}</div>
                      <div className="text-sm text-gray-500">{task.id}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {task.duration ? formatDuration(task.duration) : 'Processing...'}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="text-blue-600 hover:text-blue-700"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {task.status === 'running' && (
                        <button
                          onClick={() => cancelTask(task.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Cancel Task"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => toggleTaskExpansion(task.id)}
                        className="text-gray-600 hover:text-gray-700"
                        title="Toggle Details"
                      >
                        {expandedTasks.has(task.id) ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Expanded Task Details */}
                {expandedTasks.has(task.id) && (
                  <div className="mt-4 pl-8 border-t pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Started:</span>
                        <div className="font-medium">{formatDate(task.startTime)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <div className="font-medium">
                          {task.duration ? formatDuration(task.duration) : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Steps:</span>
                        <div className="font-medium">{task.steps.length}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Progress:</span>
                        <div className="font-medium">
                          {task.steps.filter(s => s.status === 'success').length}/{task.steps.length}
                        </div>
                      </div>
                    </div>
                    
                    {task.steps.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-medium text-gray-900 mb-2">Execution Steps:</h5>
                        <div className="space-y-2">
                          {task.steps.map((step, index) => (
                            <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                {getAgentIcon(step.agent)}
                                <span className="font-medium">{step.agent}.{step.action}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-500">{formatDuration(step.duration)}</span>
                                {step.status === 'success' ? 
                                  <CheckCircle className="w-4 h-4 text-green-500" /> :
                                  <XCircle className="w-4 h-4 text-red-500" />
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tasks found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(agents).map(([name, agent]) => (
            <div key={name} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getAgentIcon(name)}
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">{name} Agent</h3>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  agent.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {agent.status}
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Capabilities</h4>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((capability) => (
                      <span key={capability} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Last Used:</span>
                    <div className="font-medium">
                      {agent.lastUsed ? formatDate(agent.lastUsed) : 'Never'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className="font-medium capitalize">{agent.status}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Task Details</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600">Task ID:</span>
                    <div className="font-medium">{selectedTask.id}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Workflow:</span>
                    <div className="font-medium">{selectedTask.workflow}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <div className={`inline-flex text-xs px-2 py-1 rounded-full ${getStatusColor(selectedTask.status)}`}>
                      {selectedTask.status}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <div className="font-medium">
                      {selectedTask.duration ? formatDuration(selectedTask.duration) : 'N/A'}
                    </div>
                  </div>
                </div>
                
                {selectedTask.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="text-sm font-medium text-red-800">Error</h4>
                    <p className="text-sm text-red-600 mt-1">{selectedTask.error}</p>
                  </div>
                )}
                
                {selectedTask.steps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Execution Steps</h4>
                    <div className="space-y-2">
                      {selectedTask.steps.map((step, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getAgentIcon(step.agent)}
                            <div>
                              <div className="font-medium">{step.agent}.{step.action}</div>
                              <div className="text-xs text-gray-500">
                                {formatDuration(step.duration)}
                              </div>
                            </div>
                          </div>
                          {step.status === 'success' ? 
                            <CheckCircle className="w-5 h-5 text-green-500" /> :
                            <XCircle className="w-5 h-5 text-red-500" />
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIOrchestrator;
