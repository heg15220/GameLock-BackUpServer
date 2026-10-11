const KEY = "gamelock.football-manager.v1";

export function readManagerSave(restore) {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { career: restore(raw), error: null } : { career: null, error: null };
  } catch {
    return { career: null, error: "invalid" };
  }
}

export function writeManagerSave(career, serialize) {
  try {
    localStorage.setItem(KEY, serialize(career));
    return true;
  } catch {
    return false;
  }
}

export function downloadManagerSave(career, serialize) {
  const blob = new Blob([serialize(career)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `manager-${career.clubId}-${career.year}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
