import express from "express";
import QRCode from "qrcode";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

/**
 * Pengganti __dirname karena di ES Module tidak tersedia langsung.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

/**
 * DATA SEMENTARA
 * Nanti bisa diganti database seperti Supabase/MySQL/Firebase.
 */
const participants = [
  { id: 1, name: "Andi Saputra" },
  { id: 2, name: "Budi Santoso" },
  { id: 3, name: "Citra Lestari" },
  { id: 4, name: "Dewi Anggraini" },
  { id: 5, name: "Eka Pratama" },
];

const sessions = {
  "sesi-1": {
    id: "sesi-1",
    title: "Absensi Praktikum",
    isActive: true,
    currentToken: null,
    tokenExpiredAt: null,
  },
};

const attendance = [];

function generateToken() {
  return crypto.randomBytes(16).toString("hex");
}

function getCurrentQrToken(sessionId) {
  const session = sessions[sessionId];

  if (!session) {
    return null;
  }

  const now = Date.now();

  if (
    !session.currentToken ||
    !session.tokenExpiredAt ||
    now > session.tokenExpiredAt
  ) {
    session.currentToken = generateToken();
    session.tokenExpiredAt = now + 20 * 1000;
  }

  return {
    token: session.currentToken,
    expiredAt: session.tokenExpiredAt,
  };
}

app.get("/", (req, res) => {
  res.redirect("/admin.html");
});

/**
 * API QR dinamis.
 */
app.get("/api/qr/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions[sessionId];

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Sesi tidak ditemukan.",
      });
    }

    if (!session.isActive) {
      return res.status(400).json({
        success: false,
        message: "Sesi absen belum aktif.",
      });
    }

    const qrData = getCurrentQrToken(sessionId);

    const attendanceUrl = `http://localhost:${PORT}/absen.html?session=${sessionId}&token=${qrData.token}`;

    const qrImage = await QRCode.toDataURL(attendanceUrl);

    res.json({
      success: true,
      title: session.title,
      qrImage,
      url: attendanceUrl,
      token: qrData.token,
      expiredAt: qrData.expiredAt,
      expiredInSeconds: Math.max(
        0,
        Math.floor((qrData.expiredAt - Date.now()) / 1000),
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

/**
 * API ambil daftar peserta.
 */
app.get("/api/participants", (req, res) => {
  const result = participants.map((participant) => {
    const isPresent = attendance.some(
      (item) =>
        item.participantId === participant.id && item.sessionId === "sesi-1",
    );

    return {
      ...participant,
      isPresent,
    };
  });

  res.json({
    success: true,
    participants: result,
  });
});

/**
 * API submit absensi.
 */
app.post("/api/attendance", (req, res) => {
  const { sessionId, token, participantId, localDeviceId } = req.body;

  const session = sessions[sessionId];

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Sesi tidak ditemukan.",
    });
  }

  if (!session.isActive) {
    return res.status(400).json({
      success: false,
      message: "Sesi absen belum aktif.",
    });
  }

  const now = Date.now();

  if (
    !token ||
    token !== session.currentToken ||
    now > session.tokenExpiredAt
  ) {
    return res.status(400).json({
      success: false,
      message: "QR Code sudah kedaluwarsa. Silakan scan QR terbaru.",
    });
  }

  const participant = participants.find(
    (item) => item.id === Number(participantId),
  );

  if (!participant) {
    return res.status(404).json({
      success: false,
      message: "Peserta tidak ditemukan.",
    });
  }

  let cookieDeviceId = req.cookies.attendance_device_id;

  if (!cookieDeviceId) {
    cookieDeviceId = crypto.randomUUID();

    res.cookie("attendance_device_id", cookieDeviceId, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: false,
      sameSite: "lax",
    });
  }

  const participantAlreadyPresent = attendance.some(
    (item) =>
      item.sessionId === sessionId && item.participantId === participant.id,
  );

  if (participantAlreadyPresent) {
    return res.status(400).json({
      success: false,
      message: "Nama peserta ini sudah tercatat hadir pada sesi ini.",
    });
  }

  const deviceAlreadyUsed = attendance.some((item) => {
    return (
      item.sessionId === sessionId &&
      (item.localDeviceId === localDeviceId ||
        item.cookieDeviceId === cookieDeviceId)
    );
  });

  if (deviceAlreadyUsed) {
    return res.status(400).json({
      success: false,
      message:
        "Perangkat ini sudah digunakan untuk melakukan absensi pada sesi ini.",
    });
  }

  const attendedAt = new Date();

  attendance.push({
    id: attendance.length + 1,
    sessionId,
    participantId: participant.id,
    participantName: participant.name,
    localDeviceId,
    cookieDeviceId,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
    attendedAt: attendedAt.toISOString(),
  });

  res.json({
    success: true,
    message: "Absensi berhasil disimpan.",
    data: {
      name: participant.name,
      attendedAt: attendedAt.toLocaleString("id-ID"),
    },
  });
});

/**
 * API lihat rekap.
 */
app.get("/api/attendance/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  const hadir = attendance.filter((item) => item.sessionId === sessionId);

  const belumHadir = participants.filter((participant) => {
    return !hadir.some((item) => item.participantId === participant.id);
  });

  res.json({
    success: true,
    hadir,
    belumHadir,
  });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
