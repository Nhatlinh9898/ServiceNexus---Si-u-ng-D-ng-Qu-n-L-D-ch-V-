// API Client Utility
// Handles API requests with authentication

// API base URL
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';

// Generic API response interface
interface ApiResponse<T = any> {
  status: 'success' | 'fail' | 'error';
  message?: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Request options interface
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

// API client class
class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // Get auth token
  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  // Build URL with query parameters
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }
    
    return url.toString();
  }

  // Handle API response
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      params,
    } = options;

    const token = this.getAuthToken();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const requestOptions: RequestInit = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...authHeaders,
        ...headers,
      },
    };

    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    const url = this.buildUrl(endpoint, params);

    try {
      const response = await fetch(url, requestOptions);
      return await this.handleResponse<T>(response);
    } catch (error) {
      // Handle network errors
      if (error instanceof Error) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }

  // HTTP methods
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  async put<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  async patch<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // File upload
  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        // Don't set Content-Type for FormData (browser sets it with boundary)
      },
      body: formData,
    });

    return this.handleResponse<T>(response);
  }

  // Download file
  async download(endpoint: string, filename?: string): Promise<void> {
    const token = this.getAuthToken();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: authHeaders,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Create API client instance
const apiClient = new ApiClient();

// Export API client and types
export { apiClient, ApiClient };
export type { ApiResponse, RequestOptions };

// Specific API services
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  
  register: (userData: any) =>
    apiClient.post('/auth/register', userData),
  
  logout: () =>
    apiClient.post('/auth/logout'),
  
  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
  
  getMe: () =>
    apiClient.get('/auth/me'),
};

export const usersApi = {
  getUsers: (params?: Record<string, string>) =>
    apiClient.get('/users', params),
  
  getUser: (id: string) =>
    apiClient.get(`/users/${id}`),
  
  updateUser: (id: string, userData: any) =>
    apiClient.put(`/users/${id}`, userData),
  
  deleteUser: (id: string) =>
    apiClient.delete(`/users/${id}`),
  
  changePassword: (id: string, passwords: any) =>
    apiClient.post(`/users/${id}/change-password`, passwords),
};

export const organizationsApi = {
  getOrganizations: (params?: Record<string, string>) =>
    apiClient.get('/organizations', params),
  
  getOrganization: (id: string) =>
    apiClient.get(`/organizations/${id}`),
  
  createOrganization: (orgData: any) =>
    apiClient.post('/organizations', orgData),
  
  updateOrganization: (id: string, orgData: any) =>
    apiClient.put(`/organizations/${id}`, orgData),
  
  deleteOrganization: (id: string) =>
    apiClient.delete(`/organizations/${id}`),
  
  getMembers: (id: string) =>
    apiClient.get(`/organizations/${id}/members`),
  
  addMember: (id: string, memberData: any) =>
    apiClient.post(`/organizations/${id}/members`, memberData),
  
  removeMember: (id: string, userId: string) =>
    apiClient.delete(`/organizations/${id}/members/${userId}`),
};

export const servicesApi = {
  getServices: (params?: Record<string, string>) =>
    apiClient.get('/services', params),
  
  getService: (id: string) =>
    apiClient.get(`/services/${id}`),
  
  createService: (serviceData: any) =>
    apiClient.post('/services', serviceData),
  
  updateService: (id: string, serviceData: any) =>
    apiClient.put(`/services/${id}`, serviceData),
  
  deleteService: (id: string) =>
    apiClient.delete(`/services/${id}`),
  
  getStats: (params?: Record<string, string>) =>
    apiClient.get('/services/stats/overview', params),
};

export const employeesApi = {
  getEmployees: (params?: Record<string, string>) =>
    apiClient.get('/employees', params),
  
  getEmployee: (id: string) =>
    apiClient.get(`/employees/${id}`),
  
  createEmployee: (employeeData: any) =>
    apiClient.post('/employees', employeeData),
  
  updateEmployee: (id: string, employeeData: any) =>
    apiClient.put(`/employees/${id}`, employeeData),
  
  deleteEmployee: (id: string) =>
    apiClient.delete(`/employees/${id}`),
  
  getStats: (params?: Record<string, string>) =>
    apiClient.get('/employees/stats/overview', params),
};

export const departmentsApi = {
  getDepartments: (params?: Record<string, string>) =>
    apiClient.get('/departments', params),
  
  getDepartment: (id: string) =>
    apiClient.get(`/departments/${id}`),
  
  createDepartment: (deptData: any) =>
    apiClient.post('/departments', deptData),
  
  updateDepartment: (id: string, deptData: any) =>
    apiClient.put(`/departments/${id}`, deptData),
  
  deleteDepartment: (id: string) =>
    apiClient.delete(`/departments/${id}`),
  
  getHierarchy: (organizationId: string) =>
    apiClient.get('/departments/hierarchy/tree', { organization_id: organizationId }),
};

export const aiApi = {
  getAdvice: (query: string, contextData?: string, organizationId?: string) =>
    apiClient.post('/ai/advice', { query, context_data: contextData, organization_id: organizationId }),
  
  analyzeServices: (organizationId: string, dateFrom?: string, dateTo?: string) =>
    apiClient.post('/ai/analyze-services', { organization_id: organizationId, date_from: dateFrom, date_to: dateTo }),
  
  generateContent: (type: string, context: any) =>
    apiClient.post('/ai/generate-content', { type, context }),
  
  getConversations: (params?: Record<string, string>) =>
    apiClient.get('/ai/conversations', params),
  
  getInsights: (params?: Record<string, string>) =>
    apiClient.get('/ai/insights', params),
  
  markInsightActioned: (id: string) =>
    apiClient.patch(`/ai/insights/${id}/action`),
};

export default apiClient;
