// GraphQL Resolvers for ServiceNexus
// Handles all GraphQL operations with business logic

const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');

// Import models and utilities
const { User, Organization, Department, Service, File, Notification } = require('../models');
const { validateEmail, validatePassword } = require('../utils/validation');
const { uploadFile, deleteFile } = require('../utils/fileUpload');
const { sendNotification } = require('../utils/notifications');
const { generateAnalytics } = require('../utils/analytics');

// Context middleware
const context = async ({ req }) => {
  const token = req.headers.authorization || '';
  
  if (!token) {
    return { user: null };
  }
  
  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate('organization department');
    
    if (!user || !user.isActive) {
      return { user: null };
    }
    
    return { user };
  } catch (error) {
    return { user: null };
  }
};

// Resolvers
const resolvers = {
  // Field Resolvers
  User: {
    async services(parent, { limit, offset }) {
      return await Service.find({ 
        createdBy: parent.id,
        organization: parent.organization.id 
      })
      .populate('assignedTo createdBy organization department')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);
    },
    
    async notifications(parent, { limit, unreadOnly }) {
      const query = { user: parent.id };
      if (unreadOnly) {
        query.isRead = false;
      }
      
      return await Notification.find(query)
        .populate('organization')
        .sort({ createdAt: -1 })
        .limit(limit);
    }
  },
  
  Organization: {
    async users(parent, { limit, offset }) {
      return await User.find({ organization: parent.id })
        .populate('department')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    },
    
    async departments(parent) {
      return await Department.find({ organization: parent.id })
        .populate('manager')
        .sort({ name: 1 });
    },
    
    async services(parent, { limit, offset }) {
      return await Service.find({ organization: parent.id })
        .populate('assignedTo createdBy department')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    },
    
    currentUsers(parent) {
      return User.countDocuments({ organization: parent.id, isActive: true });
    }
  },
  
  Department: {
    async users(parent, { limit }) {
      return await User.find({ department: parent.id })
        .populate('organization')
        .sort({ firstName: 1, lastName: 1 })
        .limit(limit);
    },
    
    async services(parent, { limit }) {
      return await Service.find({ department: parent.id })
        .populate('assignedTo createdBy organization')
        .sort({ createdAt: -1 })
        .limit(limit);
    }
  },
  
  Service: {
    async assignedTo(parent) {
      if (parent.assignedTo) {
        return await User.findById(parent.assignedTo);
      }
      return null;
    },
    
    async createdBy(parent) {
      return await User.findById(parent.createdBy);
    },
    
    async organization(parent) {
      return await Organization.findById(parent.organization);
    },
    
    async department(parent) {
      if (parent.department) {
        return await Department.findById(parent.department);
      }
      return null;
    },
    
    async files(parent) {
      return await File.find({ service: parent.id })
        .populate('uploadedBy')
        .sort({ createdAt: -1 });
    }
  },
  
  File: {
    async uploadedBy(parent) {
      return await User.findById(parent.uploadedBy);
    },
    
    async organization(parent) {
      return await Organization.findById(parent.organization);
    }
  },
  
  Notification: {
    async user(parent) {
      return await User.findById(parent.user);
    },
    
    async organization(parent) {
      return await Organization.findById(parent.organization);
    }
  },
  
  // Query Resolvers
  Query: {
    // Auth
    me: (parent, args, { user }) => {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      return user;
    },
    
    async users(parent, { limit, offset, organizationId, departmentId, role }, { user }) {
      if (!user || user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }
      
      const query = {};
      if (organizationId) query.organization = organizationId;
      if (departmentId) query.department = departmentId;
      if (role) query.role = role;
      
      return await User.find(query)
        .populate('organization department')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    },
    
    async user(parent, { id }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      if (user.role !== 'ADMIN' && id !== user.id) {
        throw new ForbiddenError('Access denied');
      }
      
      return await User.findById(id).populate('organization department');
    },
    
    async organizations(parent, { limit, offset, industry }, { user }) {
      if (!user || user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }
      
      const query = {};
      if (industry) query.industry = industry;
      
      return await Organization.find(query)
        .sort({ name: 1 })
        .limit(limit)
        .skip(offset);
    },
    
    async organization(parent, { id }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      if (user.role !== 'ADMIN' && user.organization.id !== id) {
        throw new ForbiddenError('Access denied');
      }
      
      return await Organization.findById(id);
    },
    
    async departments(parent, { limit, offset, organizationId }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const query = {};
      if (organizationId) {
        if (user.role !== 'ADMIN' && user.organization.id !== organizationId) {
          throw new ForbiddenError('Access denied');
        }
        query.organization = organizationId;
      } else {
        query.organization = user.organization.id;
      }
      
      return await Department.find(query)
        .populate('manager organization')
        .sort({ name: 1 })
        .limit(limit)
        .skip(offset);
    },
    
    async department(parent, { id }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const department = await Department.findById(id).populate('manager organization');
      
      if (!department) {
        throw new UserInputError('Department not found');
      }
      
      if (user.role !== 'ADMIN' && user.organization.id !== department.organization.id) {
        throw new ForbiddenError('Access denied');
      }
      
      return department;
    },
    
    async services(parent, { limit, offset, filter }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      let query = {};
      
      // Apply organization filter
      if (user.role !== 'ADMIN') {
        query.organization = user.organization.id;
      } else if (filter && filter.organizationId) {
        query.organization = filter.organizationId;
      }
      
      // Apply other filters
      if (filter) {
        if (filter.status) query.status = filter.status;
        if (filter.priority) query.priority = filter.priority;
        if (filter.industry) query.industry = filter.industry;
        if (filter.assignedToId) query.assignedTo = filter.assignedToId;
        if (filter.departmentId) query.department = filter.departmentId;
        if (filter.search) {
          query.$or = [
            { title: { $regex: filter.search, $options: 'i' } },
            { description: { $regex: filter.search, $options: 'i' } },
            { customerName: { $regex: filter.search, $options: 'i' } }
          ];
        }
        if (filter.dateFrom || filter.dateTo) {
          query.createdAt = {};
          if (filter.dateFrom) query.createdAt.$gte = new Date(filter.dateFrom);
          if (filter.dateTo) query.createdAt.$lte = new Date(filter.dateTo);
        }
      }
      
      return await Service.find(query)
        .populate('assignedTo createdBy organization department')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    },
    
    async service(parent, { id }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const service = await Service.findById(id)
        .populate('assignedTo createdBy organization department');
      
      if (!service) {
        throw new UserInputError('Service not found');
      }
      
      if (user.role !== 'ADMIN' && user.organization.id !== service.organization.id) {
        throw new ForbiddenError('Access denied');
      }
      
      return service;
    },
    
    async myServices(parent, { limit, offset, status }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const query = { 
        $or: [
          { createdBy: user.id },
          { assignedTo: user.id }
        ]
      };
      
      if (status) {
        query.status = status;
      }
      
      return await Service.find(query)
        .populate('assignedTo createdBy organization department')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    },
    
    async notifications(parent, { limit, offset, unreadOnly }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const query = { user: user.id };
      if (unreadOnly) {
        query.isRead = false;
      }
      
      return await Notification.find(query)
        .populate('organization')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    },
    
    async unreadNotificationCount(parent, args, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      return await Notification.countDocuments({ 
        user: user.id, 
        isRead: false 
      });
    },
    
    async analytics(parent, { dateRange }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      let organizationId = user.organization.id;
      if (user.role === 'ADMIN' && dateRange && dateRange.organizationId) {
        organizationId = dateRange.organizationId;
      }
      
      return await generateAnalytics(organizationId, dateRange);
    },
    
    async searchServices(parent, { query, limit }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const searchQuery = {
        $and: [
          {
            $or: [
              { title: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { customerName: { $regex: query, $options: 'i' } },
              { notes: { $regex: query, $options: 'i' } }
            ]
          },
          user.role === 'ADMIN' ? {} : { organization: user.organization.id }
        ]
      };
      
      return await Service.find(searchQuery)
        .populate('assignedTo createdBy organization department')
        .sort({ createdAt: -1 })
        .limit(limit);
    },
    
    async searchUsers(parent, { query, limit }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const searchQuery = {
        $and: [
          {
            $or: [
              { firstName: { $regex: query, $options: 'i' } },
              { lastName: { $regex: query, $options: 'i' } },
              { email: { $regex: query, $options: 'i' } }
            ]
          },
          user.role === 'ADMIN' ? {} : { organization: user.organization.id }
        ]
      };
      
      return await User.find(searchQuery)
        .populate('organization department')
        .sort({ firstName: 1, lastName: 1 })
        .limit(limit);
    }
  },
  
  // Mutation Resolvers
  Mutation: {
    // Auth
    async login(parent, { input }) {
      const { email, password } = input;
      
      if (!validateEmail(email)) {
        throw new UserInputError('Invalid email format');
      }
      
      const user = await User.findOne({ email }).populate('organization department');
      
      if (!user || !user.isActive) {
        throw new AuthenticationError('Invalid credentials');
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        throw new AuthenticationError('Invalid credentials');
      }
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      // Generate tokens
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );
      
      return {
        token,
        refreshToken,
        user,
        expiresIn: 3600
      };
    },
    
    async logout(parent, args, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      // In a real implementation, you would invalidate the token here
      return true;
    },
    
    async refreshToken(parent, args, { user }) {
      if (!user) {
        throw new AuthenticationError('Invalid refresh token');
      }
      
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      return {
        token,
        expiresIn: 3600
      };
    },
    
    async changePassword(parent, { currentPassword, newPassword }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      if (!validatePassword(newPassword)) {
        throw new UserInputError('Password must be at least 8 characters long');
      }
      
      const currentUser = await User.findById(user.id);
      const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password);
      
      if (!isValidPassword) {
        throw new AuthenticationError('Current password is incorrect');
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.findByIdAndUpdate(user.id, { password: hashedPassword });
      
      return true;
    },
    
    // Users
    async createUser(parent, { input }, { user }) {
      if (!user || user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }
      
      const { email, firstName, lastName, password, role, organizationId, departmentId } = input;
      
      if (!validateEmail(email)) {
        throw new UserInputError('Invalid email format');
      }
      
      if (!validatePassword(password)) {
        throw new UserInputError('Password must be at least 8 characters long');
      }
      
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new UserInputError('User with this email already exists');
      }
      
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new UserInputError('Organization not found');
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = new User({
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: role || 'USER',
        organization: organizationId,
        department: departmentId,
        isActive: true
      });
      
      await newUser.save();
      
      // Send welcome notification
      await sendNotification({
        userId: newUser.id,
        type: 'SYSTEM',
        title: 'Welcome to ServiceNexus!',
        message: `Welcome ${firstName}! Your account has been created successfully.`,
        priority: 'NORMAL'
      });
      
      return await User.findById(newUser.id).populate('organization department');
    },
    
    async updateUser(parent, { id, input }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      if (user.role !== 'ADMIN' && id !== user.id) {
        throw new ForbiddenError('Access denied');
      }
      
      const targetUser = await User.findById(id);
      if (!targetUser) {
        throw new UserInputError('User not found');
      }
      
      // Check organization access for non-admin users
      if (user.role !== 'ADMIN' && user.organization.id !== targetUser.organization.toString()) {
        throw new ForbiddenError('Access denied');
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { ...input, updatedAt: new Date() },
        { new: true }
      ).populate('organization department');
      
      return updatedUser;
    },
    
    async deleteUser(parent, { id }, { user }) {
      if (!user || user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }
      
      const targetUser = await User.findById(id);
      if (!targetUser) {
        throw new UserInputError('User not found');
      }
      
      // Don't allow deletion of the last admin
      if (targetUser.role === 'ADMIN') {
        const adminCount = await User.countDocuments({ role: 'ADMIN', isActive: true });
        if (adminCount <= 1) {
          throw new UserInputError('Cannot delete the last admin user');
        }
      }
      
      await User.findByIdAndDelete(id);
      return true;
    },
    
    // Services
    async createService(parent, { input }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const service = new Service({
        ...input,
        createdBy: user.id,
        organization: user.organization.id,
        status: 'PENDING',
        createdAt: new Date()
      });
      
      await service.save();
      
      // Send notification to assigned user
      if (input.assignedToId && input.assignedToId !== user.id) {
        await sendNotification({
          userId: input.assignedToId,
          type: 'SERVICE',
          title: 'New Service Assigned',
          message: `You have been assigned a new service: ${input.title}`,
          data: { serviceId: service.id },
          priority: input.priority
        });
      }
      
      return await Service.findById(service.id)
        .populate('assignedTo createdBy organization department');
    },
    
    async updateService(parent, { id, input }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const service = await Service.findById(id);
      if (!service) {
        throw new UserInputError('Service not found');
      }
      
      // Check access
      if (user.role !== 'ADMIN' && user.organization.id !== service.organization.toString()) {
        throw new ForbiddenError('Access denied');
      }
      
      const updatedService = await Service.findByIdAndUpdate(
        id,
        { ...input, updatedAt: new Date() },
        { new: true }
      ).populate('assignedTo createdBy organization department');
      
      // Send notifications for status changes
      if (input.status && input.status !== service.status) {
        if (input.status === 'COMPLETED') {
          updatedService.completedAt = new Date();
          await updatedService.save();
          
          // Send completion notification
          await sendNotification({
            userId: service.createdBy,
            type: 'SERVICE',
            title: 'Service Completed',
            message: `Service "${service.title}" has been completed.`,
            data: { serviceId: service.id },
            priority: 'NORMAL'
          });
        }
      }
      
      return updatedService;
    },
    
    async deleteService(parent, { id }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const service = await Service.findById(id);
      if (!service) {
        throw new UserInputError('Service not found');
      }
      
      // Check access
      if (user.role !== 'ADMIN' && 
          user.organization.id !== service.organization.toString() && 
          user.id !== service.createdBy.toString()) {
        throw new ForbiddenError('Access denied');
      }
      
      await Service.findByIdAndDelete(id);
      return true;
    },
    
    // Notifications
    async createNotification(parent, { input }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const notification = new Notification({
        ...input,
        organization: user.organization.id,
        createdAt: new Date()
      });
      
      await notification.save();
      
      // Send real-time notification
      // This would integrate with WebSocket service
      
      return await Notification.findById(notification.id).populate('organization');
    },
    
    async markNotificationAsRead(parent, { id }, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      const notification = await Notification.findOne({ _id: id, user: user.id });
      if (!notification) {
        throw new UserInputError('Notification not found');
      }
      
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
      
      return notification;
    },
    
    async markAllNotificationsAsRead(parent, args, { user }) {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      await Notification.updateMany(
        { user: user.id, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      
      return true;
    }
  },
  
  // Subscription Resolvers
  Subscription: {
    serviceUpdated: {
      subscribe: (parent, { organizationId }, { user }) => {
        // Implementation would use WebSocket or similar
        // For now, return a placeholder
        return null;
      }
    },
    
    notificationCreated: {
      subscribe: (parent, { userId }, { user }) => {
        // Implementation would use WebSocket or similar
        // For now, return a placeholder
        return null;
      }
    }
  }
};

module.exports = { resolvers, context };
