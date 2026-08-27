type LocalStore<T> = {
  read: () => T[];
  subscribe: (onChange: () => void) => () => void;
  write: (items: T[]) => void;
};

export function createLocalStore<T>(key: string): LocalStore<T> {
  const empty: T[] = [];
  let cachedValue: string | null = null;
  let cachedItems: T[] = empty;
  const eventName = `keychain-store:${key}`;

  const read = () => {
    if (typeof window === "undefined") return empty;

    const value = window.localStorage.getItem(key) ?? "[]";
    if (value === cachedValue) return cachedItems;

    try {
      cachedItems = JSON.parse(value) as T[];
    } catch {
      cachedItems = empty;
    }
    cachedValue = value;
    return cachedItems;
  };

  const subscribe = (onChange: () => void) => {
    const notify = (event: Event) => {
      if (event.type !== "storage" || (event as StorageEvent).key === key) {
        onChange();
      }
    };

    window.addEventListener("storage", notify);
    window.addEventListener(eventName, notify);
    return () => {
      window.removeEventListener("storage", notify);
      window.removeEventListener(eventName, notify);
    };
  };

  const write = (items: T[]) => {
    const value = JSON.stringify(items);
    window.localStorage.setItem(key, value);
    cachedItems = items;
    cachedValue = value;
    window.dispatchEvent(new Event(eventName));
  };

  return { read, subscribe, write };
}
