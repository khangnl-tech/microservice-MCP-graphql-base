import { gql } from 'apollo-server-express';
import { natsClient } from '@libs/common';

export class AppModule {
  async createGraphQLSchema() {
    const typeDefs = gql`
      type User {
        id: ID!
        email: String!
        username: String!
        firstName: String!
        lastName: String!
        createdAt: String!
        updatedAt: String!
      }

      type UsersConnection {
        data: [User!]!
        pagination: Pagination!
      }

      type Pagination {
        page: Int!
        limit: Int!
        total: Int!
        totalPages: Int!
        hasNext: Boolean!
        hasPrev: Boolean!
      }

      input PaginationInput {
        page: Int = 1
        limit: Int = 10
        sortBy: String
        sortOrder: String = "desc"
      }

      input CreateUserInput {
        email: String!
        username: String!
        firstName: String!
        lastName: String!
        password: String!
      }

      input UpdateUserInput {
        email: String
        username: String
        firstName: String
        lastName: String
      }

      type Query {
        user(id: ID!): User
        users(pagination: PaginationInput): UsersConnection!
        me: User
      }

      type Mutation {
        createUser(input: CreateUserInput!): User!
        updateUser(id: ID!, input: UpdateUserInput!): User!
        deleteUser(id: ID!): Boolean!
      }

      type Subscription {
        userCreated: User!
        userUpdated: User!
        userDeleted: ID!
      }
    `;

    const resolvers = {
      Query: {
        user: async (_: any, { id }: { id: string }, context: any) => {
          try {
            return await natsClient.request('users.get', { userId: id }, 5000);
          } catch (error) {
            throw new Error(`Failed to get user: ${(error as Error).message}`);
          }
        },

        users: async (_: any, { pagination }: { pagination?: any }, context: any) => {
          try {
            return await natsClient.request('users.list', { pagination }, 5000);
          } catch (error) {
            throw new Error(`Failed to get users: ${(error as Error).message}`);
          }
        },

        me: async (_: any, __: any, context: any) => {
          if (!context.user) {
            throw new Error('Authentication required');
          }
          try {
            return await natsClient.request('users.get', { userId: context.user.id }, 5000);
          } catch (error) {
            throw new Error(`Failed to get current user: ${(error as Error).message}`);
          }
        }
      },

      Mutation: {
        createUser: async (_: any, { input }: { input: any }, context: any) => {
          try {
            return await natsClient.request('users.create', input, 10000);
          } catch (error) {
            throw new Error(`Failed to create user: ${(error as Error).message}`);
          }
        },

        updateUser: async (_: any, { id, input }: { id: string; input: any }, context: any) => {
          try {
            return await natsClient.request('users.update', { userId: id, ...input }, 10000);
          } catch (error) {
            throw new Error(`Failed to update user: ${(error as Error).message}`);
          }
        },

        deleteUser: async (_: any, { id }: { id: string }, context: any) => {
          try {
            const result = await natsClient.request('users.delete', { userId: id }, 10000);
            return result.success || false;
          } catch (error) {
            throw new Error(`Failed to delete user: ${(error as Error).message}`);
          }
        }
      },

      Subscription: {
        userCreated: {
          subscribe: () => {
            // Implementation for real-time subscriptions
            // This would typically use GraphQL subscriptions with Redis/NATS
            throw new Error('Subscriptions not implemented yet');
          }
        },

        userUpdated: {
          subscribe: () => {
            throw new Error('Subscriptions not implemented yet');
          }
        },

        userDeleted: {
          subscribe: () => {
            throw new Error('Subscriptions not implemented yet');
          }
        }
      }
    };

    return { typeDefs, resolvers };
  }
}
