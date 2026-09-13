import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

for (const file of [
  "public/absen.html",
  "public/admin-session.html",
  "public/manual.html",
  "public/alfa-wa.html",
  "public/pengumuman-wa.html",
  "public/peserta.html",
]) {
  test(`${file} has valid inline JavaScript`, async () => {
    const html = await readFile(file, "utf8");
    const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];

    assert.ok(scripts.length > 0);
    scripts.forEach(([, source]) => new Function(source));
  });
}

test("manual attendance uses styled local pickers for group and participant", async () => {
  const html = await readFile("public/manual.html", "utf8");

  assert.doesNotMatch(html, /<select id="kelompokSelect"/);
  assert.doesNotMatch(html, /<select id="participantSelect"/);
  assert.match(html, /<button[\s\S]*?id="kelompokSelect"/);
  assert.match(html, /<button[\s\S]*?id="participantSelect"/);
  assert.match(html, /id="pickerSheet"[\s\S]*?role="dialog"/);
  assert.match(html, /id="pickerOptions"[\s\S]*?role="listbox"/);
  assert.match(html, /className = "picker-status-badge"/);
  assert.match(html, /status\.textContent = "Sudah Ada Data"/);
  assert.match(html, /function selectPickerItem\(item\)/);
  assert.match(html, /id="keteranganSelect"/);
});

test("announcement uses the agreed fixed template", async () => {
  const html = await readFile("public/pengumuman-wa.html", "utf8");

  assert.match(html, /\*Pengajian Muda Mudi Desa\*/);
  assert.match(html, /Hari\/Tanggal: \$\{formatDate\(session\.start_time\)\}/);
  assert.match(html, /Waktu: 09\.00–11\.00 WIB/);
  assert.match(html, /Lokasi: SB kelompok PJ 2/);
  assert.match(html, /\*Materi : Al-Qur'an &amp; K\. Adillah\*|\*Materi : Al-Qur'an & K\. Adillah\*/);
  assert.match(html, /\*\$\{participant\.nama \|\| participant\.name \|\| ""\}\*/);
  assert.match(html, /kelompok \*\$\{participant\.kelompok\}\*/);
});

test("WA lists restore the last contacted participant when returning", async () => {
  for (const file of ["public/alfa-wa.html", "public/pengumuman-wa.html"]) {
    const html = await readFile(file, "utf8");
    assert.match(html, /dataset\.participantId/);
    assert.match(html, /scrollIntoView/);
    assert.match(html, /sessionStorage\.setItem\(lastContactedKey/);
    assert.match(html, /sessionStorage\.getItem\(lastContactedKey\)/);
    assert.match(html, /visibilitychange/);
  }
});
