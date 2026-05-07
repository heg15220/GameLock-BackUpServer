import { ENABLE_MONETIZATION_PREVIEW } from "./monetizationGate";

export const AD_PREVIEW_STORAGE_KEY = "platform-games-ad-preview-enabled";
export const DEFAULT_AD_PREVIEW_ENABLED = false;

export function isAdPreviewEnabledByCode() {
  return ENABLE_MONETIZATION_PREVIEW;
}

export function resolveStoredAdPreviewEnabled(storedValue, fallback = DEFAULT_AD_PREVIEW_ENABLED) {
  return ENABLE_MONETIZATION_PREVIEW && (storedValue == null ? fallback : storedValue === "true");
}

function createSlot(id, overrides = {}) {
  return {
    id,
    provider: "google-ads-ready",
    adUnitId: "",
    targetUrl: "",
    imageUrl: "",
    ...overrides,
  };
}

export const DESKTOP_AD_SLOTS = [
  createSlot("desktop-left-top", {
    side: "left",
    sizeLabel: "Desktop rail",
    fallbackSize: "160 x 280",
  }),
  createSlot("desktop-left-bottom", {
    side: "left",
    sizeLabel: "Desktop rail",
    fallbackSize: "160 x 280",
  }),
  createSlot("desktop-right-top", {
    side: "right",
    sizeLabel: "Desktop rail",
    fallbackSize: "160 x 280",
  }),
  createSlot("desktop-right-bottom", {
    side: "right",
    sizeLabel: "Desktop rail",
    fallbackSize: "160 x 280",
  }),
];

export const MOBILE_STAGE_AD_SLOTS = [
  createSlot("mobile-stage-a", {
    sizeLabel: "Tablet / mobile adaptive",
    fallbackSize: "Adaptive",
  }),
  createSlot("mobile-stage-b", {
    sizeLabel: "Tablet / mobile adaptive",
    fallbackSize: "Adaptive",
  }),
  createSlot("mobile-stage-c", {
    sizeLabel: "Tablet / mobile adaptive",
    fallbackSize: "Adaptive",
  }),
  createSlot("mobile-stage-d", {
    sizeLabel: "Tablet / mobile adaptive",
    fallbackSize: "Adaptive",
  }),
];

export const MOBILE_APP_BOTTOM_AD_SLOT = createSlot("mobile-app-bottom", {
  sizeLabel: "Mobile / tablet bottom banner",
  fallbackSize: "Adaptive",
});

export const TABLET_APP_SIDE_AD_SLOTS = [
  createSlot("tablet-app-side-left-top", {
    side: "left",
    sizeLabel: "Tablet app side banner",
    fallbackSize: "Adaptive",
  }),
  createSlot("tablet-app-side-left-bottom", {
    side: "left",
    sizeLabel: "Tablet app side banner",
    fallbackSize: "Adaptive",
  }),
  createSlot("tablet-app-side-right-top", {
    side: "right",
    sizeLabel: "Tablet app side banner",
    fallbackSize: "Adaptive",
  }),
  createSlot("tablet-app-side-right-bottom", {
    side: "right",
    sizeLabel: "Tablet app side banner",
    fallbackSize: "Adaptive",
  }),
];

export const MOBILE_APP_COMPACT_AD_SLOT = createSlot("mobile-app-compact", {
  sizeLabel: "Compact in-app banner",
  fallbackSize: "Adaptive",
});
