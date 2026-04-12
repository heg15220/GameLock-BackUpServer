export const AD_PREVIEW_STORAGE_KEY = "platform-games-ad-preview-enabled";
export const DEFAULT_AD_PREVIEW_ENABLED = true;

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
