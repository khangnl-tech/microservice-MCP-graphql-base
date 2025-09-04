// microservices/auth/src/index.js

const express = require('express');
const app = express();

// For parsing JSON bodies
app.use(express.json());

// Simple health check route
app.get('/health', (req, res) => {
  res.json({ status: 'Auth microservice is running' });
});

const PORT = process.env.AUTH_PORT || 5003;
app.listen(PORT, () => {
  console.log(`Auth microservice listening on port ${PORT}...`);
});
