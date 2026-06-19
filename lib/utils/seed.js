// Run: node lib/utils/seed.js
// Creates admin user: admin / admin123

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/nams';

const UserSchema = new mongoose.Schema({
  username: String, email: String, passwordHash: String, role: String,
  isActive: { type: Boolean, default: true }, deletedAt: { type: Date, default: null },
}, { timestamps: true });

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  const existing = await User.findOne({ username: 'admin' });
  if (existing) { console.log('Admin already exists'); process.exit(0); }
  const passwordHash = await bcrypt.hash('admin123', 12);
  await User.create({ username: 'admin', email: 'admin@nams.local', passwordHash, role: 'admin' });
  console.log('Admin created: admin / admin123');
  process.exit(0);
}
seed().catch(console.error);
