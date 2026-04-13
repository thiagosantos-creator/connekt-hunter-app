import { beforeEach, describe, expect, it } from 'vitest';

import { generateMockMfaQr, saveProfile } from './account.js';

const storage = new Map<string, string>();

function buildStorage(): Storage {
  return {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    key(index: number) {
      return [...storage.keys()][index] ?? null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
  };
}

describe('account helpers', () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: buildStorage(),
    });
  });

  it('stores the profile using the expected key', () => {
    saveProfile({
      id: 'u1',
      email: 'admin@demo.local',
      name: 'Admin',
      role: 'admin',
    });

    expect(localStorage.getItem('bo_user')).toContain('admin@demo.local');
  });

  it('generates a deterministic mock MFA QR url', () => {
    expect(generateMockMfaQr('admin@demo.local')).toContain('otpauth://totp/Connekt:admin@demo.local');
  });
});
