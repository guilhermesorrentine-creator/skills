import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { motionTokens } from "../../lib/motion-tokens.js";
import { areaNames } from "../../lib/areas.js";

// Busca principal em padrão combobox: sugestões de skills, repositórios, áreas e objetivos reais.
export default function SearchBox({ inputRef, value, onChange, suggestions, onPick, showShortcut = true, placeholder = "Busque por nome, tecnologia ou objetivo…", label = "Buscar skills e repositórios" }) {
  const reduced = useReducedMotion();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const options = useMemo(() => [
    ...suggestions.skills.map((skill) => ({ type: "skill", key: `s:${skill.id}`, label: skill.name, meta: `${skill.repoName} · ${areaNames[skill.category] || skill.category}`, value: skill })),
    ...suggestions.repos.map((repo) => ({ type: "repo", key: `r:${repo.name}`, label: repo.name, meta: `Repositório · ${repo.skills.length} skills`, value: repo.name })),
    ...suggestions.areas.map((area) => ({ type: "area", key: `a:${area.id}`, label: `Filtrar por ${area.label}`, meta: "Categoria", value: area.id })),
    ...suggestions.goals.map((goal) => ({ type: "goal", key: `g:${goal}`, label: goal, meta: "Objetivo sugerido", value: goal })),
  ], [suggestions]);
  const expanded = open && options.length > 0;
  const groupLabel = { skill: "SKILLS", repo: "REPOSITÓRIOS", area: "CATEGORIAS", goal: "OBJETIVOS" };

  const choose = (option) => { setOpen(false); setActive(-1); onPick(option); };
  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(-1, i - 1)); }
    else if (event.key === "Enter") {
      if (expanded && active >= 0) { event.preventDefault(); choose(options[active]); }
      else { setOpen(false); onPick({ type: "submit", value }); }
    } else if (event.key === "Escape") {
      if (expanded) { event.stopPropagation(); setOpen(false); setActive(-1); }
      else if (value) { event.stopPropagation(); onChange(""); }
    }
  };

  return <div className={`search-holo ${expanded ? "is-open" : ""}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <div className="search-field">
      <span className="search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/><path d="M8 10.5h5" stroke="currentColor" strokeWidth="1.5" opacity=".6"/></svg></span>
      <input ref={inputRef} type="search" role="combobox" aria-expanded={expanded} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined} aria-label={label} autoComplete="off" spellCheck="false" value={value} placeholder={placeholder}
        onFocus={() => setOpen(true)} onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1); }} onKeyDown={onKeyDown}/>
      {value && <button type="button" className="search-clear" aria-label="Limpar busca" onClick={() => { onChange(""); inputRef?.current?.focus(); }}>×</button>}
      {showShortcut && <kbd className="search-kbd" aria-hidden="true">Ctrl K</kbd>}
    </div>
    <AnimatePresence>
      {expanded && <motion.ul id={listId} role="listbox" aria-label="Sugestões de busca" className="search-suggestions"
        initial={reduced ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -6 }} transition={{ duration: motionTokens.duration.fast }}>
        {options.map((option, index) => <li key={option.key} id={`${listId}-${index}`} role="option" aria-selected={index === active} className={`suggestion suggestion-${option.type}`}
          onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)} onMouseEnter={() => setActive(index)}>
          {(index === 0 || options[index - 1].type !== option.type) && <span className="suggestion-group" aria-hidden="true">{groupLabel[option.type]}</span>}
          <span className="suggestion-label">{option.label}</span><span className="suggestion-meta">{option.meta}</span>
        </li>)}
      </motion.ul>}
    </AnimatePresence>
  </div>;
}
