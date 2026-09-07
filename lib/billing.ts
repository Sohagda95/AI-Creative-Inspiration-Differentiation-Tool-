export const PLANS = {
  free: { name: 'Free', credits: 25, monthlyPrice: 0 },
  creator: { name: 'Creator', credits: 300, monthlyPrice: 9 },
  pro: { name: 'Pro', credits: 1500, monthlyPrice: 29 },
  studio: { name: 'Studio', credits: 5000, monthlyPrice: 79 },
} as const;
export type PlanId = keyof typeof PLANS;
export function creditsForImages(imageCount:number, variations:number){ return Math.max(1, imageCount) * Math.max(1, variations); }
