import mongoose from 'mongoose';
const { Schema, models, model } = mongoose;

const BatchSchema = new Schema({
  ownerId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date:        { type: Date, required: true },
  label:       { type: String, trim: true },
  status:      { type: String, enum: ['open', 'committed', 'archived'], default: 'open' },
  recordCount: { type: Number, default: 0 },
  exportedAt:  { type: Date, default: null },
  committedAt: { type: Date, default: null },
  archivedAt:  { type: Date, default: null },
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

BatchSchema.index({ ownerId: 1, date: -1 }, { unique: true });
BatchSchema.index({ ownerId: 1, status: 1 });
BatchSchema.index({ date: -1 });

export default models.Batch || model('Batch', BatchSchema);
