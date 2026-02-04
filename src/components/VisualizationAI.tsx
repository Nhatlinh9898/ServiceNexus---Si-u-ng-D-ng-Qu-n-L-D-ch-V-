import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  Scatter, 
  Network, 
  Box, 
  GitBranch, 
  Layers, 
  Cube, 
  Download, 
  Upload, 
  Play, 
  RefreshCw, 
  Trash2, 
  Settings, 
  Eye, 
  Edit, 
  Save, 
  Plus, 
  Zap,
  Target,
  Shield,
  Activity,
  Database,
  FileText,
  Image,
  Palette,
  Grid3x3,
  Workflow,
  Building,
  Cloud,
  Lock,
  Server,
  Monitor,
  Cpu,
  HardDrive,
  Globe,
  Router,
  ShieldCheck,
  Key,
  Users,
  Package,
  Truck,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart,
  AreaChart,
  RadarChart,
  Sun,
  TreePine,
  Hexagon,
  Circle,
  Square,
  Triangle,
  Star,
  Heart,
  Zap as ZapIcon
} from 'lucide-react';

interface VisualizationData {
  [key: string]: any;
}

interface VisualizationResult {
  success: boolean;
  type: string;
  filename: string;
  filepath: string;
  config: any;
  metadata: any;
}

interface SavedVisualization {
  filename: string;
  type: string;
  created: string;
  size: number;
  metadata: any;
}

const VisualizationAI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'charts' | 'diagrams' | 'architectures' | 'models'>('charts');
  const [visualizationType, setVisualizationType] = useState<string>('');
  const [visualizationData, setVisualizationData] = useState<VisualizationData[]>([]);
  const [visualizationResults, setVisualizationResults] = useState<VisualizationResult[]>([]);
  const [savedVisualizations, setSavedVisualizations] = useState<SavedVisualization[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVisualization, setSelectedVisualization] = useState<VisualizationResult | null>(null);
  const [chartTypes, setChartTypes] = useState<string[]>([]);
  const [diagramTypes, setDiagramTypes] = useState<string[]>([]);
  const [architectureTypes, setArchitectureTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchVisualizationTypes();
    fetchSavedVisualizations();
  }, []);

  const fetchVisualizationTypes = async () => {
    try {
      const [chartRes, diagramRes, archRes] = await Promise.all([
        fetch('/api/visualization/chart-types'),
        fetch('/api/visualization/diagram-types'),
        fetch('/api/visualization/architecture-types')
      ]);

      const chartData = await chartRes.json();
      const diagramData = await diagramRes.json();
      const archData = await archRes.json();

      if (chartData.success) setChartTypes(chartData.data.chartTypes);
      if (diagramData.success) setDiagramTypes(diagramData.data.diagramTypes);
      if (archData.success) setArchitectureTypes(archData.data.architectureTypes);
    } catch (error) {
      console.error('Failed to fetch visualization types:', error);
    }
  };

  const fetchSavedVisualizations = async () => {
    try {
      const response = await fetch('/api/visualization/list');
      const data = await response.json();
      if (data.success) {
        const allViz = [];
        Object.entries(data.data).forEach(([type, files]) => {
          files.forEach((file: any) => {
            allViz.push({
              ...file,
              type: type.slice(0, -1) // Remove 's' from plural
            });
          });
        });
        setSavedVisualizations(allViz);
      }
    } catch (error) {
      console.error('Failed to fetch saved visualizations:', error);
    }
  };

  const generateSampleData = async (type: string, subType: string) => {
    try {
      const response = await fetch('/api/visualization/sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type,
          chartType: subType,
          count: 10
        }),
      });

      const result = await response.json();
      if (result.success) {
        setVisualizationData(result.data);
      }
    } catch (error) {
      console.error('Failed to generate sample data:', error);
    }
  };

  const handleGenerateVisualization = async () => {
    if (!visualizationType || visualizationData.length === 0) {
      alert('Please select a visualization type and provide data');
      return;
    }

    setIsProcessing(true);
    try {
      let endpoint = `/api/visualization/${activeTab.slice(0, -1)}`; // Remove 's' from plural
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: visualizationData,
          options: {
            type: visualizationType,
            title: `${visualizationType} Visualization`,
            interactive: true
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setVisualizationResults(prev => [result.data, ...prev]);
        setSelectedVisualization(result.data);
        alert('Visualization generated successfully');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Visualization generation failed:', error);
      alert(`Generation failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteVisualization = async (filename: string, type: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/visualization/${type}/${filename}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Visualization deleted successfully');
        await fetchSavedVisualizations();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Delete failed: ${error.message}`);
    }
  };

  const getVisualizationIcon = (type: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      bar: <BarChart className="w-4 h-4" />,
      line: <LineChart className="w-4 h-4" />,
      pie: <PieChart className="w-4 h-4" />,
      scatter: <Scatter className="w-4 h-4" />,
      network: <Network className="w-4 h-4" />,
      flowchart: <GitBranch className="w-4 h-4" />,
      mindmap: <Brain className="w-4 h-4" />,
      orgchart: <Users className="w-4 h-4" />,
      timeline: <Clock className="w-4 h-4" />,
      system: <Server className="w-4 h-4" />,
      microservices: <Package className="w-4 h-4" />,
      cloud: <Cloud className="w-4 h-4" />,
      security: <Shield className="w-4 h-4" />,
      '3d': <Cube className="w-4 h-4" />
    };

    return iconMap[type] || <Box className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
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
          <h1 className="text-3xl font-bold text-gray-900">Visualization AI</h1>
          <p className="text-gray-600 mt-1">AI-powered charts, diagrams, architectures, and 3D models</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => fetchSavedVisualizations()}
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
            onClick={() => setActiveTab('charts')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'charts'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Charts</span>
          </button>
          
          <button
            onClick={() => setActiveTab('diagrams')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'diagrams'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Diagrams</span>
          </button>
          
          <button
            onClick={() => setActiveTab('architectures')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'architectures'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Architectures</span>
          </button>
          
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'models'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Cube className="w-4 h-4" />
            <span>3D Models</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visualization Controls */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Visualization</h3>
            
            <div className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visualization Type
                </label>
                <select
                  value={visualizationType}
                  onChange={(e) => setVisualizationType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type...</option>
                  {activeTab === 'charts' && chartTypes.map(type => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                  {activeTab === 'diagrams' && diagramTypes.map(type => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                  {activeTab === 'architectures' && architectureTypes.map(type => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                  {activeTab === 'models' && (
                    <option value="3d">3D Model</option>
                  )}
                </select>
              </div>

              {/* Data Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Data
                  </label>
                  <button
                    onClick={() => generateSampleData(activeTab.slice(0, -1), visualizationType)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Generate Sample Data
                  </button>
                </div>
                <textarea
                  value={JSON.stringify(visualizationData, null, 2)}
                  onChange={(e) => {
                    try {
                      const data = JSON.parse(e.target.value);
                      setVisualizationData(data);
                    } catch (error) {
                      // Invalid JSON, don't update state
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={6}
                  placeholder="Enter JSON data..."
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateVisualization}
                disabled={!visualizationType || visualizationData.length === 0 || isProcessing}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Generate Visualization</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results */}
          {visualizationResults.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Visualizations</h3>
              
              <div className="space-y-4">
                {visualizationResults.slice(0, 3).map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getVisualizationIcon(result.type)}
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {result.type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedVisualization(result)}
                          className="text-blue-600 hover:text-blue-700"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="text-green-600 hover:text-green-700"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <div>File: {result.filename}</div>
                      <div>Created: {new Date().toLocaleString()}</div>
                      {result.metadata && (
                        <div>Points: {result.metadata.dataPoints || 'N/A'}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedVisualization && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
              
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="text-center text-gray-600">
                  <div className="mb-4">
                    {getVisualizationIcon(selectedVisualization.type)}
                  </div>
                  <p className="text-sm">Visualization preview would appear here</p>
                  <p className="text-xs text-gray-500 mt-2">
                    File: {selectedVisualization.filename}
                  </p>
                  <button className="mt-4 text-blue-600 hover:text-blue-700 text-sm">
                    Open in new window
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Visualizations</span>
                <span className="text-lg font-semibold text-gray-900">{savedVisualizations.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Generated</span>
                <span className="text-lg font-semibold text-gray-900">{visualizationResults.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Chart Types</span>
                <span className="text-lg font-semibold text-gray-900">{chartTypes.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Diagram Types</span>
                <span className="text-lg font-semibold text-gray-900">{diagramTypes.length}</span>
              </div>
            </div>
          </div>

          {/* Available Types */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Types</h3>
            
            <div className="space-y-3">
              {activeTab === 'charts' && (
                <>
                  <div className="flex items-center space-x-2">
                    <BarChart className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Bar Charts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <LineChart className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">Line Charts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <PieChart className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-700">Pie Charts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Scatter className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-gray-700">Scatter Plots</span>
                  </div>
                </>
              )}
              
              {activeTab === 'diagrams' && (
                <>
                  <div className="flex items-center space-x-2">
                    <GitBranch className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Flowcharts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">Org Charts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-700">Timelines</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Network className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-gray-700">Network Diagrams</span>
                  </div>
                </>
              )}
              
              {activeTab === 'architectures' && (
                <>
                  <div className="flex items-center space-x-2">
                    <Server className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">System Architecture</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">Microservices</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Cloud className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-700">Cloud Architecture</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-gray-700">Security Architecture</span>
                  </div>
                </>
              )}
              
              {activeTab === 'models' && (
                <>
                  <div className="flex items-center space-x-2">
                    <Cube className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">3D Models</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Box className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">Geometric Shapes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Grid3x3 className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-700">Mesh Models</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Saved Visualizations */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Visualizations</h3>
            
            <div className="space-y-3">
              {savedVisualizations.slice(0, 5).map((viz, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    {getVisualizationIcon(viz.type)}
                    <span className="text-sm text-gray-700 truncate">{viz.filename}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteVisualization(viz.filename, viz.type)}
                    className="text-red-600 hover:text-red-700"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              {savedVisualizations.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-4">
                  No saved visualizations
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizationAI;
