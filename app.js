const els = {
    themeBtn: document.getElementById('theme-toggle'),
    html: document.documentElement,
    searchInput: document.getElementById('city-input'),
    searchBtn: document.getElementById('search-btn'),
    dashboard: document.getElementById('weather-dashboard'),
    loading: document.getElementById('loading-spinner'),
    error: document.getElementById('error-message'),
    errorText: document.getElementById('error-text'),
    feedbackContainer: document.getElementById('feedback-container'),
    recentContainer: document.getElementById('recent-searches-container'),
    recentSearches: document.getElementById('recent-searches'),
    data: {
        cityName: document.getElementById('city-name'),
        temp: document.getElementById('temperature'),
        desc: document.getElementById('weather-desc'),
        humidity: document.getElementById('humidity'),
        wind: document.getElementById('wind-speed'),
        iconContainer: document.getElementById('weather-icon-container'),
    }
};

const STORAGE_KEY = 'skycast_recent_cities';
let recentCities = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

const THEME_KEY = 'skycast_theme';
let currentTheme = localStorage.getItem(THEME_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const initTheme = () => {
    if (currentTheme === 'dark') {
        els.html.classList.add('dark');
    }

    els.themeBtn.addEventListener('click', () => {
        els.html.classList.toggle('dark');
        const theme = els.html.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem(THEME_KEY, theme);
    });
};

const getWeatherIcon = (code) => {
    // WMO Weather interpretation codes (WW) mappings
    // 0: Clear sky
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    // 45, 48: Fog
    // 51, 53, 55, 56, 57: Drizzle
    // 61, 63, 65, 66, 67: Rain
    // 71, 73, 75, 77: Snow fall
    // 80, 81, 82: Rain showers
    // 85, 86: Snow showers
    // 95, 96, 99: Thunderstorm

    if (code === 0) return { icon: 'fa-sun', color: 'text-yellow-400', desc: 'Clear Sky' };
    if (code >= 1 && code <= 3) return { icon: 'fa-cloud-sun', color: 'text-blue-400', desc: code === 3 ? 'Overcast' : 'Partly Cloudy' };
    if (code === 45 || code === 48) return { icon: 'fa-smog', color: 'text-gray-400', desc: 'Foggy' };
    if (code >= 51 && code <= 57) return { icon: 'fa-cloud-rain', color: 'text-blue-500', desc: 'Drizzle' };
    if (code >= 61 && code <= 67) return { icon: 'fa-cloud-showers-heavy', color: 'text-blue-600', desc: 'Rain' };
    if (code >= 71 && code <= 77) return { icon: 'fa-snowflake', color: 'text-blue-300', desc: 'Snow' };
    if (code >= 80 && code <= 82) return { icon: 'fa-cloud-showers-heavy', color: 'text-blue-600', desc: 'Rain Showers' };
    if (code >= 85 && code <= 86) return { icon: 'fa-snowflake', color: 'text-blue-300', desc: 'Snow Showers' };
    if (code >= 95 && code <= 99) return { icon: 'fa-cloud-bolt', color: 'text-purple-500', desc: 'Thunderstorm' };

    return { icon: 'fa-cloud', color: 'text-gray-400', desc: 'Unknown' }; // Default
};

const renderRecentSearches = () => {
    if (recentCities.length === 0) {
        els.recentContainer.classList.add('hidden');
        return;
    }

    els.recentContainer.classList.remove('hidden');
    els.recentSearches.innerHTML = '';

    recentCities.forEach(city => {
        const badge = document.createElement('button');
        badge.className = 'px-4 py-2 bg-white/50 dark:bg-darkCard/50 hover:bg-white dark:hover:bg-darkCard backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm transition-all transform hover:-translate-y-0.5 whitespace-nowrap';
        badge.textContent = city;
        badge.addEventListener('click', () => {
            els.searchInput.value = city;
            fetchWeather(city);
        });
        els.recentSearches.appendChild(badge);
    });
};

const saveRecentSearch = (city) => {
    // Keep only last 5 unique cities
    recentCities = recentCities.filter(c => c.toLowerCase() !== city.toLowerCase());
    recentCities.unshift(city);
    if (recentCities.length > 5) recentCities.pop();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentCities));
    renderRecentSearches();
};

const showLoading = () => {
    els.dashboard.classList.add('hidden');
    els.error.classList.add('hidden');
    els.feedbackContainer.classList.remove('hidden');
    els.loading.classList.remove('hidden');
    els.loading.style.display = 'flex';
};

const showError = (message) => {
    els.dashboard.classList.add('hidden');
    els.loading.classList.add('hidden');
    els.loading.style.display = 'none';
    els.feedbackContainer.classList.remove('hidden');
    els.error.classList.remove('hidden');

    // Trigger reset animation hack
    els.error.classList.remove('animate-shake');
    void els.error.offsetWidth;
    els.error.classList.add('animate-shake');

    els.errorText.textContent = message;
};

const showDashboard = (weatherData, cityName) => {
    els.feedbackContainer.classList.add('hidden');
    els.loading.classList.add('hidden');
    els.error.classList.add('hidden');

    // Remove animation class to reset it
    els.dashboard.classList.remove('animate-slide-up');
    void els.dashboard.offsetWidth;

    els.dashboard.classList.remove('hidden');
    els.dashboard.classList.add('animate-slide-up');

    const { current } = weatherData;
    const weatherInfo = getWeatherIcon(current.weather_code);

    els.data.cityName.textContent = cityName;
    els.data.temp.innerHTML = `${Math.round(current.temperature_2m)}<span class="text-4xl text-gray-400 dark:text-gray-500 font-normal">°c</span>`;

    els.data.desc.innerHTML = `<span class="w-2.5 h-2.5 rounded-full ${weatherInfo.color.replace('text-', 'bg-')}"></span>${weatherInfo.desc}`;
    els.data.iconContainer.innerHTML = `<i class="fa-solid ${weatherInfo.icon} ${weatherInfo.color}"></i>`;

    els.data.humidity.textContent = `${current.relative_humidity_2m}%`;
    els.data.wind.textContent = `${current.wind_speed_10m} km/h`;
};

const fetchWeather = async (city) => {
    if (!city.trim()) return;

    showLoading();

    try {
        // Step 1: Geocoding (City name -> Lat/Lon)
        // Clean the query since Open-Meteo geocoding can struggle with comma-separated country codes like "Dubai, AE"
        const cleanQuery = city.split(',')[0].trim();
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=1&language=en&format=json`);

        if (!geoResponse.ok) throw new Error('Failed to reach geocoding service');

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error(`We couldn't find any city named "${city}". Please try again.`);
        }

        const location = geoData.results[0];
        const formattedCityName = `${location.name}, ${location.country_code || location.country}`;

        // Step 2: Fetch Weather (Lat/Lon -> Weather data)
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`);

        if (!weatherResponse.ok) throw new Error('Failed to retrieve weather data');

        const weatherData = await weatherResponse.json();

        showDashboard(weatherData, formattedCityName);
        saveRecentSearch(formattedCityName);

    } catch (error) {
        showError(error.message || 'An unexpected error occurred. Please try again later.');
    }
};

const setupEventListeners = () => {
    els.searchBtn.addEventListener('click', () => fetchWeather(els.searchInput.value));

    els.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') fetchWeather(els.searchInput.value);
    });
};

const initUI = () => {
    initTheme();
    setupEventListeners();
    renderRecentSearches();

    // Automatically fetch last searched city if exists
    if (recentCities.length > 0) {
        els.searchInput.value = recentCities[0];
        fetchWeather(recentCities[0]);
    }
};

document.addEventListener('DOMContentLoaded', initUI);
