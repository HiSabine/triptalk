import { supabase } from './supabaseClient.js';
import { escapeHtml, formatDate } from './utils.js';

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

function mealsForDay(dateStr, startDate, endDate) {
  if (dateStr === startDate) return ['dinner'];
  if (dateStr === endDate) return ['breakfast'];
  return ['breakfast', 'lunch', 'dinner'];
}

function dateRange(startDate, endDate) {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  const dates = [];
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

async function loadSignups(tripId) {
  const { data, error } = await supabase
    .from('meal_signups')
    .select('id, day_date, meal_type, person_name')
    .eq('trip_id', tripId);
  if (error) throw error;
  return data;
}

async function addSignup(tripId, dayDate, mealType, personName) {
  const { error } = await supabase
    .from('meal_signups')
    .insert({ trip_id: tripId, day_date: dayDate, meal_type: mealType, person_name: personName });
  if (error) throw error;
}

async function deleteSignup(id) {
  const { error } = await supabase.from('meal_signups').delete().eq('id', id);
  if (error) throw error;
}

function mealRowHtml(day, meal, existing) {
  const right = existing
    ? `<span class="filled-name">${escapeHtml(existing.person_name)}<button type="button" class="delete-name" data-id="${existing.id}" aria-label="Remove">&times;</button></span>`
    : `<form class="add-name-form" data-day="${day}" data-meal="${meal}">
         <input type="text" name="personName" placeholder="Add your name" required>
         <button type="submit">Add</button>
       </form>`;

  return `
    <div class="meal-row">
      <h4>${MEAL_LABELS[meal]}</h4>
      ${right}
    </div>
  `;
}

export async function initMealSignups(container, trip) {
  async function refresh() {
    const signups = await loadSignups(trip.id);
    const byKey = {};
    for (const s of signups) {
      byKey[`${s.day_date}|${s.meal_type}`] = s;
    }

    const days = dateRange(trip.start_date, trip.end_date);
    container.innerHTML = days
      .map((day) => {
        const note =
          day === trip.start_date
            ? ' <span class="day-note">— check-in day</span>'
            : day === trip.end_date
            ? ' <span class="day-note">— checkout day</span>'
            : '';
        const rows = mealsForDay(day, trip.start_date, trip.end_date)
          .map((meal) => mealRowHtml(day, meal, byKey[`${day}|${meal}`]))
          .join('');

        return `
          <div class="day-card">
            <p class="day-heading">${formatDate(day)}${note}</p>
            ${rows}
          </div>
        `;
      })
      .join('');
  }

  container.addEventListener('submit', async (event) => {
    if (!event.target.matches('.add-name-form')) return;
    event.preventDefault();
    const form = event.target;
    const personName = form.personName.value.trim();
    if (!personName) return;

    try {
      await addSignup(trip.id, form.dataset.day, form.dataset.meal, personName);
      await refresh();
    } catch (err) {
      alert(`Couldn't add that — someone may have just taken this slot. (${err.message})`);
      await refresh();
    }
  });

  container.addEventListener('click', async (event) => {
    if (!event.target.matches('.delete-name')) return;
    try {
      await deleteSignup(event.target.dataset.id);
      await refresh();
    } catch (err) {
      alert(`Couldn't remove that: ${err.message}`);
    }
  });

  await refresh();
}
