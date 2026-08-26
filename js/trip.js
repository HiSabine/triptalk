import { unlockTrip } from './auth.js';
import { supabase } from './supabaseClient.js';
import { fetchForecast } from './weather.js';
import { escapeHtml, formatDate, isSafeHttpUrl } from './utils.js';
import { initMealSignups } from './meals.js';

const params = new URLSearchParams(location.search);
const slug = params.get('slug');

const gate = document.getElementById('gate');
const content = document.getElementById('content');
const gateStatus = document.getElementById('gate-status');
const form = document.getElementById('unlock-form');

if (!slug) {
  gateStatus.textContent = 'No trip specified — check the link you were given.';
  form.querySelector('button').disabled = true;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  gateStatus.textContent = 'Checking...';
  const password = new FormData(form).get('password');

  try {
    const ok = await unlockTrip(slug, password);
    if (ok) {
      gate.hidden = true;
      content.hidden = false;
      loadTrip();
    } else {
      gateStatus.textContent = 'Wrong password — try again.';
    }
  } catch (err) {
    gateStatus.textContent = `Something went wrong: ${err.message}`;
  }
});

async function loadTrip() {
  const { data, error } = await supabase
    .from('trips')
    .select('id, name, address, house_url, lat, lng, start_date, end_date')
    .eq('slug', slug)
    .single();

  if (error) {
    content.textContent = `Couldn't load trip: ${error.message}`;
    return;
  }

  const houseLink = isSafeHttpUrl(data.house_url)
    ? `<a class="house-link" href="${escapeHtml(data.house_url)}" target="_blank" rel="noopener noreferrer">House details ↗</a>`
    : '';

  content.innerHTML = `
    <p class="kicker">TripTalk</p>
    <h1>${escapeHtml(data.name)}</h1>
    <p class="trip-meta">
      ${escapeHtml(data.address)}<br>
      ${formatDate(data.start_date)} – ${formatDate(data.end_date)}
    </p>
    ${houseLink}

    <hr class="divider">

    <p class="section-label">Weather</p>
    <div id="weather">Loading weather...</div>

    <hr class="divider">

    <p class="section-label">Meal Sign-Ups</p>
    <div id="meals" class="day-cards">Loading sign-ups...</div>
  `;

  loadWeather(data);
  initMealSignups(document.getElementById('meals'), data);
}

async function loadWeather(trip) {
  const weatherEl = document.getElementById('weather');

  if (trip.lat == null || trip.lng == null) {
    weatherEl.textContent = "Couldn't determine this location for weather.";
    return;
  }

  const forecast = await fetchForecast(trip.lat, trip.lng, trip.start_date, trip.end_date);

  if (!forecast.available) {
    weatherEl.textContent = `Forecast not available yet — check back closer to the trip (within ${16} days).`;
    return;
  }

  weatherEl.innerHTML = forecast.days
    .map(
      (day) => `
        <div class="weather-day">
          <span class="weather-date">${formatDate(day.date)}</span>
          <span class="weather-icon">${day.icon}</span>
          <span class="weather-temps">${day.high}° / ${day.low}°</span>
        </div>
      `
    )
    .join('');
}
