import { backofficeNavigation } from '@connekt-hunter/api-client';

export const navigationItems = backofficeNavigation.map((item) => ({
  ...item,
  description: `Placeholder inicial para ${item.label}.`,
}));
