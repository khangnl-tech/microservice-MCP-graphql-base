import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServer } from '@apollo/server';
import { gql } from 'graphql-tag';
import * as path from 'path';
import { callMcpTool, gqlRequest, httpGet, httpPost } from '@aiva/common';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = Number(process.env.PORT || 5000);
const AI_URL = process.env.AI_URL || 'http://localhost:5001';
const MEDIA_URL = process.env.MEDIA_URL || 'http://localhost:5002';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:5003';
const DATA_URL = process.env.DATA_URL || 'http://localhost:5004';

const typeDefs = gql`
  type User { id: ID!, email: String! }
  type Item { id: ID!, name: String! }

  type Query {
    aiHello(name: String): String!
    me: User
    items: [Item!]!
    mediaHealth: Boolean!
  }

  type Mutation {
    login(email: String!, password: String!): String!
    createItem(name: String!): Item!
  }
`;

const resolvers = {
  Query: {
    aiHello: async (_: any, args: { name?: string }) => {
      try {
        const res = await callMcpTool<{result:string}>(AI_URL, 'aiHelloTool', { name: args.name || 'World' });
        return res.result;
      } catch {
        const data = await gqlRequest<{ aiHello: string }>(AI_URL + '/graphql', `
          query($name:String){ aiHello(name:$name) }
        `, { name: args.name || 'World' });
        return data.aiHello;
      }
    },
    me: async (_: any, __: any, ctx: any) => {
      const token = ctx.req.headers.authorization?.replace('Bearer ', '') || '';
      if (!token) return null;
      const me = await httpGet(AUTH_URL + '/me', { Authorization: 'Bearer ' + token }).catch(() => null);
      return me?.user || null;
    },
    items: async () => {
      const data = await httpGet(DATA_URL + '/items');
      return data.items || [];
    },
    mediaHealth: async () => {
      const data = await httpGet(MEDIA_URL + '/health');
      return Boolean(data?.ok);
    }
  },
  Mutation: {
    login: async (_: any, { email, password }: any) => {
      const data = await httpPost(AUTH_URL + '/login', { email, password });
      return data.token;
    },
    createItem: async (_: any, { name }: any) => {
      const data = await httpPost(DATA_URL + '/items', { name });
      return data.item;
    }
  }
};

async function bootstrap() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  app.use('/graphql', expressMiddleware(server, { context: async ({ req, res }) => ({ req, res }) }));
  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.listen(PORT, () => console.log(`Gateway GraphQL at http://localhost:${PORT}/graphql`));
}
bootstrap();
