// Polyfill for crypto.randomUUID
export const cryptoUtils = {
  generateUUID: function(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback implementation using Web Crypto API
    const getRandomValues = (typeof crypto !== 'undefined' && crypto.getRandomValues)
      ? (array: Uint8Array) => crypto.getRandomValues(array)
      : (array: Uint8Array) => {
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
          }
          return array;
        };

    const randomBytes = new Uint8Array(16);
    getRandomValues(randomBytes);

    // Set version (4) and variant (2)
    randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
    randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;

    // Convert to hex string and format as UUID
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
  },
  randomUUID: function(): string {
    return cryptoUtils.generateUUID();
  },
  getRandomValues: function(array: Uint8Array): Uint8Array {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      return crypto.getRandomValues(array);
    }
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
};

// Export it as default
export default cryptoUtils;
