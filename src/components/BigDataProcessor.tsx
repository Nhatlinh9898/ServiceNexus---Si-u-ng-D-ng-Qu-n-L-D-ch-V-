import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Settings, 
  Activity, 
  Zap, 
  Target, 
  Shield, 
  HardDrive, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  Link, 
  Link2, 
  Globe, 
  FileText, 
  FileSpreadsheet, 
  Archive, 
  Filter, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Save, 
  Plus, 
  Minus, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  MoreVertical, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Zap as ZapIcon,
  Cpu,
  Server,
  Network,
  Router,
  ShieldCheck,
  Key,
  Truck,
  Calendar,
  Info,
  HelpCircle,
  Terminal,
  Monitor,
  Cpu as CpuIcon,
  HardDrive as HardDriveIcon,
  Activity as ActivityIcon,
  AlertTriangle,
  Ban,
  CheckCheck,
  Loader,
  Progress,
  Gauge,
  Timer,
  Data,
  Cloud,
  CloudDownload,
  CloudUpload,
  Folder,
  FolderOpen,
  File,
  FileJson,
  FileCsv,
  FileText as FileTextIcon,
  FileArchive,
  Link as LinkIcon,
  Link2 as Link2Icon,
  Unlink,
  RefreshCw as RefreshCwIcon,
  RotateCcw,
  SkipForward,
  SkipBack,
  FastForward,
  Rewind,
  PlayCircle,
  PauseCircle,
  StopCircle
} from 'lucide-react';

interface ProcessingTask {
  id: string;
  type: 'big-data' | 'link-resolution';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  source: string;
  progress: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  recordsProcessed: number;
  totalRecords: number;
  error?: string;
  result?: any;
}

interface ProcessingStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  activeTasks: number;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  averageProcessingTime: number;
  circuitBreakerState: string;
}

interface LinkResolutionStats {
  totalUrls: number;
  downloadedUrls: number;
  failedUrls: number;
  skippedUrls: number;
  totalSize: number;
  visitedUrls: number;
  suspiciousPatterns: number;
  queueLength: number;
}

const BigDataProcessor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'big-data' | 'link-resolution'>('big-data');
  const [tasks, setTasks] = useState<ProcessingTask[]>([]);
  const [bigDataStats, setBigDataStats] = useState<ProcessingStats | null>(null);
  const [linkStats, setLinkStats] = useState<LinkResolutionStats | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProcessingTask | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form states
  const [bigDataConfig, setBigDataConfig] = useState({
    source: '',
    format: 'json',
    chunkSize: 10000,
    maxWorkers: 4,
    outputFormat: 'json',
    compression: true,
    validation: true,
    deduplication: true
  });

  const [linkConfig, setLinkConfig] = useState({
    seedUrls: [''],
    maxDepth: 3,
    maxConcurrentDownloads: 5,
    allowedDomains: [],
    blockedDomains: [],
    fileTypes: ['json', 'csv', 'txt', 'xml', 'jsonl'],
    maxFileSize: 104857600,
    followRedirects: true,
    respectRobotsTxt: true,
    delayBetweenRequests: 1000
  });

  useEffect(() => {
    fetchSystemData();
    
    const interval = setInterval(() => {
      if (realTimeUpdates) {
        fetchSystemData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [realTimeUpdates]);

  const fetchSystemData = async () => {
    try {
      const [statsRes, linkStatsRes] = await Promise.all([
        fetch('/api/big-data/big-data/stats'),
        fetch('/api/big-data/links/stats')
      ]);

      const statsData = await statsRes.json();
      const linkData = await linkStatsRes.json();

      if (statsData.success) setBigDataStats(statsData.data);
      if (linkData.success) setLinkStats(linkData.data);
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    }
  };

  const processBigData = async () => {
    if (!bigDataConfig.source) {
      alert('Please provide a data source');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/big-data/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bigDataConfig),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Big data processing started successfully');
        await fetchSystemData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Big data processing failed:', error);
      alert(`Processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resolveDataLinks = async () => {
    if (!linkConfig.seedUrls.some(url => url.trim())) {
      alert('Please provide at least one seed URL');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/big-data/resolve-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...linkConfig,
          seedUrls: linkConfig.seedUrls.filter(url => url.trim())
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Data link resolution started successfully');
        await fetchSystemData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Data link resolution failed:', error);
      alert(`Resolution failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAndProcess = async () => {
    if (!bigDataConfig.source) {
      alert('Please provide a URL to download');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/big-data/download-and-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bigDataConfig),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Download and processing started successfully');
        await fetchSystemData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Download and process failed:', error);
      alert(`Operation failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
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

  const getFileIcon = (format: string) => {
    switch (format) {
      case 'json': return <FileJson className="w-4 h-4 text-blue-600" />;
      case 'csv': return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
      case 'txt': return <FileTextIcon className="w-4 h-4 text-gray-600" />;
      case 'xml': return <FileText className="w-4 h-4 text-orange-600" />;
      case 'jsonl': return <FileJson className="w-4 h-4 text-purple-600" />;
      default: return <File className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
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

  const addSeedUrl = () => {
    setLinkConfig(prev => ({
      ...prev,
      seedUrls: [...prev.seedUrls, '']
    }));
  };

  const removeSeedUrl = (index: number) => {
    setLinkConfig(prev => ({
      ...prev,
      seedUrls: prev.seedUrls.filter((_, i) => i !== index)
    }));
  };

  const updateSeedUrl = (index: number, value: string) => {
    setLinkConfig(prev => ({
      ...prev,
      seedUrls: prev.seedUrls.map((url, i) => i === index ? value : url)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Big Data Processor</h1>
          <p className="text-gray-600 mt-1">Process billions of records with infinite loop prevention</p>
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
            onClick={() => setActiveTab('big-data')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'big-data'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Big Data Processing</span>
          </button>
          
          <button
            onClick={() => setActiveTab('link-resolution')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'link-resolution'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Link className="w-4 h-4" />
            <span>Link Resolution</span>
          </button>
        </div>
      </div>

      {/* Big Data Processing Tab */}
      {activeTab === 'big-data' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Processing Configuration */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Source (URL or File Path)
                  </label>
                  <input
                    type="text"
                    value={bigDataConfig.source}
                    onChange={(e) => setBigDataConfig(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/data.json or /path/to/file.json"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Input Format
                    </label>
                    <select
                      value={bigDataConfig.format}
                      onChange={(e) => setBigDataConfig(prev => ({ ...prev, format: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                      <option value="txt">Text</option>
                      <option value="xml">XML</option>
                      <option value="jsonl">JSON Lines</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Output Format
                    </label>
                    <select
                      value={bigDataConfig.outputFormat}
                      onChange={(e) => setBigDataConfig(prev => ({ ...prev, outputFormat: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                      <option value="jsonl">JSON Lines</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chunk Size
                    </label>
                    <input
                      type="number"
                      value={bigDataConfig.chunkSize}
                      onChange={(e) => setBigDataConfig(prev => ({ ...prev, chunkSize: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1000"
                      max="100000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Workers
                    </label>
                    <input
                      type="number"
                      value={bigDataConfig.maxWorkers}
                      onChange={(e) => setBigDataConfig(prev => ({ ...prev, maxWorkers: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={bigDataConfig.compression}
                      onChange={(e) => setBigDataConfig(prev => ({ ...prev, compression: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Enable Compression</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={bigDataConfig.validation}
                      onChange={(e) => setBigDataConfig(prev => ({ ...prev, validation: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Enable Validation</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={bigDataConfig.deduplication}
                      onChange={(e) => setBigDataConfig(prev => ({ ...prev, deduplication: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Enable Deduplication</span>
                  </label>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={processBigData}
                    disabled={isProcessing || !bigDataConfig.source}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    <span>Process Data</span>
                  </button>

                  {bigDataConfig.source.startsWith('http') && (
                    <button
                      onClick={downloadAndProcess}
                      disabled={isProcessing}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download & Process</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Processing Statistics */}
            {bigDataStats && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Statistics</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{bigDataStats.totalTasks}</div>
                    <div className="text-sm text-gray-600">Total Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{bigDataStats.completedTasks}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{bigDataStats.activeTasks}</div>
                    <div className="text-sm text-gray-600">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatFileSize(bigDataStats.totalRecords || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Records Processed</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Circuit Breaker:</span>
                    <span className={`px-2 py-1 rounded-full ${
                      bigDataStats.circuitBreakerState === 'OPEN' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {bigDataStats.circuitBreakerState}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* System Status */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Workers</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {bigDataStats?.activeWorkers || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Processing Time</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {bigDataStats?.averageProcessingTime ? formatDuration(bigDataStats.averageProcessingTime) : 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Failed Records</span>
                  <span className="text-lg font-semibold text-red-600">
                    {bigDataStats?.failedRecords || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Settings className="w-4 h-4" />
                  <span>{showAdvanced ? 'Hide' : 'Show'} Advanced</span>
                </button>
                
                <button
                  onClick={() => setBigDataConfig({
                    source: '',
                    format: 'json',
                    chunkSize: 10000,
                    maxWorkers: 4,
                    outputFormat: 'json',
                    compression: true,
                    validation: true,
                    deduplication: true
                  })}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset Config</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Resolution Tab */}
      {activeTab === 'link-resolution' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Link Resolution Configuration */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Link Resolution Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seed URLs
                  </label>
                  {linkConfig.seedUrls.map((url, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => updateSeedUrl(index, e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/data.json"
                      />
                      {linkConfig.seedUrls.length > 1 && (
                        <button
                          onClick={() => removeSeedUrl(index)}
                          className="p-2 text-red-600 hover:text-red-700"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                      {index === linkConfig.seedUrls.length - 1 && (
                        <button
                          onClick={addSeedUrl}
                          className="p-2 text-green-600 hover:text-green-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Depth
                    </label>
                    <input
                      type="number"
                      value={linkConfig.maxDepth}
                      onChange={(e) => setLinkConfig(prev => ({ ...prev, maxDepth: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Concurrent Downloads
                    </label>
                    <input
                      type="number"
                      value={linkConfig.maxConcurrentDownloads}
                      onChange={(e) => setLinkConfig(prev => ({ ...prev, maxConcurrentDownloads: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Types
                  </label>
                  <div className="space-y-2">
                    {['json', 'csv', 'txt', 'xml', 'jsonl'].map(type => (
                      <label key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={linkConfig.fileTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLinkConfig(prev => ({ ...prev, fileTypes: [...prev.fileTypes, type] }));
                            } else {
                              setLinkConfig(prev => ({ ...prev, fileTypes: prev.fileTypes.filter(t => t !== type) }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">{type.toUpperCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max File Size (MB)
                    </label>
                    <input
                      type="number"
                      value={linkConfig.maxFileSize / (1024 * 1024)}
                      onChange={(e) => setLinkConfig(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) * 1024 * 1024 }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="1000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delay Between Requests (ms)
                    </label>
                    <input
                      type="number"
                      value={linkConfig.delayBetweenRequests}
                      onChange={(e) => setLinkConfig(prev => ({ ...prev, delayBetweenRequests: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="10000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={linkConfig.followRedirects}
                      onChange={(e) => setLinkConfig(prev => ({ ...prev, followRedirects: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Follow Redirects</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={linkConfig.respectRobotsTxt}
                      onChange={(e) => setLinkConfig(prev => ({ ...prev, respectRobotsTxt: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Respect Robots.txt</span>
                  </label>
                </div>

                <button
                  onClick={resolveDataLinks}
                  disabled={isProcessing || !linkConfig.seedUrls.some(url => url.trim())}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Resolving Links...</span>
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4" />
                      <span>Resolve Data Links</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Link Resolution Statistics */}
            {linkStats && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolution Statistics</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{linkStats.totalUrls}</div>
                    <div className="text-sm text-gray-600">Total URLs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{linkStats.downloadedUrls}</div>
                    <div className="text-sm text-gray-600">Downloaded</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{linkStats.failedUrls}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{linkStats.suspiciousPatterns}</div>
                    <div className="text-sm text-gray-600">Suspicious Patterns</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Size:</span>
                    <span className="text-gray-900">{formatFileSize(linkStats.totalSize)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Queue Length:</span>
                    <span className="text-gray-900">{linkStats.queueLength}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Infinite Loop Prevention */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Infinite Loop Prevention</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">Pattern Detection</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Ban className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-gray-700">Circular Reference Check</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-gray-700">Suspicious Pattern Alert</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <CheckCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">URL History Tracking</span>
                </div>
              </div>
            </div>

            {/* Processing Features */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Features</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">Multi-threaded Processing</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">Chunk-based Processing</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Archive className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700">Data Compression</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-gray-700">Data Validation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BigDataProcessor;
