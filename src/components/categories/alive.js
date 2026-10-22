import { useEffect, useRef, useState } from "react";

// Vida dos personagens: gestos aleatórios de tempos em tempos e olhar que segue o cursor.
// Tudo para quando a cena sai da tela, a aba fica oculta ou o movimento está reduzido.

export function useFidgets(ids, { enabled = true, rootRef, busy = null, every = 2600 } = {}) {
  const [fidgets, setFidgets] = useState({});
  const timers = useRef([]);
  const key = ids.join(",");
  useEffect(() => {
    if (!enabled || !ids.length) return undefined;
    let visible = true;
    const observer = rootRef?.current ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }) : null;
    if (observer) observer.observe(rootRef.current);
    const tick = () => {
      if (!visible || document.hidden) return;
      const pool = ids.filter((id) => id !== busy);
      if (!pool.length) return;
      const id = pool[Math.floor(Math.random() * pool.length)];
      const kind = Math.random() < 0.55 ? "hop" : "act";
      setFidgets((current) => ({ ...current, [id]: kind }));
      timers.current.push(window.setTimeout(() => setFidgets((current) => { const next = { ...current }; delete next[id]; return next; }), kind === "hop" ? 900 : 1700));
    };
    const interval = window.setInterval(tick, every + Math.random() * 900);
    return () => { window.clearInterval(interval); observer?.disconnect(); timers.current.forEach(window.clearTimeout); timers.current = []; setFidgets({}); };
  }, [enabled, key, busy, every, rootRef]); // eslint-disable-line react-hooks/exhaustive-deps
  return fidgets;
}

const same = (a, b) => Object.keys(b).every((id) => a[id]?.x === b[id].x && a[id]?.y === b[id].y) && Object.keys(a).length === Object.keys(b).length;

// Olhar em passos de 1 pixel do sprite: -1, 0 ou 1 em cada eixo, a partir do centro do rosto.
export function useLooks(enabled) {
  const elements = useRef({});
  const [looks, setLooks] = useState({});
  useEffect(() => {
    if (!enabled) { setLooks({}); return undefined; }
    let frame = 0; let last = null;
    const update = () => {
      frame = 0;
      const next = {};
      for (const [id, element] of Object.entries(elements.current)) {
        if (!element || !last) continue;
        const box = element.getBoundingClientRect();
        const dx = last.clientX - (box.left + box.width / 2);
        const dy = last.clientY - (box.top + box.height * 0.3);
        next[id] = { x: Math.abs(dx) < 36 ? 0 : Math.sign(dx), y: dy < -70 ? -1 : dy > 110 ? 1 : 0 };
      }
      setLooks((current) => (same(current, next) ? current : next));
    };
    const move = (event) => { last = event; if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(frame); };
  }, [enabled]);
  const ref = (id) => (element) => { elements.current[id] = element; };
  return [looks, ref];
}
