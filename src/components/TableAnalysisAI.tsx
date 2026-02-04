import React, { useState, useEffect } from 'react';
import { 
  Table, 
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
  Activity,
  Grid,
  Columns,
  Rows,
  Calculator,
  Eye,
  Edit,
  Filter,
  Search,
  Plus
} from 'lucide-react';

interface TableData {
  [key: string]: any;
}

interface AnalysisResult {
  timestamp: string;
  type: string;
  data: any;
  insights?: string[];
  recommendations?: string[];
}

interface SavedTable {
  filename: string;
  size: number;
  created: string;
  modified: string;
  format: string;
}

const TableAnalysisAI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'analyze' | 'matrix' | 'saved'>('upload');
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [savedTables, setSavedTables] = useState<SavedTable[]>([]);
  const [matrixData, setMatrixData] = useState<number[][]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [selectedRow, setSelectedRow] = useState<number>(-1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSavedTables();
  }, []);

  const fetchSavedTables = async () => {
    try {
      const response = await fetch('/api/table-analysis/list');
      const data = await response.json();
      if (data.success) {
        setSavedTables(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch saved tables:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          let parsedData: TableData[] = [];

          if (file.name.endsWith('.json')) {
            parsedData = JSON.parse(content);
          } else if (file.name.endsWith('.csv')) {
            // Simple CSV parsing
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length > 0) {
              const headers = lines[0].split(',').map(h => h.trim());
              parsedData = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const row: TableData = {};
                headers.forEach((header, index) => {
                  row[header] = values[index];
                });
                return row;
              });
            }
          }

          setTableData(parsedData);
        } catch (error) {
          console.error('Failed to parse file:', error);
          alert('Invalid file format. Please upload a valid JSON or CSV file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleParseTable = async () => {
    if (!tableData.length) {
      alert('Please upload data first');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/table-analysis/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: tableData,
          format: 'auto'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setAnalysisResults(prev => [result.data, ...prev]);
        alert('Table parsed successfully');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Parsing failed:', error);
      alert(`Parsing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeTable = async () => {
    if (!tableData.length) {
      alert('Please upload data first');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/table-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: tableData,
          analysisType: 'comprehensive'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setAnalysisResults(prev => [result.data, ...prev]);
        alert('Table analysis completed');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeColumn = async () => {
    if (!tableData.length || !selectedColumn) {
      alert('Please upload data and select a column');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/table-analysis/column/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: tableData,
          columnName: selectedColumn,
          analysisType: 'comprehensive'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setAnalysisResults(prev => [result.data, ...prev]);
        alert('Column analysis completed');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Column analysis failed:', error);
      alert(`Column analysis failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeRow = async () => {
    if (!tableData.length || selectedRow < 0) {
      alert('Please upload data and select a row');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/table-analysis/row/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: tableData,
          rowIndex: selectedRow,
          analysisType: 'comprehensive'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setAnalysisResults(prev => [result.data, ...prev]);
        alert('Row analysis completed');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Row analysis failed:', error);
      alert(`Row analysis failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertToMatrix = async () => {
    if (!tableData.length) {
      alert('Please upload data first');
      return;
    }

    try {
      const response = await fetch('/api/table-analysis/to-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: tableData,
          includeHeaders: true
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMatrixData(result.data.matrix);
        setActiveTab('matrix');
        alert('Converted to matrix successfully');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Matrix conversion failed:', error);
      alert(`Matrix conversion failed: ${error.message}`);
    }
  };

  const handleMatrixOperation = async (operation: string) => {
    if (!matrixData.length) {
      alert('Please convert table to matrix first');
      return;
    }

    try {
      const response = await fetch(`/api/table-analysis/matrix/${operation}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matrix: matrixData
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMatrixData(result.data.result);
        alert(`${operation} operation completed`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`${operation} failed:`, error);
      alert(`${operation} failed: ${error.message}`);
    }
  };

  const handleSaveTable = async () => {
    if (!tableData.length) {
      alert('Please upload data first');
      return;
    }

    const filename = prompt('Enter filename:');
    if (!filename) return;

    try {
      const response = await fetch('/api/table-analysis/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: tableData,
          filename: filename,
          format: 'json'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Table saved successfully');
        await fetchSavedTables();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert(`Save failed: ${error.message}`);
    }
  };

  const handleLoadTable = async (filename: string) => {
    try {
      const response = await fetch(`/api/table-analysis/load/${filename}`);
      const result = await response.json();
      
      if (result.success) {
        setTableData(result.data.data);
        alert('Table loaded successfully');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Load failed:', error);
      alert(`Load failed: ${error.message}`);
    }
  };

  const handleDeleteTable = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/table-analysis/delete/${filename}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Table deleted successfully');
        await fetchSavedTables();
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

  const filteredTableData = tableData.filter(row => 
    Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Table Analysis AI</h1>
          <p className="text-gray-600 mt-1">AI-powered table data analysis and matrix operations</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => fetchSavedTables()}
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
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload & Parse</span>
          </button>
          
          <button
            onClick={() => setActiveTab('analyze')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'analyze'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analyze</span>
          </button>
          
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium ${
              activeTab === 'matrix'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Matrix Operations</span>
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
            <span>Saved Tables</span>
          </button>
        </div>
      </div>

      {/* Upload & Parse Tab */}
      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Table Data</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Click to upload
                  </span>
                  <span className="text-gray-600"> or drag and drop</span>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">JSON or CSV files only</p>
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

            {/* Data Preview */}
            {tableData.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Preview</h3>
                
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search table data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(tableData[0]).map((key, index) => (
                          <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTableData.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredTableData.length > 10 && (
                    <div className="text-center py-4 text-sm text-gray-500">
                      Showing 10 of {filteredTableData.length} rows
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {filteredTableData.length} rows × {tableData[0] ? Object.keys(tableData[0]).length : 0} columns
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleParseTable}
                      disabled={isProcessing}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      <span>Parse Table</span>
                    </button>
                    
                    <button
                      onClick={handleSaveTable}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Rows</span>
                  <span className="text-lg font-semibold text-gray-900">{tableData.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Columns</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {tableData.length > 0 ? Object.keys(tableData[0]).length : 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Saved Tables</span>
                  <span className="text-lg font-semibold text-gray-900">{savedTables.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Analysis Results</span>
                  <span className="text-lg font-semibold text-gray-900">{analysisResults.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Capabilities</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Table className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">Table Parsing</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Columns className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">Column Analysis</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Rows className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700">Row Analysis</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Grid className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-gray-700">Matrix Operations</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calculator className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-gray-700">Statistical Analysis</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analyze Tab */}
      {activeTab === 'analyze' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Analysis Controls */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Controls</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleAnalyzeTable}
                  disabled={!tableData.length || isProcessing}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Analyze Full Table</span>
                </button>
                
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Column</option>
                    {tableData.length > 0 && Object.keys(tableData[0]).map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAnalyzeColumn}
                    disabled={!selectedColumn || isProcessing}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Columns className="w-4 h-4" />
                    <span>Analyze Column</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    placeholder="Row index"
                    value={selectedRow}
                    onChange={(e) => setSelectedRow(parseInt(e.target.value))}
                    min="0"
                    max={tableData.length - 1}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAnalyzeRow}
                    disabled={selectedRow < 0 || isProcessing}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Rows className="w-4 h-4" />
                    <span>Analyze Row</span>
                  </button>
                </div>
                
                <button
                  onClick={handleConvertToMatrix}
                  disabled={!tableData.length || isProcessing}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  <Grid className="w-4 h-4" />
                  <span>Convert to Matrix</span>
                </button>
              </div>

              {isProcessing && (
                <div className="mt-4">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing analysis...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Analysis Results */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Results</h3>
              
              <div className="space-y-4">
                {analysisResults.slice(0, 5).map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {result.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(result.timestamp)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      {result.data && typeof result.data === 'object' && (
                        <div>
                          <span className="font-medium">Summary:</span>
                          <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.data, null, 2).substring(0, 200)}...
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {analysisResults.length === 0 && (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No analysis results yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('matrix')}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <Grid className="w-4 h-4" />
                  <span>Matrix Operations</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('saved')}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Database className="w-4 h-4" />
                  <span>Manage Saved Tables</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Matrix Operations Tab */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Matrix Display */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Matrix Data</h3>
              
              {matrixData.length > 0 ? (
                <div>
                  <div className="mb-4 text-sm text-gray-600">
                    Matrix dimensions: {matrixData.length} × {matrixData[0].length}
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="bg-white divide-y divide-gray-200">
                        {matrixData.slice(0, 10).map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 border border-gray-200">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {matrixData.length > 10 && (
                      <div className="text-center py-4 text-sm text-gray-500">
                        Showing 10 of {matrixData.length} rows
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleMatrixOperation('transpose')}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Transpose</span>
                    </button>
                    
                    <button
                      onClick={() => handleMatrixOperation('determinant')}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Determinant</span>
                    </button>
                    
                    <button
                      onClick={() => handleMatrixOperation('inverse')}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Inverse</span>
                    </button>
                    
                    <button
                      onClick={() => handleMatrixOperation('statistics')}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                    >
                      <BarChart3 className="w-3 h-3" />
                      <span>Statistics</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Grid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No matrix data available</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-4 text-blue-600 hover:text-blue-700"
                  >
                    Upload table data to convert to matrix
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saved Tables Tab */}
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
                    Format
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
                {savedTables.map((table, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{table.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {table.format.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFileSize(table.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(table.created)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(table.modified)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleLoadTable(table.filename)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Load"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table.filename)}
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
            
            {savedTables.length === 0 && (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No saved tables found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableAnalysisAI;
