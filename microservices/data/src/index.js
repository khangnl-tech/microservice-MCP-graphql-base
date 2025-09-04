// microservices/data/src/index.js

const express = require('express');
const mongoose = require('mongoose');
const app = express();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connected to Data database successfully");
}).catch(err => {
  console.error("Error connecting Data database:", err);
});

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
