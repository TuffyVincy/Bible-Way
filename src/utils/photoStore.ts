const DB_NAME = 'steadfast_accountability_photos';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open photo store.'));
  });
}

export async function saveLocalPhoto(dateKey: string, dataUrl: string): Promise<void> {
  try {
    const db = await openPhotoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(dataUrl, dateKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback to session/localStorage only if small enough
    try {
      localStorage.setItem(`steadfast_photo_${dateKey}`, dataUrl);
    } catch {
      // Ignore storage quota fallback errors
    }
  }
}

export async function getAllLocalPhotos(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  try {
    const db = await openPhotoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          if (typeof cursor.key === 'string' && typeof cursor.value === 'string') {
            result[cursor.key] = cursor.value;
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
    db.close();
  } catch {
    // Fallback check in localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('steadfast_photo_')) {
          const val = localStorage.getItem(key);
          if (val) result[key.replace('steadfast_photo_', '')] = val;
        }
      }
    } catch {
      // Ignore
    }
  }
  return result;
}

export async function deleteLocalPhoto(dateKey: string): Promise<void> {
  try {
    const db = await openPhotoDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(dateKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore
  }
  try {
    localStorage.removeItem(`steadfast_photo_${dateKey}`);
  } catch {
    // Ignore
  }
}

export async function compressImageFile(file: File, maxDimension = 960): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const rawUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawUrl) {
        reject(new Error('Empty image data.'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Selected file is not a valid image.'));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}
