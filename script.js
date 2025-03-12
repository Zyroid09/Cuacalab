let weatherChart = null; // Variabel global untuk menyimpan referensi chart

// NAVBAR WAKTU START
// Variabel global untuk bulan
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

// Fungsi updateTime
function updateTime() {
  const now = new Date();
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  // Tanggal
  let day = days[now.getDay()];
  let date = now.getDate();
  let month = months[now.getMonth()]; // Menggunakan variabel global months
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
// NAVBAR WAKTU END

// API Key OpenWeatherMap
const apiKey = "c45121679e81f3e00024976ee44cd480";

// Inisialisasi Peta di dalam .ramalan-maps
var map = L.map("map").setView([-6.2, 106.816666], 10); // Default ke Jakarta

// Tambahkan Tile Layer dari OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// Fungsi untuk mendapatkan lokasi pengguna
async function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async function (position) {
        let lat = position.coords.latitude;
        let lon = position.coords.longitude;

        map.setView([lat, lon], 12); // Pusatkan peta ke lokasi pengguna

        // Ambil data cuaca saat ini
        await getWeatherData(lat, lon);

        // Perbarui grafik tren cuaca
        await updateWeatherChart(lat, lon);

        // Perbarui prakiraan cuaca
        await updateForecast(lat, lon);

        // Tampilkan detail cuaca per jam untuk hari ini
        const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
        const hourlyData = await getHourlyWeatherData(lat, lon, today);
        if (hourlyData) {
          showHourlyWeather(hourlyData);
        }
      },
      function (error) {
        console.error("Gagal mendapatkan lokasi:", error);
        alert("Tidak dapat mengakses lokasi Anda!");
      }
    );
  } else {
    alert("Geolocation tidak didukung di browser Anda.");
  }
}

// Fungsi untuk mencari lokasi menggunakan Nominatim API
async function searchLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      return { lat, lon };
    } else {
      throw new Error("Lokasi tidak ditemukan");
    }
  } catch (error) {
    console.error("Gagal mencari lokasi:", error);
    alert("Lokasi tidak ditemukan atau terjadi kesalahan.");
    return null;
  }
}

// Event listener untuk search box
document
  .getElementById("searchInput")
  .addEventListener("keypress", async function (e) {
    if (e.key === "Enter") {
      const query = this.value.trim();
      if (query) {
        const location = await searchLocation(query);
        if (location) {
          // Update peta dan cuaca
          map.setView([location.lat, location.lon], 12);
          await getWeatherData(location.lat, location.lon);
        }
      }
    }
  });

// Fungsi untuk mengupdate ramalan-box dengan data cuaca
function updateWeatherBox(data) {
  const currentDay = document.getElementById("currentDay");
  const currentDate = document.getElementById("currentDate");
  const weatherIcon = document.getElementById("weatherIcon");
  const currentTemp = document.getElementById("currentTemp");
  const weatherDescription = document.getElementById("weatherDescription");
  const windSpeed = document.getElementById("windSpeed");
  const windDirection = document.getElementById("windDirection");
  const humidity = document.getElementById("humidity");
  const weatherWarning = document.getElementById("weatherWarning");

  // Update informasi cuaca
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const now = new Date();
  currentDay.textContent = days[now.getDay()]; // Hari ini
  currentDate.textContent = `${now.getDate()} ${
    months[now.getMonth()]
  } ${now.getFullYear()}`; // Tanggal

  // Update ikon cuaca
  const iconCode = data.weather[0].icon;
  console.log("Icon Code:", iconCode); // Debugging
  console.log("Weather Icon Class:", getWeatherIcon(iconCode)); // Debugging
  weatherIcon.className = `bi ${getWeatherIcon(iconCode)}`; // Update ikon cuaca

  // Update suhu, deskripsi, dan detail cuaca
  currentTemp.textContent = `${Math.round(data.main.temp)}°C`;
  weatherDescription.textContent = data.weather[0].description;
  windSpeed.textContent = data.wind.speed;
  windDirection.textContent = getWindDirection(data.wind.deg);
  humidity.textContent = `${data.main.humidity}%`;

  // Update peringatan cuaca (jika ada)
  if (
    data.weather[0].main === "Rain" ||
    data.weather[0].main === "Thunderstorm"
  ) {
    weatherWarning.textContent = "Peringatan: Cuaca Buruk";
  } else {
    weatherWarning.textContent = "Tidak ada peringatan cuaca buruk";
  }

  // Update background berdasarkan kondisi cuaca
  const ramalanKiri = document.querySelector(".ramalan-kiri");
  ramalanKiri.classList.remove("sunny", "rainy", "cloudy", "stormy"); // Hapus class sebelumnya

  if (data.weather[0].main === "Clear") {
    ramalanKiri.classList.add("sunny"); // Cuaca cerah
  } else if (data.weather[0].main === "Rain") {
    ramalanKiri.classList.add("rainy"); // Cuaca hujan
  } else if (data.weather[0].main === "Clouds") {
    ramalanKiri.classList.add("cloudy"); // Cuaca berawan
  } else if (data.weather[0].main === "Thunderstorm") {
    ramalanKiri.classList.add("stormy"); // Cuaca badai
  }
}

// Fungsi untuk mendapatkan ikon cuaca berdasarkan kode dari OpenWeatherMap
function getWeatherIcon(iconCode) {
  const iconMap = {
    "01d": "sun", // Clear sky (day)
    "01n": "moon", // Clear sky (night)
    "02d": "cloud-sun", // Few clouds (day)
    "02n": "cloud-moon", // Few clouds (night)
    "03d": "cloud", // Scattered clouds
    "03n": "cloud", // Scattered clouds
    "04d": "clouds", // Broken clouds
    "04n": "clouds", // Broken clouds
    "09d": "cloud-rain", // Shower rain
    "09n": "cloud-rain", // Shower rain
    "10d": "cloud-rain", // Rain (day)
    "10n": "cloud-rain", // Rain (night)
    "11d": "cloud-lightning", // Thunderstorm
    "11n": "cloud-lightning", // Thunderstorm
    "13d": "snow", // Snow
    "13n": "snow", // Snow
    "50d": "cloud-fog", // Mist
    "50n": "cloud-fog", // Mist
  };
  return iconMap[iconCode] || "cloud";
}

// Fungsi untuk mendapatkan arah angin berdasarkan derajat
function getWindDirection(degrees) {
  const directions = [
    "Utara",
    "Timur Laut",
    "Timur",
    "Tenggara",
    "Selatan",
    "Barat Daya",
    "Barat",
    "Barat Laut",
  ];
  const index = Math.round((degrees % 360) / 45);
  return directions[index % 8];
}

// Fungsi untuk mendapatkan data cuaca dari OpenWeatherMap
async function getWeatherData(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=id`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("Data dari API:", data); // Periksa data di console browser
    if (data.cod !== 200) {
      throw new Error(data.message);
    }

    // Update ramalan-box dengan data cuaca
    updateWeatherBox(data);

    // Tambahkan marker ke peta dengan popup informasi cuaca
    let marker = L.marker([lat, lon]).addTo(map);
    marker
      .bindPopup(
        `
      <b>${data.name}</b><br>
      <img src="https://openweathermap.org/img/wn/${
        data.weather[0].icon
      }@2x.png" alt="icon"><br>
      Suhu: ${Math.round(data.main.temp)}°C<br>
      ${data.weather[0].description}<br>
      Kelembapan: ${data.main.humidity}%<br>
      Angin: ${data.wind.speed} km/jam
    `
      )
      .openPopup();
  } catch (error) {
    console.error("Gagal mengambil data cuaca:", error);
  }
}

// FUNGSI PRAKIRAAN CUACA
// Fungsi untuk mengambil data prakiraan cuaca harian dari Open-Meteo
async function getForecastData(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Gagal mengambil data prakiraan cuaca:", error);
    return null;
  }
}

// Fungsi untuk mengambil data cuaca per jam dari Open-Meteo
async function getHourlyWeatherData(lat, lon, date) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&start_date=${date}&end_date=${date}&timezone=auto`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("Data dari API:", data); // Debugging
    return data;
  } catch (error) {
    console.error("Gagal mengambil data cuaca per jam:", error);
    return null;
  }
}

// Fungsi untuk menampilkan prakiraan cuaca harian
async function updateForecast(lat, lon) {
  const forecastData = await getForecastData(lat, lon);
  if (forecastData) {
    const forecastCards = document.querySelectorAll(".card");
    forecastCards.forEach((card, index) => {
      const date = forecastData.daily.time[index];
      const maxTemp = forecastData.daily.temperature_2m_max[index];
      const minTemp = forecastData.daily.temperature_2m_min[index];
      const weatherCode = forecastData.daily.weathercode[index];
      const precipitation = forecastData.daily.precipitation_sum[index];

      const day =
        index === 0 ? "Hari ini" : index === 1 ? "Besok" : formatDate(date);
      const weatherDescription = getWeatherDescription(weatherCode);

      card.querySelector("p").textContent = day;
      card.querySelectorAll("p")[1].textContent = weatherDescription;
      card.querySelectorAll("p")[2].textContent = `${precipitation}%`;
      card.querySelector("h4").textContent = `${Math.round(
        (maxTemp + minTemp) / 2
      )}°C`;

      // Tambahkan event listener untuk menampilkan detail cuaca per jam
      card.addEventListener("click", async () => {
        const hourlyData = await getHourlyWeatherData(lat, lon, date);
        if (hourlyData) {
          showHourlyWeather(hourlyData);
        }
      });
    });
  }
}

// Fungsi untuk menampilkan detail cuaca per jam
function showHourlyWeather(hourlyData) {
  const hourlyWeatherDetail = document.getElementById("hourlyWeatherDetail");
  hourlyWeatherDetail.innerHTML = "<p>Memuat data cuaca per jam...</p>";

  // Tambahkan delay untuk simulasi loading
  setTimeout(() => {
    let html = "";
    hourlyData.hourly.time.forEach((time, index) => {
      const hour = new Date(time).getHours();
      const temp = hourlyData.hourly.temperature_2m[index];
      const weatherCode = hourlyData.hourly.weathercode[index];
      const weatherIcon = getWeatherIcon(weatherCode);
      const weatherDescription = getWeatherDescription(weatherCode);

      html += `
        <div class="hourly-item">
          <p>${hour}:00</p>
          <i class="bi ${weatherIcon}"></i>
          <p>${temp}°C</p>
          <p>${weatherDescription}</p>
        </div>
      `;
    });

    hourlyWeatherDetail.innerHTML = html;

    // Tambahkan animasi slideIn untuk setiap item
    const hourlyItems = document.querySelectorAll(".hourly-item");
    hourlyItems.forEach((item, index) => {
      item.style.animationDelay = `${index * 0.1}s`; // Delay animasi untuk setiap item
    });
  }, 500); // Simulasi loading selama 500ms
}

// Modifikasi event listener untuk card prakiraan cuaca
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("click", async function () {
    // Tambahkan efek animasi saat card diklik
    this.style.transform = "scale(0.95)";
    setTimeout(() => {
      this.style.transform = "scale(1)";
    }, 200); // Kembali ke ukuran normal setelah 200ms

    // Ambil data cuaca per jam
    const lat = map.getCenter().lat;
    const lon = map.getCenter().lng;
    const date = this.querySelector("p").textContent; // Ambil tanggal dari card

    const hourlyData = await getHourlyWeatherData(lat, lon, date);
    if (hourlyData) {
      showHourlyWeather(hourlyData);
    }
  });
});

// Fungsi untuk mendapatkan deskripsi cuaca berdasarkan weather code
function getWeatherDescription(weatherCode) {
  const weatherDescriptions = {
    0: "Cerah",
    1: "Cerah Berawan",
    2: "Berawan",
    3: "Mendung",
    45: "Kabut",
    48: "Kabut Beku",
    51: "Hujan Ringan",
    53: "Hujan Sedang",
    55: "Hujan Deras",
    56: "Hujan Beku Ringan",
    57: "Hujan Beku Deras",
    61: "Hujan Ringan",
    63: "Hujan Sedang",
    65: "Hujan Deras",
    66: "Hujan Beku Ringan",
    67: "Hujan Beku Deras",
    71: "Salju Ringan",
    73: "Salju Sedang",
    75: "Salju Deras",
    77: "Butiran Salju",
    80: "Hujan Lebat Ringan",
    81: "Hujan Lebat Sedang",
    82: "Hujan Lebat Deras",
    85: "Hujan Salju Ringan",
    86: "Hujan Salju Deras",
    95: "Badai Petir",
    96: "Badai Petir dengan Hujan Ringan",
    99: "Badai Petir dengan Hujan Deras",
  };
  return weatherDescriptions[weatherCode] || "Tidak Diketahui";
}

// Fungsi untuk mendapatkan ikon cuaca berdasarkan weather code
function getWeatherIcon(weatherCode) {
  const iconMap = {
    0: "bi-sun", // Cerah
    1: "bi-cloud-sun", // Cerah Berawan
    2: "bi-cloud", // Berawan
    3: "bi-clouds", // Mendung
    45: "bi-cloud-fog", // Kabut
    48: "bi-cloud-fog", // Kabut Beku
    51: "bi-cloud-drizzle", // Hujan Ringan
    53: "bi-cloud-rain", // Hujan Sedang
    55: "bi-cloud-rain-heavy", // Hujan Deras
    56: "bi-cloud-sleet", // Hujan Beku Ringan
    57: "bi-cloud-sleet", // Hujan Beku Deras
    61: "bi-cloud-drizzle", // Hujan Ringan
    63: "bi-cloud-rain", // Hujan Sedang
    65: "bi-cloud-rain-heavy", // Hujan Deras
    66: "bi-cloud-sleet", // Hujan Beku Ringan
    67: "bi-cloud-sleet", // Hujan Beku Deras
    71: "bi-snow", // Salju Ringan
    73: "bi-snow", // Salju Sedang
    75: "bi-snow", // Salju Deras
    77: "bi-snow", // Butiran Salju
    80: "bi-cloud-rain", // Hujan Lebat Ringan
    81: "bi-cloud-rain", // Hujan Lebat Sedang
    82: "bi-cloud-rain-heavy", // Hujan Lebat Deras
    85: "bi-cloud-snow", // Hujan Salju Ringan
    86: "bi-cloud-snow", // Hujan Salju Deras
    95: "bi-cloud-lightning", // Badai Petir
    96: "bi-cloud-lightning-rain", // Badai Petir dengan Hujan Ringan
    99: "bi-cloud-lightning-rain", // Badai Petir dengan Hujan Deras
  };
  return iconMap[weatherCode] || "bi-cloud";
}

// Fungsi untuk memformat tanggal
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { day: "numeric", month: "long" };
  return date.toLocaleDateString("id-ID", options);
}

// Panggil fungsi updateForecast saat lokasi berubah
// Fungsi untuk menampilkan loading
function showLoading() {
  const loadingContainer = document.getElementById("loadingContainer");
  loadingContainer.style.display = "flex"; // Tampilkan loading
}

// Fungsi untuk menyembunyikan loading
function hideLoading() {
  const loadingContainer = document.getElementById("loadingContainer");
  loadingContainer.style.display = "none"; // Sembunyikan loading
}

// Modifikasi event listener untuk pencarian lokasi
document
  .getElementById("searchInput")
  .addEventListener("keypress", async function (e) {
    if (e.key === "Enter") {
      const query = this.value.trim();
      if (query) {
        showLoading(); // Tampilkan loading
        const location = await searchLocation(query);
        if (location) {
          // Update peta dan cuaca
          map.setView([location.lat, location.lon], 12);
          await getWeatherData(location.lat, location.lon);

          // Perbarui prakiraan cuaca
          await updateForecast(location.lat, location.lon);

          // Tampilkan detail cuaca per jam untuk hari ini
          const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
          const hourlyData = await getHourlyWeatherData(
            location.lat,
            location.lon,
            today
          );
          if (hourlyData) {
            showHourlyWeather(hourlyData);
          }
        }
        hideLoading(); // Sembunyikan loading setelah selesai
      }
    }
  });

// FUNGI HISTORI DATA CUACA
async function getHistoricalWeatherData(lat, lon) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 10); // Ambil data untuk 5 hari terakhir
  const endDate = new Date();

  const startDateFormatted = startDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD
  const endDateFormatted = endDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDateFormatted}&end_date=${endDateFormatted}&hourly=temperature_2m,rain,relative_humidity_2m`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.hourly && data.hourly.time.length > 0) {
      const historicalData = [];

      // Ambil data untuk jam 12 siang setiap hari
      for (let i = 0; i < data.hourly.time.length; i++) {
        const date = new Date(data.hourly.time[i]);
        if (date.getHours() === 12) {
          // Ambil data untuk jam 12 siang
          historicalData.push({
            date: date.toLocaleDateString(),
            temp: data.hourly.temperature_2m[i],
            humidity: data.hourly.relative_humidity_2m[i],
            rain: data.hourly.rain[i] || 0, // Curah hujan dalam mm
          });
        }
      }

      // Format data untuk grafik
      const months = historicalData.map((entry) => entry.date);
      const temperatureData = historicalData.map((entry) => entry.temp);
      const rainfallData = historicalData.map((entry) => entry.rain);
      const humidityData = historicalData.map((entry) => entry.humidity);

      return {
        months,
        temperatureData,
        rainfallData,
        humidityData,
      };
    } else {
      throw new Error("Data historis cuaca tidak ditemukan.");
    }
  } catch (error) {
    console.error("Gagal mengambil data historis cuaca:", error);
    return null;
  }
}

// Fungsi untuk membuat grafik
function createWeatherChart(
  months,
  temperatureData,
  rainfallData,
  humidityData
) {
  const ctx = document.getElementById("weatherChart").getContext("2d");

  // Hancurkan chart sebelumnya jika ada
  if (weatherChart) {
    weatherChart.destroy();
  }

  // Buat chart baru
  weatherChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Suhu (°C)",
          data: temperatureData,
          borderColor: "rgba(255, 99, 132, 1)",
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderWidth: 2,
          fill: true,
        },
        {
          label: "Curah Hujan (mm)",
          data: rainfallData,
          borderColor: "rgba(54, 162, 235, 1)",
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderWidth: 2,
          fill: true,
        },
        {
          label: "Kelembaban (%)",
          data: humidityData,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderWidth: 2,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false,
      },
      scales: {
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: {
            display: true,
            text: "Suhu (°C)",
          },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: {
            display: true,
            text: "Curah Hujan (mm)",
          },
          grid: {
            drawOnChartArea: false,
          },
        },
        y2: {
          type: "linear",
          display: true,
          position: "right",
          title: {
            display: true,
            text: "Kelembaban (%)",
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  });
}

// Panggil fungsi updateWeatherChart saat lokasi berubah
document
  .getElementById("searchInput")
  .addEventListener("keypress", async function (e) {
    if (e.key === "Enter") {
      const query = this.value.trim();
      if (query) {
        const location = await searchLocation(query);
        if (location) {
          // Update peta dan cuaca
          map.setView([location.lat, location.lon], 12);
          await getWeatherData(location.lat, location.lon);

          // Perbarui grafik tren cuaca
          await updateWeatherChart(location.lat, location.lon); // Pastikan ini dipanggil
        }
      }
    }
  });

let heatmapChart = null; // Variabel global untuk menyimpan referensi heatmap

function createHeatmapChart(months, temperatureData) {
  const ctx = document.getElementById("heatmapChart").getContext("2d");

  // Hancurkan heatmap sebelumnya jika ada
  if (heatmapChart) {
    heatmapChart.destroy();
  }

  // Buat heatmap baru
  heatmapChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          label: "Suhu (°C)",
          data: temperatureData,
          backgroundColor: temperatureData.map((temp) => {
            // Gradien warna berdasarkan suhu
            if (temp < 20) return "rgba(54, 162, 235, 0.6)"; // Biru untuk suhu rendah
            if (temp >= 20 && temp < 30) return "rgba(75, 192, 192, 0.6)"; // Hijau untuk suhu sedang
            return "rgba(255, 99, 132, 0.6)"; // Merah untuk suhu tinggi
          }),
          borderColor: "rgba(255, 255, 255, 0.2)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Suhu (°C)",
          },
        },
      },
    },
  });
}

let pieChart = null; // Variabel global untuk menyimpan referensi pie chart

function createPieChart(weatherConditions) {
  const ctx = document.getElementById("pieChart").getContext("2d");

  // Hancurkan pie chart sebelumnya jika ada
  if (pieChart) {
    pieChart.destroy();
  }

  // Buat pie chart baru
  pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(weatherConditions),
      datasets: [
        {
          label: "Kondisi Cuaca",
          data: Object.values(weatherConditions),
          backgroundColor: [
            "rgba(255, 99, 132, 0.6)", // Merah
            "rgba(54, 162, 235, 0.6)", // Biru
            "rgba(75, 192, 192, 0.6)", // Hijau
            "rgba(255, 206, 86, 0.6)", // Kuning
          ],
          borderColor: "rgba(255, 255, 255, 0.2)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

// Fungsi untuk memperbarui grafik berdasarkan lokasi
async function updateWeatherChart(lat, lon) {
  const { months, temperatureData, rainfallData, humidityData } =
    await getHistoricalWeatherData(lat, lon);

  if (months && temperatureData && rainfallData && humidityData) {
    // Hitung statistik cuaca
    const avgTemp = calculateAverage(temperatureData).toFixed(1);
    const totalRainfall = calculateTotal(rainfallData).toFixed(1);
    const avgHumidity = calculateAverage(humidityData).toFixed(1);

    // Tampilkan statistik cuaca
    document.getElementById("avgTemp").textContent = `${avgTemp}°C`;
    document.getElementById(
      "totalRainfall"
    ).textContent = `${totalRainfall} mm`;
    document.getElementById("avgHumidity").textContent = `${avgHumidity}%`;

    // Buat grafik cuaca
    createWeatherChart(months, temperatureData, rainfallData, humidityData);

    // Buat heatmap untuk distribusi suhu
    createHeatmapChart(months, temperatureData);

    // Hitung persentase kondisi cuaca (contoh data)
    const weatherConditions = {
      Cerah: 10, // 10 hari cerah
      Hujan: 5, // 5 hari hujan
      Berawan: 8, // 8 hari berawan
      Lainnya: 2, // 2 hari lainnya
    };

    // Buat pie chart untuk persentase kondisi cuaca
    createPieChart(weatherConditions);
  } else {
    console.error("Data historis cuaca tidak valid.");
  }
}

// Fungsi untuk menghitung rata-rata
function calculateAverage(data) {
  const sum = data.reduce((acc, val) => acc + val, 0);
  return sum / data.length;
}

// Fungsi untuk menghitung total
function calculateTotal(data) {
  return data.reduce((acc, val) => acc + val, 0);
}

// Panggil fungsi untuk mendapatkan lokasi pengguna dan cuaca
getUserLocation();
