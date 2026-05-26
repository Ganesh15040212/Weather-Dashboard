
const cityInput = document.querySelector(".city-input");
const searchButton = document.querySelector(".search-btn");
const locationButton = document.querySelector(".location-btn");
const currentWeather = document.querySelector(".current-weather");
const weatherCardDiv = document.querySelector(".weather-cards");

const API_KEY = "be77fca2ba7832430cba514ac205adc6";  // API key for openweathermap API

// Compass direction matrix
const getWindDirection = (deg) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const val = Math.floor((deg / 22.5) + 0.5);
    return directions[val % 16];
};

// Generates modern Dribbble-style left panels and horizontal cards
const createWeatherCard = (cityName, weatherItem, index) => {
    const formattedDate = weatherItem.dt_txt.split(" ")[0];
    const tempCelsius = (weatherItem.main.temp - 273.15).toFixed(2);
    
    if (index === 0)   // HTML for the left tall current weather display
    {
        return `<div class="hero-weather-illustration mt-2">
                    <img src="https://openweathermap.org/img/wn/${weatherItem.weather[0].icon}@4x.png" alt="Weather-icon">
                </div>
                <h1 class="hero-temp-large num-font">${tempCelsius}°C</h1>
                <div class="hero-condition-desc">${weatherItem.weather[0].description}</div>
                
                <div class="hero-divider"></div>
                
                <div class="hero-metadata-list w-100">
                    <div class="hero-metadata-item" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Active Forecast Date">
                        <i class="fa-regular fa-calendar-days fs-5"></i>
                        <span>Today, ${formattedDate}</span>
                    </div>
                    <div class="hero-metadata-item" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Current Location">
                        <i class="fa-solid fa-location-dot fs-5"></i>
                        <span>${cityName}</span>
                    </div>
                </div>`;
    }
    else    // HTML for the horizontal forecast strip list item
    {
        return `<li class="glass-card">
                    <h3>(${formattedDate})</h3>
                    <img src="https://openweathermap.org/img/wn/${weatherItem.weather[0].icon}@2x.png" alt="Weather-icon">
                    <div class="desc-text">${weatherItem.weather[0].description}</div>
                    <div class="forecast-metric temp">
                        <small class="text-muted"><i class="fa-solid fa-temperature-half me-1"></i> Temp</small>
                        <span>${tempCelsius} °C</span>
                    </div>
                    <div class="forecast-metric wind">
                        <small class="text-muted"><i class="fa-solid fa-wind me-1"></i> Wind</small>
                        <span>${weatherItem.wind.speed} M/S</span>
                    </div>
                    <div class="forecast-metric humidity">
                        <small class="text-muted"><i class="fa-solid fa-droplet me-1"></i> Hum</small>
                        <span>${weatherItem.main.humidity} %</span>
                    </div>
                </li>`;
    }
}

// Injects high-tech details into the 4 Today's Highlights widgets
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

// Fetches 5-day weather forecasts and builds the DOM cards
const getWeatherDetails = (cityName, lat, lon) => {
    const WEATHER_API_URL = `https://api.openweathermap.org/data/2.5/forecast/?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

    fetch(WEATHER_API_URL)
        .then(res => res.json())
        .then(data => {
            const uniqueForecastDays = [];
            const fiveDaysForecast = data.list.filter(forecast => {
                const forecastDate = new Date(forecast.dt_txt).getDate();
                if (!uniqueForecastDays.includes(forecastDate)) {
                    return uniqueForecastDays.push(forecastDate);
                }
            });

            // Clearing previous weather data
            cityInput.value = "";
            weatherCardDiv.innerHTML = "";
            currentWeather.innerHTML = "";

            // Creating weather cards and adding them to the DOM
            fiveDaysForecast.forEach((weatherItem, index) => {
                const cardHTML = createWeatherCard(cityName, weatherItem, index);
                if (index === 0) {
                    currentWeather.innerHTML = cardHTML; // Injects current weather hero details
                    injectTodayHighlights(weatherItem);  // Injects wind, hum, vis, and press values
                } else {
                    weatherCardDiv.insertAdjacentHTML("beforeend", cardHTML); // Injects horizontal strip
                }
            });

            // Re-initialize tooltips for newly dynamically generated elements
            const dynamicTooltips = [].slice.call(
                document.querySelectorAll('.current-weather [data-bs-toggle="tooltip"]')
            );
            dynamicTooltips.forEach(function (tooltipElement) {
                new bootstrap.Tooltip(tooltipElement);
            });
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

// Event Listeners (Static permanent references remain intact)
locationButton.addEventListener('click', getUserCoordinates);
searchButton.addEventListener('click', () => getCityCoordinates());
cityInput.addEventListener('keypress', (e) => {
    if (e.key === "Enter") searchButton.click();
});

// Load default city (London) on startup so user sees a beautiful functional panel immediately
document.addEventListener("DOMContentLoaded", () => {
    getCityCoordinates("London");
});
