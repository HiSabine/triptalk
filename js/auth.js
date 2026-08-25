import { supabase } from './supabaseClient.js';

async function ensureAnonSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

export async function unlockTrip(slug, password) {
  await ensureAnonSession();

  const { data, error } = await supabase.rpc('verify_trip_password', {
    p_slug: slug,
    p_password: password,
  });

  if (error) throw error;
  return data === true;
}

export async function createTrip(fields) {
  await ensureAnonSession();

  const { data, error } = await supabase.rpc('create_trip', {
    p_slug: fields.slug,
    p_name: fields.name,
    p_address: fields.address,
    p_city_state: fields.cityState,
    p_lat: fields.lat,
    p_lng: fields.lng,
    p_start_date: fields.startDate,
    p_end_date: fields.endDate,
    p_password: fields.password,
  });

  if (error) throw error;
  return data;
}
