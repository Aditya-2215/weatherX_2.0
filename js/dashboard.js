// ================= CONFIGURATION =================
const CONFIG = {
  API_KEY: "4ea4f85566b4441bb4d41604251109",
  DEFAULT_CITY: "London",
  CACHE_DURATION: 10 * 60 * 1000, // 10 minutes
  AUTO_REFRESH_INTERVAL: 10 * 60 * 1000, // 10 minutes
  ANIMATION_DELAY: 100,
  MAX_HOURLY_CARDS: 24
};

// ================= STATE MANAGEMENT =================
const state = {
  currentData: null,
  forecastData: null,
  isCelsius: true,
  isWindMph: false,
  isDarkTheme: true,
  autoRefresh: false,
  notificationsEnabled: false,
  lastFetchTime: 0,
  refreshInterval: null,
  currentMapLayer: 'standard',
  chartPeriod: '5day',
  hourlyDetailedView: false
};

// ================= CHART INSTANCES =================
let charts = {
  temperature: null,
  humidity: null,
  condition: null,
  wind: null
};

// ================= MAP =================
let map = null;
let marker = null;
let mapLayers = {};

// ================= INITIALIZATION =================

window.addEventListener('load', () => {
  initializeDashboard();
});

function initializeDashboard() {
  // Check authentication
  if (!checkAuth()) {
    window.location.href = 'index.html';
    return;
  }

  // Load saved preferences
  loadPreferences();
  
  // Initialize UI
  initializeEventListeners();
  
  // Load weather data with animation
  animateLoadingProgress();
  
  function setDefaultCityByLocation() {
  if (!navigator.geolocation) {
    fallbackToDefaultCity();
    return;
  }

  showLoading("Detecting your location...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const response = await fetch(
          `https://api.weatherapi.com/v1/search.json?key=${CONFIG.API_KEY}&q=${latitude},${longitude}`
        );

        const results = await response.json();

        if (results && results.length > 0) {
          const cityName = results[0].name;
          const input = document.getElementById("cityInput");

          if (input) input.value = cityName;

          fetchWeather(cityName);
        } else {
          fallbackToDefaultCity();
        }

      } catch (err) {
        console.error("Location city fetch error:", err);
        fallbackToDefaultCity();
      }
    },
    () => {
      fallbackToDefaultCity();
    },
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0
    }
  );
}

function fallbackToDefaultCity() {
  const input = document.getElementById("cityInput");
  if (input) input.value = CONFIG.DEFAULT_CITY;
  fetchWeather(CONFIG.DEFAULT_CITY);
}

// Fetch weather using user's location
setTimeout(() => {
  setDefaultCityByLocation();
}, 800);
 
  // Initialize auto-refresh if enabled
  if (state.autoRefresh) {
    startAutoRefresh();
  }
}

function checkAuth() {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  return isLoggedIn === 'true';
}

function loadPreferences() {
  state.isCelsius = localStorage.getItem('tempUnit') !== 'fahrenheit';
  state.isWindMph = localStorage.getItem('windUnit') === 'mph';
  state.isDarkTheme = localStorage.getItem('theme') !== 'light';
  state.autoRefresh = localStorage.getItem('autoRefresh') === 'true';
  state.notificationsEnabled = localStorage.getItem('notifications') === 'true';
  
  // Apply theme
  if (!state.isDarkTheme) {
    document.body.classList.add('light-theme');
  }
  
  // Update UI checkboxes
  const autoRefreshCheckbox = document.getElementById('autoRefresh');
  const notificationsCheckbox = document.getElementById('notifications');
  const windMphCheckbox = document.getElementById('windMph');
  
  if (autoRefreshCheckbox) autoRefreshCheckbox.checked = state.autoRefresh;
  if (notificationsCheckbox) notificationsCheckbox.checked = state.notificationsEnabled;
  if (windMphCheckbox) windMphCheckbox.checked = state.isWindMph;
}

function initializeEventListeners() {
  // Search input
  const cityInput = document.getElementById("cityInput");
  if (cityInput) {
    cityInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        fetchWeatherByCity();
      }
    });
    
    cityInput.addEventListener("input", (e) => {
      const clearBtn = document.getElementById("clearBtn");
      if (clearBtn) {
        clearBtn.style.display = e.target.value ? 'flex' : 'none';
      }
    });
  }

  // Window resize handler for map
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 250);
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      cityInput?.focus();
    }
    
    // Esc to close modals
    if (e.key === 'Escape') {
      closeSettings();
    }
  });
}

// ================= LOADING ANIMATION =================

function animateLoadingProgress() {
  const progressBar = document.getElementById('loadingProgress');
  if (!progressBar) return;
  
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 90) {
      progress = 90;
      clearInterval(interval);
    }
    progressBar.style.width = progress + '%';
  }, 150);
}

function showLoading(message = 'Loading weather data...') {
  const overlay = document.getElementById("loadingOverlay");
  const text = overlay?.querySelector('.loading-text');
  const progressBar = document.getElementById('loadingProgress');
  
  if (overlay) {
    if (text) text.textContent = message;
    if (progressBar) progressBar.style.width = '0%';
    overlay.classList.add("active");
    animateLoadingProgress();
  }
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  const progressBar = document.getElementById('loadingProgress');
  
  if (overlay) {
    if (progressBar) progressBar.style.width = '100%';
    setTimeout(() => {
      overlay.classList.remove("active");
    }, 300);
  }
}

// ================= ALERTS =================

function showAlert(message, type = 'info', duration = 5000) {
  const alert = document.getElementById("alertBox");
  if (!alert) return;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  alert.innerHTML = `<span class="alert-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
  alert.className = `alert ${type}`;
  alert.classList.add("show");
  
  setTimeout(() => {
    alert.classList.remove("show");
  }, duration);
}

// ================= UTILITY FUNCTIONS =================

function updateElement(id, value, property = 'textContent') {
  const element = document.getElementById(id);
  if (element) {
    element[property] = value;
  }
}

function formatTime(dateString) {
  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return '--:--';
  }
}

function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return '--';
  }
}

// ================= SEARCH FUNCTIONS =================

function clearSearch() {
  const input = document.getElementById("cityInput");
  const clearBtn = document.getElementById("clearBtn");
  
  if (input) {
    input.value = '';
    input.focus();
  }
  if (clearBtn) {
    clearBtn.style.display = 'none';
  }
}

function fetchWeatherByCity() {
  const input = document.getElementById("cityInput");
  const city = input?.value.trim();
  
  if (!city) {
    showAlert("Please enter a city name", "warning");
    return;
  }
  
  fetchWeather(city);
}

// ================= GEOLOCATION =================

function getLocation() {
  if (!navigator.geolocation) {
    showAlert("Geolocation is not supported by your browser", "error");
    return;
  }
  
  showLoading('Getting your location...');
  navigator.geolocation.getCurrentPosition(
    fetchWeatherByCoords,
    showGeoError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

function fetchWeatherByCoords(position) {
  const { latitude, longitude } = position.coords;
  fetchWeather(`${latitude},${longitude}`);
}

function showGeoError(error) {
  hideLoading();
  const errorMessages = {
    [error.PERMISSION_DENIED]: "Location access denied. Please use city search instead.",
    [error.POSITION_UNAVAILABLE]: "Location information is unavailable.",
    [error.TIMEOUT]: "Location request timed out.",
    default: "An error occurred while getting your location."
  };
  
  showAlert(errorMessages[error.code] || errorMessages.default, "error");
}

// ================= WEATHER DATA FETCHING =================

async function fetchWeather(query) {
  // Prevent rapid requests
  const now = Date.now();
  if (now - state.lastFetchTime < 2000) {
    return;
  }
  state.lastFetchTime = now;
  
  showLoading('Fetching weather data...');
  
  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${CONFIG.API_KEY}&q=${encodeURIComponent(query)}&days=7&aqi=yes&alerts=yes`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      showAlert(data.error.message, "error");
      hideLoading();
      return;
    }
    
    state.currentData = data;
    state.forecastData = data.forecast.forecastday;
    
    // Update all UI components
    updateAllUI(data);
    
    // Show success message
    showAlert(`Weather updated for ${data.location.name}`, "success", 3000);
    
    hideLoading();
    
  } catch (err) {
    console.error("Weather fetch error:", err);
    showAlert("Error fetching weather data. Please try again.", "error");
    hideLoading();
  }
}

// ================= TEMPERATURE CONVERSION =================

function toggleUnit() {
  state.isCelsius = !state.isCelsius;
  localStorage.setItem('tempUnit', state.isCelsius ? 'celsius' : 'fahrenheit');
  
  const unitText = document.getElementById('unitText');
  if (unitText) {
    unitText.textContent = state.isCelsius ? '°F' : '°C';
  }
  
  if (state.currentData) {
    updateAllUI(state.currentData);
  }
}

function convertTemp(celsius) {
  return state.isCelsius ? celsius : (celsius * 9/5) + 32;
}

function getTempUnit() {
  return state.isCelsius ? "°C" : "°F";
}

function convertWind(kph) {
  return state.isWindMph ? kph * 0.621371 : kph;
}

function getWindUnit() {
  return state.isWindMph ? "mph" : "km/h";
}

// ================= THEME TOGGLE =================

function toggleTheme() {
  state.isDarkTheme = !state.isDarkTheme;
  localStorage.setItem('theme', state.isDarkTheme ? 'dark' : 'light');
  
  document.body.classList.toggle('light-theme');
  
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    const icon = themeBtn.querySelector('.btn-icon');
    if (icon) {
      icon.textContent = state.isDarkTheme ? '🌙' : '☀️';
    }
  }
  
  // Recreate charts with new theme
  if (state.currentData) {
    updateCharts(state.forecastData);
  }
}

// ================= UI UPDATE FUNCTIONS =================

function updateAllUI(data) {
  if (!data || !data.current || !data.location || !data.forecast) {
    showAlert("Invalid weather data received", "error");
    return;
  }
  
  updateMainCard(data);
  updateStats(data);
  updateHourlyForecast(data.forecast.forecastday);
  updateDailyForecast(data.forecast.forecastday);
  updateSunMoon(data);
  updateWeatherAlerts(data);
  updateAirQuality(data);
  updateCharts(data.forecast.forecastday);
  updateWeatherInsights(data);
  initializeMap(data.location.lat, data.location.lon, data.location.name);
  updateBackgroundWeather(data.current.condition.text);
}

function updateMainCard(data) {
  const current = data.current;
  const location = data.location;
  const forecast = data.forecast.forecastday[0];

  updateElement("cityName", location.name);
  updateElement("country", location.country);
  updateElement("timezone", location.tz_id.split('/').pop());
  updateElement("localTime", formatTime(location.localtime));
  updateElement("condition", current.condition.text);
  
  // Temperature with split display
  const tempValue = Math.round(convertTemp(current.temp_c));
  updateElement("temp", '');
  const tempEl = document.getElementById("temp");
  if (tempEl) {
    tempEl.innerHTML = `<span class="temp-value">${tempValue}</span><span class="temp-unit">${getTempUnit()}</span>`;
  }
  
  updateElement("feelsLike", `Feels like ${Math.round(convertTemp(current.feelslike_c))}${getTempUnit()}`);
  updateElement("tempMax", `${Math.round(convertTemp(forecast.day.maxtemp_c))}°`);
  updateElement("tempMin", `${Math.round(convertTemp(forecast.day.mintemp_c))}°`);
  
  // Weather icon
  const weatherIcon = document.getElementById("weatherIcon");
  if (weatherIcon && current.condition.icon) {
    weatherIcon.src = "https:" + current.condition.icon.replace('64x64', '128x128');
    weatherIcon.alt = current.condition.text;
  }
  
  // Last updated
  updateElement("updateTime", `Updated ${formatTime(current.last_updated)}`);
}

function updateStats(data) {
  const current = data.current;
  
  // Humidity
  updateElement("humidity", `${current.humidity}%`);
  const humidityBar = document.getElementById("humidityBar");
  if (humidityBar) humidityBar.style.width = `${current.humidity}%`;
  
  // Wind
  updateElement("wind", `${Math.round(convertWind(current.wind_kph))} ${getWindUnit()}`);
  updateElement("windDir", current.wind_dir);
  
  // Pressure
  updateElement("pressure", Math.round(current.pressure_mb));
  updateElement("pressureTrend", getPressureTrend(current.pressure_mb));
  
  // Visibility
  updateElement("visibility", current.vis_km);
  
  // Clouds
  updateElement("clouds", `${current.cloud}%`);
  const cloudsBar = document.getElementById("cloudsBar");
  if (cloudsBar) cloudsBar.style.width = `${current.cloud}%`;
  
  // UV
  updateElement("uv", current.uv);
  updateElement("uvRisk", getUVRisk(current.uv));
  
  // Precipitation
  updateElement("precipitation", current.precip_mm);
  const precipChance = data.forecast.forecastday[0].day.daily_chance_of_rain;
  updateElement("precipChance", `${precipChance}% chance`);
  
  // Dew point
  updateElement("dewpoint", `${Math.round(convertTemp(current.dewpoint_c))}°`);
}

function updateHourlyForecast(forecast) {
  const container = document.getElementById("hourlyForecast");
  if (!container || !forecast || forecast.length < 2) return;
  
  container.innerHTML = "";

  try {
    const hours = forecast[0].hour.concat(forecast[1].hour.slice(0, 12));

    hours.forEach((hour, index) => {
      const time = formatTime(hour.time);
      
      const card = document.createElement("div");
      card.className = "hourly-card";
      card.style.animationDelay = `${index * 0.05}s`;
      
      const detailsHTML = state.hourlyDetailedView ? `
        <p class="hour-detail"><span>💧</span> ${hour.humidity}%</p>
        <p class="hour-detail"><span>💨</span> ${Math.round(convertWind(hour.wind_kph))} ${getWindUnit()}</p>
        <p class="hour-detail"><span>🌧️</span> ${hour.chance_of_rain}%</p>
      ` : '';
      
      card.innerHTML = `
        <p class="hour-time">${time}</p>
        <img src="https:${hour.condition.icon}" alt="${hour.condition.text}" loading="lazy">
        <p class="hour-temp">${Math.round(convertTemp(hour.temp_c))}${getTempUnit()}</p>
        <p class="hour-condition">${hour.condition.text}</p>
        ${detailsHTML}
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error("Error updating hourly forecast:", e);
  }
}

function updateDailyForecast(forecast) {
  const container = document.getElementById("dailyForecast");
  if (!container || !forecast) return;
  
  container.innerHTML = "";

  forecast.forEach((day, index) => {
    const date = new Date(day.date);
    const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const card = document.createElement("div");
    card.className = "daily-card";
    card.style.animationDelay = `${index * 0.1}s`;
    
    card.innerHTML = `
      <div class="daily-header">
        <h3>${dayName}</h3>
        <p class="daily-date">${dateStr}</p>
      </div>
      <img src="https:${day.day.condition.icon}" alt="${day.day.condition.text}">
      <div class="daily-temps">
        <span class="temp-high">${Math.round(convertTemp(day.day.maxtemp_c))}°</span>
        <div class="temp-bar">
          <div class="temp-range"></div>
        </div>
        <span class="temp-low">${Math.round(convertTemp(day.day.mintemp_c))}°</span>
      </div>
      <p class="daily-condition">${day.day.condition.text}</p>
      <div class="daily-stats">
        <span title="Precipitation"><span>🌧️</span> ${day.day.daily_chance_of_rain}%</span>
        <span title="Humidity"><span>💧</span> ${day.day.avghumidity}%</span>
        <span title="Wind"><span>💨</span> ${Math.round(convertWind(day.day.maxwind_kph))} ${getWindUnit()}</span>
      </div>
    `;
    
    container.appendChild(card);
  });
}

function updateSunMoon(data) {
  const astro = data.forecast.forecastday[0].astro;
  
  updateElement("sunrise", astro.sunrise);
  updateElement("sunset", astro.sunset);
  updateElement("moonrise", astro.moonrise);
  updateElement("moonset", astro.moonset);
  updateElement("moonPhase", astro.moon_phase);
  
  // Calculate solar noon
  const sunrise = parseTime(astro.sunrise);
  const sunset = parseTime(astro.sunset);
  if (sunrise && sunset) {
    const solarNoon = new Date((sunrise.getTime() + sunset.getTime()) / 2);
    updateElement("solarNoon", formatTime(solarNoon.toISOString()));
  }
  
  // Update moon phase icon
  updateMoonPhaseIcon(astro.moon_phase);
  
  // Animate sun position
  animateSunPosition(astro.sunrise, astro.sunset, data.location.localtime);
}

function updateMoonPhaseIcon(phase) {
  const iconEl = document.getElementById('moonPhaseIcon');
  if (!iconEl) return;
  
  const phases = {
    'New Moon': '🌑',
    'Waxing Crescent': '🌒',
    'First Quarter': '🌓',
    'Waxing Gibbous': '🌔',
    'Full Moon': '🌕',
    'Waning Gibbous': '🌖',
    'Last Quarter': '🌗',
    'Waning Crescent': '🌘'
  };
  
  iconEl.textContent = phases[phase] || '🌙';
}

function animateSunPosition(sunrise, sunset, currentTime) {
  const sunMarker = document.getElementById('sunMarker');
  const sunArc = document.getElementById('sunArc');
  
  if (!sunMarker || !sunArc) return;
  
  try {
    const sunriseTime = parseTime(sunrise);
    const sunsetTime = parseTime(sunset);
    const currentDateTime = new Date(currentTime);
    
    if (!sunriseTime || !sunsetTime) return;
    
    const totalDaylight = sunsetTime - sunriseTime;
    const currentPosition = currentDateTime - sunriseTime;
    
    if (currentPosition < 0 || currentPosition > totalDaylight) {
      // Sun is down
      sunMarker.style.opacity = '0.3';
      return;
    }
    
    const percentage = (currentPosition / totalDaylight) * 100;
    const angle = (percentage / 100) * 180; // 0 to 180 degrees
    const radius = 120; // arc radius
    
    const x = radius * Math.cos((angle - 90) * Math.PI / 180);
    const y = radius * Math.sin((angle - 90) * Math.PI / 180);
    
    sunMarker.style.left = `calc(50% + ${x}px)`;
    sunMarker.style.top = `calc(50% - ${y}px)`;
    sunMarker.style.opacity = '1';
  } catch (e) {
    console.error('Error animating sun position:', e);
  }
}

function updateWeatherAlerts(data) {
  const alertsSection = document.getElementById('weatherAlerts');
  const alertsContent = document.getElementById('alertsContent');
  
  if (!alertsSection || !alertsContent) return;
  
  if (data.alerts && data.alerts.alert && data.alerts.alert.length > 0) {
    alertsSection.style.display = 'block';
    alertsContent.innerHTML = '';
    
    data.alerts.alert.forEach(alert => {
      const alertCard = document.createElement('div');
      alertCard.className = 'alert-item';
      alertCard.innerHTML = `
        <h4>${alert.headline}</h4>
        <p class="alert-severity">${alert.severity}</p>
        <p class="alert-desc">${alert.desc}</p>
        <p class="alert-time">Effective: ${formatDate(alert.effective)}</p>
      `;
      alertsContent.appendChild(alertCard);
    });
  } else {
    alertsSection.style.display = 'none';
  }
}

function updateAirQuality(data) {
  const airQualityEl = document.getElementById('airQuality');
  const aqiValueEl = document.getElementById('aqiValue');
  
  if (!airQualityEl || !aqiValueEl) return;
  
  if (data.current.air_quality) {
    const aqi = data.current.air_quality['us-epa-index'];
    const aqiLabels = ['Good', 'Moderate', 'Unhealthy for Sensitive', 'Unhealthy', 'Very Unhealthy', 'Hazardous'];
    
    airQualityEl.style.display = 'block';
    aqiValueEl.textContent = aqiLabels[aqi - 1] || 'Unknown';
    aqiValueEl.className = `aqi-value aqi-${aqi}`;
  } else {
    airQualityEl.style.display = 'none';
  }
}

// ================= CHARTS =================

function updateCharts(forecast) {
  if (!forecast || forecast.length === 0) return;
  
  try {
    const days = forecast.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    });
    
    const temps = forecast.map(d => Math.round(convertTemp(d.day.avgtemp_c)));
    const maxTemps = forecast.map(d => Math.round(convertTemp(d.day.maxtemp_c)));
    const minTemps = forecast.map(d => Math.round(convertTemp(d.day.mintemp_c)));
    const humidity = forecast.map(d => d.day.avghumidity);
    const precipitation = forecast.map(d => d.day.totalprecip_mm);
    const windSpeeds = forecast.map(d => Math.round(convertWind(d.day.maxwind_kph)));

    // Condition counts
    const conditionCounts = {};
    forecast.forEach(d => {
      const cond = d.day.condition.text;
      conditionCounts[cond] = (conditionCounts[cond] || 0) + 1;
    });

    renderTempChart(days, temps, maxTemps, minTemps);
    renderHumidityChart(days, humidity, precipitation);
    renderConditionChart(Object.keys(conditionCounts), Object.values(conditionCounts));
    renderWindChart(days, windSpeeds);
  } catch (e) {
    console.error("Error updating charts:", e);
  }
}

function renderTempChart(labels, avgTemps, maxTemps, minTemps) {
  const canvas = document.getElementById("tempChart");
  if (!canvas) return;
  
  if (charts.temperature) charts.temperature.destroy();
  
  charts.temperature = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `Max Temp (${getTempUnit()})`,
          data: maxTemps,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true
        },
        {
          label: `Avg Temp (${getTempUnit()})`,
          data: avgTemps,
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56, 189, 248, 0.2)",
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true
        },
        {
          label: `Min Temp (${getTempUnit()})`,
          data: minTemps,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true
        }
      ]
    },
    options: getChartOptions()
  });
}

function renderHumidityChart(labels, humidity, precipitation) {
  const canvas = document.getElementById("humidityChart");
  if (!canvas) return;
  
  if (charts.humidity) charts.humidity.destroy();
  
  charts.humidity = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Humidity %",
          data: humidity,
          backgroundColor: "rgba(34, 197, 94, 0.7)",
          borderColor: "#22c55e",
          borderWidth: 2,
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          label: "Precipitation (mm)",
          data: precipitation,
          backgroundColor: "rgba(56, 189, 248, 0.7)",
          borderColor: "#38bdf8",
          borderWidth: 2,
          borderRadius: 6,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      ...getChartOptions(),
      scales: {
        ...getChartOptions().scales,
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: { 
            color: state.isDarkTheme ? "#f1f5f9" : "#1e293b",
            font: { size: 11 }
          },
          grid: { 
            drawOnChartArea: false,
            color: state.isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
          }
        }
      }
    }
  });
}

function renderConditionChart(labels, data) {
  const canvas = document.getElementById("conditionChart");
  if (!canvas) return;
  
  if (charts.condition) charts.condition.destroy();
  
  charts.condition = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          "rgba(56, 189, 248, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(168, 85, 247, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(20, 184, 166, 0.8)"
        ],
        borderColor: state.isDarkTheme ? "#0f172a" : "#ffffff",
        borderWidth: 3,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          labels: { 
            color: state.isDarkTheme ? "#f1f5f9" : "#1e293b",
            font: { size: 11, family: 'Space Mono' },
            padding: 12,
            usePointStyle: true
          },
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} days (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function renderWindChart(labels, data) {
  const canvas = document.getElementById("windChart");
  if (!canvas) return;
  
  if (charts.wind) charts.wind.destroy();
  
  charts.wind = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: `Max Wind Speed (${getWindUnit()})`,
        data,
        backgroundColor: "rgba(168, 85, 247, 0.7)",
        borderColor: "#a855f7",
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: getChartOptions()
  });
}

function getChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: { 
        labels: { 
          color: state.isDarkTheme ? "#f1f5f9" : "#1e293b",
          font: { size: 12, family: 'Space Mono' },
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: state.isDarkTheme ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: state.isDarkTheme ? '#f1f5f9' : '#1e293b',
        bodyColor: state.isDarkTheme ? '#cbd5e1' : '#475569',
        borderColor: state.isDarkTheme ? 'rgba(148, 163, 184, 0.2)' : 'rgba(30, 41, 59, 0.2)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: { 
        ticks: { 
          color: state.isDarkTheme ? "#f1f5f9" : "#1e293b",
          font: { size: 11, family: 'Space Mono' }
        },
        grid: { 
          color: state.isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          drawBorder: false
        }
      },
      y: { 
        ticks: { 
          color: state.isDarkTheme ? "#f1f5f9" : "#1e293b",
          font: { size: 11, family: 'Space Mono' }
        },
        grid: { 
          color: state.isDarkTheme ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          drawBorder: false
        }
      }
    }
  };
}

// ================= MAP FUNCTIONS =================

function initializeMap(lat, lon, cityName) {
  const mapContainer = document.getElementById("map");
  if (!mapContainer) return;
  
  try {
    if (!map) {
      map = L.map('map', {
        zoomControl: true,
        attributionControl: true
      }).setView([lat, lon], 10);
      
      // Initialize layers
      mapLayers.standard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      });
      
      mapLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18
      });
      
      mapLayers.terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap contributors',
        maxZoom: 17
      });
      
      mapLayers.standard.addTo(map);
    } else {
      map.setView([lat, lon], 10);
    }

    if (marker) {
      marker.setLatLng([lat, lon]);
      marker.setPopupContent(`<b>${cityName}</b><br>Lat: ${lat.toFixed(4)}<br>Lon: ${lon.toFixed(4)}`);
    } else {
      marker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`<b>${cityName}</b><br>Lat: ${lat.toFixed(4)}<br>Lon: ${lon.toFixed(4)}`)
        .openPopup();
    }
    
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 100);
  } catch (e) {
    console.error("Map initialization error:", e);
  }
}

function changeMapLayer(layerType) {
  if (!map || !mapLayers[layerType]) return;
  
  // Remove all layers
  Object.values(mapLayers).forEach(layer => {
    if (map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  });
  
  // Add selected layer
  mapLayers[layerType].addTo(map);
  state.currentMapLayer = layerType;
  
  // Update button states
  document.querySelectorAll('.map-layer-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.layer === layerType) {
      btn.classList.add('active');
    }
  });
}

// ================= WEATHER INSIGHTS =================

function updateWeatherInsights(data) {
  const container = document.getElementById('insightsGrid');
  if (!container) return;
  
  container.innerHTML = '';
  
  const insights = generateInsights(data);
  
  insights.forEach((insight, index) => {
    const card = document.createElement('div');
    card.className = 'insight-card';
    card.style.animationDelay = `${index * 0.1}s`;
    card.innerHTML = `
      <div class="insight-icon">${insight.icon}</div>
      <h3>${insight.title}</h3>
      <p>${insight.description}</p>
    `;
    container.appendChild(card);
  });
}

function generateInsights(data) {
  const insights = [];
  const current = data.current;
  const forecast = data.forecast.forecastday;
  
  // Temperature trend
  const temps = forecast.map(d => d.day.avgtemp_c);
  const tempTrend = temps[temps.length - 1] - temps[0];
  if (Math.abs(tempTrend) > 5) {
    insights.push({
      icon: tempTrend > 0 ? '🔥' : '❄️',
      title: tempTrend > 0 ? 'Warming Trend' : 'Cooling Trend',
      description: `Temperature will ${tempTrend > 0 ? 'rise' : 'drop'} by ${Math.abs(Math.round(convertTemp(tempTrend)))}${getTempUnit()} over the next ${forecast.length} days.`
    });
  }
  
  // Rain forecast
  const rainDays = forecast.filter(d => d.day.daily_chance_of_rain > 50).length;
  if (rainDays > 0) {
    insights.push({
      icon: '🌧️',
      title: 'Rain Expected',
      description: `Expect rain on ${rainDays} of the next ${forecast.length} days. Don't forget your umbrella!`
    });
  }
  
  // UV warning
  if (current.uv >= 6) {
    insights.push({
      icon: '☀️',
      title: 'High UV Index',
      description: `UV index is ${current.uv}. Wear sunscreen and protective clothing when outdoors.`
    });
  }
  
  // Wind advisory
  const maxWind = Math.max(...forecast.map(d => d.day.maxwind_kph));
  if (maxWind > 40) {
    insights.push({
      icon: '💨',
      title: 'Windy Conditions',
      description: `Wind speeds may reach ${Math.round(convertWind(maxWind))} ${getWindUnit()}. Secure loose outdoor items.`
    });
  }
  
  // Humidity comfort
  if (current.humidity > 70) {
    insights.push({
      icon: '💧',
      title: 'High Humidity',
      description: `Humidity is ${current.humidity}%. It may feel more uncomfortable than the actual temperature suggests.`
    });
  } else if (current.humidity < 30) {
    insights.push({
      icon: '🏜️',
      title: 'Low Humidity',
      description: `Humidity is ${current.humidity}%. Stay hydrated and consider using a humidifier.`
    });
  }
  
  // Visibility
  if (current.vis_km < 5) {
    insights.push({
      icon: '🌫️',
      title: 'Reduced Visibility',
      description: `Visibility is only ${current.vis_km} km. Drive carefully and use headlights.`
    });
  }
  
  // Perfect day
  if (current.temp_c >= 18 && current.temp_c <= 25 && current.cloud < 40 && current.precip_mm === 0) {
    insights.push({
      icon: '🌟',
      title: 'Perfect Weather',
      description: 'Conditions are ideal for outdoor activities. Enjoy the beautiful day!'
    });
  }
  
  // Default insight if none generated
  if (insights.length === 0) {
    insights.push({
      icon: '✅',
      title: 'Stable Conditions',
      description: 'Weather conditions are stable with no significant changes expected.'
    });
  }
  
  return insights;
}

// ================= HELPER FUNCTIONS =================

function getPressureTrend(pressure) {
  if (pressure > 1020) return 'High';
  if (pressure < 1000) return 'Low';
  return 'Normal';
}

function getUVRisk(uv) {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

function parseTime(timeString) {
  try {
    const today = new Date();
    const [time, period] = timeString.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    today.setHours(hours, minutes, 0, 0);
    return today;
  } catch (e) {
    return null;
  }
}

// ================= BACKGROUND EFFECTS =================

function updateBackgroundWeather(condition) {
  const body = document.body;
  const conditionLower = condition.toLowerCase();
  
  body.removeAttribute('data-weather');
  
  if (conditionLower.includes('clear') || conditionLower.includes('sunny')) {
    body.setAttribute('data-weather', 'clear');
  } else if (conditionLower.includes('cloud')) {
    body.setAttribute('data-weather', 'clouds');
  } else if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
    body.setAttribute('data-weather', 'rain');
  } else if (conditionLower.includes('snow')) {
    body.setAttribute('data-weather', 'snow');
  } else if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
    body.setAttribute('data-weather', 'thunderstorm');
  } else if (conditionLower.includes('mist') || conditionLower.includes('fog')) {
    body.setAttribute('data-weather', 'mist');
  }
}

// ================= SETTINGS & PREFERENCES =================

function showSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function toggleAutoRefresh() {
  state.autoRefresh = !state.autoRefresh;
  localStorage.setItem('autoRefresh', state.autoRefresh);
  
  if (state.autoRefresh) {
    startAutoRefresh();
    showAlert('Auto-refresh enabled', 'success', 2000);
  } else {
    stopAutoRefresh();
    showAlert('Auto-refresh disabled', 'info', 2000);
  }
}

function toggleNotifications() {
  state.notificationsEnabled = !state.notificationsEnabled;
  localStorage.setItem('notifications', state.notificationsEnabled);
  
  if (state.notificationsEnabled && 'Notification' in window) {
    Notification.requestPermission();
  }
}

function toggleWindUnit() {
  state.isWindMph = !state.isWindMph;
  localStorage.setItem('windUnit', state.isWindMph ? 'mph' : 'kph');
  
  if (state.currentData) {
    updateAllUI(state.currentData);
  }
}

function updateRefreshInterval() {
  const select = document.getElementById('refreshInterval');
  if (select) {
    CONFIG.AUTO_REFRESH_INTERVAL = parseInt(select.value) * 60 * 1000;
    
    if (state.autoRefresh) {
      stopAutoRefresh();
      startAutoRefresh();
    }
  }
}

function startAutoRefresh() {
  if (state.refreshInterval) {
    clearInterval(state.refreshInterval);
  }
  
  state.refreshInterval = setInterval(() => {
    if (state.currentData) {
      const cityInput = document.getElementById('cityInput');
      const city = cityInput?.value || CONFIG.DEFAULT_CITY;
      fetchWeather(city);
    }
  }, CONFIG.AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
  if (state.refreshInterval) {
    clearInterval(state.refreshInterval);
    state.refreshInterval = null;
  }
}

// ================= VIEW TOGGLES =================

function toggleHourlyView() {
  state.hourlyDetailedView = !state.hourlyDetailedView;
  const btn = document.getElementById('hourlyViewBtn');
  
  if (btn) {
    btn.querySelector('span').textContent = state.hourlyDetailedView ? 'Simple View' : 'Detailed View';
  }
  
  if (state.currentData) {
    updateHourlyForecast(state.forecastData);
  }
}

function changeChartPeriod(period) {
  state.chartPeriod = period;
  
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.period === period) {
      btn.classList.add('active');
    }
  });
  
  // Update chart subtitle
  const subtitle = document.getElementById('tempChartSubtitle');
  if (subtitle) {
    subtitle.textContent = period === '5day' ? '5-Day Average' : '24-Hour Forecast';
  }
  
  // TODO: Implement hourly chart rendering
  if (state.currentData && period === 'hourly') {
    showAlert('Hourly charts coming soon!', 'info', 2000);
  }
}

// ================= NAVIGATION & INFO =================

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    window.location.href = "index.html";
  }
}

function showAbout() {
  showAlert('WeatherX v2.0 - Advanced Weather Intelligence Dashboard', 'info', 4000);
}

function showPrivacy() {
  showAlert('Privacy: Your data is stored locally and never shared.', 'info', 4000);
}

function showTerms() {
  showAlert('Terms: This is a demo application for educational purposes.', 'info', 4000);
}

// ================= ERROR HANDLING =================

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

// ================= CONSOLE LOG =================

console.log('%c🌤️ WeatherX Dashboard Initialized', 'color: #38bdf8; font-size: 16px; font-weight: bold');
console.log('%cVersion: 2.0 | Theme: ' + (state.isDarkTheme ? 'Dark' : 'Light'), 'color: #22c55e');