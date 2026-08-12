/**
 * Motion here is never decoration: the delta marker travels out from zero because that is
 * the measurement being made, and the numbers count because a season is an accumulation.
 * Anyone who has asked not to see that gets the final value immediately.
 *
 * Its own module because the screens are no longer one file - the seven chances live in
 * `chancegames.jsx` and every one of them owes the same answer to the same preference.
 */
import { useEffect, useState } from "react";

export default function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    setReduced(query.matches);
    const onChange = (event) => setReduced(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}
