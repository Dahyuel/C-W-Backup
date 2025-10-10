const CACHE_PREFIX = 'form_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CacheData<T> {
  data: T;
  timestamp: number;
}

export const saveFormCache = <T>(formId: string, data: T): void => {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(`${CACHE_PREFIX}${formId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to save form cache:', error);
  }
};

export const loadFormCache = <T>(formId: string): T | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${formId}`);
    if (!cached) return null;

    const cacheData: CacheData<T> = JSON.parse(cached);

    // Check if cache is expired
    if (Date.now() - cacheData.timestamp > CACHE_EXPIRY) {
      clearFormCache(formId);
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.error('Failed to load form cache:', error);
    return null;
  }
};

export const clearFormCache = (formId: string): void => {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${formId}`);
  } catch (error) {
    console.error('Failed to clear form cache:', error);
  }
};

export const clearAllFormCaches = (): void => {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear all form caches:', error);
  }
};
