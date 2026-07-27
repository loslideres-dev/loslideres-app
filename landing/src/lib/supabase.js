import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si faltan las variables, exportamos null en vez de romper toda la página.
// El helper de rastreo maneja este caso con un mensaje amable.
export const supabase = url && key ? createClient(url, key) : null;
