// microservices/data/src/index.js

const express = require('express');
const app = express();

// For parsing JSON bodies
app.use(express.json());

// Simple health check route
app.get('/health', (req, res) => {
  res.json({ status: 'Data microservice is running' });
});

const PORT = process.env.DATA_PORT || 5004;
app.listen(PORT, () => {
  console.log(`Data microservice listening on port ${PORT}...`);
});
