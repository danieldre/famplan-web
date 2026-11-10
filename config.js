// Public values only. The publishable key is meant to ship in clients; row-level
// security in the database decides what it can read. Anonymous callers can run
// only the invite and referral previews.
window.FAMPLAN_CONFIG = Object.freeze({
  supabaseUrl: 'https://pcxcdeottcprfbcyjqvn.supabase.co',
  publishableKey: 'sb_publishable_hvW3g8mA7FRtUt_jstaJ4A_UbU7r9j3',
});
