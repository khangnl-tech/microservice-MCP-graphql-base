// microservices/media/src/index.js

const express = require('express');
const app = express();

// For parsing JSON bodies
app.use(express.json());

// Simple health check route
app.get('/health', (req, res) => {
  res.json({ status: 'Media microservice is running' });
});

const PORT = process.env.MEDIA_PORT || 5002;
app.listen(PORT, () => {
  console.log(`Media microservice listening on port ${PORT}...`);
});
