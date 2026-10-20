import { memo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getMatchReason } from "../../lib/search.js";
import { mosaicSize } from "../../lib/featured.js";
import { motionTokens, springs } from "../../lib/motion-tokens.js";
import { areaNames } from "../../lib/areas.js";
import { CompareButton, CopyButton, FavoriteButton, Highlight, promptFor } from "../shared.jsx";

// Reflexo holográfico: escreve variáveis CSS direto no elemento, sem re-renderizar o React.
export function trackGlare(event) {
  if (event.pointerType !== "mouse") return;
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
  event.currentTarget.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
}

const sizeNames = { L: "destaque", W: "largo", M: "alto", S: "compacto" };

const AdaptiveSkillCard = memo(function AdaptiveSkillCard({ skill, size, query, favorite, compared, onOpen, onFavorite, onCompare }) {
  const rich = size === "L" || size === "W";
  return <>
    <div className="tile-meta"><span className="cat-badge">{areaNames[skill.category] || skill.category}</span><span className="tile-repo">{skill.repoName}</span></div>
    <h3 className="tile-title"><button type="button" data-focus-id={skill.id} onClick={() => onOpen(skill)}><Highlight text={skill.name} query={query}/></button></h3>
    <p className="tile-desc"><Highlight text={skill.description || "A fonte não informa uma descrição para esta skill."} query={query}/></p>
    {size !== "S" && <p className="tile-reason">{getMatchReason(skill, query)}</p>}
    {size === "L" && skill.repoSummary && <p className="tile-about"><span>SOBRE O REPOSITÓRIO</span>{skill.repoSummary}</p>}
    {rich && skill.path && <code className="tile-path">{skill.path}</code>}
    <div className="tile-actions">
      {size !== "S" && <CopyButton value={promptFor(skill)}>Copiar prompt</CopyButton>}
      {size === "L" && skill.skillUrl && <a className="text-link" href={skill.skillUrl} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}
      <span className="tile-icons"><FavoriteButton skill={skill} active={favorite} onToggle={onFavorite} compact/><CompareButton skill={skill} active={compared} onToggle={onCompare} compact/></span>
    </div>
  </>;
});

function RepoTileBody({ repo, size, onOpenRepo }) {
  return <>
    <div className="tile-meta"><span className="cat-badge">{areaNames[repo.category] || repo.category}</span><span className="tile-repo">{repo.skills.length} skills</span></div>
    <h3 className="tile-title"><button type="button" data-focus-id={`repo:${repo.name}`} onClick={() => onOpenRepo(repo.name)}>{repo.name}</button></h3>
    <p className="tile-desc">{repo.summary || "O catálogo não informa uma descrição."}</p>
    {size !== "S" && !repo.skills.length && <p className="tile-reason">Sem skills catalogadas no índice.</p>}
    <div className="tile-actions">{size !== "S" && repo.repoUrl && <a className="text-link" href={repo.repoUrl} target="_blank" rel="noopener noreferrer">Repositório ↗</a>}</div>
  </>;
}

// Mosaico holográfico: tamanhos seguem a posição no ranking (padrão determinístico sem buracos).
export default function SkillMosaic({ kind, items, query, favorites, compareIds, onOpen, onOpenRepo, onFavorite, onCompare }) {
  const reduced = useReducedMotion();
  return <div className="mosaic" data-kind={kind}>
    <AnimatePresence mode="popLayout" initial={false}>
      {items.map((item, position) => {
        const size = mosaicSize(position);
        const key = kind === "skills" ? item.id : `repo:${item.name}`;
        return <motion.article key={key} className={`tile tile-${size}`} data-category={item.category} aria-label={`${item.name} — cartão ${sizeNames[size]}`}
          layout={reduced ? false : "position"} onPointerMove={trackGlare}
          initial={reduced ? false : { opacity: 0, scale: 0.96, y: motionTokens.distance.sm }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, scale: 0.96, transition: { duration: motionTokens.duration.fast } }}
          transition={reduced ? { duration: 0 } : { ...springs.layout, opacity: { duration: motionTokens.duration.fast, delay: Math.min(position, 12) * 0.018 } }}>
          <span className="tile-glare" aria-hidden="true"/>
          {kind === "skills"
            ? <AdaptiveSkillCard skill={item} size={size} query={query} favorite={favorites.includes(item.id)} compared={compareIds.includes(item.id)} onOpen={onOpen} onFavorite={onFavorite} onCompare={onCompare}/>
            : <RepoTileBody repo={item} size={size} onOpenRepo={onOpenRepo}/>}
        </motion.article>;
      })}
    </AnimatePresence>
  </div>;
}
