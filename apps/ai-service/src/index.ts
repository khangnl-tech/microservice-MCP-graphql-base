import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { gql } from 'graphql-tag';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const PORT = Number(process.env.PORT || 5001);

const typeDefs = gql` type Query { aiHello(name: String): String! } `;
const resolvers = { Query: { aiHello: (_: any, { name }: { name?: string }) => `🤖 AI says: Hello ${name || 'World'}!` } };

async function bootstrap() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  app.use('/graphql', expressMiddleware(server));

  app.get('/mcp/tools', (_req, res) => res.json({ tools: [{ name: 'aiHelloTool', description: 'Return a greeting from AI service' }] }));
  app.post('/mcp/call', (req, res) => {
    const { tool, input } = req.body || {};
    if (tool === 'aiHelloTool') return res.json({ result: `🤖 AI says: Hello ${input?.name || 'World'}!` });
    return res.status(400).json({ error: 'Unknown tool' });
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.listen(PORT, () => console.log(`AI service :${PORT} (GraphQL /graphql)`));
}
bootstrap();
