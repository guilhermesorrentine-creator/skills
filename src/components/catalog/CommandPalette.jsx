import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "../../lib/motion-tokens.js";
import { searchRepos, searchSkills } from "../../lib/search.js";
import { areaNames } from "../../lib/areas.js";
import { navLinks } from "../layout/FloatingNavbar.jsx";

// Paleta de comandos (Ctrl/Cmd + K): seções do site e resultados reais do índice local.
export default function CommandPalette({ index, onClose, onOpenSkill, onOpenRepo, onNavigate }) {
  const reduced = useReducedMotion();
  const inputRef = useRef(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const deferred = useDeferredValue(query);
  const options = useMemo(() => {
    const sections = navLinks.filter((link) => !deferred || link.label.toLowerCase().includes(deferred.toLowerCase()))
      .map((link) => ({ key: `n:${link.id}`, group: "SEÇÕES", label: link.label, meta: `#${link.id}`, run: () => onNavigate(null, link.id) }));
    if (!deferred.trim()) return sections;
    const skills = searchSkills(index, deferred).slice(0, 8).map((skill) => ({ key: `s:${skill.id}`, group: "SKILLS", label: skill.name, meta: `${skill.repoName} · ${areaNames[skill.category]}`, run: () => onOpenSkill(skill) }));
    const repos = searchRepos(index, deferred).slice(0, 3).map((repo) => ({ key: `r:${repo.name}`, group: "REPOSITÓRIOS", label: repo.name, meta: `${repo.skills.length} skills`, run: () => onOpenRepo(repo.name) }));
    return [...skills, ...repos, ...sections];
  }, [deferred, index, onNavigate, onOpenRepo, onOpenSkill]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => setActive(0), [deferred]);
  const run = (option) => { onClose(); option.run(); };

  return <div className="palette-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div className="palette" role="dialog" aria-modal="true" aria-label="Busca rápida"
      initial={reduced ? false : { opacity: 0, y: -16, scale: 1.02 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); onClose(); }
        else if (event.key === "ArrowDown") { event.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
        else if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
        else if (event.key === "Enter" && options[active]) { event.preventDefault(); run(options[active]); }
        else if (event.key === "Tab") { event.preventDefault(); inputRef.current?.focus(); }
      }}>
      <div className="palette-input"><span aria-hidden="true">&gt;</span>
        <input ref={inputRef} role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={options[active] ? `${listId}-${active}` : undefined} aria-label="Buscar skills, repositórios ou seções" placeholder="SEARCH_PROTOCOL: digite uma skill, repositório ou seção…" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" spellCheck="false"/>
        <button type="button" className="palette-close" onClick={onClose}>Esc</button>
      </div>
      <ul className="palette-list" id={listId} role="listbox" aria-label="Resultados">
        {options.map((option, i) => <li key={option.key} id={`${listId}-${i}`} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onMouseDown={(event) => event.preventDefault()} onClick={() => run(option)}>
          {(i === 0 || options[i - 1].group !== option.group) && <span className="suggestion-group" aria-hidden="true">{option.group}</span>}
          <span className="suggestion-label">{option.label}</span><span className="suggestion-meta">{option.meta}</span>
        </li>)}
        {!options.length && <li className="palette-empty" role="presentation">Nenhum resultado para “{query}”. Tente um termo mais curto.</li>}
      </ul>
      <p className="palette-foot" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> navegar · <kbd>Enter</kbd> abrir · <kbd>Esc</kbd> fechar</p>
    </motion.div>
  </div>;
}
