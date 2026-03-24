export interface CervicalPredictionResult {
  reviewStatus: 'Normal' | 'Abnormal';
  aiResult: string;
  confidence: number;
  avgRedIntensity: number;
}

const getClassifierApiBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_CLASSIFIER_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_CLASSIFIER_API_URL is not configured');
  }
  return url.replace(/\/$/, '');
};

export const predictCervicalScreening = async (
  imageUrl: string,
  screeningId: string
): Promise<CervicalPredictionResult> => {
  const apiBaseUrl = getClassifierApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl,
      screeningId,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Classifier request failed: ${message}`);
  }

  const data = await response.json();
  return {
    reviewStatus: data.reviewStatus,
    aiResult: data.aiResult,
    confidence: data.confidence,
    avgRedIntensity: data.avgRedIntensity,
  };
};
