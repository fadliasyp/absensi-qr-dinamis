import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("dynamic participant database migration is additive and private", async () => {
  const sql = await readFile(
    "supabase/migrations/20260920000000_add_dynamic_participant_database.sql",
    "utf8",
  );

  assert.match(sql, /create table if not exists public\.participant_groups/i);
  assert.match(sql, /create table if not exists public\.participant_custom_fields/i);
  assert.match(sql, /create table if not exists public\.participant_custom_values/i);
  assert.match(sql, /primary key \(participant_id, field_id\)/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all[\s\S]*from anon, authenticated/i);
  assert.doesNotMatch(sql, /^\s*(drop|truncate|delete)\b/im);
});

test("group links are hashed, scoped, and validate dynamic choices", async () => {
  const api = await readFile("api/index.js", "utf8");
  const adminPage = await readFile("public/database-peserta.html", "utf8");
  const groupPage = await readFile("public/isi-data-kelompok.html", "utf8");

  assert.match(api, /crypto\.randomBytes\(16\)\.toString\("base64url"\)/);
  assert.match(api, /createHmac\("sha256", secret\)/);
  assert.match(api, /createHash\("sha256"\)/);
  assert.match(api, /req\.headers\["x-group-access-token"\]/);
  assert.match(api, /isi-data-kelompok\.html#token=\$\{token\}/);
  assert.match(api, /Peserta tidak termasuk dalam kelompok link ini/);
  assert.match(api, /validOptions\.includes\(value\)/);
  assert.match(api, /onConflict: "participant_id,field_id"/);
  assert.match(api, /app\.get\("\/api\/participant-database\/results"/);
  assert.match(api, /\.from\("participant_custom_values"\)/);
  assert.match(
    api,
    /app\.post\([\s\S]*?"\/api\/participant-database\/groups\/:groupId\/export-pdf"/,
  );
  assert.match(api, /requestedFields\.length === 0 \|\| requestedFields\.length > 6/);
  assert.match(api, /const rowHeight = 16/);
  assert.match(api, /Database Muda Mudi Desa Periuk Jaya/);
  assert.match(api, /Total Muda Mudi: \$\{totalParticipants\}/);
  assert.match(api, /Laki-laki: \$\{totalMale\}/);
  assert.match(api, /Perempuan: \$\{totalFemale\}/);
  assert.match(adminPage, /protectAdminPage\(\)/);
  assert.match(adminPage, /Authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(adminPage, /id="resultsSection"/);
  assert.match(adminPage, /id="fieldModal"/);
  assert.match(adminPage, /id="participantsTab"/);
  assert.match(adminPage, /id="linksTab"/);
  assert.match(adminPage, /function showDashboardTab\(tabName, updateHash = true\)/);
  assert.match(adminPage, /location\.hash === "#links"/);
  assert.match(adminPage, /const activeFields = fields\.filter\(\(field\) => field\.is_active\)/);
  assert.match(adminPage, /class="field-actions"/);
  assert.match(adminPage, /id="resultGroupPicker"/);
  assert.match(adminPage, /id="resultAnswerPicker"/);
  assert.doesNotMatch(adminPage, /<select id="result(?:Group|Answer)Filter"/);
  assert.match(adminPage, /id="exportModal"/);
  assert.match(adminPage, /class="export-group"/);
  assert.match(adminPage, /new Set\(\["nama", "gender", "kelompok"\]\)/);
  assert.match(adminPage, /function showBlockingLoading\(title\)/);
  assert.match(adminPage, /allowOutsideClick: false/);
  assert.match(adminPage, /showBlockingLoading\("Membuat PDF\.\.\."\)/);
  assert.match(adminPage, /showBlockingLoading\("Menonaktifkan link\.\.\."\)/);
  assert.match(adminPage, /Arsipkan/);
  assert.match(adminPage, /Lihat Hasil/);
  assert.match(groupPage, /location\.hash\.slice\(1\)/);
  assert.match(groupPage, /"X-Group-Access-Token": accessToken/);
  assert.match(groupPage, /align-items: center/);
  assert.match(groupPage, /id="pickerParticipant"/);
  assert.match(
    groupPage,
    /document\.getElementById\("pickerParticipant"\)\.textContent/,
  );
  assert.doesNotMatch(groupPage, /auth-config\.js|admin-auth\.js/);
});
