const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'APP_ENCRYPTION_KEY',
  'CRON_SECRET',
  'NEXT_PUBLIC_APP_URL'
];
const alternatives = [
  ['OPENAI_API_KEY', /^OPENAI_API_KEY(?:_\d+)?$/],
  ['SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY', /^(?:SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY)$/],
];
const missing = required.filter(k => !process.env[k]);
for (const [label, re] of alternatives) {
  if (!Object.keys(process.env).some(k => re.test(k) && process.env[k])) missing.push(label);
}
const prod = process.env.NODE_ENV === 'production';
if (prod && process.env.NEXT_PUBLIC_APP_URL?.startsWith('http://')) missing.push('NEXT_PUBLIC_APP_URL must use https:// in production');
if (missing.length) {
  console.error('Environment preflight failed:\n- ' + missing.join('\n- '));
  process.exit(1);
}
console.log('Environment preflight passed.');
