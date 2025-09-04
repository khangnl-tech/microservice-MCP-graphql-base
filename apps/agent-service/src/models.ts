import mongoose, { Schema, Types } from 'mongoose';

export interface IAgent {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  model?: string;
  createdAt: Date;
  updatedAt: Date;
}
const AgentSchema = new Schema<IAgent>({
  name: { type: String, required: true },
  description: { type: String },
  model: { type: String }
}, { timestamps: true });

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);
