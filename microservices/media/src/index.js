// microservices/media/src/index.js

const express = require('express');
const mongoose = require('mongoose');
const app = express();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connected to Media database successfully");
}).catch(err => {
  console.error("Error connecting Media database:", err);
});

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
