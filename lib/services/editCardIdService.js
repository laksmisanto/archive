import AssetIdCounter from '@/lib/db/models/AssetIdCounter';
import EditCardRecord from '@/lib/db/models/EditCardRecord';

const ID_ASSET_TYPES = new Set(['edc', 'gvw', 'doc', 'gfx']);

function slugFromMetadata(metadata) {
  const slug = String(metadata || '').toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .trim().replace(/\s+/g, '_').replace(/^_+|_+$/g, '').slice(0, 10).replace(/_+$/g, '');
  return (slug.length >= 5 ? slug : 'asset').slice(0, 10);
}

function dayParts(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return { key: `${date.getFullYear()}-${month}-${day}`, display: `${day}${month}${year}` };
}

export async function createEditCardId({ ownerId, metadata, assetType, reservedSequences = new Set() }) {
  const code = String(assetType || '').trim().toLowerCase();
  if (!/^[a-z0-9]{3}$/.test(code)) {
    throw new Error('Generated IDs require a 3-character asset type such as EDC, GVW, DOC, GFX, or a custom code');
  }
  const { key, display } = dayParts();
  const pattern = new RegExp(`__${code}_${display}_(\\d{3})$`, 'i');
  const existing = await EditCardRecord.find({ ownerId, entryId: pattern }).select('entryId').lean();
  const used = new Set(existing.map(({ entryId }) => Number(entryId.match(pattern)?.[1])));
  const sequence = Array.from({ length: 1000 }, (_, index) => index).find((value) => !used.has(value) && !reservedSequences.has(value));
  if (sequence === undefined) throw new Error(`All 1,000 daily ${code.toUpperCase()} ID slots are in use`);

  await AssetIdCounter.findOneAndUpdate(
    { ownerId, day: key, assetType: code },
    { $set: { sequence } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  return `${slugFromMetadata(metadata)}__${code}_${display}_${String(sequence).padStart(3, '0')}`;
}

export { ID_ASSET_TYPES };
