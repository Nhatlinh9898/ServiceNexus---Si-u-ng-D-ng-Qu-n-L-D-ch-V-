// AI Management Dashboard Component
// Giao diện quản lý AI trung tâm

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Download, 
  Settings, 
  Activity, 
  Zap, 
  Database,
  Plug,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  description: string;
  type: string;
  size: string;
  downloaded: boolean;
  loaded: boolean;
  capabilities: string[];
  stats?: {
    usageCount: number;
    averageResponseTime: number;
    errors: number;
    lastUsed: string | null;
  };
}

interface AIService {
  name: string;
  isDefault: boolean;
  type: string;
  status: string;
}

const AIManagementDashboard: React.FC = () => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [services, setServices] = useState<AIService[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string[]>([]);

  useEffect(() => {
    loadAIStatus();
    const interval = setInterval(loadAIStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAIStatus = async () => {
    try {
      // Mock data - trong thực tế sẽ gọi API
      const mockModels: AIModel[] = [
        {
          id: 'local-gpt-small',
          name: 'Local GPT Small',
          description: 'Model GPT nhỏ, nhẹ và nhanh',
          type: 'language',
          size: '100MB',
          downloaded: true,
          loaded: true,
          capabilities: ['text-generation', 'analysis'],
          stats: {
            usageCount: 156,
            averageResponseTime: 0.8,
            errors: 2,
            lastUsed: '2024-01-15T10:30:00Z'
          }
        },
        {
          id: 'local-gpt-medium',
          name: 'Local GPT Medium',
          description: 'Model GPT vừa, cân bằng hiệu suất',
          type: 'language',
          size: '500MB',
          downloaded: false,
          loaded: false,
          capabilities: ['text-generation', 'analysis', 'translation']
        },
        {
          id: 'rule-ai-v1',
          name: 'Rule AI v1.0',
          description: 'AI dựa trên luật, không cần download',
          type: 'rule-based',
          size: '0MB',
          downloaded: true,
          loaded: true,
          capabilities: ['rule-processing', 'decision-making'],
          stats: {
            usageCount: 89,
            averageResponseTime: 0.2,
            errors: 0,
            lastUsed: '2024-01-15T09:45:00Z'
          }
        },
        {
          id: 'pattern-ai-v1',
          name: 'Pattern AI v1.0',
          description: 'AI nhận diện mẫu',
          type: 'pattern-based',
          size: '0MB',
          downloaded: true,
          loaded: true,
          capabilities: ['pattern-recognition', 'trend-analysis'],
          stats: {
            usageCount: 45,
            averageResponseTime: 0.5,
            errors: 1,
            lastUsed: '2024-01-15T08:20:00Z'
          }
        }
      ];

      const mockServices: AIService[] = [
        { name: 'local', isDefault: true, type: 'LocalAIService', status: 'active' },
        { name: 'gemini', isDefault: false, type: 'GeminiService', status: 'inactive' }
      ];

      const mockSystemStatus = {
        totalModels: 4,
        downloadedModels: 3,
        activeDownloads: 0,
        queueLength: 0,
        storageUsage: {
          totalMB: 100,
          totalGB: '0.10',
          formatted: '100 MB'
        },
        mostUsed: [
          { modelId: 'local-gpt-small', usageCount: 156, averageResponseTime: 0.8 },
          { modelId: 'rule-ai-v1', usageCount: 89, averageResponseTime: 0.2 }
        ]
      };

      setModels(mockModels);
      setServices(mockServices);
      setSystemStatus(mockSystemStatus);
      setLoading(false);
    } catch (error) {
      console.error('Error loading AI status:', error);
      setLoading(false);
    }
  };

  const downloadModel = async (modelId: string) => {
    setDownloading([...downloading, modelId]);
    
    // Mock download
    setTimeout(() => {
      setModels(models.map(m => 
        m.id === modelId 
          ? { ...m, downloaded: true, loaded: true }
          : m
      ));
      setDownloading(downloading.filter(id => id !== modelId));
    }, 3000);
  };

  const deleteModel = async (modelId: string) => {
    if (confirm('Bạn có chắc muốn xóa model này?')) {
      setModels(models.map(m => 
        m.id === modelId 
          ? { ...m, downloaded: false, loaded: false }
          : m
      ));
    }
  };

  const setDefaultService = async (serviceName: string) => {
    setServices(services.map(s => ({
      ...s,
      isDefault: s.name === serviceName
    })));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'downloading':
        return <Download className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Brain className="h-8 w-8 mr-2" />
            AI Management Center
          </h1>
          <p className="text-muted-foreground">
            Quản lý AI trung tâm - Hoạt động offline, không cần API key
          </p>
        </div>
        <Button onClick={loadAIStatus} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus?.totalModels}</div>
            <p className="text-xs text-muted-foreground">
              {systemStatus?.downloadedModels} downloaded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus?.storageUsage?.formatted}</div>
            <p className="text-xs text-muted-foreground">
              {systemStatus?.storageUsage?.totalGB} GB used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {services.filter(s => s.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Default: {services.find(s => s.isDefault)?.name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus?.activeDownloads}</div>
            <p className="text-xs text-muted-foreground">
              {systemStatus?.queueLength} in queue
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">AI Models</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="plugins">Plugins</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Models</CardTitle>
              <CardDescription>
                Quản lý các model AI có sẵn và tải model mới
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{model.name}</h3>
                        {getStatusIcon(model.loaded ? 'active' : 'inactive')}
                        {model.downloaded && (
                          <Badge variant="secondary">Downloaded</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {model.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-muted-foreground">
                          Type: {model.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Size: {model.size}
                        </span>
                        {model.stats && (
                          <span className="text-xs text-muted-foreground">
                            Used: {model.stats.usageCount} times
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {model.capabilities.map((cap) => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!model.downloaded ? (
                        <Button
                          onClick={() => downloadModel(model.id)}
                          disabled={downloading.includes(model.id)}
                          size="sm"
                        >
                          {downloading.includes(model.id) ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => deleteModel(model.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Services</CardTitle>
              <CardDescription>
                Quản lý các dịch vụ AI và cấu hình mặc định
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{service.name}</h3>
                        {getStatusIcon(service.status)}
                        {service.isDefault && (
                          <Badge variant="default">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Type: {service.type}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!service.isDefault && (
                        <Button
                          onClick={() => setDefaultService(service.name)}
                          variant="outline"
                          size="sm"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Set Default
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plugins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Plugins</CardTitle>
              <CardDescription>
                Hệ thống plugin mở rộng cho AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Plugin System</h3>
                <p className="text-muted-foreground mb-4">
                  Hệ thống plugin cho phép mở rộng khả năng AI một cách linh hoạt
                </p>
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Plugins
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIManagementDashboard;
