// GraphQL Schema Definition for ServiceNexus
// Defines all types, queries, mutations, and subscriptions

const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # Scalar Types
  scalar DateTime
  scalar JSON
  scalar Upload

  # Enums
  enum UserRole {
    ADMIN
    MANAGER
    USER
    VIEWER
  }

  enum ServiceStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    CANCELLED
    ON_HOLD
  }

  enum Priority {
    LOW
    MEDIUM
    HIGH
    URGENT
  }

  enum IndustryType {
    TECHNOLOGY
    HEALTHCARE
    FINANCE
    EDUCATION
    RETAIL
    MANUFACTURING
    CONSULTING
    OTHER
  }

  enum NotificationType {
    SYSTEM
    SERVICE
    ALERT
    MARKETING
    SECURITY
  }

  # Base Types
  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    role: UserRole!
    organization: Organization!
    department: Department
    avatar: String
    phone: String
    isActive: Boolean!
    lastLogin: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    services(limit: Int = 10, offset: Int = 0): [Service!]!
    notifications(limit: Int = 10, unreadOnly: Boolean = false): [Notification!]!
  }

  type Organization {
    id: ID!
    name: String!
    description: String
    industry: IndustryType!
    website: String
    logo: String
    isActive: Boolean!
    subscriptionPlan: String!
    maxUsers: Int!
    currentUsers: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
    users(limit: Int = 10, offset: Int = 0): [User!]!
    departments: [Department!]!
    services(limit: Int = 10, offset: Int = 0): [Service!]!
  }

  type Department {
    id: ID!
    name: String!
    description: String
    organization: Organization!
    manager: User
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    users(limit: Int = 10): [User!]!
    services(limit: Int = 10): [Service!]!
  }

  type Service {
    id: ID!
    title: String!
    description: String
    customerName: String!
    industry: IndustryType!
    status: ServiceStatus!
    priority: Priority!
    amount: Float!
    assignedTo: User
    createdBy: User!
    organization: Organization!
    department: Department
    tags: [String!]!
    notes: String
    files: [File!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    completedAt: DateTime
  }

  type File {
    id: ID!
    filename: String!
    originalName: String!
    mimeType: String!
    fileSize: Int!
    filePath: String!
    description: String
    isPublic: Boolean!
    downloadCount: Int!
    uploadedBy: User!
    organization: Organization!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Notification {
    id: ID!
    user: User!
    organization: Organization!
    type: NotificationType!
    title: String!
    message: String!
    data: JSON
    isRead: Boolean!
    priority: Priority!
    createdAt: DateTime!
    readAt: DateTime
    expiresAt: DateTime
  }

  # Analytics Types
  type ServiceMetrics {
    total: Int!
    pending: Int!
    inProgress: Int!
    completed: Int!
    cancelled: Int!
    completionRate: Float!
    averageCompletionTime: Float!
  }

  type RevenueMetrics {
    totalRevenue: Float!
    monthlyRevenue: Float!
    yearlyRevenue: Float!
    growthRate: Float!
    averageOrderValue: Float!
  }

  type UserMetrics {
    total: Int!
    active: Int!
    newThisMonth: Int!
    retentionRate: Float!
  }

  type Analytics {
    services: ServiceMetrics!
    revenue: RevenueMetrics!
    users: UserMetrics!
    topPerformers(limit: Int = 5): [User!]!
    industryBreakdown: [IndustryStats!]!
  }

  type IndustryStats {
    industry: IndustryType!
    count: Int!
    revenue: Float!
    percentage: Float!
  }

  # Auth Types
  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
    expiresIn: Int!
  }

  type RefreshTokenPayload {
    token: String!
    expiresIn: Int!
  }

  # Input Types
  input CreateUserInput {
    email: String!
    firstName: String!
    lastName: String!
    password: String!
    role: UserRole = USER
    phone: String
    organizationId: ID!
    departmentId: ID
  }

  input UpdateUserInput {
    firstName: String
    lastName: String
    phone: String
    role: UserRole
    departmentId: ID
    isActive: Boolean
  }

  input CreateOrganizationInput {
    name: String!
    description: String
    industry: IndustryType!
    website: String
    subscriptionPlan: String = "basic"
    maxUsers: Int = 10
  }

  input UpdateOrganizationInput {
    name: String
    description: String
    industry: IndustryType
    website: String
    subscriptionPlan: String
    maxUsers: Int
    isActive: Boolean
  }

  input CreateDepartmentInput {
    name: String!
    description: String
    organizationId: ID!
    managerId: ID
  }

  input UpdateDepartmentInput {
    name: String
    description: String
    managerId: ID
    isActive: Boolean
  }

  input CreateServiceInput {
    title: String!
    description: String
    customerName: String!
    industry: IndustryType!
    priority: Priority = MEDIUM
    amount: Float!
    assignedToId: ID
    departmentId: ID
    tags: [String!]
    notes: String
  }

  input UpdateServiceInput {
    title: String
    description: String
    customerName: String
    industry: IndustryType
    status: ServiceStatus
    priority: Priority
    amount: Float
    assignedToId: ID
    departmentId: ID
    tags: [String!]
    notes: String
  }

  input CreateNotificationInput {
    userId: ID!
    type: NotificationType!
    title: String!
    message: String!
    data: JSON
    priority: Priority = NORMAL
    expiresAt: DateTime
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input ServiceFilterInput {
    status: ServiceStatus
    priority: Priority
    industry: IndustryType
    assignedToId: ID
    departmentId: ID
    dateFrom: DateTime
    dateTo: DateTime
    search: String
  }

  input DateRangeInput {
    from: DateTime!
    to: DateTime!
  }

  # Queries
  type Query {
    # Auth
    me: User
    users(limit: Int = 10, offset: Int = 0, organizationId: ID, departmentId: ID, role: UserRole): [User!]!
    user(id: ID!): User
    
    # Organizations
    organizations(limit: Int = 10, offset: Int = 0, industry: IndustryType): [Organization!]!
    organization(id: ID!): Organization
    
    # Departments
    departments(limit: Int = 10, offset: Int = 0, organizationId: ID): [Department!]!
    department(id: ID!): Department
    
    # Services
    services(limit: Int = 10, offset: Int = 0, filter: ServiceFilterInput): [Service!]!
    service(id: ID!): Service
    myServices(limit: Int = 10, offset: Int = 0, status: ServiceStatus): [Service!]!
    
    # Files
    files(limit: Int = 10, offset: Int = 0, organizationId: ID): [File!]!
    file(id: ID!): File
    
    # Notifications
    notifications(limit: Int = 10, offset: Int = 0, unreadOnly: Boolean = false): [Notification!]!
    notification(id: ID!): Notification
    unreadNotificationCount: Int!
    
    # Analytics
    analytics(dateRange: DateRangeInput): Analytics!
    serviceMetrics(dateRange: DateRangeInput): ServiceMetrics!
    revenueMetrics(dateRange: DateRangeInput): RevenueMetrics!
    userMetrics(dateRange: DateRangeInput): UserMetrics!
    
    # Search
    searchServices(query: String!, limit: Int = 10): [Service!]!
    searchUsers(query: String!, limit: Int = 10): [User!]!
    
    # Reports
    exportServices(filter: ServiceFilterInput, format: String = "csv"): String!
    exportUsers(organizationId: ID, format: String = "csv"): String!
  }

  # Mutations
  type Mutation {
    # Auth
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!
    refreshToken: RefreshTokenPayload!
    changePassword(currentPassword: String!, newPassword: String!): Boolean!
    
    # Users
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    activateUser(id: ID!): User!
    deactivateUser(id: ID!): User!
    
    # Organizations
    createOrganization(input: CreateOrganizationInput!): Organization!
    updateOrganization(id: ID!, input: UpdateOrganizationInput!): Organization!
    deleteOrganization(id: ID!): Boolean!
    
    # Departments
    createDepartment(input: CreateDepartmentInput!): Department!
    updateDepartment(id: ID!, input: UpdateDepartmentInput!): Department!
    deleteDepartment(id: ID!): Boolean!
    
    # Services
    createService(input: CreateServiceInput!): Service!
    updateService(id: ID!, input: UpdateServiceInput!): Service!
    deleteService(id: ID!): Boolean!
    assignService(serviceId: ID!, userId: ID!): Service!
    unassignService(serviceId: ID!): Service!
    
    # Files
    uploadFile(file: Upload!, description: String, isPublic: Boolean = false): File!
    updateFile(id: ID!, description: String, isPublic: Boolean): File!
    deleteFile(id: ID!): Boolean!
    downloadFile(id: ID!): String!
    
    # Notifications
    createNotification(input: CreateNotificationInput!): Notification!
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: Boolean!
    deleteNotification(id: ID!): Boolean!
    
    # Bulk Operations
    bulkUpdateServices(serviceIds: [ID!]!, input: UpdateServiceInput!): [Service!]!
    bulkDeleteServices(serviceIds: [ID!]!): Boolean!
    bulkCreateNotifications(inputs: [CreateNotificationInput!]!): [Notification!]!
  }

  # Subscriptions
  type Subscription {
    # Real-time updates
    serviceUpdated(organizationId: ID): Service!
    userUpdated(organizationId: ID): User!
    notificationCreated(userId: ID): Notification!
    notificationUpdated(userId: ID): Notification!
    
    # Analytics
    analyticsUpdated(organizationId: ID): Analytics!
    
    # System events
    systemEvent(type: String): JSON!
  }
`;

module.exports = typeDefs;
