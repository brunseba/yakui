// Node.js polyfills for browser compatibility
// This file provides empty implementations for Node.js modules that don't work in browsers

// Empty implementations to prevent import errors
export const util = {
  debuglog: () => () => {},
  inspect: (obj: any) => JSON.stringify(obj, null, 2),
  format: (f: string, ...args: any[]) => f,
  isDeepStrictEqual: (a: any, b: any) => a === b,
  promisify: (fn: Function) => (...args: any[]) => Promise.resolve(fn(...args))
};

export const child_process = {
  spawn: () => {
    throw new Error('child_process.spawn is not available in browser environment');
  },
  exec: () => {
    throw new Error('child_process.exec is not available in browser environment');
  },
  fork: () => {
    throw new Error('child_process.fork is not available in browser environment');
  }
};

export const fs = {
  readFile: () => {
    throw new Error('fs.readFile is not available in browser environment');
  },
  writeFile: () => {
    throw new Error('fs.writeFile is not available in browser environment');
  },
  stat: () => {
    throw new Error('fs.stat is not available in browser environment');
  }
};

export const path = {
  join: (...paths: string[]) => paths.join('/'),
  resolve: (...paths: string[]) => paths.join('/'),
  dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
  basename: (p: string) => p.split('/').pop() || '',
  extname: (p: string) => {
    const parts = p.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }
};

export const os = {
  homedir: () => '/home/user',
  tmpdir: () => '/tmp',
  platform: () => 'browser',
  arch: () => 'browser',
  type: () => 'browser'
};

export const crypto = {
  createHash: () => {
    throw new Error('crypto.createHash is not available in browser environment');
  },
  randomBytes: () => {
    throw new Error('crypto.randomBytes is not available in browser environment');
  }
};

// Stream polyfills
export const stream = {
  Readable: class MockReadable {
    constructor() {}
    read() { return null; }
    pipe() { return this; }
    on() { return this; }
    emit() { return false; }
  },
  Writable: class MockWritable {
    constructor() {}
    write() { return true; }
    end() {}
    on() { return this; }
    emit() { return false; }
  }
};

// Export as default for compatibility
export default {
  util,
  child_process,
  fs,
  path,
  os,
  crypto,
  stream
};