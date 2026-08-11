import { createOwnerApiClient } from '@matrizo/shared';

import { useOwnerAuthStore } from '../stores/ownerAuth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787/api/v1';

export const ownerApi = createOwnerApiClient({
  baseUrl: BASE_URL,
  getOwnerToken: () => useOwnerAuthStore.getState().ownerToken,
});
