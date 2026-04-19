import { openStateDb, DEFAULT_DB_PATH } from "../server/wikipedia-gacha/db.mjs";
import {
  compactRecoverySnapshot,
  compactState,
  deserializePersistedValue,
  expandRecoverySnapshot,
  expandState,
  serializePersistedValue,
} from "../server/wikipedia-gacha/storage.mjs";

async function main() {
  const dbPath = process.argv[2] || DEFAULT_DB_PATH;
  const db = openStateDb(dbPath);
  await db.ready;

  const userRows = await db.all(
    "SELECT browser_token, data_json FROM user_state"
  );
  const recoveryRows = await db.all(
    "SELECT code, snapshot_json FROM recovery_codes"
  );

  let userChanged = 0;
  let recoveryChanged = 0;
  let beforeUserBytes = 0;
  let afterUserBytes = 0;
  let beforeRecoveryBytes = 0;
  let afterRecoveryBytes = 0;

  for (const row of userRows) {
    const rawBytes = Buffer.isBuffer(row.data_json)
      ? row.data_json.length
      : Buffer.byteLength(String(row.data_json ?? ""), "utf8");
    beforeUserBytes += rawBytes;

    const expanded = expandState(deserializePersistedValue(row.data_json));
    const encoded = serializePersistedValue(compactState(expanded));
    const encodedBytes = Buffer.isBuffer(encoded)
      ? encoded.length
      : Buffer.byteLength(String(encoded), "utf8");
    afterUserBytes += encodedBytes;

    const unchanged = Buffer.isBuffer(row.data_json)
      ? Buffer.isBuffer(encoded) && Buffer.compare(row.data_json, encoded) === 0
      : !Buffer.isBuffer(encoded) && String(row.data_json) === encoded;

    if (!unchanged) {
      await db.run(
        "UPDATE user_state SET data_json = ?, updated_at = ? WHERE browser_token = ?",
        [encoded, new Date().toISOString(), row.browser_token]
      );
      userChanged += 1;
    }
  }

  for (const row of recoveryRows) {
    const rawBytes = Buffer.isBuffer(row.snapshot_json)
      ? row.snapshot_json.length
      : Buffer.byteLength(String(row.snapshot_json ?? ""), "utf8");
    beforeRecoveryBytes += rawBytes;

    const expanded = expandRecoverySnapshot(deserializePersistedValue(row.snapshot_json));
    const encoded = serializePersistedValue(compactRecoverySnapshot(expanded));
    const encodedBytes = Buffer.isBuffer(encoded)
      ? encoded.length
      : Buffer.byteLength(String(encoded), "utf8");
    afterRecoveryBytes += encodedBytes;

    const unchanged = Buffer.isBuffer(row.snapshot_json)
      ? Buffer.isBuffer(encoded) && Buffer.compare(row.snapshot_json, encoded) === 0
      : !Buffer.isBuffer(encoded) && String(row.snapshot_json) === encoded;

    if (!unchanged) {
      await db.run(
        "UPDATE recovery_codes SET snapshot_json = ? WHERE code = ?",
        [encoded, row.code]
      );
      recoveryChanged += 1;
    }
  }

  await db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  await db.close();
  console.log(JSON.stringify({
    ok: true,
    dbPath,
    userRows: userRows.length,
    userChanged,
    recoveryRows: recoveryRows.length,
    recoveryChanged,
    beforeUserBytes,
    afterUserBytes,
    beforeRecoveryBytes,
    afterRecoveryBytes,
    userSavedPercent: beforeUserBytes
      ? Number((((beforeUserBytes - afterUserBytes) / beforeUserBytes) * 100).toFixed(2))
      : 0,
    recoverySavedPercent: beforeRecoveryBytes
      ? Number((((beforeRecoveryBytes - afterRecoveryBytes) / beforeRecoveryBytes) * 100).toFixed(2))
      : 0,
    nextStep: "Run VACUUM manually if you want SQLite to reclaim free pages immediately.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
