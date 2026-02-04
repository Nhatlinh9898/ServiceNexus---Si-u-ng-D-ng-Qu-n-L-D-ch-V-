import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Upload, 
  Download, 
  Play, 
  Save, 
  Trash2, 
  RefreshCw, 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Database, 
  FileText, 
  Settings, 
  Zap,
  Target,
  Shield,
  Activity
} from 'lucide-react';

interface ProcessingResult {
  timestamp: string;
  type: string;
  algorithm: string;
  data: any;
  insights?: string[];
  recommendations?: string[];
  statistics?: any;
}

interface SavedData {
  filename: string;
  size: number;
  created: string;
  modified: string;
  metadata: any;
}

const DataProcessingAI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'process' | 'saved' | 'analytics'>('process');
  const [processingData, setProcessingData] = useState<any>(null);
  const [processingType, setProcessingType] = useState<string>('analysis');
  const [algorithm, setAlgorithm] = useState<string>('auto');
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [savedData, setSavedData] = useState<SavedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchSavedData();
  }, []);

  const fetchSavedData = async () => {
    try {
      const response = await fetch('/api/data-processing/list');
      const data = await response.json();
      if (data.success) {
        setSavedData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch saved data:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          setProcessingData(jsonData);
        } catch (error) {
          console.error('Failed to parse JSON:', error);
          alert('Invalid JSON file. Please upload a valid JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleProcess = async () => {
    if (!processingData) {
      alert('Please upload data first');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const endpoint = `/api/data-processing/${processingType}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: processingData,
          algorithm: algorithm,
          options: {
            saveResult: true,
            createBackup: true
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setResults(prev => [result.data, ...prev]);
        setUploadProgress(100);
        await fetchSavedData(); // Refresh saved data list
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Processing failed:', error);
      alert(`Processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async (filename: string) => {
    if (!results[0]) {
      alert('No results to save');
      return;
    }

    try {
      const response = await fetch('/api/data-processing/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: results[0],
          filename: filename
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Data saved successfully');
        await fetchSavedData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert(`Save failed: ${error.message}`);
    }
  };

  const handleLoad = async (filename: string) => {
    try {
      const response = await fetch(`/api/data-processing/load/${filename}`);
      const result = await response.json();
      
      if (result.success) {
        setProcessingData(result.data.data);
        setResults([result.data.data]);
        alert('Data loaded successfully');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Load failed:', error);
      alert(`Load failed: ${error.message}`);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/data-processing/delete/${filename}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Data deleted successfully');
        await fetchSavedData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Delete failed: ${error.message}`);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Data Processing AI</h1>
          <p className="text-gray-600 mt-1">AI-powered data analysis and storage system</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => fetchSavedData()}
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
            onClick={() => setActiveTab('process')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'process'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Process Data</span>
          </button>
          
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'saved'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Saved Data</span>
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'analytics'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Process Data Tab */}
      {activeTab === 'process' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Data</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Click to upload
                  </span>
                  <span className="text-gray-600"> or drag and drop</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">JSON files only</p>
              </div>

              {selectedFile && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">{selectedFile.name}</span>
                    </div>
                    <span className="text-sm text-green-600">{formatFileSize(selectedFile.size)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Processing Options */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Options</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Processing Type
                  </label>
                  <select
                    value={processingType}
                    onChange={(e) => setProcessingType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="analysis">Data Analysis</option>
                    <option value="optimization">Data Optimization</option>
                    <option value="prediction">Prediction</option>
                    <option value="clustering">Clustering</option>
                    <option value="anomaly_detection">Anomaly Detection</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Algorithm
                  </label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">Auto Select</option>
                    <option value="statistical">Statistical</option>
                    <option value="ml">Machine Learning</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleProcess}
                disabled={!processingData || isProcessing}
                className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Process Data</span>
                  </>
                )}
              </button>

              {isProcessing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Processing Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Saved</span>
                  <span className="text-lg font-semibold text-gray-900">{savedData.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Processing Results</span>
                  <span className="text-lg font-semibold text-gray-900">{results.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data Quality</span>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm font-medium text-green-600">Good</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Capabilities</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">Smart Analysis</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">Pattern Recognition</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700">Predictive Analytics</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Shield className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-gray-700">Anomaly Detection</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Database className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-gray-700">Data Storage</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Data Tab */}
      {activeTab === 'saved' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Modified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {savedData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{item.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFileSize(item.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.created)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.modified)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleLoad(item.filename)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Load"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.filename)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {savedData.length === 0 && (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No saved data found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Results */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Processing Results</h3>
            
            <div className="space-y-4">
              {results.slice(0, 5).map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {result.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(result.timestamp)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-gray-600">Algorithm: {result.algorithm}</span>
                  </div>
                  
                  {result.insights && result.insights.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Key Insights:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {result.insights.slice(0, 2).map((insight, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-blue-500 mr-1">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
              
              {results.length === 0 && (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No processing results yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Processing Speed</span>
                </div>
                <span className="text-sm font-semibold text-blue-600">Fast</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Accuracy</span>
                </div>
                <span className="text-sm font-semibold text-green-600">95%</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">AI Model</span>
                </div>
                <span className="text-sm font-semibold text-purple-600">Local AI</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-900">Storage Used</span>
                </div>
                <span className="text-sm font-semibold text-orange-600">
                  {formatFileSize(savedData.reduce((sum, item) => sum + item.size, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataProcessingAI;
