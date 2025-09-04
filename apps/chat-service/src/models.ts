import mongoose, { Schema, Types } from 'mongoose';

export interface IConversation {
  _id: Types.ObjectId;
  agentId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
const ConversationSchema = new Schema<IConversation>({
  agentId: { type: String, required: true },
  userId: { type: String, required: true }
}, { timestamps: true });
export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);

export interface IMessage {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  sender: 'user'|'agent';
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
const MessageSchema = new Schema<IMessage>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: String, enum: ['user','agent'], required: true },
  content: { type: String, required: true }
}, { timestamps: true });
export const Message = mongoose.model<IMessage>('Message', MessageSchema);
