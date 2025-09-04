const axios = require('axios');

// Service URLs from environment variables
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:4002';
const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL || 'http://localhost:4003';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:4004';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005';

// Helper function to make HTTP requests to microservices
const makeServiceRequest = async (serviceUrl, endpoint, method = 'GET', data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${serviceUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error calling service ${serviceUrl}${endpoint}:`, error.message);
    throw new Error(`Service unavailable: ${error.message}`);
  }
};

const resolvers = {
  Query: {
    // User queries
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(USER_SERVICE_URL, `/users/${user.id}`);
    },

    user: async (_, { id }, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(USER_SERVICE_URL, `/users/${id}`);
    },

    users: async (_, { limit = 10, offset = 0 }, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(USER_SERVICE_URL, `/users?limit=${limit}&offset=${offset}`);
    },

    // AI queries
    aiModels: async () => {
      return makeServiceRequest(AI_SERVICE_URL, '/models');
    },

    // Media queries
    mediaFiles: async (_, { userId, category }, { user }) => {
      if (!user) throw new Error('Authentication required');
      const queryParams = new URLSearchParams();
      if (userId) queryParams.append('userId', userId);
      if (category) queryParams.append('category', category);
      
      const endpoint = `/files${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return makeServiceRequest(MEDIA_SERVICE_URL, endpoint);
    },

    // Notification queries
    notifications: async (_, { userId, limit = 10, offset = 0 }, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(
        NOTIFICATION_SERVICE_URL, 
        `/notifications/${userId}?limit=${limit}&offset=${offset}`
      );
    },

    unreadNotificationsCount: async (_, { userId }, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(NOTIFICATION_SERVICE_URL, `/notifications/${userId}/unread-count`);
    }
  },

  Mutation: {
    // Authentication
    login: async (_, { input }) => {
      return makeServiceRequest(AUTH_SERVICE_URL, '/auth/login', 'POST', input);
    },

    register: async (_, { input }) => {
      return makeServiceRequest(AUTH_SERVICE_URL, '/auth/register', 'POST', input);
    },

    refreshToken: async (_, { token }) => {
      return makeServiceRequest(AUTH_SERVICE_URL, '/auth/refresh', 'POST', { token });
    },

    logout: async (_, __, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(AUTH_SERVICE_URL, '/auth/logout', 'POST', {}, { 
        'Authorization': `Bearer ${user.token}` 
      });
    },

    // User management
    updateProfile: async (_, { input }, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(
        USER_SERVICE_URL, 
        `/users/${user.id}`, 
        'PUT', 
        input,
        { 'Authorization': `Bearer ${user.token}` }
      );
    },

    changePassword: async (_, { input }, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(
        USER_SERVICE_URL, 
        `/users/${user.id}/password`, 
        'PUT', 
        input,
        { 'Authorization': `Bearer ${user.token}` }
      );
    },

    // AI operations
    generateText: async (_, { input }, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(
        AI_SERVICE_URL, 
        '/generate/text', 
        'POST', 
        input,
        { 'Authorization': `Bearer ${user.token}` }
      );
    },

    generateImage: async (_, { input }, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(
        AI_SERVICE_URL, 
        '/generate/image', 
        'POST', 
        input,
        { 'Authorization': `Bearer ${user.token}` }
      );
    },

    // Media operations
    uploadFile: async (_, { input }, { user }) => {
      if (!user) throw new Error('Authentication required');
      // Note: File upload handling would need special consideration for GraphQL
      // This is a simplified version
      return makeServiceRequest(
        MEDIA_SERVICE_URL, 
        '/files/upload', 
        'POST', 
        { ...input, uploadedBy: user.id },
        { 'Authorization': `Bearer ${user.token}` }
      );
    },

    deleteFile: async (_, { id }, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(
        MEDIA_SERVICE_URL, 
        `/files/${id}`, 
        'DELETE',
        null,
        { 'Authorization': `Bearer ${user.token}` }
      );
    },

    // Notifications
    markNotificationAsRead: async (_, { id }, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(
        NOTIFICATION_SERVICE_URL, 
        `/notifications/${id}/read`, 
        'PUT',
        null,
        { 'Authorization': `Bearer ${user.token}` }
      );
    },

    markAllNotificationsAsRead: async (_, { userId }, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(
        NOTIFICATION_SERVICE_URL, 
        `/notifications/${userId}/read-all`, 
        'PUT',
        null,
        { 'Authorization': `Bearer ${user.token}` }
      );
    },

    deleteNotification: async (_, { id }, { user }) => {
      if (!user) throw new Error('Authentication required');
      return makeServiceRequest(
        NOTIFICATION_SERVICE_URL, 
        `/notifications/${id}`, 
        'DELETE',
        null,
        { 'Authorization': `Bearer ${user.token}` }
      );
    }
  },

  // Field resolvers for complex types
  User: {
    // Add any field-level resolvers if needed
  },

  AIResponse: {
    // Add any field-level resolvers if needed
  },

  MediaFile: {
    // Add any field-level resolvers if needed
  },

  Notification: {
    // Add any field-level resolvers if needed
  }
};

module.exports = { resolvers };
