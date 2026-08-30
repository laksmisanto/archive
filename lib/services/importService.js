import { connectDB } from '../db/mongoose';
import ArchiveRecord from '../db/models/ArchiveRecord';
import Reporter from '../db/models/Reporter';
import Drive from '../db/models/Drive';

export async function processImport({ ownerId, batchId, rows }) {

  console.log(rows);

  await connectDB();

  // Existing video IDs
  const existing = await ArchiveRecord.find(
    { ownerId, deletedAt: null },
    { videoId: 1 }
  ).lean();

  const existingSet = new Set(existing.map((r) => r.videoId));

  // Load Reporters & Drives
  const [reporterList, driveList] = await Promise.all([
    Reporter.find({ ownerId, deletedAt: null }).lean(),
    Drive.find({ ownerId, deletedAt: null }).lean(),
  ]);

  const reporterMap = Object.fromEntries(
    reporterList.map((r) => [r.name.toLowerCase(), r])
  );

  const driveMap = Object.fromEntries(
    driveList.map((d) => [d.label.toLowerCase(), d])
  );

  const toInsert = [];
  const skipped = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // -------------------------
    // Read Excel Columns
    // -------------------------

const rawDate =
  row["Date"] ??
  row["date"] ??
  row["DATE"];

const videoId = (
  row["Video ID"] ??
  row["videoId"] ??
  row["videoid"] ??
  row["video_id"] ??
  ""
).toString().trim();

const driveName = (
  row["Drive"] ??
  row["drive"] ??
  row["driveLabel"] ??
  row["drivelabel"] ??
  ""
).toString().trim();

const reporterName = (
  row["Reporter"] ??
  row["reporter"] ??
  row["reporterName"] ??
  ""
).toString().trim();

const metadata = (
  row["Metadata"] ??
  row["metadata"] ??
  row["description"] ??
  row["Description"] ??
  row["DESCRIPTION"] ??
  ""
).toString().trim();


    // -------------------------
    // Validation
    // -------------------------

    if (!rawDate) {
      errors.push({
        row: i + 2,
        reason: "Missing Date",
      });
      continue;
    }

    const date = new Date(rawDate);

    if (isNaN(date.getTime())) {
      errors.push({
        row: i + 2,
        reason: `Invalid Date: ${rawDate}`,
      });
      continue;
    }

    if (!videoId) {
      errors.push({
        row: i + 2,
        reason: "Missing Video ID",
      });
      continue;
    }

    if (!metadata) {
      errors.push({
        row: i + 2,
        reason: "Missing Metadata",
      });
      continue;
    }

    // -------------------------
    // Duplicate Check
    // -------------------------

    if (existingSet.has(videoId)) {
      skipped.push({
        row: i + 2,
        videoId,
        reason: "Duplicate Video ID",
      });
      continue;
    }

    existingSet.add(videoId);

    // -------------------------
    // Drive
    // -------------------------

    const drive = driveMap[driveName.toLowerCase()];

    if (!drive) {
      errors.push({
        row: i + 2,
        reason: `Drive not found: ${driveName}`,
      });
      continue;
    }

    // -------------------------
    // Reporter
    // -------------------------

    let reporter = reporterMap[reporterName.toLowerCase()];

    if (!reporter) {
      reporter = await Reporter.create({
        ownerId,
        name: reporterName,
      });

      reporterMap[reporterName.toLowerCase()] = reporter;
    }

    // -------------------------
    // Add Record
    // -------------------------

    toInsert.push({
      archiveDate: date,
      videoId,
      driveId: drive._id,
      driveLabel: drive.label,
      reporterId: reporter._id,
      reporterName: reporter.name,
      metadata,
      ownerId,
      batchId,
      status: "committed",
    });
  }

  // -------------------------
  // Insert
  // -------------------------

  let inserted = 0;

  if (toInsert.length) {
    try {
      const result = await ArchiveRecord.insertMany(toInsert, {
        ordered: false,
      });

      inserted = result.length;
    } catch (e) {
      if (e.code === 11000) {
        inserted = e.insertedDocs?.length || 0;
      } else {
        throw e;
      }
    }
  }

  return {
    total: rows.length,
    inserted,
    skipped: skipped.length,
    errors,
  };
}
