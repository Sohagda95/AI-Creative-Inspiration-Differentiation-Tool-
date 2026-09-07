import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return ['','/pricing','/login'].map(path => ({ url: `${base.replace(/\/$/,'')}${path}`, lastModified: new Date() }));
}
