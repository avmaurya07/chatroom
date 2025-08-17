import { Redis } from "@upstash/redis";

// Create a mock Redis implementation for local development
class MockRedis {
  private store: Record<string, string | number | string[]> = {};
  private expirations: Record<string, number> = {};
  private callbacks: Record<string, Array<(message: string) => void>> = {};
  private _globalCallback?: (channel: string, message: string) => void;

  async get(key: string) {
    this.checkExpiration(key);
    return this.store[key];
  }

  async set(key: string, value: string | number, options?: { ex?: number }) {
    this.store[key] = value;
    if (options?.ex) {
      this.expirations[key] = Date.now() + options.ex * 1000;
    }
    return "OK";
  }

  async incr(key: string) {
    this.checkExpiration(key);
    if (!this.store[key]) {
      this.store[key] = 0;
    }
    this.store[key] = Number(this.store[key]) + 1;
    return this.store[key];
  }

  async expire(key: string, seconds: number) {
    this.expirations[key] = Date.now() + seconds * 1000;
    return 1;
  }

  async pttl(key: string) {
    this.checkExpiration(key);
    if (!this.expirations[key]) return -1;
    return Math.max(0, this.expirations[key] - Date.now());
  }

  async lpush(key: string, ...values: string[]) {
    this.checkExpiration(key);
    if (!this.store[key]) {
      this.store[key] = [];
    }

    if (!Array.isArray(this.store[key])) {
      this.store[key] = [String(this.store[key])];
    }

    // TypeScript will complain about this, but we're treating it as a string array
    const list = this.store[key] as string[];

    // lpush prepends items to the list
    const newList = [...values, ...list];
    this.store[key] = newList;

    return newList.length;
  }

  async ltrim(key: string, start: number, stop: number) {
    this.checkExpiration(key);
    if (!this.store[key]) {
      return "OK";
    }

    if (!Array.isArray(this.store[key])) {
      this.store[key] = [String(this.store[key])];
    }

    // TypeScript will complain about this, but we're treating it as a string array
    const list = this.store[key] as string[];

    // ltrim keeps elements from start to stop (inclusive)
    this.store[key] = list.slice(start, stop + 1);

    return "OK";
  }

  async subscribe(channel: string) {
    if (!this.callbacks[channel]) {
      this.callbacks[channel] = [];
    }
    console.log(`Subscribed to channel: ${channel} (mock implementation)`);
    return 1;
  }

  // This is a mock-specific method that won't exist in the real Redis client
  onMessage(callback: (channel: string, message: string) => void) {
    // Store the callback for all channels
    this._globalCallback = callback;
    return this;
  }

  async publish(channel: string, message: string) {
    console.log(`Publishing to ${channel}: ${message} (mock implementation)`);
    if (this._globalCallback) {
      this._globalCallback(channel, message);
    }
    return 1;
  }

  private checkExpiration(key: string) {
    if (this.expirations[key] && this.expirations[key] < Date.now()) {
      delete this.store[key];
      delete this.expirations[key];
    }
  }
}

let redisInstance: Redis | MockRedis;

// Check if we're in development mode or if credentials are missing
const isDev = process.env.NODE_ENV === "development";
const hasRedisCredentials =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

if (!isDev && hasRedisCredentials) {
  try {
    // Try to create a real Redis connection
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log("Connected to Upstash Redis");
  } catch (error) {
    console.warn(
      "Failed to connect to Redis, using in-memory mock instead:",
      error
    );
    redisInstance = new MockRedis();
  }
} else {
  console.log("Using in-memory Redis mock for development");
  redisInstance = new MockRedis();
}

// Use type assertion to indicate this is compatible with Redis
// We're implementing just the methods we need from the Redis interface
export default redisInstance as Redis;
