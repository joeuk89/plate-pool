import { afterEach } from "vitest";

afterEach(() => {
  if (typeof localStorage !== "undefined") localStorage.clear();
  if (typeof window !== "undefined") window.history.replaceState(null, "", "/");
});
