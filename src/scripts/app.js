let map;
let currentCity = "Kottawa";
let mapMarkers = [];
let weatherDataCache = null;
let currentPeriod = "7days";
let debounceTimer;
let isLocationDenied = false;
let isListening = false;
let recognition = null;

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  requestLocationAndFetch();
  setupEventListeners();
});

function requestLocationAndFetch() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "Unknown";
          const country = data.address?.country_code?.toUpperCase() || "";
          currentCity = city;
          document.getElementById("current-location").innerText = `${city}, ${country}`;
          fetchWeatherData(city);
          hideLocationMessage();
        } catch (err) {
          console.warn("Reverse geocode failed:", err);
          fetchWeatherByCoords(latitude, longitude);
        }
      },
      (err) => {
        console.warn("Geolocation denied:", err);
        isLocationDenied = true;
        showLocationMessage();
        document.getElementById("current-location").innerText = "Kottawa, LK";
        fetchWeatherData("Kottawa");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  } else {
    document.getElementById("current-location").innerText = "Kottawa, LK";
    fetchWeatherData("Kottawa");
  }
}

async function fetchWeatherByCoords(lat, lon) {
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error("Coord fetch error");
    const data = await res.json();
    weatherDataCache = data;
    currentCity = data.city;
    document.getElementById("current-location").innerText = `${data.city}, ${data.country}`;
    updateMapSmoothly(data.coord, `${data.city}, ${data.country}`);
    updateViewWithSmoothAnimation();
  } catch (err) {
    console.error("Coord weather fetch failed:", err);
    fetchWeatherData("Kottawa");
  }
}

function showLocationMessage() {
  document.getElementById("location-message").style.display = "flex";
}
function hideLocationMessage() {
  document.getElementById("location-message").style.display = "none";
}

function setupEventListeners() {
  // Theme
  const lightBtn = document.getElementById("btn-light");
  const darkBtn = document.getElementById("btn-dark");
  lightBtn.addEventListener("click", () => {
    document.body.className = "light-theme";
    lightBtn.classList.add("active");
    darkBtn.classList.remove("active");
  });
  darkBtn.addEventListener("click", () => {
    document.body.className = "dark-theme";
    darkBtn.classList.add("active");
    lightBtn.classList.remove("active");
  });

  // Location settings
  document.getElementById("open-location-settings").addEventListener("click", () => {
    window.open("ms-settings:privacy-location", "_blank");
  });
  document.getElementById("dismiss-location-msg").addEventListener("click", hideLocationMessage);

  // Search
  const searchInput = document.getElementById("city-search");
  const clearBtn = document.getElementById("clear-btn");
  const micBtn = document.getElementById("mic-btn");
  const suggestionsBox = document.getElementById("search-suggestions");

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    suggestionsBox.style.display = "none";
    searchInput.focus();
  });

  // Voice search with smooth state
  micBtn.addEventListener("click", () => {
    if (isListening) {
      if (recognition) recognition.stop();
      isListening = false;
      micBtn.classList.remove("listening");
      return;
    }
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SR();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.start();
      isListening = true;
      micBtn.classList.add("listening");

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        searchInput.value = transcript;
        currentCity = transcript.trim();
        suggestionsBox.style.display = "none";
        fetchWeatherData(currentCity);
        isListening = false;
        micBtn.classList.remove("listening");
      };
      recognition.onerror = () => {
        isListening = false;
        micBtn.classList.remove("listening");
        searchInput.focus();
      };
      recognition.onend = () => {
        isListening = false;
        micBtn.classList.remove("listening");
      };
    } else {
      searchInput.focus();
    }
  });

  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    if (query.length < 2) {
      suggestionsBox.style.display = "none";
      return;
    }
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        if (data.length > 0) {
          suggestionsBox.innerHTML = "";
          data.forEach(item => {
            const div = document.createElement("div");
            div.className = "suggestion-item";
            div.innerText = item.display_name;
            div.addEventListener("click", () => {
              currentCity = item.display_name.split(",")[0];
              searchInput.value = currentCity;
              suggestionsBox.style.display = "none";
              fetchWeatherData(currentCity);
            });
            suggestionsBox.appendChild(div);
          });
          suggestionsBox.style.display = "block";
        }
      } catch (err) { console.error("Suggestion error:", err); }
    }, 300);
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && searchInput.value.trim() !== "") {
      currentCity = searchInput.value.trim();
      suggestionsBox.style.display = "none";
      fetchWeatherData(currentCity);
    }
  });

  // Tabs
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", (e) => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      e.target.classList.add("active");
      currentPeriod = e.target.getAttribute("data-period");
      updateViewWithSmoothAnimation();
    });
  });
}

async function fetchWeatherData(city) {
  try {
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    if (!response.ok) throw new Error("City fetch error");
    weatherDataCache = await response.json();

    console.log("✅ Weather data:", weatherDataCache);
    document.getElementById("current-location").innerText = `${weatherDataCache.city}, ${weatherDataCache.country}`;
    updateMapSmoothly(weatherDataCache.coord, `${weatherDataCache.city}, ${weatherDataCache.country}`);
    updateViewWithSmoothAnimation();
  } catch (err) {
    console.error("❌ Weather fetch failed:", err);
    const grid = document.getElementById("forecast-grid");
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);">
      <p style="font-size:16px;">⚠️ Could not load weather data</p>
      <p style="font-size:12px;margin-top:8px;">${err.message}</p>
    </div>`;
  }
}

function updateViewWithSmoothAnimation() {
  const wrapper = document.getElementById("forecast-wrapper");
  wrapper.classList.add("faded");

  setTimeout(() => {
    if (!weatherDataCache) {
      wrapper.classList.remove("faded");
      return;
    }
    renderForecastView();
    document.getElementById("chart-title").innerText = "Chance of rain";
    renderChart(weatherDataCache.hourlyRain || []);
    renderCitiesList(weatherDataCache.otherCities);
    wrapper.classList.remove("faded");
  }, 300);
}

function renderForecastView() {
  const grid = document.getElementById("forecast-grid");
  grid.innerHTML = "";

  if (!weatherDataCache?.daily?.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-secondary);">No forecast data</div>`;
    return;
  }

  const daily = weatherDataCache.daily;

  if (currentPeriod === "7days") {
    daily.forEach((day, i) => {
      if (i === 0) grid.appendChild(createMainTodayCard(day));
      else grid.appendChild(createSmallDayCard(day.dayName, day.temp, day.icon));
    });
  } else if (currentPeriod === "today") {
    if (daily[0]) grid.appendChild(createMainTodayCard(daily[0]));
    const hourly = weatherDataCache.hourlyToday || [];
    if (hourly.length) {
      hourly.slice(0, 8).forEach(item => {
        grid.appendChild(createSmallDayCard(item.time, item.temp, item.icon));
      });
    } else {
      for (let i = 1; i < Math.min(5, daily.length); i++) {
        grid.appendChild(createSmallDayCard(daily[i].dayName, daily[i].temp, daily[i].icon));
      }
    }
  } else if (currentPeriod === "tomorrow") {
    const tomorrow = daily[1] || daily[0];
    grid.appendChild(createMainTodayCard(tomorrow, "Tomorrow"));
    const hourly = weatherDataCache.hourlyTomorrow || [];
    if (hourly.length) {
      hourly.slice(0, 8).forEach(item => {
        grid.appendChild(createSmallDayCard(item.time, item.temp, item.icon));
      });
    } else {
      for (let i = 2; i < Math.min(6, daily.length); i++) {
        grid.appendChild(createSmallDayCard(daily[i].dayName, daily[i].temp, daily[i].icon));
      }
    }
  }
}

function createMainTodayCard(data, titleOverride = null) {
  const card = document.createElement("div");
  card.className = "card card-today";
  card.style.animation = "fadeIn 0.5s ease";
  card.innerHTML = `
    <div class="header-row">
      <span>${titleOverride || data.dayName || "Today"}</span>
      <span>${data.time || ""}</span>
    </div>
    <div class="temp-large">${data.temp ?? "--"}°</div>
    <div class="weather-img">${getWeatherSVG(data.icon, 64)}</div>
    <div class="details">
      <div><span>Real Feel:</span> <strong>${data.feelsLike ?? "--"}°</strong></div>
      <div><span>Wind:</span> <span>${data.wind || "--"}</span></div>
      <div><span>Pressure:</span> <span>${data.pressure || "--"} MB</span></div>
      <div><span>Sunrise:</span> <span>${data.sunrise || "--"}</span></div>
      <div><span>Humidity:</span> <span>${data.humidity ?? "--"}%</span></div>
      <div><span>Sunset:</span> <span>${data.sunset || "--"}</span></div>
    </div>
  `;
  return card;
}

function createSmallDayCard(title, temp, icon) {
  const card = document.createElement("div");
  card.className = "card card-day";
  card.style.animation = "fadeIn 0.4s ease";
  card.innerHTML = `
    <div class="day-title">${title || "--"}</div>
    <div>${getWeatherSVG(icon, 36)}</div>
    <div class="day-temp">${temp ?? "--"}°</div>
  `;
  return card;
}

function renderChart(metrics) {
  const barsContainer = document.getElementById("chart-bars");
  const xAxisContainer = document.getElementById("chart-x-axis");
  barsContainer.innerHTML = "";
  xAxisContainer.innerHTML = "";

  if (!metrics || metrics.length === 0) {
    barsContainer.innerHTML = `<div style="text-align:center;width:100%;color:var(--text-secondary);font-size:12px;padding:10px;">No data</div>`;
    return;
  }

  metrics.forEach((item, idx) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    const val = typeof item.value === 'number' ? item.value : 0;
    const targetHeight = Math.max(Math.min(val, 100), 6);
    bar.style.height = "6%";
    bar.dataset.target = targetHeight;
    barsContainer.appendChild(bar);

    const label = document.createElement("span");
    label.innerText = item.time || "";
    xAxisContainer.appendChild(label);

    // Staggered animation
    setTimeout(() => {
      bar.style.height = targetHeight + "%";
    }, 50 + idx * 40);
  });
}

function renderCitiesList(cities) {
  const container = document.getElementById("city-list");
  container.innerHTML = "";

  if (!cities || cities.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:var(--text-secondary);font-size:13px;padding:10px;">No cities available</div>`;
    return;
  }

  cities.forEach((city, idx) => {
    const div = document.createElement("div");
    div.className = "city-card";
    div.style.animation = `fadeIn 0.4s ease ${idx * 30}ms both`;
    div.innerHTML = `
      <div class="city-info">
        <div class="country">${city.country || ""}</div>
        <div class="name">${city.name || "Unknown"}</div>
        <div class="condition">${city.condition || ""}</div>
      </div>
      <div class="city-weather">
        <div>${getWeatherSVG(city.icon, 24)}</div>
        <div class="city-temp">${city.temp ?? "--"}°</div>
      </div>
    `;
    container.appendChild(div);
  });
}

function initMap() {
  map = L.map('map', { center: [20, 0], zoom: 2, zoomControl: false, attributionControl: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

function updateMapSmoothly(coord, label) {
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];
  if (coord?.lat && coord?.lon) {
    map.flyTo([coord.lat, coord.lon], 9, { duration: 1.5 });
    const m = L.marker([coord.lat, coord.lon], { icon: createCustomPin(true, label) }).addTo(map);
    mapMarkers.push(m);
  }
}

function createCustomPin(hasLabel, text) {
  const html = `
    <div style="position:relative;">
      <div class="map-pin">
        <svg width="12" height="12" viewBox="0 0 64 64"><circle cx="32" cy="32" r="20" fill="#2563eb"/></svg>
      </div>
      ${hasLabel ? `<div class="map-label">${text || ""}</div>` : ''}
    </div>
  `;
  return L.divIcon({ html, className: 'custom-pin', iconSize: [26, 26], iconAnchor: [13, 13] });
}

function getWeatherSVG(code, size = 36) {
  const map = {
    '01d': 'sunny', '01n': 'sunny',
    '02d': 'partly', '02n': 'partly',
    '03d': 'cloudy', '03n': 'cloudy',
    '04d': 'cloudy', '04n': 'cloudy',
    '09d': 'rainy', '09n': 'rainy',
    '10d': 'rainy', '10n': 'rainy',
    '11d': 'storm', '11n': 'storm',
    '13d': 'snowy', '13n': 'snowy',
    '50d': 'foggy', '50n': 'foggy'
  };
  const type = map[code] || 'sunny';
  const s = size;

  const svgs = {
    sunny: `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="14" fill="#FFC107"/><circle cx="32" cy="32" r="20" fill="none" stroke="#FFC107" stroke-width="2" opacity="0.3"/><circle cx="32" cy="32" r="22" fill="none" stroke="#FFC107" stroke-width="1.5" opacity="0.15"/></svg>`,
    partly: `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><circle cx="42" cy="22" r="10" fill="#FFC107"/><path d="M18 38 C18 32 23 28 29 28 C34 28 38 31 39 35 C42 35 46 39 46 43 C46 48 42 51 38 51 L18 51 C13 51 9 47 9 41 Z" fill="#90CAF9"/><circle cx="42" cy="22" r="12" fill="none" stroke="#FFC107" stroke-width="1.5" opacity="0.2"/></svg>`,
    cloudy: `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><path d="M18 38 C18 32 23 28 29 28 C34 28 38 31 39 35 C42 35 46 39 46 43 C46 48 42 51 38 51 L18 51 C13 51 9 47 9 41 Z" fill="#B0BEC5"/><path d="M12 42 C12 37 16 34 21 34 C24 34 27 36 28 39 C30 39 33 42 33 45 C33 49 30 51 26 51 L12 51 C9 51 6 48 6 45 Z" fill="#90A4AE" opacity="0.6"/></svg>`,
    rainy: `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><path d="M18 38 C18 32 23 28 29 28 C34 28 38 31 39 35 C42 35 46 39 46 43 C46 48 42 51 38 51 L18 51 C13 51 9 47 9 41 Z" fill="#90CAF9"/><path d="M22 56 L24 62 M30 56 L32 62 M38 56 L40 62 M46 56 L48 62" stroke="#4FC3F7" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    storm: `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><path d="M18 38 C18 32 23 28 29 28 C34 28 38 31 39 35 C42 35 46 39 46 43 C46 48 42 51 38 51 L18 51 C13 51 9 47 9 41 Z" fill="#78909C"/><path d="M30 46 L33 53 L26 53 L32 60" stroke="#FFD54F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
    snowy: `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><path d="M18 38 C18 32 23 28 29 28 C34 28 38 31 39 35 C42 35 46 39 46 43 C46 48 42 51 38 51 L18 51 C13 51 9 47 9 41 Z" fill="#E0E0E0"/><circle cx="22" cy="56" r="3.5" fill="#90CAF9"/><circle cx="32" cy="56" r="3.5" fill="#90CAF9"/><circle cx="42" cy="56" r="3.5" fill="#90CAF9"/></svg>`,
    foggy: `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><path d="M18 38 C18 32 23 28 29 28 C34 28 38 31 39 35 C42 35 46 39 46 43 C46 48 42 51 38 51 L18 51 C13 51 9 47 9 41 Z" fill="#BDBDBD"/><rect x="12" y="46" width="40" height="3.5" rx="2" fill="#BDBDBD" opacity="0.5"/><rect x="16" y="52" width="32" height="3" rx="1.5" fill="#BDBDBD" opacity="0.35"/></svg>`
  };
  return svgs[type] || svgs.sunny;
}