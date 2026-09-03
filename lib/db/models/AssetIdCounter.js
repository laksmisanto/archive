import mongoose from 'mongoose';
const { Schema, models, model } = mongoose;

const AssetIdCounterSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true },
  assetType: { type: String, required: true, lowercase: true },
  sequence: { type: Number, default: 0 },
}, { timestamps: true });

AssetIdCounterSchema.index({ ownerId: 1, day: 1, assetType: 1 }, { unique: true });

export default models.AssetIdCounter || model('AssetIdCounter', AssetIdCounterSchema);
