import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("attendance uniqueness audit is read-only and covers every duplicate rule", async () => {
  const sql = await readFile(
    "supabase/checks/20260913_attendance_uniqueness_audit.sql",
    "utf8",
  );

  assert.doesNotMatch(sql, /\b(insert|update|delete|alter|drop|truncate|create)\b/i);
  assert.match(sql, /session_id, participant_id/);
  assert.match(sql, /session_id, local_device_id/);
  assert.match(sql, /session_id, cookie_device_id/);
  assert.match(sql, /pg_constraint/);
  assert.match(sql, /pg_indexes/);
});
