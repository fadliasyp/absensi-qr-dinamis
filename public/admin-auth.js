const ADMIN_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 menit tidak aktif
const ADMIN_MAX_SESSION_AGE = 8 * 60 * 60 * 1000; // maksimal login 8 jam

const ADMIN_LOGIN_TIME_KEY = "admin_login_time";
const ADMIN_LAST_ACTIVITY_KEY = "admin_last_activity";

function setAdminSessionTimeIfNeeded() {
  const now = Date.now();

  if (!localStorage.getItem(ADMIN_LOGIN_TIME_KEY)) {
    localStorage.setItem(ADMIN_LOGIN_TIME_KEY, String(now));
  }

  localStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(now));
}

function updateAdminActivity() {
  localStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(Date.now()));
}

function clearAdminSessionTime() {
  localStorage.removeItem(ADMIN_LOGIN_TIME_KEY);
  localStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
}

async function forceLogoutAdmin(message) {
  clearAdminSessionTime();

  await authClient.auth.signOut();

  if (typeof Swal !== "undefined") {
    await Swal.fire({
      icon: "warning",
      title: "Sesi Berakhir",
      text: message || "Silakan login ulang untuk melanjutkan.",
      confirmButtonText: "Login Ulang",
      confirmButtonColor: "#2563eb",
    });
  } else {
    alert(message || "Sesi berakhir. Silakan login ulang.");
  }

  window.location.href = "/login.html";
}

function startAdminActivityWatcher() {
  const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];

  events.forEach((eventName) => {
    window.addEventListener(eventName, updateAdminActivity, {
      passive: true,
    });
  });

  setInterval(async () => {
    const now = Date.now();

    const loginTime = Number(localStorage.getItem(ADMIN_LOGIN_TIME_KEY) || 0);
    const lastActivity = Number(
      localStorage.getItem(ADMIN_LAST_ACTIVITY_KEY) || 0,
    );

    if (!loginTime || !lastActivity) {
      return;
    }

    const sessionAge = now - loginTime;
    const idleTime = now - lastActivity;

    if (sessionAge > ADMIN_MAX_SESSION_AGE) {
      await forceLogoutAdmin(
        "Sesi admin sudah terlalu lama. Silakan login ulang.",
      );
      return;
    }

    if (idleTime > ADMIN_IDLE_TIMEOUT) {
      await forceLogoutAdmin(
        "Anda tidak aktif selama beberapa waktu. Silakan login ulang.",
      );
    }
  }, 60 * 1000); // cek setiap 1 menit
}

async function protectAdminPage() {
  const {
    data: { session },
  } = await authClient.auth.getSession();

  if (!session) {
    clearAdminSessionTime();
    window.location.href = "/login.html";
    return;
  }

  setAdminSessionTimeIfNeeded();

  const now = Date.now();
  const loginTime = Number(localStorage.getItem(ADMIN_LOGIN_TIME_KEY) || 0);
  const lastActivity = Number(
    localStorage.getItem(ADMIN_LAST_ACTIVITY_KEY) || 0,
  );

  if (loginTime && now - loginTime > ADMIN_MAX_SESSION_AGE) {
    await forceLogoutAdmin(
      "Sesi admin sudah terlalu lama. Silakan login ulang.",
    );
    return;
  }

  if (lastActivity && now - lastActivity > ADMIN_IDLE_TIMEOUT) {
    await forceLogoutAdmin(
      "Anda tidak aktif terlalu lama. Silakan login ulang.",
    );
    return;
  }

  const { data: adminData, error } = await authClient
    .from("admin_users")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !adminData) {
    clearAdminSessionTime();
    await authClient.auth.signOut();

    if (typeof Swal !== "undefined") {
      await Swal.fire({
        icon: "error",
        title: "Akses Ditolak",
        text: "Akun ini belum terdaftar sebagai admin.",
        confirmButtonColor: "#ef4444",
      });
    } else {
      alert("Akun ini belum terdaftar sebagai admin.");
    }

    window.location.href = "/login.html";
    return;
  }

  if (adminData.status !== "approved") {
    clearAdminSessionTime();
    await authClient.auth.signOut();

    if (typeof Swal !== "undefined") {
      await Swal.fire({
        icon: "warning",
        title: "Admin Belum Disetujui",
        text: "Akun admin Anda belum disetujui.",
        confirmButtonColor: "#f59e0b",
      });
    } else {
      alert("Akun admin Anda belum disetujui.");
    }

    window.location.href = "/login.html";
    return;
  }

  const adminEmailText = document.getElementById("adminEmailText");

  if (adminEmailText) {
    adminEmailText.textContent = adminData.nama_lengkap || session.user.email;
  }

  startAdminActivityWatcher();
}

async function logoutAdmin() {
  if (typeof Swal !== "undefined") {
    const result = await Swal.fire({
      icon: "warning",
      title: "Logout dari admin?",
      text: "Anda akan keluar dari halaman admin.",
      showCancelButton: true,
      confirmButtonText: "Ya, logout",
      cancelButtonText: "Batal",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    clearAdminSessionTime();

    await authClient.auth.signOut();

    await Swal.fire({
      icon: "success",
      title: "Berhasil logout",
      text: "Anda akan diarahkan ke halaman login.",
      confirmButtonText: "Oke",
      confirmButtonColor: "#2563eb",
    });

    window.location.href = "/login.html";
    return;
  }

  const confirmation = confirm("Yakin ingin logout?");
  if (!confirmation) return;

  clearAdminSessionTime();
  await authClient.auth.signOut();
  window.location.href = "/login.html";
}
