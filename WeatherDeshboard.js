
const cityInput = document.querySelector(".city-input");
const searchButton = document.querySelector(".search-btn");
const locationButton = document.querySelector(".location-btn");
const currentWeather = document.querySelector(".current-weather");
const weatherCardDiv = document.querySelector(".weather-cards");

// Upgraded Interactive UI Selectors
const unitToggleBtn = document.getElementById("unitToggleBtn");
const favoriteCityBtn = document.getElementById("favoriteCityBtn");
const favoriteCitiesContainer = document.querySelector(".favorite-cities-container");
const hourlyPanelTitle = document.getElementById("hourlyPanelTitle");
const hourlyForecastList = document.querySelector(".hourly-forecast-list");

const API_KEY = "be77fca2ba7832430cba514ac205adc6";  // API key for openweathermap API

// Global Application States
window.currentUnit = localStorage.getItem("weather_unit") || "C"; // C or F
window.favoriteCities = JSON.parse(localStorage.getItem("fav_cities")) || ["London", "Tokyo", "New York"];
window.forecastDataList = []; // Caches current search's full 40 forecast intervals
window.activeCityName = "London"; // Tracks currently selected city name
window.selectedDateStr = ""; // Tracks currently active forecast day selected
window.chartInstance = null; // Chart.js instance variable

// Helper: Wind direction compass
const getWindDirection = (deg) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const val = Math.floor((deg / 22.5) + 0.5);
    return directions[val % 16];
};

// Helper: Converts Kelvin temperature to correct Unit string
const formatTemp = (tempKelvin) => {
    const celsius = tempKelvin - 273.15;
    if (window.currentUnit === 'C') {
        return `${celsius.toFixed(1)} °C`;
    } else {
        const fahrenheit = (celsius * 9 / 5) + 32;
        return `${fahrenheit.toFixed(1)} °F`;
    }
};

// ========================================================
// TEMPERATURE UNIT SWITCHER LOGIC
// ========================================================
const initUnitSwitcher = () => {
    // Sync toggle button visual state on startup
    if (window.currentUnit === "F") {
        unitToggleBtn.classList.remove("active-c");
        unitToggleBtn.classList.add("active-f");
    } else {
        unitToggleBtn.classList.remove("active-f");
        unitToggleBtn.classList.add("active-c");
    }

    unitToggleBtn.addEventListener("click", () => {
        if (window.currentUnit === "C") {
            window.currentUnit = "F";
            unitToggleBtn.classList.remove("active-c");
            unitToggleBtn.classList.add("active-f");
        } else {
            window.currentUnit = "C";
            unitToggleBtn.classList.remove("active-f");
            unitToggleBtn.classList.add("active-c");
        }
        localStorage.setItem("weather_unit", window.currentUnit);
        
        // Rerender the active views using local cache data (no additional API calls needed)
        rerenderWeatherUI();
    });
};

// ========================================================
// FAVORITE CITIES MANAGER (LocalStorage)
// ========================================================
const renderFavoriteChips = () => {
    favoriteCitiesContainer.innerHTML = "";
    window.favoriteCities.forEach(city => {
        const chip = document.createElement("div");
        chip.className = "city-chip";
        chip.innerHTML = `<span>${city}</span><button type="button" class="city-chip-remove" data-city="${city}">&times;</button>`;
        
        // Load city details when chip is clicked
        chip.addEventListener("click", (e) => {
            if (!e.target.classList.contains("city-chip-remove")) {
                getCityCoordinates(city);
            }
        });
        
        // Remove city from favorites when close icon is clicked
        chip.querySelector(".city-chip-remove").addEventListener("click", (e) => {
            e.stopPropagation();
            const cityToRemove = e.target.getAttribute("data-city");
            window.favoriteCities = window.favoriteCities.filter(c => c !== cityToRemove);
            localStorage.setItem("fav_cities", JSON.stringify(window.favoriteCities));
            renderFavoriteChips();
            updateStarBtnState();
        });
        
        favoriteCitiesContainer.appendChild(chip);
    });
};

const updateStarBtnState = () => {
    const isFav = window.favoriteCities.some(c => c.toLowerCase() === window.activeCityName.toLowerCase());
    if (isFav) {
        favoriteCityBtn.classList.add("active");
        favoriteCityBtn.querySelector("i").className = "fa-solid fa-star";
    } else {
        favoriteCityBtn.classList.remove("active");
        favoriteCityBtn.querySelector("i").className = "fa-regular fa-star";
    }
};

const initFavoriteBtn = () => {
    favoriteCityBtn.addEventListener("click", () => {
        const isFav = window.favoriteCities.some(c => c.toLowerCase() === window.activeCityName.toLowerCase());
        if (isFav) {
            // Remove from favorites
            window.favoriteCities = window.favoriteCities.filter(c => c.toLowerCase() !== window.activeCityName.toLowerCase());
        } else {
            // Add to favorites
            window.favoriteCities.push(window.activeCityName);
        }
        localStorage.setItem("fav_cities", JSON.stringify(window.favoriteCities));
        renderFavoriteChips();
        updateStarBtnState();
    });
};

// ========================================================
// DYNAMIC COMPONENT CARD GENERATOR (HTML templates)
// ========================================================
const createWeatherCardHTML = (weatherItem, index) => {
    const formattedDate = weatherItem.dt_txt.split(" ")[0];
    
    if (index === 0)   // HTML for Today Left Hero Widget
    {
        return `<div class="hero-weather-illustration mt-2">
                    <img src="https://openweathermap.org/img/wn/${weatherItem.weather[0].icon}@4x.png" alt="Weather-icon">
                </div>
                <h1 class="hero-temp-large num-font">${formatTemp(weatherItem.main.temp)}</h1>
                <div class="hero-condition-desc">${weatherItem.weather[0].description}</div>
                
                <div class="hero-divider"></div>
                
                <div class="hero-metadata-list w-100">
                    <div class="hero-metadata-item" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Active Forecast Date">
                        <i class="fa-regular fa-calendar-days fs-5"></i>
                        <span>Today, ${formattedDate}</span>
                    </div>
                    <div class="hero-metadata-item" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Current Location">
                        <i class="fa-solid fa-location-dot fs-5"></i>
                        <span>${window.activeCityName}</span>
                    </div>
                </div>`;
    }
    else    // HTML for the horizontal forecast strip list item
    {
        const isActive = formattedDate === window.selectedDateStr ? "active" : "";
        return `<li class="glass-card ${isActive}" data-date="${formattedDate}">
                    <h3>(${formattedDate})</h3>
                    <img src="https://openweathermap.org/img/wn/${weatherItem.weather[0].icon}@2x.png" alt="Weather-icon">
                    <div class="desc-text">${weatherItem.weather[0].description}</div>
                    <div class="forecast-metric temp">
                        <small class="text-muted"><i class="fa-solid fa-temperature-half me-1"></i> Temp</small>
                        <span>${formatTemp(weatherItem.main.temp)}</span>
                    </div>
                </li>`;
    }
}

// ========================================================
// TODAY'S HIGHLIGHTS INTERACTIVE WIDGET INJECTIONS
// ========================================================
const injectTodayHighlights = (todayItem) => {
    // 1. Wind Status Card
    const windSpeed = todayItem.wind.speed || 0;
    const windDeg = todayItem.wind.deg || 0;
    
    const windValueEl = document.querySelector(".wind-card .widget-card-value");
    const compassArrowEl = document.querySelector(".wind-card .mini-compass-arrow");
    const compassDirectionEl = document.querySelector(".wind-card .compass-direction-text");
    
    if (windValueEl) windValueEl.innerHTML = `${windSpeed} <span class="fs-5 text-secondary">M/S</span>`;
    if (compassArrowEl) compassArrowEl.style.transform = `rotate(${windDeg}deg)`;
    if (compassDirectionEl) compassDirectionEl.innerHTML = `Direction: ${windDeg}° (${getWindDirection(windDeg)})`;

    // 2. Humidity Level Card
    const humidity = todayItem.main.humidity || 0;
    
    const humidityValueEl = document.querySelector(".humidity-card .widget-card-value");
    const humidityFillEl = document.querySelector(".humidity-card .level-meter-fill");
    const humidityBadgeEl = document.querySelector(".humidity-card .level-meter-badge");
    
    let humidityStatus = "Comfortable";
    if (humidity < 30) humidityStatus = "Dry";
    else if (humidity > 60) humidityStatus = "Humid";
    
    if (humidityValueEl) humidityValueEl.innerHTML = `${humidity} <span class="fs-5 text-secondary">%</span>`;
    if (humidityFillEl) humidityFillEl.style.width = `${humidity}%`;
    if (humidityBadgeEl) {
        humidityBadgeEl.innerHTML = humidityStatus;
        if (humidityStatus === "Comfortable") {
            humidityBadgeEl.style.color = "#38ef7d";
            humidityBadgeEl.style.background = "rgba(56, 239, 125, 0.12)";
        } else if (humidityStatus === "Dry") {
            humidityBadgeEl.style.color = "#ff7e5f";
            humidityBadgeEl.style.background = "rgba(255, 126, 95, 0.12)";
        } else {
            humidityBadgeEl.style.color = "#00f2fe";
            humidityBadgeEl.style.background = "rgba(0, 242, 254, 0.12)";
        }
    }

    // 3. Visibility Gauge Card
    const visibilityMeters = todayItem.visibility || 10000;
    const visibilityKM = (visibilityMeters / 1000).toFixed(1);
    const visPercent = Math.min((visibilityMeters / 10000) * 100, 100);
    
    const visibilityValueEl = document.querySelector(".visibility-card .widget-card-value");
    const visibilityFillEl = document.querySelector(".visibility-card .visibility-gauge-fill");
    const visibilityStatusEl = document.querySelector(".visibility-card .visibility-gauge-status span:last-child");
    
    let visStatus = "Clear View";
    if (visibilityKM < 3) visStatus = "Foggy";
    else if (visibilityKM < 8) visStatus = "Hazy";
    
    if (visibilityValueEl) visibilityValueEl.innerHTML = `${visibilityKM} <span class="fs-5 text-secondary">KM</span>`;
    if (visibilityFillEl) visibilityFillEl.style.width = `${visPercent}%`;
    if (visibilityStatusEl) visibilityStatusEl.innerHTML = visStatus;

    // 4. Barometric Pressure Card
    const pressure = todayItem.main.pressure || 1013;
    const pressPercent = Math.max(0, Math.min(100, ((pressure - 950) / 100) * 100));
    
    const pressureValueEl = document.querySelector(".pressure-card .widget-card-value");
    const pressurePointerEl = document.querySelector(".pressure-card .barometer-pointer");
    
    if (pressureValueEl) pressureValueEl.innerHTML = `${pressure} <span class="fs-5 text-secondary">hPa</span>`;
    if (pressurePointerEl) pressurePointerEl.style.left = `${pressPercent}%`;
}

// ========================================================
// AIR POLLUTION INDEX (AQI) INTEGRATION
// ========================================================
const fetchAirQualityDetails = (lat, lon) => {
    const POLLUTION_API_URL = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    
    fetch(POLLUTION_API_URL)
        .then(res => res.json())
        .then(data => {
            if (!data.list || !data.list.length) return;
            const airItem = data.list[0];
            const aqiValue = airItem.main.aqi; // 1 to 5 scale
            const pm25 = airItem.components.pm2_5;
            
            const aqiValueEl = document.getElementById("aqiValue");
            const aqiProgressEl = document.getElementById("aqiProgress");
            const aqiStatusEl = document.getElementById("aqiStatus");
            const pm25ValueEl = document.getElementById("pm25Value");
            
            // Map Index values (1 to 5) to descriptive Dribbble highlights
            const aqiLabels = {
                1: { text: "Good", color: "#38ef7d", pct: 20 },
                2: { text: "Fair", color: "#a855f7", pct: 40 },
                3: { text: "Moderate", color: "#fbbf24", pct: 60 },
                4: { text: "Poor", color: "#ff7e5f", pct: 80 },
                5: { text: "Very Poor", color: "#f43f5e", pct: 100 }
            };
            
            const config = aqiLabels[aqiValue] || { text: "Unknown", color: "#64748b", pct: 0 };
            
            if (aqiValueEl) aqiValueEl.innerHTML = `${aqiValue} <span class="fs-5 text-secondary">/ 5</span>`;
            if (pm25ValueEl) pm25ValueEl.innerHTML = `PM2.5: ${pm25.toFixed(1)} μg/m³`;
            if (aqiStatusEl) aqiStatusEl.innerHTML = `Index: ${config.text}`;
            if (aqiProgressEl) {
                aqiProgressEl.style.width = `${config.pct}%`;
                aqiProgressEl.style.backgroundColor = config.color;
                aqiProgressEl.style.boxShadow = `0 0 10px ${config.color}50`;
            }
        })
        .catch(() => {
            console.log("An error occurred while fetching the Air Pollution Index!");
        });
};

// ========================================================
// HOURLY WEATHER LINE GRAPH BUILDER (Chart.js)
// ========================================================
const renderHourlyChart = (hours, temps) => {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    
    // Destroy previous Chart instance to clear DOM footprints
    if (window.chartInstance) {
        window.chartInstance.destroy();
    }
    
    // Draw neon blue/violet gradient fills
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(0, 242, 254, 0.22)');
    gradient.addColorStop(1, 'rgba(0, 242, 254, 0)');
    
    window.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [{
                label: 'Temperature',
                data: temps,
                borderColor: '#00f2fe',
                borderWidth: 3,
                pointBackgroundColor: '#07090e',
                pointBorderColor: '#00f2fe',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                backgroundColor: gradient,
                tension: 0.4 // Gives the graph curve a smooth layout
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0b0e14',
                    titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
                    bodyFont: { family: 'Space Grotesk', size: 13 },
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.parsed.y} °${window.currentUnit}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Plus Jakarta Sans', size: 11 }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Space Grotesk', size: 11 },
                        callback: function(value) {
                            return value + '°';
                        }
                    }
                }
            }
        }
    });
};

// ========================================================
// CLICK TRIGGER: UPDATE DETAILED HOURLY FORECAST
// ========================================================
const updateHourlyForecast = (dateStr) => {
    window.selectedDateStr = dateStr;
    
    // Update Panel Title
    const todayStr = window.forecastDataList[0].dt_txt.split(" ")[0];
    if (dateStr === todayStr) {
        hourlyPanelTitle.innerHTML = `Hourly Forecast - Today`;
    } else {
        hourlyPanelTitle.innerHTML = `Hourly Forecast - ${dateStr}`;
    }
    
    // Filter out weather items matching selected date
    const dayIntervals = window.forecastDataList.filter(item => {
        return item.dt_txt.split(" ")[0] === dateStr;
    });
    
    // Render dynamic horizontal hour chips
    hourlyForecastList.innerHTML = "";
    const hours = [];
    const temps = [];
    
    dayIntervals.forEach(item => {
        const timeVal = item.dt_txt.split(" ")[1].substring(0, 5); // e.g. "12:00"
        hours.push(timeVal);
        
        // Calculate temp value based on Unit
        const celsius = item.main.temp - 273.15;
        const tempValue = window.currentUnit === 'C' ? parseFloat(celsius.toFixed(1)) : parseFloat(((celsius * 9/5) + 32).toFixed(1));
        temps.push(tempValue);
        
        const li = document.createElement("li");
        li.className = "hourly-card";
        li.innerHTML = `
            <div class="hour-time">${timeVal}</div>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" alt="Weather-icon">
            <div class="hour-temp">${formatTemp(item.main.temp)}</div>
        `;
        hourlyForecastList.appendChild(li);
    });
    
    // Redraw the temperature trend Chart
    renderHourlyChart(hours, temps);
    
    // Update active day class in horizontal 5-day strip
    const forecastCards = document.querySelectorAll(".forecast-strip li");
    forecastCards.forEach(card => {
        if (card.getAttribute("data-date") === dateStr) {
            card.classList.add("active");
        } else {
            card.classList.remove("active");
        }
    });
};

// Rerenders entire page using cached values (saves network calls on switcher change)
const rerenderWeatherUI = () => {
    if (!window.forecastDataList || !window.forecastDataList.length) return;
    
    // 1. Rerender Today Left Panel
    const todayItem = window.forecastDataList[0];
    currentWeather.innerHTML = createWeatherCardHTML(todayItem, 0);
    
    // 2. Rerender 5-Day forecast cards
    const uniqueForecastDays = [];
    const fiveDaysForecast = window.forecastDataList.filter(forecast => {
        const forecastDate = new Date(forecast.dt_txt).getDate();
        if (!uniqueForecastDays.includes(forecastDate)) {
            return uniqueForecastDays.push(forecastDate);
        }
    });
    
    weatherCardDiv.innerHTML = "";
    fiveDaysForecast.forEach((weatherItem, index) => {
        const cardHTML = createWeatherCardHTML(weatherItem, index);
        if (index > 0) {
            weatherCardDiv.insertAdjacentHTML("beforeend", cardHTML);
        }
    });
    
    // Rebind Click events on new forecast cards
    const forecastCards = document.querySelectorAll(".forecast-strip li");
    forecastCards.forEach(card => {
        const cardDate = card.getAttribute("data-date");
        card.addEventListener("click", () => {
            updateHourlyForecast(cardDate);
        });
    });
    
    // 3. Rerender Hourly forecast panel
    updateHourlyForecast(window.selectedDateStr);
    
    // 4. Update highlights widgets
    injectTodayHighlights(todayItem);
};

// ========================================================
// RETRIEVE WEATHER METADATA FROM OPENWEATHERMAP API
// ========================================================
const getWeatherDetails = (cityName, lat, lon) => {
    const WEATHER_API_URL = `https://api.openweathermap.org/data/2.5/forecast/?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

    fetch(WEATHER_API_URL)
        .then(res => res.json())
        .then(data => {
            window.activeCityName = cityName;
            window.forecastDataList = data.list; // Cache API lists
            window.selectedDateStr = data.list[0].dt_txt.split(" ")[0]; // Default selected is today
            
            // Render UI
            rerenderWeatherUI();
            
            // Sync Bookmark star button states
            updateStarBtnState();
            
            // Concurrently fetch air pollution parameters
            fetchAirQualityDetails(lat, lon);
        })
        .catch(() => {
            alert("An error occurred while fetching the weather forecast!");
        });
}

// Queries openweathermap API for coordinates based on city name
const getCityCoordinates = (cityNameInput = null) => {
    const cityName = (cityNameInput || cityInput.value).trim();
    if (!cityName) return;

    const GEOCODING_API_URL = `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_KEY}`;

    fetch(GEOCODING_API_URL)
        .then(res => res.json())
        .then(data => {
            if (!data.length) return alert(`No coordinates found for "${cityName}"`);
            const { name, lat, lon } = data[0];
            getWeatherDetails(name, lat, lon);
        })
        .catch(() => {
            alert("An error occurred while fetching the coordinates!");
        });
}

// Leverages HTML5 geolocation API for current location coordinates
const getUserCoordinates = () => {
    navigator.geolocation.getCurrentPosition(
        position => {
            const { latitude, longitude } = position.coords;
            const REVERSE_GEOCODING_URL = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`;

            // get city name from coordinates using reverse geocoding API
            fetch(REVERSE_GEOCODING_URL)
                .then(res => res.json())
                .then(data => {
                    const { name } = data[0];
                    getWeatherDetails(name, latitude, longitude);
                })
                .catch(() => {
                    alert("An error occurred while fetching the city details!");
                });
        },
        error => {
            if (error.code === error.PERMISSION_DENIED) {
                alert("Geolocation request denied. Please reset location permissions to grant access again.");
            }
        }
    );
}

// ========================================================
// CORE INITIALIZATIONS & EVENT REGISTER
// ========================================================
locationButton.addEventListener('click', getUserCoordinates);
searchButton.addEventListener('click', () => getCityCoordinates());
cityInput.addEventListener('keypress', (e) => {
    if (e.key === "Enter") searchButton.click();
});

// Click Left Hero panel redirects hourly chart back to Today
currentWeather.addEventListener("click", () => {
    if (window.forecastDataList && window.forecastDataList.length) {
        const todayStr = window.forecastDataList[0].dt_txt.split(" ")[0];
        updateHourlyForecast(todayStr);
    }
});

// Startup Bootstraps
document.addEventListener("DOMContentLoaded", () => {
    initUnitSwitcher();
    initFavoriteBtn();
    renderFavoriteChips();
    getCityCoordinates(window.activeCityName);
});
