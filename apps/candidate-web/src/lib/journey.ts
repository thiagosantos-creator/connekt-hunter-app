import { candidateJourneySteps } from '@connekt-hunter/api-client';

export const candidateJourney = candidateJourneySteps.map((step, index) => ({
  key: step,
  label: `${index + 1}. ${step}`,
}));
