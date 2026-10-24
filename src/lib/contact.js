const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const LOCAL_KEY = 'seshat-contactos';
export const supabaseReady = Boolean(url && key);

let client;
async function getClient() {
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

// Con Supabase configurado inserta en la tabla `contactos`.
// Sin configurar, guarda en este navegador para poder probar todo en local.
export async function sendContact(msg) {
  if (supabaseReady) {
    const sb = await getClient();
    const { error } = await sb.from('contactos').insert(msg);
    if (error) throw new Error(error.message);
    return 'supabase';
  }
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {}
  list.push({ ...msg, created_at: new Date().toISOString() });
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {}
  return 'local';
}
