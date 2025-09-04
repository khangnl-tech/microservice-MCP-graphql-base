const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # User Types
  type User {
    id: ID!
    email: String!
    username: String!
    firstName: String
    lastName: String
    role: UserRole!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  enum UserRole {
    USER
    ADMIN
    MODERATOR
  }

  # Authentication Types
  type AuthResponse {
    user: User!
    token: String!
    refreshToken: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input RegisterInput {
    email: String!
    username: String!
    password: String!
    firstName: String
    lastName: String
  }

  # AI Service Types
  type AIResponse {
    id: ID!
    content: String!
    model: String!
    usage: UsageStats
    createdAt: String!
  }

  type UsageStats {
    promptTokens: Int
    completionTokens: Int
    totalTokens: Int
  }

  input AIRequestInput {
    prompt: String!
    model: String
    maxTokens: Int
    temperature: Float
  }

  # Media Types
  type MediaFile {
    id: ID!
    filename: String!
    originalName: String!
    mimeType: String!
    size: Int!
    url: String!
    uploadedBy: ID!
    createdAt: String!
  }

  input FileUploadInput {
    file: Upload!
    category: String
    tags: [String]
  }

  # Notification Types
  type Notification {
    id: ID!
    userId: ID!
    title: String!
    message: String!
    type: NotificationType!
    isRead: Boolean!
    createdAt: String!
  }

  enum NotificationType {
    INFO
    WARNING
    ERROR
    SUCCESS
  }

  # Queries
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(limit: Int, offset: Int): [User!]!
    
    # AI queries
    aiModels: [String!]!
    
    # Media queries
    mediaFiles(userId: ID, category: String): [MediaFile!]!
    
    # Notification queries
    notifications(userId: ID!, limit: Int, offset: Int): [Notification!]!
    unreadNotificationsCount(userId: ID!): Int!
  }

  # Mutations
  type Mutation {
    # Authentication
    login(input: LoginInput!): AuthResponse!
    register(input: RegisterInput!): AuthResponse!
    refreshToken(token: String!): AuthResponse!
    logout: Boolean!
    
    # User management
    updateProfile(input: UpdateProfileInput!): User!
    changePassword(input: ChangePasswordInput!): Boolean!
    
    # AI operations
    generateText(input: AIRequestInput!): AIResponse!
    generateImage(input: ImageGenerationInput!): String!
    
    # Media operations
    uploadFile(input: FileUploadInput!): MediaFile!
    deleteFile(id: ID!): Boolean!
    
    # Notifications
    markNotificationAsRead(id: ID!): Boolean!
    markAllNotificationsAsRead(userId: ID!): Boolean!
    deleteNotification(id: ID!): Boolean!
  }

  # Subscriptions
  type Subscription {
    notificationCreated(userId: ID!): Notification!
    userStatusChanged(userId: ID!): User!
  }

  # Additional input types
  input UpdateProfileInput {
    firstName: String
    lastName: String
    username: String
  }

  input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
  }

  input ImageGenerationInput {
    prompt: String!
    size: String
    quality: String
  }

  # File upload scalar
  scalar Upload
`;

module.exports = { typeDefs };
