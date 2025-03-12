//NAVBAR WAKTU START
function updateTime() {
  const now = new Date();
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  // Tanggal
  let day = days[now.getDay()];
  let date = now.getDate();
  let month = months[now.getMonth()];
  let year = now.getFullYear();
  document.getElementById("tanggal").textContent =
    day + ", " + date + " " + month + " " + year;

  // Waktu WIB (GMT+7)
  let wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  let wibTime = wib.toISOString().substring(11, 19); // Format HH:MM:SS

  // Waktu UTC
  let utcTime = now.toISOString().substring(11, 19);

  document.getElementById("waktu").innerHTML =
    "WAKTU INDONESIA <span>" +
    wibTime +
    " WIB</span> / <span>" +
    utcTime +
    " UTC</span>";
}

updateTime();
setInterval(updateTime, 1000);
//NAVBAR WAKTU END
