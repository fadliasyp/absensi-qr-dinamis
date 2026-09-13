import express from "express";
import QRCode from "qrcode";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { supabase, supabaseAdmin } from "./supabase.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
const app = express();

app.use(express.json());
app.use(cookieParser());

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

function getBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${protocol}://${host}`;
}

async function getSessionQrToken(sessionId, sessionEndTime) {
  const { data: existingToken, error: tokenError } = await supabase
    .from("qr_tokens")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (tokenError) {
    throw tokenError;
  }

  if (existingToken) {
    return {
      token: existingToken.token,
      expiredAt: existingToken.expired_at,
    };
  }

  const newToken = generateToken();

  const expiredAt =
    sessionEndTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: insertedToken, error: insertError } = await supabase
    .from("qr_tokens")
    .insert({
      session_id: sessionId,
      token: newToken,
      expired_at: expiredAt,
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return {
    token: insertedToken.token,
    expiredAt: insertedToken.expired_at,
  };
}

function formatTanggalSesiIndonesia(dateString) {
  if (!dateString) return "-";

  return new Date(dateString).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

app.get("/api/qr/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data sesi.",
        error: sessionError.message,
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Sesi tidak ditemukan.",
      });
    }

    if (!session.is_active) {
      return res.status(400).json({
        success: false,
        message: "Sesi absen belum aktif.",
      });
    }

    const now = new Date();

    if (session.start_time && now < new Date(session.start_time)) {
      return res.status(400).json({
        success: false,
        message: "Sesi absen belum dimulai.",
      });
    }

    if (session.end_time && now > new Date(session.end_time)) {
      return res.status(400).json({
        success: false,
        message: "Sesi absen sudah berakhir.",
      });
    }

    const qrData = await getSessionQrToken(sessionId, session.end_time);
    const baseUrl = getBaseUrl(req);

    const attendanceUrl = `${baseUrl}/absen.html?session=${sessionId}&token=${qrData.token}`;
    const qrImage = await QRCode.toDataURL(attendanceUrl);

    res.json({
      success: true,
      title: session.judul,
      qrImage,
      url: attendanceUrl,
      token: qrData.token,
      expiredAt: qrData.expiredAt,
      expiredInSeconds: Math.max(
        0,
        Math.floor((new Date(qrData.expiredAt).getTime() - Date.now()) / 1000),
      ),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal membuat QR.",
      error: error.message,
    });
  }
});

app.get("/api/participants", async (req, res) => {
  try {
    const sessionId = req.query.session;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID wajib dikirim.",
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Sesi tidak ditemukan.",
      });
    }

    // const { data: participants, error: participantError } = await supabase
    //   .from("participants")
    //   .select("*")
    //   .eq("kelompok", session.kelompok)
    //   .order("nama", { ascending: true });

    const { data: participants, error: participantError } = await supabase
      .from("participants")
      .select("*")
      .eq("is_active", true)
      .order("kelompok", { ascending: true })
      .order("nama", { ascending: true });

    if (participantError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil daftar peserta.",
        error: participantError.message,
      });
    }

    const { data: hadir, error: hadirError } = await supabase
      .from("attendance")
      .select("participant_id")
      .eq("session_id", sessionId);

    if (hadirError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data kehadiran.",
        error: hadirError.message,
      });
    }

    const hadirIds = new Set(hadir.map((item) => item.participant_id));

    const result = participants.map((participant) => ({
      id: participant.id,
      name: participant.nama,
      nama: participant.nama,
      gender: participant.gender,
      kelompok: participant.kelompok,
      no_wa: participant.no_wa,
      isPresent: hadirIds.has(participant.id),
    }));

    res.json({
      success: true,
      participants: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil peserta.",
      error: error.message,
    });
  }
});

app.post("/api/attendance", async (req, res) => {
  try {
    const { sessionId, token, participantId, localDeviceId } = req.body;

    if (!sessionId || !token || !participantId || !localDeviceId) {
      return res.status(400).json({
        success: false,
        message: "Data absensi belum lengkap.",
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Sesi tidak ditemukan.",
      });
    }

    if (!session.is_active) {
      return res.status(400).json({
        success: false,
        message: "Sesi absen belum aktif.",
      });
    }

    const now = new Date();

    if (session.start_time && now < new Date(session.start_time)) {
      return res.status(400).json({
        success: false,
        message: "Sesi absen belum dimulai.",
      });
    }

    if (session.end_time && now > new Date(session.end_time)) {
      return res.status(400).json({
        success: false,
        message: "Sesi absen sudah berakhir.",
      });
    }

    const { data: validToken, error: tokenError } = await supabase
      .from("qr_tokens")
      .select("*")
      .eq("session_id", sessionId)
      .eq("token", token)
      .gt("expired_at", now.toISOString())
      .maybeSingle();

    if (tokenError || !validToken) {
      return res.status(400).json({
        success: false,
        message: "QR Code sudah kedaluwarsa. Silakan scan QR terbaru.",
      });
    }

    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("*")
      .eq("id", participantId)
      .maybeSingle();

    if (participantError || !participant) {
      return res.status(404).json({
        success: false,
        message: "Peserta tidak ditemukan.",
      });
    }

    if (participant.is_active === false) {
      return res.status(400).json({
        success: false,
        message: "Peserta sedang nonaktif dan tidak dapat melakukan absensi.",
      });
    }

    // if (participant.kelompok !== session.kelompok) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Peserta tidak termasuk dalam kelompok sesi ini.",
    //   });
    // }

    const cookies = req.cookies || {};
    let cookieDeviceId = cookies.attendance_device_id;

    if (!cookieDeviceId) {
      cookieDeviceId = crypto.randomUUID();

      res.cookie("attendance_device_id", cookieDeviceId, {
        maxAge: 1000 * 60 * 60 * 24 * 30,
        httpOnly: false,
        sameSite: "lax",
        secure: true,
      });
    }

    const { data: existingParticipant } = await supabase
      .from("attendance")
      .select("id")
      .eq("session_id", sessionId)
      .eq("participant_id", participantId)
      .maybeSingle();

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        code: "PARTICIPANT_ALREADY_PRESENT",
        message: "Nama peserta ini sudah tercatat hadir pada sesi ini.",
      });
    }

    const { data: existingLocalDevice } = await supabase
      .from("attendance")
      .select("id")
      .eq("session_id", sessionId)
      .eq("local_device_id", localDeviceId)
      .maybeSingle();

    if (existingLocalDevice) {
      return res.status(400).json({
        success: false,
        code: "DEVICE_ALREADY_USED",
        message:
          "Perangkat ini sudah digunakan untuk melakukan absensi pada sesi ini.",
      });
    }

    const { data: existingCookieDevice } = await supabase
      .from("attendance")
      .select("id")
      .eq("session_id", sessionId)
      .eq("cookie_device_id", cookieDeviceId)
      .maybeSingle();

    if (existingCookieDevice) {
      return res.status(400).json({
        success: false,
        code: "DEVICE_ALREADY_USED",
        message:
          "Perangkat ini sudah digunakan untuk melakukan absensi pada sesi ini.",
      });
    }

    const ipAddress =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

    const { data: insertedAttendance, error: insertError } = await supabase
      .from("attendance")
      .insert({
        session_id: sessionId,
        participant_id: participant.id,
        waktu_hadir: new Date().toISOString(),
        nama: participant.nama,
        gender: participant.gender,
        kelompok: participant.kelompok,
        keterangan: "Hadir",
        local_device_id: localDeviceId,
        cookie_device_id: cookieDeviceId,
        user_agent: req.headers["user-agent"],
        ip_address: ipAddress,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return res.status(400).json({
          success: false,
          message:
            "Data absensi sudah tercatat atau perangkat sudah digunakan.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Gagal menyimpan absensi.",
        error: insertError.message,
      });
    }

    res.json({
      success: true,
      message: "Absensi berhasil disimpan.",
      data: {
        name: insertedAttendance.nama,
        nama: insertedAttendance.nama,
        gender: insertedAttendance.gender,
        kelompok: insertedAttendance.kelompok,
        keterangan: insertedAttendance.keterangan,
        waktu_hadir: insertedAttendance.waktu_hadir,
      },
    });
  } catch (error) {
    console.error("ATTENDANCE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server saat menyimpan absensi.",
      error: error.message,
    });
  }
});

app.get("/api/attendance/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: hadir, error: hadirError } = await supabase
      .from("attendance")
      .select("*")
      .eq("session_id", sessionId)
      .order("waktu_hadir", { ascending: true });

    if (hadirError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil rekap absensi.",
        error: hadirError.message,
      });
    }

    res.json({
      success: true,
      hadir,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil rekap.",
      error: error.message,
    });
  }
});

// =========================
// Manual untuk izin dan alfa
// =========================
app.post("/api/manual-attendance", async (req, res) => {
  try {
    const { sessionId, participantId, keterangan } = req.body;

    if (!sessionId || !participantId || !keterangan) {
      return res.status(400).json({
        success: false,
        message: "Data belum lengkap.",
      });
    }

    if (!["Hadir", "Izin", "Alfa"].includes(keterangan)) {
      return res.status(400).json({
        success: false,
        message: "Keterangan tidak valid.",
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Sesi tidak ditemukan.",
      });
    }

    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("*")
      .eq("id", participantId)
      .maybeSingle();

    if (participantError || !participant) {
      return res.status(404).json({
        success: false,
        message: "Peserta tidak ditemukan.",
      });
    }

    if (participant.is_active === false) {
      return res.status(400).json({
        success: false,
        message: "Peserta sedang nonaktif dan tidak dapat dicatat pada sesi.",
      });
    }

    /**
     * Cek apakah peserta sudah punya data attendance di sesi ini.
     * Kalau sudah ada, kita update keterangannya.
     * Misalnya sebelumnya Alfa, bisa diganti Izin.
     */
    const { data: existingAttendance, error: existingError } = await supabase
      .from("attendance")
      .select("*")
      .eq("session_id", sessionId)
      .eq("participant_id", participantId)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengecek data absensi.",
        error: existingError.message,
      });
    }

    if (existingAttendance) {
      const { data: updatedAttendance, error: updateError } = await supabase
        .from("attendance")
        .update({
          waktu_hadir: new Date().toISOString(),
          nama: participant.nama,
          gender: participant.gender,
          kelompok: participant.kelompok,
          keterangan,
        })
        .eq("id", existingAttendance.id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({
          success: false,
          message: "Gagal memperbarui data absensi.",
          error: updateError.message,
        });
      }

      return res.json({
        success: true,
        message: `Data berhasil diperbarui menjadi ${keterangan}.`,
        data: updatedAttendance,
      });
    }

    /**
     * Kalau belum ada data, insert baru.
     * Untuk Izin/Alfa, device id tidak perlu diisi.
     */
    const { data: insertedAttendance, error: insertError } = await supabase
      .from("attendance")
      .insert({
        session_id: sessionId,
        participant_id: participant.id,
        waktu_hadir: new Date().toISOString(),
        nama: participant.nama,
        gender: participant.gender,
        kelompok: participant.kelompok,
        keterangan,
        local_device_id: null,
        cookie_device_id: null,
        user_agent: req.headers["user-agent"],
        ip_address:
          req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        success: false,
        message: "Gagal menyimpan data absensi manual.",
        error: insertError.message,
      });
    }

    res.json({
      success: true,
      message: `Peserta berhasil dicatat sebagai ${keterangan}.`,
      data: insertedAttendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan absensi manual.",
      error: error.message,
    });
  }
});

// =========================
// Endpoint Membuat sesi UI
// ========================
app.post("/api/sessions", async (req, res) => {
  try {
    const { judul, startTime, endTime, locationName } = req.body;

    if (!judul || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Judul, waktu mulai, dan waktu selesai wajib diisi.",
      });
    }

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        judul,
        kelompok: "Semua",
        is_active: true,
        start_time: startTime,
        end_time: endTime,
        location_name:
          typeof locationName === "string"
            ? locationName.trim() || "Tidak ditentukan"
            : "Tidak ditentukan",
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Gagal membuat sesi.",
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Sesi berhasil dibuat.",
      session: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat sesi.",
      error: error.message,
    });
  }
});

app.get("/api/sessions", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil daftar sesi.",
        error: error.message,
      });
    }

    res.json({
      success: true,
      sessions: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil sesi.",
      error: error.message,
    });
  }
});

// =========================
// Endpoint untuk kirim WA ke yg ALFA
// ========================
app.get("/api/attendance/:sessionId/alfa", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, judul, start_time, end_time")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data sesi.",
        error: sessionError.message,
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Sesi tidak ditemukan.",
      });
    }

    const { data, error } = await supabase
      .from("attendance")
      .select(
        `
        id,
        session_id,
        participant_id,
        nama,
        gender,
        kelompok,
        keterangan,
        waktu_hadir,
        participants!inner (
          no_wa,
          is_active
        )
      `,
      )
      .eq("session_id", sessionId)
      .eq("keterangan", "Alfa")
      .eq("participants.is_active", true)
      .order("kelompok", { ascending: true })
      .order("nama", { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data peserta Alfa.",
        error: error.message,
      });
    }

    const result = data.map((item) => ({
      id: item.id,
      participant_id: item.participant_id,
      nama: item.nama,
      gender: item.gender,
      kelompok: item.kelompok,
      keterangan: item.keterangan,
      waktu_hadir: item.waktu_hadir,
      no_wa: item.participants?.no_wa || null,
    }));

    res.json({
      success: true,
      session,
      alfa: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil peserta Alfa.",
      error: error.message,
    });
  }
});

// ========================
// Menghapus sesi (beserta data attendance terkait)
// ========================
app.delete("/api/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID wajib dikirim.",
      });
    }

    const { data: session, error: findError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (findError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengecek sesi.",
        error: findError.message,
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Sesi tidak ditemukan.",
      });
    }

    const { error: deleteError } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (deleteError) {
      return res.status(500).json({
        success: false,
        message: "Gagal menghapus sesi.",
        error: deleteError.message,
      });
    }

    res.json({
      success: true,
      message: "Sesi berhasil dihapus.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus sesi.",
      error: error.message,
    });
  }
});

// ========================
// Endpoint untuk menambah peserta baru (manual) satuan atau banyakan
// ========================

app.post("/api/participants", async (req, res) => {
  try {
    const { participants } = req.body;

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Data peserta wajib diisi.",
      });
    }

    const cleanedParticipants = participants
      .map((item) => ({
        nama: item.nama?.trim(),
        gender: item.gender?.trim() || null,
        kelompok: item.kelompok?.trim(),
        no_wa: item.no_wa?.trim() || null,
        is_active: true,
      }))
      .filter((item) => item.nama && item.kelompok);

    if (cleanedParticipants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Minimal nama dan kelompok wajib diisi.",
      });
    }

    const { data, error } = await supabase
      .from("participants")
      .insert(cleanedParticipants)
      .select();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Gagal menyimpan peserta.",
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: `${data.length} peserta berhasil ditambahkan.`,
      participants: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menyimpan peserta.",
      error: error.message,
    });
  }
});

app.get("/api/all-participants", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .order("kelompok", { ascending: true })
      .order("nama", { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil daftar peserta.",
        error: error.message,
      });
    }

    res.json({
      success: true,
      participants: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil peserta.",
      error: error.message,
    });
  }
});

// ========================
// Endpoint untuk update/edit peserta
// ========================
app.put("/api/participants/:participantId", async (req, res) => {
  try {
    const { participantId } = req.params;
    const { nama, gender, kelompok, no_wa, is_active } = req.body;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: "Participant ID wajib dikirim.",
      });
    }

    if (!nama || !kelompok) {
      return res.status(400).json({
        success: false,
        message: "Nama dan kelompok wajib diisi.",
      });
    }

    if (is_active !== undefined && typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Status aktif peserta tidak valid.",
      });
    }

    const updates = {
      nama: nama.trim(),
      gender: gender?.trim() || null,
      kelompok: kelompok.trim(),
      no_wa: no_wa?.trim() || null,
    };

    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from("participants")
      .update(updates)
      .eq("id", participantId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Gagal memperbarui data peserta.",
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Data peserta berhasil diperbarui.",
      participant: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memperbarui peserta.",
      error: error.message,
    });
  }
});

// ========================
// Endpoint untuk hapus peserta
// ========================
app.delete("/api/participants/:participantId", async (req, res) => {
  try {
    const { participantId } = req.params;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: "Participant ID wajib dikirim.",
      });
    }

    const { data: participant, error: findError } = await supabase
      .from("participants")
      .select("*")
      .eq("id", participantId)
      .maybeSingle();

    if (findError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengecek data peserta.",
        error: findError.message,
      });
    }

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Peserta tidak ditemukan.",
      });
    }

    const { error: deleteError } = await supabase
      .from("participants")
      .delete()
      .eq("id", participantId);

    if (deleteError) {
      return res.status(500).json({
        success: false,
        message: "Gagal menghapus peserta.",
        error: deleteError.message,
      });
    }

    res.json({
      success: true,
      message: "Peserta berhasil dihapus.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus peserta.",
      error: error.message,
    });
  }
});

// ========================
// Endpoint finalisasi sesi
// Peserta aktif yang belum memiliki data absensi otomatis menjadi Alfa
// ========================
app.post("/api/sessions/:sessionId/finalize", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID wajib dikirim.",
      });
    }

    // 1. Ambil data sesi
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data sesi.",
        error: sessionError.message,
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Sesi tidak ditemukan.",
      });
    }

    // 2. Cek apakah sesi sudah difinalisasi
    if (session.is_finalized) {
      return res.status(400).json({
        success: false,
        message: "Sesi ini sudah pernah difinalisasi.",
      });
    }

    // 3. Cek apakah sesi sudah berakhir
    const now = new Date();

    if (session.end_time && now <= new Date(session.end_time)) {
      return res.status(400).json({
        success: false,
        message: "Sesi belum berakhir, finalisasi belum bisa dilakukan.",
      });
    }

    // 4. Ambil semua peserta aktif
    const { data: participants, error: participantError } = await supabase
      .from("participants")
      .select("id, nama, gender, kelompok")
      .eq("is_active", true)
      .order("kelompok", { ascending: true })
      .order("nama", { ascending: true });

    if (participantError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data peserta.",
        error: participantError.message,
      });
    }

    if (!participants || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Belum ada peserta aktif yang tersedia.",
      });
    }

    // 5. Ambil peserta yang sudah tercatat pada sesi ini
    const { data: existingAttendance, error: attendanceError } = await supabase
      .from("attendance")
      .select("participant_id")
      .eq("session_id", sessionId);

    if (attendanceError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data absensi.",
        error: attendanceError.message,
      });
    }

    const recordedParticipantIds = new Set(
      (existingAttendance || []).map((item) => item.participant_id),
    );

    // 6. Cari peserta yang belum tercatat Hadir/Izin/Alfa
    const unrecordedParticipants = participants.filter((participant) => {
      return !recordedParticipantIds.has(participant.id);
    });

    // 7. Kalau semua peserta sudah punya data, tetap tandai sesi sudah final
    if (unrecordedParticipants.length === 0) {
      const { error: updateSessionError } = await supabase
        .from("sessions")
        .update({
          is_finalized: true,
          finalized_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (updateSessionError) {
        return res.status(500).json({
          success: false,
          message:
            "Data absensi sudah lengkap, tetapi gagal menandai sesi sebagai final.",
          error: updateSessionError.message,
        });
      }

      return res.json({
        success: true,
        message:
          "Semua peserta aktif sudah memiliki data absensi. Sesi berhasil difinalisasi.",
        insertedCount: 0,
      });
    }

    // 8. Siapkan data Alfa otomatis
    const alfaRows = unrecordedParticipants.map((participant) => ({
      session_id: sessionId,
      participant_id: participant.id,
      waktu_hadir: new Date().toISOString(),
      nama: participant.nama,
      gender: participant.gender,
      kelompok: participant.kelompok,
      keterangan: "Alfa",
      local_device_id: null,
      cookie_device_id: null,
      user_agent: "system-finalize",
      ip_address: null,
    }));

    // 9. Insert Alfa otomatis
    const { data: insertedAlfa, error: insertError } = await supabase
      .from("attendance")
      .insert(alfaRows)
      .select();

    if (insertError) {
      return res.status(500).json({
        success: false,
        message: "Gagal menyimpan data Alfa otomatis.",
        error: insertError.message,
      });
    }

    // 10. Tandai sesi sudah final
    const { error: updateSessionError } = await supabase
      .from("sessions")
      .update({
        is_finalized: true,
        finalized_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateSessionError) {
      return res.status(500).json({
        success: false,
        message:
          "Data Alfa berhasil dibuat, tetapi gagal menandai sesi sebagai final.",
        error: updateSessionError.message,
      });
    }

    res.json({
      success: true,
      message: `${insertedAlfa.length} peserta berhasil otomatis dicatat sebagai Alfa. Sesi berhasil difinalisasi.`,
      insertedCount: insertedAlfa.length,
      data: insertedAlfa,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat finalisasi sesi.",
      error: error.message,
    });
  }
});

// ========================
// Endpoint Export Rekap Absensi ke PDF
// ========================
// app.get("/api/sessions/:sessionId/export-pdf", async (req, res) => {
//   try {
//     const { sessionId } = req.params;

//     if (!sessionId) {
//       return res.status(400).json({
//         success: false,
//         message: "Session ID wajib dikirim.",
//       });
//     }

//     const { data: session, error: sessionError } = await supabase
//       .from("sessions")
//       .select("*")
//       .eq("id", sessionId)
//       .maybeSingle();

//     if (sessionError) {
//       return res.status(500).json({
//         success: false,
//         message: "Gagal mengambil data sesi.",
//         error: sessionError.message,
//       });
//     }

//     if (!session) {
//       return res.status(404).json({
//         success: false,
//         message: "Sesi tidak ditemukan.",
//       });
//     }

//     const { data: attendanceData, error: attendanceError } = await supabase
//       .from("attendance")
//       .select("*")
//       .eq("session_id", sessionId);

//     if (attendanceError) {
//       return res.status(500).json({
//         success: false,
//         message: "Gagal mengambil data absensi.",
//         error: attendanceError.message,
//       });
//     }

//     const statusOrder = {
//       Hadir: 1,
//       Izin: 2,
//       Alfa: 3,
//     };

//     const genderOrder = {
//       "Laki-laki": 1,
//       Perempuan: 2,
//     };

//     const sortedData = (attendanceData || []).sort((a, b) => {
//       const kelompokA = (a.kelompok || "").toLowerCase();
//       const kelompokB = (b.kelompok || "").toLowerCase();

//       if (kelompokA !== kelompokB) {
//         return kelompokA.localeCompare(kelompokB);
//       }

//       const statusA = statusOrder[a.keterangan] || 99;
//       const statusB = statusOrder[b.keterangan] || 99;

//       if (statusA !== statusB) {
//         return statusA - statusB;
//       }

//       const genderA = genderOrder[a.gender] || 99;
//       const genderB = genderOrder[b.gender] || 99;

//       if (genderA !== genderB) {
//         return genderA - genderB;
//       }

//       return (a.nama || "").localeCompare(b.nama || "");
//     });

//     function formatTanggalIndonesia(dateString) {
//       if (!dateString) return "-";

//       return new Date(dateString).toLocaleDateString("id-ID", {
//         timeZone: "Asia/Jakarta",
//         weekday: "long",
//         day: "numeric",
//         month: "long",
//         year: "numeric",
//       });
//     }

//     function formatWaktuIndonesia(dateString) {
//       if (!dateString) return "-";

//       return (
//         new Date(dateString).toLocaleString("id-ID", {
//           timeZone: "Asia/Jakarta",
//           day: "2-digit",
//           month: "2-digit",
//           year: "numeric",
//           hour: "2-digit",
//           minute: "2-digit",
//           second: "2-digit",
//           hour12: false,
//         }) + " WIB"
//       );
//     }

//     const safeTitle = (session.judul || "rekap-absensi")
//       .toLowerCase()
//       .replace(/[^a-z0-9]+/g, "-")
//       .replace(/(^-|-$)/g, "");

//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="rekap-${safeTitle}.pdf"`,
//     );

//     const doc = new PDFDocument({
//       size: "A4",
//       margin: 36,
//       layout: "landscape",
//     });

//     doc.pipe(res);

//     const pageWidth = doc.page.width;
//     const margin = 36;

//     // Header
//     doc.font("Helvetica-Bold").fontSize(18).text("Rekap Absensi", {
//       align: "center",
//     });

//     doc.moveDown(0.4);

//     doc.font("Helvetica").fontSize(11);
//     doc.text(`Judul Sesi: ${session.judul || "-"}`);
//     doc.text(`Tanggal Sesi: ${formatTanggalIndonesia(session.start_time)}`);
//     doc.text(`Waktu Mulai: ${formatWaktuIndonesia(session.start_time)}`);
//     doc.text(`Waktu Selesai: ${formatWaktuIndonesia(session.end_time)}`);
//     doc.text(`Total Data: ${sortedData.length} peserta`);

//     doc.moveDown(0.8);

//     // Summary
//     const totalHadir = sortedData.filter(
//       (item) => item.keterangan === "Hadir",
//     ).length;
//     const totalIzin = sortedData.filter(
//       (item) => item.keterangan === "Izin",
//     ).length;
//     const totalAlfa = sortedData.filter(
//       (item) => item.keterangan === "Alfa",
//     ).length;

//     doc
//       .font("Helvetica-Bold")
//       .fontSize(11)
//       .text(
//         `Ringkasan: Hadir ${totalHadir} | Izin ${totalIzin} | Alfa ${totalAlfa}`,
//       );

//     doc.moveDown(0.8);

//     // Table settings
//     const startX = margin;
//     let y = doc.y;

//     const columns = [
//       { title: "No", width: 35 },
//       { title: "Nama", width: 180 },
//       { title: "Kelompok", width: 120 },
//       { title: "Gender", width: 90 },
//       { title: "Keterangan", width: 85 },
//       { title: "Waktu Input", width: 170 },
//     ];

//     const rowHeight = 24;

//     function drawTableHeader() {
//       let x = startX;

//       doc.font("Helvetica-Bold").fontSize(10);

//       columns.forEach((col) => {
//         doc.rect(x, y, col.width, rowHeight).stroke();
//         doc.text(col.title, x + 5, y + 7, {
//           width: col.width - 10,
//           align: "left",
//         });
//         x += col.width;
//       });

//       y += rowHeight;
//     }

//     function drawRow(item, index) {
//       let x = startX;

//       const row = [
//         index + 1,
//         item.nama || "-",
//         item.kelompok || "-",
//         item.gender || "-",
//         item.keterangan || "-",
//         formatWaktuIndonesia(item.waktu_hadir),
//       ];

//       doc.font("Helvetica").fontSize(9);

//       columns.forEach((col, colIndex) => {
//         doc.rect(x, y, col.width, rowHeight).stroke();
//         doc.text(String(row[colIndex]), x + 5, y + 7, {
//           width: col.width - 10,
//           align: "left",
//           ellipsis: true,
//         });
//         x += col.width;
//       });

//       y += rowHeight;
//     }

//     drawTableHeader();

//     sortedData.forEach((item, index) => {
//       if (y + rowHeight > doc.page.height - margin) {
//         doc.addPage();
//         y = margin;
//         drawTableHeader();
//       }

//       drawRow(item, index);
//     });

//     if (sortedData.length === 0) {
//       doc
//         .font("Helvetica")
//         .fontSize(11)
//         .text("Belum ada data absensi.", startX, y + 10);
//     }

//     doc.end();
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Terjadi kesalahan saat membuat PDF.",
//       error: error.message,
//     });
//   }
// });

// ========================
// Endpoint Export Rekap Absensi ke PDF
// ========================
app.get("/api/sessions/:sessionId/export-pdf", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID wajib dikirim.",
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data sesi.",
        error: sessionError.message,
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Sesi tidak ditemukan.",
      });
    }

    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance")
      .select("*")
      .eq("session_id", sessionId);

    if (attendanceError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data absensi.",
        error: attendanceError.message,
      });
    }

    const statusOrder = {
      Hadir: 1,
      Izin: 2,
      Alfa: 3,
    };

    const genderOrder = {
      "Laki-laki": 1,
      Perempuan: 2,
    };

    const sortedData = (attendanceData || []).sort((a, b) => {
      const kelompokA = (a.kelompok || "").toLowerCase();
      const kelompokB = (b.kelompok || "").toLowerCase();

      if (kelompokA !== kelompokB) {
        return kelompokA.localeCompare(kelompokB);
      }

      const statusA = statusOrder[a.keterangan] || 99;
      const statusB = statusOrder[b.keterangan] || 99;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      const genderA = genderOrder[a.gender] || 99;
      const genderB = genderOrder[b.gender] || 99;

      if (genderA !== genderB) {
        return genderA - genderB;
      }

      return (a.nama || "").localeCompare(b.nama || "");
    });

    function formatTanggalIndonesia(dateString) {
      if (!dateString) return "-";

      return new Date(dateString).toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    function formatWaktuIndonesia(dateString) {
      if (!dateString) return "-";

      return (
        new Date(dateString).toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " WIB"
      );
    }

    function safeText(value) {
      return String(value || "-");
    }

    function getStatusColor(status) {
      if (status === "Hadir") return "#16a34a";
      if (status === "Izin") return "#f59e0b";
      if (status === "Alfa") return "#ef4444";
      return "#64748b";
    }

    const safeTitle = (session.judul || "rekap-absensi")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="rekap-${safeTitle}.pdf"`,
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      layout: "landscape",
    });

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    const totalHadir = sortedData.filter(
      (item) => item.keterangan === "Hadir",
    ).length;

    const totalIzin = sortedData.filter(
      (item) => item.keterangan === "Izin",
    ).length;

    const totalAlfa = sortedData.filter(
      (item) => item.keterangan === "Alfa",
    ).length;

    const margin = 34;
    const contentWidth = pageWidth - margin * 2;

    function drawBackground() {
      doc.rect(0, 0, pageWidth, pageHeight).fill("#f4f8ff");

      doc.circle(70, 70, 95).fill("#dbeafe");
      doc.circle(pageWidth - 55, 88, 120).fill("#dcfce7");
      doc.circle(pageWidth - 25, pageHeight - 20, 135).fill("#ede9fe");

      doc
        .roundedRect(margin, 28, contentWidth, pageHeight - 56, 24)
        .fill("#ffffff");

      doc.roundedRect(margin, 28, contentWidth, 12, 24).fill("#2563eb");

      doc.rect(margin + 220, 28, 180, 12).fill("#16a34a");
      doc.rect(margin + 400, 28, contentWidth - 400, 12).fill("#7c3aed");
    }

    function drawFooter(pageNumber) {
      const footerY = pageHeight - 42;

      doc
        .moveTo(margin + 24, footerY - 10)
        .lineTo(pageWidth - margin - 24, footerY - 10)
        .lineWidth(1)
        .strokeColor("#e5e7eb")
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#94a3b8")
        .text(
          `Dicetak otomatis dari sistem Absenku! - Halaman ${pageNumber}`,
          margin + 24,
          footerY,
          {
            width: contentWidth - 48,
            align: "center",
          },
        );
    }

    function drawHeader() {
      let y = 58;

      doc
        .font("Helvetica-Bold")
        .fontSize(24)
        .fillColor("#111827")
        .text("Rekap Absensi", margin + 28, y, {
          width: contentWidth - 56,
          align: "center",
        });

      y += 30;

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#64748b")
        .text("Muda-Mudi Periuk Jaya Ayoo Kita Mengaji !!!", margin + 28, y, {
          width: contentWidth - 56,
          align: "center",
        });

      y += 26;

      const badgeWidth = 150;
      const badgeHeight = 24;
      const badgeX = (pageWidth - badgeWidth) / 2;

      doc.roundedRect(badgeX, y, badgeWidth, badgeHeight, 999).fill("#eff6ff");

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#2563eb")
        .text("LAPORAN ABSENSI SESI", badgeX, y + 7, {
          width: badgeWidth,
          align: "center",
        });

      return y + 42;
    }

    function drawInfoAndSummary(startY) {
      const gap = 12;
      const infoX = margin + 28;
      const infoY = startY;
      const infoW = 420;
      const infoH = 104;

      const summaryX = infoX + infoW + gap;
      const summaryW = pageWidth - margin - 28 - summaryX;
      const summaryH = infoH;

      doc
        .roundedRect(infoX, infoY, infoW, infoH, 18)
        .fillAndStroke("#f8fafc", "#e2e8f0");

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#111827")
        .text("Informasi Sesi", infoX + 16, infoY + 14);

      doc.font("Helvetica").fontSize(9).fillColor("#334155");

      doc.text(
        `Judul Sesi  : ${safeText(session.judul)}`,
        infoX + 16,
        infoY + 34,
        {
          width: infoW - 32,
        },
      );

      doc.text(
        `Tanggal     : ${formatTanggalIndonesia(session.start_time)}`,
        infoX + 16,
        infoY + 50,
        {
          width: infoW - 32,
        },
      );

      doc.text(
        `Waktu Mulai : ${formatWaktuIndonesia(session.start_time)}`,
        infoX + 16,
        infoY + 66,
        {
          width: infoW - 32,
        },
      );

      doc.text(
        `Waktu Selesai: ${formatWaktuIndonesia(session.end_time)}`,
        infoX + 16,
        infoY + 82,
        {
          width: infoW - 32,
        },
      );

      doc
        .roundedRect(summaryX, infoY, summaryW, summaryH, 18)
        .fillAndStroke("#ffffff", "#e2e8f0");

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#111827")
        .text("Ringkasan Data", summaryX + 16, infoY + 14);

      const boxGap = 8;
      const boxY = infoY + 42;
      const boxH = 42;
      const boxW = (summaryW - 32 - boxGap * 3) / 4;

      const summaryItems = [
        {
          label: "Total",
          value: sortedData.length,
          color: "#2563eb",
          bg: "#eff6ff",
        },
        {
          label: "Hadir",
          value: totalHadir,
          color: "#16a34a",
          bg: "#dcfce7",
        },
        {
          label: "Izin",
          value: totalIzin,
          color: "#f59e0b",
          bg: "#fef3c7",
        },
        {
          label: "Alfa",
          value: totalAlfa,
          color: "#ef4444",
          bg: "#fee2e2",
        },
      ];

      summaryItems.forEach((item, index) => {
        const x = summaryX + 16 + index * (boxW + boxGap);

        doc.roundedRect(x, boxY, boxW, boxH, 12).fill(item.bg);

        doc
          .font("Helvetica-Bold")
          .fontSize(15)
          .fillColor(item.color)
          .text(String(item.value), x, boxY + 7, {
            width: boxW,
            align: "center",
          });

        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(item.color)
          .text(item.label, x, boxY + 26, {
            width: boxW,
            align: "center",
          });
      });

      return infoY + infoH + 20;
    }

    const columns = [
      { title: "No", width: 36, key: "no" },
      { title: "Nama", width: 178, key: "nama" },
      { title: "Kelompok", width: 110, key: "kelompok" },
      { title: "Gender", width: 84, key: "gender" },
      { title: "Keterangan", width: 92, key: "keterangan" },
      { title: "Waktu Masuk", width: 176, key: "waktu" },
    ];

    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
    const tableX = (pageWidth - tableWidth) / 2;
    const rowHeight = 26;
    const headerHeight = 28;

    let pageNumber = 1;
    let y = 0;

    function drawTableHeader() {
      let x = tableX;

      doc.roundedRect(tableX, y, tableWidth, headerHeight, 10).fill("#1e293b");

      doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");

      columns.forEach((col) => {
        doc.text(col.title, x + 6, y + 9, {
          width: col.width - 12,
          align: "left",
        });

        x += col.width;
      });

      y += headerHeight;
    }

    function drawRow(item, index) {
      let x = tableX;
      const bgColor = index % 2 === 0 ? "#ffffff" : "#f8fafc";

      doc.rect(tableX, y, tableWidth, rowHeight).fill(bgColor);

      const row = [
        index + 1,
        item.nama || "-",
        item.kelompok || "-",
        item.gender || "-",
        item.keterangan || "-",
        formatWaktuIndonesia(item.waktu_hadir),
      ];

      columns.forEach((col, colIndex) => {
        doc
          .rect(x, y, col.width, rowHeight)
          .strokeColor("#e5e7eb")
          .lineWidth(0.5)
          .stroke();

        if (col.key === "keterangan") {
          const status = item.keterangan || "-";
          const color = getStatusColor(status);

          doc.roundedRect(x + 7, y + 6, col.width - 14, 14, 999).fill(color);

          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .fillColor("#ffffff")
            .text(status, x + 7, y + 9, {
              width: col.width - 14,
              align: "center",
            });
        } else {
          doc
            .font(colIndex === 1 ? "Helvetica-Bold" : "Helvetica")
            .fontSize(8.5)
            .fillColor(colIndex === 1 ? "#111827" : "#334155")
            .text(String(row[colIndex]), x + 6, y + 8, {
              width: col.width - 12,
              align: "left",
              ellipsis: true,
            });
        }

        x += col.width;
      });

      y += rowHeight;
    }

    function addDecoratedPage() {
      drawBackground();
      drawFooter(pageNumber);
    }

    addDecoratedPage();

    y = drawHeader();
    y = drawInfoAndSummary(y);

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#111827")
      .text("Daftar Rekap Absensi", tableX, y, {
        width: tableWidth,
        align: "left",
      });

    y += 20;

    drawTableHeader();

    if (sortedData.length === 0) {
      doc
        .roundedRect(tableX, y + 12, tableWidth, 58, 16)
        .fillAndStroke("#f8fafc", "#e5e7eb");

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#64748b")
        .text("Belum ada data absensi.", tableX, y + 34, {
          width: tableWidth,
          align: "center",
        });
    }

    sortedData.forEach((item, index) => {
      if (y + rowHeight > pageHeight - 68) {
        doc.addPage({
          size: "A4",
          margin: 0,
          layout: "landscape",
        });

        pageNumber += 1;
        addDecoratedPage();

        y = 64;

        doc
          .font("Helvetica-Bold")
          .fontSize(13)
          .fillColor("#111827")
          .text("Daftar Rekap Absensi Lanjutan", tableX, y, {
            width: tableWidth,
            align: "left",
          });

        y += 20;
        drawTableHeader();
      }

      drawRow(item, index);
    });

    doc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat PDF.",
      error: error.message,
    });
  }
});

// ========================
// Export PDF
// ========================
// ========================
// Endpoint Download QR ke PDF
// ========================
// app.get("/api/sessions/:sessionId/qr-pdf", async (req, res) => {
//   try {
//     const { sessionId } = req.params;

//     if (!sessionId) {
//       return res.status(400).json({
//         success: false,
//         message: "Session ID wajib dikirim.",
//       });
//     }

//     // Ambil data sesi
//     const { data: session, error: sessionError } = await supabase
//       .from("sessions")
//       .select("*")
//       .eq("id", sessionId)
//       .maybeSingle();

//     if (sessionError) {
//       return res.status(500).json({
//         success: false,
//         message: "Gagal mengambil data sesi.",
//         error: sessionError.message,
//       });
//     }

//     if (!session) {
//       return res.status(404).json({
//         success: false,
//         message: "Sesi tidak ditemukan.",
//       });
//     }

//     // Ambil / buat token QR tetap per sesi
//     const qrData = await getSessionQrToken(sessionId, session.end_time);

//     // URL absensi
//     const absensiUrl = `${getBaseUrl(req)}/absen.html?session=${sessionId}&token=${qrData.token}`;

//     // Generate gambar QR resolusi besar
//     const qrBuffer = await QRCode.toBuffer(absensiUrl, {
//       type: "png",
//       width: 1400,
//       margin: 1,
//       errorCorrectionLevel: "H",
//     });

//     // Nama file aman
//     const safeTitle = (session.judul || "qr-absensi")
//       .toLowerCase()
//       .replace(/[^a-z0-9]+/g, "-")
//       .replace(/(^-|-$)/g, "");

//     // Response PDF
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename="qr-${safeTitle}.pdf"`,
//     );

//     const doc = new PDFDocument({
//       size: "A4",
//       margin: 40,
//       layout: "portrait",
//     });

//     doc.pipe(res);

//     const pageWidth = doc.page.width;
//     const pageHeight = doc.page.height;
//     const margin = 40;

//     let currentY = 40;

//     // ========================
//     // HEADER GAMBAR
//     // ========================
//     const headerImagePath = path.join(process.cwd(), "assets", "header-qr.png");

//     if (fs.existsSync(headerImagePath)) {
//       const headerImage = doc.openImage(headerImagePath);

//       const headerWidth = 340;
//       const headerHeight =
//         (headerImage.height / headerImage.width) * headerWidth;
//       const headerX = (pageWidth - headerWidth) / 2;

//       doc.image(headerImagePath, headerX, currentY, {
//         width: headerWidth,
//       });

//       currentY += headerHeight + 26;
//     } else {
//       doc
//         .font("Helvetica-BoldOblique")
//         .fontSize(38)
//         .fillColor("#5e7ac4")
//         .text("Absenku!", 0, currentY, {
//           align: "center",
//         });

//       currentY += 42;

//       doc
//         .font("Helvetica")
//         .fontSize(13)
//         .fillColor("#1f2937")
//         .text("Muda-Mudi Periuk Jaya Ayoo Kita Mengaji !!!", 0, currentY, {
//           align: "center",
//         });

//       currentY += 32;
//     }

//     // ========================
//     // JUDUL SESI
//     // ========================
//     doc
//       .font("Helvetica-Bold")
//       .fontSize(17)
//       .fillColor("#111827")
//       .text(session.judul || "QR Absensi", margin, currentY, {
//         align: "center",
//         width: pageWidth - margin * 2,
//       });

//     currentY += 34;

//     // ========================
//     // QR CODE BESAR
//     // ========================
//     const qrSize = 350;
//     const qrX = (pageWidth - qrSize) / 2;

//     doc
//       .roundedRect(qrX - 14, currentY - 14, qrSize + 28, qrSize + 28, 16)
//       .fillAndStroke("#ffffff", "#d1d5db");

//     doc.image(qrBuffer, qrX, currentY, {
//       width: qrSize,
//       height: qrSize,
//     });

//     currentY += qrSize + 34;

//     // ========================
//     // TANGGAL SESI
//     // ========================
//     const tanggalSesi = formatTanggalSesiIndonesia(session.start_time);

//     const qrBoxX = qrX - 14;
//     const qrBoxWidth = qrSize + 28;

//     doc
//       .font("Helvetica-Bold")
//       .fontSize(22)
//       .fillColor("#111827")
//       .text(tanggalSesi, qrBoxX, currentY, {
//         width: qrBoxWidth,
//         align: "center",
//       });

//     currentY += 28;

//     doc
//       .font("Helvetica")
//       .fontSize(11)
//       .fillColor("#6b7280")
//       .text(
//         "Silakan scan QR code ini untuk mengisi absensi sesi.",
//         qrBoxX,
//         currentY,
//         {
//           width: qrBoxWidth,
//           align: "center",
//         },
//       );

//     currentY += 20;

//     if (session.location_name) {
//       doc
//         .font("Helvetica")
//         .fontSize(11)
//         .fillColor("#6b7280")
//         .text(`Lokasi: ${session.location_name}`, qrBoxX, currentY, {
//           width: qrBoxWidth,
//           align: "center",
//         });
//     }

//     doc.end();
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Terjadi kesalahan saat membuat PDF QR.",
//       error: error.message,
//     });
//   }
// });

// ========================
// Endpoint Download QR ke PDF
// ========================
app.get("/api/sessions/:sessionId/qr-pdf", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID wajib dikirim.",
      });
    }

    // Ambil data sesi
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data sesi.",
        error: sessionError.message,
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Sesi tidak ditemukan.",
      });
    }

    // Ambil / buat token QR tetap per sesi
    const qrData = await getSessionQrToken(sessionId, session.end_time);

    // URL absensi
    const absensiUrl = `${getBaseUrl(req)}/absen.html?session=${sessionId}&token=${qrData.token}`;

    // Generate gambar QR resolusi besar
    const qrBuffer = await QRCode.toBuffer(absensiUrl, {
      type: "png",
      width: 1600,
      margin: 1,
      errorCorrectionLevel: "H",
    });

    // Nama file aman
    const safeTitle = (session.judul || "qr-absensi")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="qr-${safeTitle}.pdf"`,
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      layout: "portrait",
    });

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // ========================
    // BACKGROUND
    // ========================
    doc.rect(0, 0, pageWidth, pageHeight).fill("#f4f8ff");

    // Dekorasi lingkaran atas
    doc.circle(70, 70, 95).fill("#dbeafe");
    doc.circle(pageWidth - 55, 92, 110).fill("#dcfce7");
    doc.circle(pageWidth - 40, pageHeight - 30, 120).fill("#ede9fe");

    // Card utama putih
    const cardX = 42;
    const cardY = 38;
    const cardWidth = pageWidth - cardX * 2;
    const cardHeight = pageHeight - 76;

    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 28).fill("#ffffff");

    // Garis dekorasi atas card
    doc.roundedRect(cardX, cardY, cardWidth, 14, 28).fill("#2563eb");

    doc.rect(cardX + 160, cardY, 170, 14).fill("#16a34a");
    doc.rect(cardX + 330, cardY, cardWidth - 330, 14).fill("#7c3aed");

    let currentY = cardY + 42;

    // ========================
    // HEADER ABSENKU
    // Style gambar Absenku tetap dipakai
    // ========================
    const headerImagePath = path.join(process.cwd(), "assets", "header-qr.png");

    if (fs.existsSync(headerImagePath)) {
      const headerImage = doc.openImage(headerImagePath);

      const headerWidth = 315;
      const headerHeight =
        (headerImage.height / headerImage.width) * headerWidth;
      const headerX = (pageWidth - headerWidth) / 2;

      doc.image(headerImagePath, headerX, currentY, {
        width: headerWidth,
      });

      currentY += headerHeight + 16;
    } else {
      // Fallback jika header-qr.png tidak ditemukan
      doc
        .font("Helvetica-BoldOblique")
        .fontSize(42)
        .fillColor("#5e7ac4")
        .text("Absenku!", cardX, currentY, {
          width: cardWidth,
          align: "center",
        });

      currentY += 48;
    }

    // Subtitle tetap ada, hanya dipercantik

    // ========================
    // BADGE SESI
    // ========================
    const badgeText = "SCAN QR ABSENSI";
    const badgeWidth = 145;
    const badgeHeight = 27;
    const badgeX = (pageWidth - badgeWidth) / 2;

    doc
      .roundedRect(badgeX, currentY, badgeWidth, badgeHeight, 999)
      .fill("#eff6ff");

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#2563eb")
      .text(badgeText, badgeX, currentY + 8, {
        width: badgeWidth,
        align: "center",
      });

    currentY += 42;

    // ========================
    // JUDUL SESI
    // ========================
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#111827")
      .text(session.judul || "QR Absensi", cardX + 34, currentY, {
        width: cardWidth - 68,
        align: "center",
      });

    currentY += 26;

    // Garis kecil
    const lineWidth = 70;
    doc
      .moveTo((pageWidth - lineWidth) / 2, currentY)
      .lineTo((pageWidth + lineWidth) / 2, currentY)
      .lineWidth(2)
      .strokeColor("#93c5fd")
      .stroke();

    currentY += 24;

    // ========================
    // QR CARD
    // ========================
    const qrSize = 338;
    const qrX = (pageWidth - qrSize) / 2;
    const qrCardPadding = 18;
    const qrCardX = qrX - qrCardPadding;
    const qrCardY = currentY - qrCardPadding;
    const qrCardSize = qrSize + qrCardPadding * 2;

    // Shadow tipis simulasi
    doc
      .roundedRect(qrCardX + 4, qrCardY + 6, qrCardSize, qrCardSize, 22)
      .fill("#e5e7eb");

    doc
      .roundedRect(qrCardX, qrCardY, qrCardSize, qrCardSize, 22)
      .fillAndStroke("#ffffff", "#dbeafe");

    // Inner soft border
    doc
      .roundedRect(
        qrCardX + 8,
        qrCardY + 8,
        qrCardSize - 16,
        qrCardSize - 16,
        18,
      )
      .strokeColor("#eef2ff")
      .lineWidth(1)
      .stroke();

    doc.image(qrBuffer, qrX, currentY, {
      width: qrSize,
      height: qrSize,
    });

    currentY += qrSize + 38;

    // ========================
    // TANGGAL SESI
    // ========================
    const tanggalSesi = formatTanggalSesiIndonesia(session.start_time);

    const dateBadgeWidth = 300;
    const dateBadgeHeight = 38;
    const dateBadgeX = (pageWidth - dateBadgeWidth) / 2;

    doc
      .roundedRect(dateBadgeX, currentY, dateBadgeWidth, dateBadgeHeight, 999)
      .fill("#f8fafc")
      .strokeColor("#e2e8f0")
      .lineWidth(1)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(19)
      .fillColor("#111827")
      .text(tanggalSesi, dateBadgeX, currentY + 9, {
        width: dateBadgeWidth,
        align: "center",
      });

    currentY += 52;

    // ========================
    // INFO
    // ========================
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#64748b")
      .text(
        "Silakan scan QR code ini untuk mengisi absensi sesi.",
        cardX + 40,
        currentY,
        {
          width: cardWidth - 80,
          align: "center",
        },
      );

    currentY += 19;

    if (session.location_name) {
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#334155")
        .text(`Lokasi: ${session.location_name}`, cardX + 40, currentY, {
          width: cardWidth - 80,
          align: "center",
        });

      currentY += 18;
    }

    // ========================
    // FOOTER
    // ========================
    const footerY = pageHeight - 76;

    doc
      .moveTo(cardX + 35, footerY - 14)
      .lineTo(pageWidth - cardX - 35, footerY - 14)
      .lineWidth(1)
      .strokeColor("#e5e7eb")
      .stroke();

    // doc
    //   .font("Helvetica")
    //   .fontSize(9)
    //   .fillColor("#94a3b8")
    //   .text(
    //     "QR ini berlaku sesuai waktu sesi yang telah dibuat oleh admin.",
    //     cardX + 35,
    //     footerY,
    //     {
    //       width: cardWidth - 70,
    //       align: "center",
    //     },
    //   );

    doc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membuat PDF QR.",
      error: error.message,
    });
  }
});

app.delete("/api/admin-users/:adminId", async (req, res) => {
  try {
    const { adminId } = req.params;

    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token login tidak ditemukan.",
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        message: "Token login tidak valid.",
      });
    }

    const { data: requester, error: requesterError } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (requesterError || !requester) {
      return res.status(403).json({
        success: false,
        message: "Akun Anda tidak terdaftar sebagai admin.",
      });
    }

    if (requester.role !== "super_admin" || requester.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Hanya super admin yang boleh menghapus admin.",
      });
    }

    const { data: targetAdmin, error: targetError } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .eq("id", adminId)
      .maybeSingle();

    if (targetError) {
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data admin target.",
        error: targetError.message,
      });
    }

    if (!targetAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin target tidak ditemukan.",
      });
    }

    if (targetAdmin.user_id === user.id) {
      return res.status(400).json({
        success: false,
        message: "Super admin tidak boleh menghapus akun sendiri.",
      });
    }

    const { error: deleteAuthError } =
      await supabaseAdmin.auth.admin.deleteUser(targetAdmin.user_id);

    if (deleteAuthError) {
      return res.status(500).json({
        success: false,
        message: "Gagal menghapus user dari Authentication.",
        error: deleteAuthError.message,
      });
    }

    const { error: deleteAdminError } = await supabaseAdmin
      .from("admin_users")
      .delete()
      .eq("id", adminId);

    if (deleteAdminError) {
      return res.status(500).json({
        success: false,
        message:
          "User Auth berhasil dihapus, tetapi data admin_users gagal dihapus.",
        error: deleteAdminError.message,
      });
    }

    res.json({
      success: true,
      message:
        "Admin berhasil dihapus dari admin_users dan Authentication Users.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghapus admin.",
      error: error.message,
    });
  }
});

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const port = Number(process.env.PORT) || 3000;
  const publicDirectory = path.join(process.cwd(), "public");

  app.use(express.static(publicDirectory));
  app.get("/", (_req, res) => res.redirect("/login.html"));

  const server = app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${server.address().port}`);
  });
}

export default app;
