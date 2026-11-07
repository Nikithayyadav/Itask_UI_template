/** Replace these mock implementations with real fetch calls when backend routes are agreed. */
export interface ApiAdapter {
  list<T>(resource: string): Promise<T[]>;
  save<T>(resource: string, item: T): Promise<T>;
}

const memory = new Map<string, unknown[]>();
export const api: ApiAdapter = {
  async list<T>(resource: string) { return (memory.get(resource) ?? []) as T[]; },
  async save<T>(resource: string, item: T) {
    const items = memory.get(resource) ?? [];
    memory.set(resource, [...items, item]);
    return item;
  },
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
