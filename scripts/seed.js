/**
 * NAMS Database Seed Script
 * Run: node scripts/seed.js
 */
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/nams";

const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      username: String,
      email: String,
      passwordHash: String,
      role: String,
      isActive: { type: Boolean, default: true },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true },
  ),
);

const Reporter = mongoose.model(
  "Reporter",
  new mongoose.Schema(
    {
      name: String,
      ownerId: mongoose.Schema.Types.ObjectId,
      isActive: { type: Boolean, default: true },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true },
  ),
);

const Drive = mongoose.model(
  "Drive",
  new mongoose.Schema(
    {
      label: String,
      ownerId: mongoose.Schema.Types.ObjectId,
      location: String,
      isActive: { type: Boolean, default: true },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true },
  ),
);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected:", MONGODB_URI);

  let adminUser = await User.findOne({ username: "admin" });
  if (!adminUser) {
    adminUser = await User.create({
      username: "admin",
      email: "admin@nams.local",
      passwordHash: await bcrypt.hash("admin123", 12),
      role: "admin",
    });
    console.log("Admin created: admin / admin123");
  } else console.log("Admin exists");

  let opUser = await User.findOne({ username: "operator" });
  if (!opUser) {
    opUser = await User.create({
      username: "operator",
      email: "operator@nams.local",
      passwordHash: await bcrypt.hash("operator123", 12),
      role: "user",
    });
    console.log("Operator created: operator / operator123");
  } else console.log("Operator exists");

  const uid = opUser._id;
  for (const name of ["Shanto", "Rahim", "Karim", "Nadia", "Sara", "Tanvir"]) {
    if (!(await Reporter.findOne({ name, ownerId: uid }))) {
      await Reporter.create({ name, ownerId: uid });
      console.log("Reporter:", name);
    }
  }

  for (const { label, location } of [
    { label: "AVECO BACKUP - 01", location: "Server Room A" },
    { label: "AVECO BACKUP - 12", location: "Server Room B" },
    { label: "ARCHIVE MASTER - 01", location: "Archive Vault" },
    { label: "DAILY BACKUP - 06", location: "Server Room B" },
  ]) {
    if (!(await Drive.findOne({ label, ownerId: uid }))) {
      await Drive.create({ label, location, ownerId: uid });
      console.log("Drive:", label);
    }
  }

  console.log("\nSeed complete!");
  console.log("admin / admin123");
  console.log("operator / operator123");
  await mongoose.disconnect();
}
seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
