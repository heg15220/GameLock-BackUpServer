import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCEPT_ALL_COOKIE_PREFERENCES,
  COOKIE_CONSENT_COOKIE_NAME,
  COOKIE_CONSENT_STORAGE_KEY,
  readCookieConsent,
  saveCookieConsent,
} from "./cookieConsent";

function createLocalStorageMock() {
  const store = new Map();
  return {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
  };
}

function installBrowserMocks() {
  const localStorage = createLocalStorageMock();
  const cookies = new Map();

  global.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };

  global.window = {
    localStorage,
    location: { protocol: "https:", hostname: "gamelock.es" },
    dispatchEvent: vi.fn(),
  };

  global.document = {};
  Object.defineProperty(global.document, "cookie", {
    configurable: true,
    get() {
      return Array.from(cookies.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    },
    set(rawCookie) {
      const [nameValue, ...attributes] = rawCookie.split(";").map((part) => part.trim());
      const [name, value] = nameValue.split("=");
      if (attributes.some((attribute) => attribute.toLowerCase() === "max-age=0")) {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    },
  });

  return { localStorage };
}

describe("cookie consent storage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete global.window;
    delete global.document;
    delete global.CustomEvent;
  });

  it("returns null on a first visit with no stored consent", () => {
    installBrowserMocks();

    expect(readCookieConsent()).toBeNull();
  });

  it("removes local consent after the 180 day lifetime expires", () => {
    const { localStorage } = installBrowserMocks();
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({
      version: 1,
      decided: true,
      updatedAt: "2025-12-27T11:59:59.000Z",
      preferences: ACCEPT_ALL_COOKIE_PREFERENCES,
    }));

    expect(readCookieConsent()).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith(COOKIE_CONSENT_STORAGE_KEY);
  });

  it("accepting all stores every category and the 180 day consent cookie", () => {
    const { localStorage } = installBrowserMocks();

    const consent = saveCookieConsent(ACCEPT_ALL_COOKIE_PREFERENCES);
    const stored = JSON.parse(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));

    expect(consent.preferences).toEqual({
      necessary: true,
      preferences: true,
      analytics: true,
      advertising: true,
      affiliate: true,
    });
    expect(stored.preferences).toEqual(consent.preferences);
    expect(global.document.cookie).toContain(`${COOKIE_CONSENT_COOKIE_NAME}=`);
  });

  it("the default accept-all profile enables analytics and advertising", () => {
    expect(ACCEPT_ALL_COOKIE_PREFERENCES).toEqual({
      necessary: true,
      preferences: true,
      analytics: true,
      advertising: true,
      affiliate: true,
    });
  });
});
