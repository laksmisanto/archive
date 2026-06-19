import mongoose from 'mongoose';
const { Schema, models, model } = mongoose;

const DriveSchema = new Schema({
  label:     { type: String, required: true, trim: true },
  ownerId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  location:  { type: String, trim: true },
  isActive:  { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

DriveSchema.index({ ownerId: 1, label: 1 }, { unique: true });

export default models.Drive || model('Drive', DriveSchema);
