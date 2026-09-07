const buckets = new Map<string,{count:number;reset:number}>();
export function clientKey(headers:Headers){
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
}
export function allowRequest(key:string,limit=20,windowMs=60_000){
  const now=Date.now(); const current=buckets.get(key);
  if(!current || current.reset<=now){buckets.set(key,{count:1,reset:now+windowMs});return true;}
  if(current.count>=limit)return false; current.count++; return true;
}
