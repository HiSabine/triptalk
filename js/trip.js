import { unlockTrip } from './auth.js';
import { supabase } from './supabaseClient.js';

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
    .select('name, address, start_date, end_date')
    .eq('slug', slug)
    .single();

  if (error) {
    content.textContent = `Couldn't load trip: ${error.message}`;
    return;
  }

  content.innerHTML = `
    <h1>${data.name}</h1>
    <p>${data.address}</p>
    <p>${data.start_date} – ${data.end_date}</p>
  `;
}
