// Application constants
export const APP_CONSTANTS = {
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  },

  // Service Names
  SERVICES: {
    API_GATEWAY: 'api-gateway',
    USERS_SERVICE: 'users-service',
    AUTH_SERVICE: 'auth-service',
    AI_SERVICE: 'ai-service',
    MEDIA_SERVICE: 'media-service',
    NOTIFICATION_SERVICE: 'notification-service',
  },

  // Event Types
  EVENTS: {
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    AUTH_LOGIN: 'auth.login',
    AUTH_LOGOUT: 'auth.logout',
    AI_REQUEST: 'ai.request',
    AI_RESPONSE: 'ai.response',
    MEDIA_UPLOADED: 'media.uploaded',
    MEDIA_PROCESSED: 'media.processed',
    NOTIFICATION_SENT: 'notification.sent',
  },

  // Queue Names
  QUEUES: {
    AI_PROCESSING: 'ai-processing',
    MEDIA_PROCESSING: 'media-processing',
    EMAIL_NOTIFICATIONS: 'email-notifications',
    PUSH_NOTIFICATIONS: 'push-notifications',
  },

  // Cache Keys
  CACHE_KEYS: {
    USER_SESSION: 'user:session:',
    USER_PROFILE: 'user:profile:',
    AI_RESPONSE: 'ai:response:',
    MEDIA_METADATA: 'media:metadata:',
  },

  // File Types
  FILE_TYPES: {
    IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    VIDEO: ['mp4', 'avi', 'mov', 'wmv', 'flv'],
    AUDIO: ['mp3', 'wav', 'flac', 'aac'],
    DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
    EXCEL: ['xls', 'xlsx', 'csv'],
  },

  // AI Models
  AI_MODELS: {
    OPENAI: {
      GPT_4: 'gpt-4',
      GPT_3_5_TURBO: 'gpt-3.5-turbo',
      DALL_E_3: 'dall-e-3',
      WHISPER: 'whisper-1',
    },
    GOOGLE: {
      GEMINI_PRO: 'gemini-pro',
      GEMINI_PRO_VISION: 'gemini-pro-vision',
    },
    HUGGINGFACE: {
      BERT: 'bert-base-uncased',
      ROBERTA: 'roberta-base',
    },
  },

  // MCP Configuration
  MCP: {
    PROTOCOL_VERSION: '2024-11-05',
    TRANSPORT_TYPES: ['stdio', 'sse'],
    CAPABILITIES: {
      LOGGING: 'logging',
      PROMPTS: 'prompts',
      RESOURCES: 'resources',
      TOOLS: 'tools',
    },
  },
};

// Environment constants
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
};

// Validation constants
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
};
