const WEATHER_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

const FORECAST_LIMIT_DAYS = 16;

export async function geocodeAddress(address) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1`
  );
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;

  const result = data.results[0];
  return { lat: result.latitude, lng: result.longitude };
}

export async function fetchForecast(lat, lng, startDate, endDate) {
  const daysUntilStart = Math.ceil(
    (new Date(startDate) - new Date(new Date().toDateString())) / 86_400_000
  );

  if (daysUntilStart > FORECAST_LIMIT_DAYS) {
    return { available: false, daysUntilStart };
  }

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
    `&temperature_unit=fahrenheit&timezone=auto` +
    `&start_date=${startDate}&end_date=${endDate}`
  );
  const data = await res.json();

  if (!data.daily) {
    return { available: false, daysUntilStart };
  }

  const days = data.daily.time.map((date, i) => ({
    date,
    icon: WEATHER_ICONS[data.daily.weathercode[i]] ?? '🌡️',
    high: Math.round(data.daily.temperature_2m_max[i]),
    low: Math.round(data.daily.temperature_2m_min[i]),
  }));

  return { available: true, days };
}
