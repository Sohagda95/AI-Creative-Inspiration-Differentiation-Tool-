import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
function key(){
 const raw=process.env.APP_ENCRYPTION_KEY;
 if(!raw) throw new Error('APP_ENCRYPTION_KEY is required for database-stored API keys.');
 return crypto.createHash('sha256').update(raw).digest();
}
export function encryptSecret(value:string){
 const iv=crypto.randomBytes(12); const cipher=crypto.createCipheriv(ALGO,key(),iv); const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]); const tag=cipher.getAuthTag();
 return [iv.toString('base64url'),tag.toString('base64url'),encrypted.toString('base64url')].join('.');
}
export function decryptSecret(value:string){
 const [ivB,tagB,dataB]=value.split('.'); if(!ivB||!tagB||!dataB) throw new Error('Invalid encrypted secret.');
 const decipher=crypto.createDecipheriv(ALGO,key(),Buffer.from(ivB,'base64url')); decipher.setAuthTag(Buffer.from(tagB,'base64url'));
 return Buffer.concat([decipher.update(Buffer.from(dataB,'base64url')),decipher.final()]).toString('utf8');
}
export function maskSecret(secret:string){return secret.length<10?'••••••••':`${secret.slice(0,4)}••••••••${secret.slice(-4)}`;}
