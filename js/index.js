import { createTrip } from './auth.js';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const form = document.getElementById('create-trip-form');
const status = document.getElementById('status');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = 'Creating trip...';

  const formData = new FormData(form);
  const name = formData.get('name').trim();
  const suffix = Math.random().toString(36).slice(2, 6);
  const slug = `${slugify(name)}-${suffix}`;

  try {
    await createTrip({
      slug,
      name,
      address: formData.get('address').trim(),
      lat: null,
      lng: null,
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      password: formData.get('password'),
    });

    const basePath = location.pathname.replace(/index\.html$/, '');
    const url = `${location.origin}${basePath}trip.html?slug=${slug}`;
    status.innerHTML = `Trip created! Share this link with your group:<br><a href="${url}">${url}</a>`;
    form.reset();
  } catch (err) {
    status.textContent = `Something went wrong: ${err.message}`;
  }
});
