import { beforeEach, describe, expect, it } from 'vitest';

import { listAuditEvents, listManagedUsers } from './account.js';

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

describe('account storage helpers', () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: buildStorage(),
    });
  });

  it('returns empty audit list when stored json is malformed', () => {
    localStorage.setItem('bo_audit', '{ malformed');

    expect(listAuditEvents()).toEqual([]);
  });

  it('falls back to seeded managed users when json is malformed', () => {
    localStorage.setItem('bo_managed_users', '{ malformed');

    const users = listManagedUsers({
      id: 'user-1',
      email: 'admin@demo.local',
      name: 'Admin',
      role: 'admin',
      tenantId: 'org-1',
    });

    expect(users).toHaveLength(3);
    expect(users.every((user) => user.tenantId === 'org-1')).toBe(true);
  });
});
