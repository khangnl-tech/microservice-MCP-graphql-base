// microservices/ai/src/index.js
// Chuyển sang dùng GraphQL ngay trong microservice AI

const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connected to AI database successfully");
}).catch(err => {
  console.error("Error connecting AI database:", err);
});

// Định nghĩa schema GraphQL
const typeDefs = gql`
  type Query {
    aiHello: String
  }
`;

// Resolvers: logic cho các field của schema
const resolvers = {
  Query: {
    aiHello: () => 'Hello from AI microservice!'
  }
};

async function start() {
  // Tạo Apollo Server
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  // Gắn Apollo Server vào Express app
  server.applyMiddleware({ app, path: '/graphql' });

  // Route health check cũ
  app.get('/health', (req, res) => {
    res.json({ status: 'AI microservice is running' });
  });

  const PORT = process.env.AI_PORT || 5001;
  app.listen(PORT, () => {
    console.log(`AI microservice listening on port ${PORT}...`);
    console.log("GraphQL endpoint at /graphql");
  });
}

// Khởi chạy server
start().catch(err => {
  console.error("Error starting AI microservice", err);
});
