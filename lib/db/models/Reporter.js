import mongoose from 'mongoose';
const { Schema, models, model } = mongoose;

const ReporterSchema = new Schema({
  name:      { type: String, required: true, trim: true },
  ownerId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isActive:  { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

ReporterSchema.index({ ownerId: 1, name: 1 }, { unique: true });
ReporterSchema.index({ ownerId: 1, isActive: 1 });

export default models.Reporter || model('Reporter', ReporterSchema);
