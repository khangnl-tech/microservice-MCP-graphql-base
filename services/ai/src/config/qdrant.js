const { QdrantClient } = require('qdrant');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/qdrant.log', level: 'error' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

let qdrantClient = null;

const connectQdrant = async () => {
  try {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    
    qdrantClient = new QdrantClient({
      url: qdrantUrl,
      timeout: 10000
    });

    // Test connection by getting collections info
    const collections = await qdrantClient.getCollections();
    logger.info('Qdrant connected successfully');
    logger.info(`Available collections: ${collections.length}`);

    // Initialize default collections if they don't exist
    await initializeDefaultCollections();

    return qdrantClient;

  } catch (error) {
    logger.error('Qdrant connection failed:', error);
    throw error;
  }
};

const initializeDefaultCollections = async () => {
  try {
    const defaultCollections = [
      {
        name: 'documents',
        vectorSize: 1536, // OpenAI embedding size
        distance: 'Cosine'
      },
      {
        name: 'images',
        vectorSize: 512, // Image embedding size
        distance: 'Cosine'
      },
      {
        name: 'audio',
        vectorSize: 1024, // Audio embedding size
        distance: 'Cosine'
      },
      {
        name: 'code',
        vectorSize: 768, // Code embedding size
        distance: 'Cosine'
      }
    ];

    for (const collection of defaultCollections) {
      try {
        const exists = await qdrantClient.getCollection(collection.name);
        if (!exists) {
          await qdrantClient.createCollection(collection.name, {
            vectors: {
              size: collection.vectorSize,
              distance: collection.distance
            }
          });
          logger.info(`Created collection: ${collection.name}`);
        }
      } catch (error) {
        if (error.message.includes('already exists')) {
          logger.info(`Collection ${collection.name} already exists`);
        } else {
          logger.warn(`Failed to create collection ${collection.name}:`, error.message);
        }
      }
    }

  } catch (error) {
    logger.error('Failed to initialize default collections:', error);
  }
};

const getQdrantClient = () => {
  if (!qdrantClient) {
    throw new Error('Qdrant client not initialized');
  }
  return qdrantClient;
};

const createCollection = async (name, vectorSize, distance = 'Cosine') => {
  try {
    const client = getQdrantClient();
    await client.createCollection(name, {
      vectors: {
        size: vectorSize,
        distance: distance
      }
    });
    logger.info(`Collection ${name} created successfully`);
    return true;
  } catch (error) {
    logger.error(`Failed to create collection ${name}:`, error);
    throw error;
  }
};

const deleteCollection = async (name) => {
  try {
    const client = getQdrantClient();
    await client.deleteCollection(name);
    logger.info(`Collection ${name} deleted successfully`);
    return true;
  } catch (error) {
    logger.error(`Failed to delete collection ${name}:`, error);
    throw error;
  }
};

const upsertPoints = async (collectionName, points) => {
  try {
    const client = getQdrantClient();
    await client.upsert(collectionName, {
      points: points
    });
    logger.info(`Upserted ${points.length} points to collection ${collectionName}`);
    return true;
  } catch (error) {
    logger.error(`Failed to upsert points to collection ${collectionName}:`, error);
    throw error;
  }
};

const searchVectors = async (collectionName, vector, limit = 10, scoreThreshold = 0.7) => {
  try {
    const client = getQdrantClient();
    const results = await client.search(collectionName, {
      vector: vector,
      limit: limit,
      score_threshold: scoreThreshold
    });
    return results;
  } catch (error) {
    logger.error(`Failed to search vectors in collection ${collectionName}:`, error);
    throw error;
  }
};

const getCollectionInfo = async (collectionName) => {
  try {
    const client = getQdrantClient();
    const info = await client.getCollection(collectionName);
    return info;
  } catch (error) {
    logger.error(`Failed to get collection info for ${collectionName}:`, error);
    throw error;
  }
};

module.exports = {
  connectQdrant,
  getQdrantClient,
  createCollection,
  deleteCollection,
  upsertPoints,
  searchVectors,
  getCollectionInfo
};
