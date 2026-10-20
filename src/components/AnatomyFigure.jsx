import { motion, useReducedMotion } from "motion/react";
import { motionTokens, springs, shouldAnimate } from "../lib/motion-tokens.js";

const positions = [-42, 0, 42, 84, 126];
const selectors = [
  { id: "todas", label: "Todas" },
  { id: "software", label: "Software" },
  { id: "empreendedorismo", label: "Empreender" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "ciencia", label: "Ciência" },
];

export default function AnatomyFigure({ area, areaIndex, skillCount, onSelect }) {
  const reduced = useReducedMotion();
  const x = positions[areaIndex] ?? positions[0];
  const transition = shouldAnimate(reduced) ? springs.gentle : { duration: motionTokens.duration.instant };
  const ticks = Array.from({ length: 12 }, (_, index) => index);
  const bolts = [
    [110, 278], [185, 310], [406, 250], [466, 282],
  ];
  const slots = [0, 1, 2, 3];

  return (
    <figure className="anatomy-card" aria-labelledby="anatomy-title">
      <div className="anatomy-heading">
        <div>
          <p className="eyebrow">INSTRUMENTO · FIG 01</p>
          <h2 id="anatomy-title">Seletor de skills</h2>
        </div>
        <span className="live-dot" aria-label="Ilustração interativa ativa" />
      </div>
      <div className="anatomy-stage">
        <svg viewBox="0 0 560 360" role="img" aria-label="Instrumento isométrico com gavetas de cartões e um carrinho que marca a área escolhida" className="anatomy-svg">
          <ellipse cx="280" cy="320" rx="210" ry="24" className="machine-shadow" />
          <g className="machine-back">
            <path d="M146 100 355 70l72 40-210 33Z" className="machine-top" />
            <path d="M217 143 427 110v134l-210 36Z" className="machine-side" />
            <path d="M146 100 217 143v137l-71-43Z" className="machine-side-deep" />
            <path d="m160 104 192-28 53 30-193 30Z" className="machine-rim" />
            <path d="M170 111 352 84l39 23-183 29Z" className="machine-panel" />
            <path d="m181 116 166-24 29 17-167 26Z" className="screen-bezel" />
            <path d="m190 118 156-22 19 11-157 24Z" className="screen-lit" />
            <path d="m197 120 30-4 4 2-30 5Z" className="screen-line" />
            <path d="m239 114 36-5 4 2-36 6Z" className="screen-line screen-line-warm" />
            <path d="m286 107 46-7 4 2-46 7Z" className="screen-line" />
            <path d="m197 127 67-10 4 2-67 10Z" className="screen-line" />
            <path d="m275 115 52-8 4 2-52 8Z" className="screen-line" />
            <path d="m179 144 212-32v7l-212 32Z" className="readout-rail" />
            <path d="m189 147 9-1v2l-9 1Zm15-2 9-1v2l-9 1Zm15-2 9-1v2l-9 1Zm15-2 9-1v2l-9 1Z" className="readout-mark" />
            <path d="m177 163 210-32v4l-210 32Z" className="panel-seam" />
            <path d="m180 179 210-32v2l-210 32Z" className="panel-seam" />
            <path d="m184 195 210-32v2l-210 32Z" className="panel-seam" />
            <path d="m190 214 202-31v2l-202 31Z" className="panel-seam" />
            <path d="M176 228 393 194v14l-217 35Z" className="label-plate" />
            <path d="m187 231 54-8 2 2-54 8Zm62-10 30-5 2 2-30 5Z" className="engraving" />
            <path d="M168 235 390 201" className="edge-light" />
            <path d="M156 254 206 282 426 245 379 218Z" className="deck-top" />
            <path d="M206 282 426 245v20l-220 39Z" className="deck-front" />
            <path d="m379 218 47 27v20l-47-27Z" className="deck-side" />
            <path d="M168 262 205 284v13l-37-22Z" className="foot" />
            <path d="m398 240 28 17v13l-28-17Z" className="foot" />
            <path d="m235 286 24-4v13l-24 5Z" className="foot" />
            <path d="m375 262 25-4v13l-25 5Z" className="foot" />
            <path d="M155 253 379 216" className="deck-groove" />
            <path d="m207 286 212-36" className="deck-groove" />
          </g>

          <g className="machine-rails">
            <path d="m158 228 222-35 9 6-223 36Z" className="rail" />
            <path d="m163 231 218-34" className="rail-highlight" />
            <path d="m172 243 221-35 8 5-222 36Z" className="rail" />
            <path d="m178 246 215-34" className="rail-highlight" />
            {ticks.map((tick) => <path key={`tick-${tick}`} d={`M${177 + tick * 15} ${225 - tick * 2.4}l2 5`} className="machine-tick" />)}
            <path d="m162 222 9-2 5 4-9 2Z" className="stop-block" />
            <path d="m381 188 10-2 6 4-10 2Z" className="stop-block" />
            <path d="m169 220 7 4m203-37 7 4" className="stop-screw" />
          </g>

          <g className="machine-slots">
            {slots.map((slot) => {
              const x0 = 202 + slot * 42;
              const y0 = 231 - slot * 7;
              return (
                <motion.g key={`slot-${slot}`} animate={{ y: areaIndex === slot + 1 ? -10 : areaIndex === 0 ? -3 : 0 }} transition={transition} className={areaIndex === slot + 1 ? "machine-slot-active" : ""}>
                  <path d={`M${x0} ${y0}l34-5 11 7-34 6Z`} className="card-top" />
                  <path d={`m${x0 + 11} ${y0 + 7} 34-6v11l-34 6Z`} className="card-face" />
                  <path d={`m${x0 + 4} ${y0 + 2} 25-4 5 3-25 4Z`} className="card-rule" />
                  <path d={`m${x0 + 13} ${y0 + 11} 22-4`} className="card-rule" />
                </motion.g>
              );
            })}
          </g>

          <motion.g animate={{ x }} transition={transition} className="machine-carriage">
            <path d="m204 212 38-6 13 8-38 7Z" className="carriage-top" />
            <path d="m217 221 38-7v13l-38 7Z" className="carriage-face" />
            <path d="m208 211 8-1 13 8-8 2Z" className="bearing" />
            <path d="m231 207 8-1 13 8-8 2Z" className="bearing" />
            <path d="m223 213 16-3 4 2-16 3Z" className="carriage-mark" />
            <path d="m235 200 5-1 3 8-5 1Z" className="index-pin" />
          </motion.g>

          <g className="machine-controls">
            <path d="m405 149 25-4 11 6-25 5Z" className="control-housing" />
            <path d="m416 156 24-4v13l-24 4Z" className="control-side" />
            <ellipse cx="421" cy="150" rx="9" ry="5" transform="rotate(-10 421 150)" className="knob-ring" />
            <ellipse cx="421" cy="150" rx="5.5" ry="3" transform="rotate(-10 421 150)" className="knob-face" />
            {Array.from({ length: 6 }, (_, i) => <path key={`knurl-${i}`} d={`M${415 + i * 2} ${149.3 - i * 0.3}l1-2`} className="knurl" />)}
            <path d="m418 139 5-1 3 5-5 1Z" className="button-top" />
            <path d="m421 144 5-1v5l-5 1Z" className="button-side" />
            <circle cx="429" cy="175" r="3" className="status-lamp" />
            <circle cx="429" cy="175" r="1" className="status-core" />
            <path d="m407 184 11-2" className="control-mark" />
          </g>

          <g className="machine-fasteners">
            {bolts.map(([cx, cy], index) => (
              <g key={`bolt-${index}`}>
                <circle cx={cx} cy={cy} r="4.2" className="bolt-ring" />
                <circle cx={cx} cy={cy} r="2.2" className="bolt" />
                <path d={`M${cx - 1.3} ${cy + 0.8}l2.6-1.6`} className="bolt-slot" />
              </g>
            ))}
          </g>
        </svg>
      </div>
      <figcaption className="anatomy-readout" aria-live="polite">
        <span><i className="key-swatch" /> Carrinho: <strong>{area.label}</strong></span>
        <span><strong>{skillCount.toLocaleString("pt-BR")}</strong> skills no índice</span>
      </figcaption>
      <div className="anatomy-controls" role="group" aria-label="Área mostrada no instrumento">
        {selectors.map((selector, index) => <button key={selector.id} type="button" aria-pressed={areaIndex === index} onClick={() => onSelect(selector.id)}>{selector.label}</button>)}
      </div>
      <p className="anatomy-caption">Selecione uma área para mover o carrinho e abrir a gaveta correspondente.</p>
    </figure>
  );
}
