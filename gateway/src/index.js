// gateway/src/index.js

const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');

// Minimal schema and resolver for demonstration
const typeDefs = gql`
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => "Hello from Gateway!"
  }
};

async function startGateway() {
  const app = express();

  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Gateway listening on port ${PORT}...`);
    console.log(`GraphQL endpoint at /graphql`);
  });
}

startGateway().catch(err => {
  console.error("Error starting Gateway server", err);
});
