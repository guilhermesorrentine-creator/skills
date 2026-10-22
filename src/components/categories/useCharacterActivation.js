import { useCallback, useEffect, useRef, useState } from "react";

// Ativa a ação de um personagem por mouse, foco de teclado ou toque (toque mantém por 2,4 s).
export default function useCharacterActivation() {
  const [active, setActive] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const onPointerEnter = useCallback((event) => { if (event.pointerType === "mouse") setActive(true); }, []);
  const onPointerLeave = useCallback((event) => { if (event.pointerType === "mouse") setActive(false); }, []);
  const onPointerDown = useCallback((event) => {
    if (event.pointerType === "mouse") return;
    window.clearTimeout(timer.current);
    setActive(true);
    timer.current = window.setTimeout(() => setActive(false), 2400);
  }, []);
  const onFocus = useCallback((event) => { if (event.target.matches?.(":focus-visible")) setActive(true); }, []);
  const onBlur = useCallback(() => setActive(false), []);
  return { active, handlers: { onPointerEnter, onPointerLeave, onPointerDown, onFocus, onBlur } };
}
