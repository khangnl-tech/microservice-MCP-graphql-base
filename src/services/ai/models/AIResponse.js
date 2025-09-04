import mongoose from 'mongoose';

const aiResponseSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIRequest',
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  tokensUsed: {
    type: Number,
    default: 0,
  },
  cost: {
    type: Number,
    default: 0,
  },
  processingTime: {
    type: Number, // in milliseconds
    default: 0,
  },
  quality: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  cached: {
    type: Boolean,
    default: false,
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
aiResponseSchema.index({ requestId: 1 });
aiResponseSchema.index({ createdAt: -1 });
aiResponseSchema.index({ tokensUsed: -1 });
aiResponseSchema.index({ cost: -1 });

const AIResponse = mongoose.model('AIResponse', aiResponseSchema);

export default AIResponse;
