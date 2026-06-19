import mongoose from 'mongoose';
const { Schema, models, model } = mongoose;

const ActivityLogSchema = new Schema({
  userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username:   { type: String },
  action:     { type: String, enum: ['CREATE', 'EDIT', 'DELETE', 'IMPORT', 'EXPORT', 'LOGIN', 'LOGOUT', 'COMMIT'], required: true },
  entityType: { type: String },
  entityId:   { type: Schema.Types.ObjectId },
  meta:       { type: Schema.Types.Mixed },
  ip:         { type: String },
}, { timestamps: true });

ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: -1 });

export default models.ActivityLog || model('ActivityLog', ActivityLogSchema);
