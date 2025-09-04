import mongoose from 'mongoose';

const aiRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  service: {
    type: String,
    required: true,
    enum: ['openai', 'googleai', 'huggingface', 'elevenlabs', 'together', 'googlecloud'],
    index: true,
  },
  model: {
    type: String,
    required: true,
  },
  prompt: {
    type: String,
    required: true,
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },
  errorMessage: {
    type: String,
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes
aiRequestSchema.index({ userId: 1, createdAt: -1 });
aiRequestSchema.index({ service: 1, status: 1 });
aiRequestSchema.index({ createdAt: -1 });

const AIRequest = mongoose.model('AIRequest', aiRequestSchema);

export default AIRequest;
