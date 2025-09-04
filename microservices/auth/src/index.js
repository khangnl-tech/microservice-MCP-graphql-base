// microservices/auth/src/index.js

const express = require('express');
const mongoose = require('mongoose');
const app = express();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connected to Auth database successfully");
}).catch(err => {
  console.error("Error connecting Auth database:", err);
});

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
