import mongoose from 'mongoose';
const { Schema, models, model } = mongoose;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role:     { type: String, enum: ['admin', 'editor', 'user'], default: 'user' },
  isActive: { type: Boolean, default: true },
  deletedAt:{ type: Date, default: null },
}, { timestamps: true });

UserSchema.index({ role: 1 });
UserSchema.index({ deletedAt: 1 });

export default models.User || model('User', UserSchema);
