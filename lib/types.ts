export type AnalysisResult = {
  imageId: string;
  model?: string;
  analysis: {
    subject: string;
    secondaryElements: string[];
    environment: string;
    composition: string;
    viewpoint: string;
    lighting: string;
    colorPalette: string[];
    mood: string;
    visualStyle: string;
    distinctiveFeaturesToAvoid: string[];
  };
  creativeDirections: { title: string; concept: string; changes: string[] }[];
  prompts: { title: string; prompt: string; negativeGuidance: string[] }[];
  confidence?: number;
};
