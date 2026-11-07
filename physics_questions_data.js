// ============================================================================
// PHYSICS QUESTION LIBRARY DATA (physics_questions_data.js)
// 134 questions, plus the code that draws their diagrams.
// Loaded by the Library App via <script src=".../physics_questions_data.js">
//
// What is in this file, top to bottom:
//   1. installSplineEngine()  - the interactive position/velocity graphs used by KIN-01 and KIN-02
//   2. guidedSteps()          - builds the numbered Guided Solution text
//   3. DIAGRAM_DRAWERS        - one drawing function per diagram name (a question says diagram: "incline")
//   4. getDiagramSVG()        - looks up a diagram name and draws it
//   5. PHYSICS_QUESTIONS      - the questions themselves
//
// To add a NEW kind of picture: add one more entry to DIAGRAM_DRAWERS and set
// diagram: "yourName" on the question. The Library App does not need to change.
//
// NOTE: This file intentionally does NOT declare G_ACCEL, G_CONST, DEG2RAD,
// RAD2DEG, rnd or randInt. The Library App already defines them, and declaring
// them twice makes the browser stop with "Identifier ... has already been declared".
// ============================================================================

// 1. Interactive spline graph engine (position and velocity graphs for KIN-01 / KIN-02).
function installSplineEngine() {
    // =========================================================================
    // INTERACTIVE SPLINE GRAPH ENGINE (QUESTIONS 1 & 2: x-t AND v-t GRAPHS)
    // =========================================================================
    const SVG_CONFIG = { xLeft: 95, xRight: 625, yTop: 25, yBottom: 355, tMin: 0, tMax: 10, yMin: -2, yMax: 8 };

    function tToSvgX(t) { return SVG_CONFIG.xLeft + ((t - SVG_CONFIG.tMin) / (SVG_CONFIG.tMax - SVG_CONFIG.tMin)) * (SVG_CONFIG.xRight - SVG_CONFIG.xLeft); }
    function svgXToT(px) { return Math.max(0, Math.min(10, SVG_CONFIG.tMin + ((px - SVG_CONFIG.xLeft) / (SVG_CONFIG.xRight - SVG_CONFIG.xLeft)) * (SVG_CONFIG.tMax - SVG_CONFIG.tMin))); }
    function yToSvgY(y) { return SVG_CONFIG.yBottom - ((y - SVG_CONFIG.yMin) / (SVG_CONFIG.yMax - SVG_CONFIG.yMin)) * (SVG_CONFIG.yBottom - SVG_CONFIG.yTop); }
    function svgYToY(py) { return SVG_CONFIG.yMin + ((SVG_CONFIG.yBottom - py) / (SVG_CONFIG.yBottom - SVG_CONFIG.yTop)) * (SVG_CONFIG.yMax - SVG_CONFIG.yMin); }

    function buildSplineModel(knotsY) {
      const [y0, y1, y2, y3] = knotsY;
      const h = 3;
      const D1 = y2 - 2 * y1 + y0;
      const D2 = y3 - 2 * y2 + y1;
      const M = [0, (2 / 45) * (4 * D1 - D2), (2 / 45) * (4 * D2 - D1), 0];
      const tKnots = [0, 3, 6, 9];
      const yKnots = [y0, y1, y2, y3];

      function getSegmentIndex(t) { return t <= 3 ? 0 : t <= 6 ? 1 : 2; }
      function evalValue(t) {
        const i = getSegmentIndex(t);
        const u = t - tKnots[i], v = h - u;
        return (M[i] * Math.pow(v, 3) + M[i + 1] * Math.pow(u, 3)) / (6 * h) + (yKnots[i] / h - (M[i] * h) / 6) * v + (yKnots[i + 1] / h - (M[i + 1] * h) / 6) * u;
      }
      function evalSlope(t) {
        const i = getSegmentIndex(t);
        const u = t - tKnots[i], v = h - u;
        return (-M[i] * v * v + M[i + 1] * u * u) / (2 * h) + (yKnots[i + 1] - yKnots[i]) / h - ((M[i + 1] - M[i]) * h) / 6;
      }
      function findZeroSlopeTimes() {
        const roots = [];
        const step = 0.02;
        for (let t = 0; t < 10; t += step) {
          const s1 = evalSlope(t), s2 = evalSlope(t + step);
          if (Math.abs(s1) < 1e-7) {
            if (roots.length === 0 || Math.abs(t - roots[roots.length - 1]) > 0.2) roots.push(t);
          } else if (s1 * s2 < 0) {
            let a = t, b = t + step;
            for (let iter = 0; iter < 30; iter++) {
              const mid = 0.5 * (a + b);
              if (evalSlope(a) * evalSlope(mid) <= 0) b = mid; else a = mid;
            }
            const r = 0.5 * (a + b);
            if (r >= 0.05 && r <= 9.95 && (roots.length === 0 || Math.abs(r - roots[roots.length - 1]) > 0.2)) roots.push(r);
          }
        }
        return roots;
      }
      function findTimesForValue(targetY) {
        const roots = [];
        const step = 0.02;
        for (let t = 0; t <= 10 - step + 1e-9; t += step) {
          const f1 = evalValue(t) - targetY, f2 = evalValue(t + step) - targetY;
          if (Math.abs(f1) < 1e-6) {
            if (roots.length === 0 || Math.abs(t - roots[roots.length - 1]) > 0.2) roots.push(t);
          } else if (f1 * f2 <= 0) {
            let a = t, b = t + step;
            for (let iter = 0; iter < 30; iter++) {
              const mid = 0.5 * (a + b);
              if ((evalValue(a) - targetY) * (evalValue(mid) - targetY) <= 0) b = mid; else a = mid;
            }
            const r = 0.5 * (a + b);
            if (r >= 0 && r <= 10.001 && (roots.length === 0 || Math.abs(r - roots[roots.length - 1]) > 0.2)) roots.push(Math.min(10, Math.max(0, r)));
          }
        }
        return roots;
      }
      return { knotsY, evalValue, evalSlope, findZeroSlopeTimes, findTimesForValue };
    }

    // Spline-graph problem generator (needed by KIN-01 / KIN-02). Kept in the app so it works with any version of the data file.
    function generateSplineProblemVars(probId) {
      let model = null;
      let chosenKnots = probId === 1 ? [0, 4, -1, 3] : [1, 5, -1, 3];

      for (let attempt = 0; attempt < 250; attempt++) {
        const y0 = randInt(-1, 5);
        const dir = Math.random() < 0.5 ? 1 : -1;
        const delta1 = randInt(3, 5) * dir;
        const y1 = y0 + delta1;
        const delta2 = -randInt(3, 6) * dir;
        const y2 = y1 + delta2;
        const delta3 = randInt(2, 5) * dir;
        const y3 = y2 + delta3;

        if (y1 < -1 || y1 > 7 || y2 < -1 || y2 > 7 || y3 < -1 || y3 > 6) continue;

        const candidate = buildSplineModel([y0, y1, y2, y3]);
        let inBounds = true;
        for (let t = 0; t <= 10; t += 0.1) {
          const val = candidate.evalValue(t);
          if (val < -1.85 || val > 7.85) {
            inBounds = false;
            break;
          }
        }
        if (!inBounds) continue;

        const restTimes = candidate.findZeroSlopeTimes();
        if (restTimes.length >= 1 && restTimes.length <= 2) {
          model = candidate;
          chosenKnots = [y0, y1, y2, y3];
          break;
        }
      }

      if (!model) {
        model = buildSplineModel(chosenKnots);
      }

      const intervalPairs = [
        [0, 3], [0, 6], [0, 9], [3, 6], [3, 9], [6, 9], [1, 7], [2, 8]
      ];
      const pair1 = intervalPairs[randInt(0, intervalPairs.length - 1)];
      let pair2 = intervalPairs[randInt(0, intervalPairs.length - 1)];
      if (pair2[0] === pair1[0] && pair2[1] === pair1[1]) {
        pair2 = [3, 9];
      }

      if (probId === 1) {
        const instCandidates1 = [1.0, 1.25, 1.5, 1.75, 2.0, 2.5];
        const instCandidates2 = [4.25, 4.5, 4.75, 5.0, 5.5, 7.5];
        const tInst1 = instCandidates1[randInt(0, instCandidates1.length - 1)];
        const tInst2 = instCandidates2[randInt(0, instCandidates2.length - 1)];
        return {
          knotsY: chosenKnots,
          tAvg1: pair1[0],
          tAvg2: pair1[1],
          tInst1,
          tDisp1: pair2[0],
          tDisp2: pair2[1],
          tInst2
        };
      } else {
        const taCandidates = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        const ta = taCandidates[randInt(0, taCandidates.length - 1)];
        const possibleVb = [-1, 0, 1, 2, 3, 4, 5];
        let chosenVb = 0;
        const validVbs = possibleVb.filter(v => {
          const roots = model.findTimesForValue(v);
          if (roots.length === 0 || roots.length > 3) return false;
          return roots.every(r => Math.abs(model.evalSlope(r)) > 0.35);
        });
        if (validVbs.length > 0) {
          chosenVb = validVbs[randInt(0, validVbs.length - 1)];
        }
        const tdCandidates = [1.5, 1.75, 2.0, 3.5, 4.5, 5.0, 7.5, 8.0];
        const td = tdCandidates[randInt(0, tdCandidates.length - 1)];
        return {
          knotsY: chosenKnots,
          ta,
          vb: chosenVb,
          tc1: pair1[0],
          tc2: pair1[1],
          td
        };
      }
    }

    function formatSigned(val, decimals = 2) {
      const rounded = Number(val.toFixed(decimals));
      if (Math.abs(rounded) < 1e-9) return (0).toFixed(decimals);
      return (rounded > 0 ? "+" : "") + rounded.toFixed(decimals);
    }

    function findNeutralSplineTimes(probId, model, params) {
      let qTimes = probId === 1 
        ? [params.tAvg1, params.tAvg2, params.tInst1, params.tDisp1, params.tDisp2, params.tInst2]
        : [params.ta, ...(model ? (model.findTimesForValue(params.vb) || []) : []), params.tc1, params.tc2, params.td];

      let bestTangentT = 5.0, maxTanDist = -1;
      for (let t = 1.0; t <= 9.0; t += 0.25) {
        const minDist = Math.min(...qTimes.map(qt => Math.abs(t - qt)));
        if (minDist > maxTanDist) { maxTanDist = minDist; bestTangentT = t; }
      }
      const pairCandidates = [[1.0, 4.0], [1.5, 4.5], [2.0, 5.0], [2.5, 5.5], [3.0, 6.0], [3.5, 6.5], [4.0, 7.0], [4.5, 7.5], [5.0, 8.0], [5.5, 8.5], [2.0, 7.0], [1.0, 5.0]];
      let bestSecantPair = [2.0, 5.0], maxSecDist = -1;
      for (const pair of pairCandidates) {
        const score = Math.min(Math.min(...qTimes.map(qt => Math.abs(pair[0] - qt))), Math.min(...qTimes.map(qt => Math.abs(pair[1] - qt))));
        if (score > maxSecDist) { maxSecDist = score; bestSecantPair = pair; }
      }
      return { tangentT: bestTangentT, secantT1: bestSecantPair[0], secantT2: bestSecantPair[1] };
    }

    const splineWidgetStates = {
      1: { probId: 1, unitPosition: "m", yAxisTitle: "Position x (meters)", zeroLabel: "x = 0 m", vars: null, model: null, showTangent: false, showSecant: false, tangentT: 5.0, secantT1: 2.0, secantT2: 5.0, hasMovedTangent: false, hasMovedSecant: false },
      2: { probId: 2, unitPosition: "m/s", yAxisTitle: "Velocity v (m/s)", zeroLabel: "v = 0 m/s", vars: null, model: null, showTangent: false, showSecant: false, tangentT: 5.0, secantT1: 2.0, secantT2: 5.0, hasMovedTangent: false, hasMovedSecant: false }
    };
    let activeSplineDrag = null;

    function syncSplineStateWithVars(probId, v, resetTools = false) {
      const st = splineWidgetStates[probId];
      const knotsKey = JSON.stringify(v.knotsY || []);
      const prevKey = st.vars ? JSON.stringify(st.vars.knotsY || []) : "";
      st.vars = v;
      st.model = buildSplineModel(v.knotsY || (probId === 1 ? [0, 4, -1, 3] : [1, 5, -1, 3]));
      if (resetTools || knotsKey !== prevKey) {
        const neutral = findNeutralSplineTimes(probId, st.model, v);
        st.tangentT = neutral.tangentT; st.secantT1 = neutral.secantT1; st.secantT2 = neutral.secantT2;
        st.hasMovedTangent = false; st.hasMovedSecant = false;
        if (resetTools) { st.showTangent = false; st.showSecant = false; }
      }
    }

    function buildInteractiveSplineSVG(probId, v) {
      syncSplineStateWithVars(probId, v, false);
      const st = splineWidgetStates[probId];
      const model = st.model;
      let gridHTML = "";
      for (let t = 0; t <= 10; t++) gridHTML += `<line x1="${tToSvgX(t)}" y1="${SVG_CONFIG.yTop}" x2="${tToSvgX(t)}" y2="${SVG_CONFIG.yBottom}" stroke="#f1f5f9" stroke-width="1.2"/>`;
      for (let y = -2; y <= 8; y++) gridHTML += `<line x1="${SVG_CONFIG.xLeft}" y1="${yToSvgY(y)}" x2="${SVG_CONFIG.xRight + 20}" y2="${yToSvgY(y)}" stroke="#f1f5f9" stroke-width="1.2"/>`;

      const pyZero = yToSvgY(0);
      const zeroHTML = `<line x1="${SVG_CONFIG.xLeft}" y1="${pyZero}" x2="${SVG_CONFIG.xRight + 22}" y2="${pyZero}" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="3.5,2.5"/><text x="${SVG_CONFIG.xRight + 28}" y="${pyZero + 4}" fill="#1e3a8a" font-size="12.5" class="mono" font-weight="500">${st.zeroLabel}</text>`;

      let axesHTML = `<line x1="${SVG_CONFIG.xLeft}" y1="${SVG_CONFIG.yTop}" x2="${SVG_CONFIG.xLeft}" y2="${SVG_CONFIG.yBottom}" stroke="#1e293b" stroke-width="1.8"/><line x1="${SVG_CONFIG.xLeft}" y1="${SVG_CONFIG.yBottom}" x2="${SVG_CONFIG.xRight}" y2="${SVG_CONFIG.yBottom}" stroke="#1e293b" stroke-width="1.8"/>`;
      for (let y = -2; y <= 8; y++) {
        const py = yToSvgY(y);
        axesHTML += `<line x1="${SVG_CONFIG.xLeft - 5}" y1="${py}" x2="${SVG_CONFIG.xLeft + 4}" y2="${py}" stroke="#1e293b" stroke-width="1.5"/><text x="${SVG_CONFIG.xLeft - 9}" y="${py + 4.5}" text-anchor="end" fill="#0f172a" font-size="13.5" font-weight="700">${y > 0 ? '+' + y : y}</text>`;
      }
      for (let t = 0; t <= 10; t++) {
        const px = tToSvgX(t);
        axesHTML += `<line x1="${px}" y1="${SVG_CONFIG.yBottom - 5}" x2="${px}" y2="${SVG_CONFIG.yBottom + 5}" stroke="#1e293b" stroke-width="1.5"/><text x="${px}" y="${SVG_CONFIG.yBottom + 21}" text-anchor="middle" fill="#0f172a" font-size="13.5" font-weight="700">${t}</text>`;
      }
      const yCenter = (SVG_CONFIG.yTop + SVG_CONFIG.yBottom) / 2;
      axesHTML += `<text x="${(SVG_CONFIG.xLeft + SVG_CONFIG.xRight) / 2}" y="${SVG_CONFIG.yBottom + 48}" text-anchor="middle" fill="#1e293b" font-size="14.5" font-weight="700">Time t (seconds)</text><text x="36" y="${yCenter}" text-anchor="middle" fill="#1e293b" font-size="14.5" font-weight="700" transform="rotate(-90, 36, ${yCenter})">${st.yAxisTitle}</text>`;

      const pts = [];
      for (let t = 0; t <= 10.45; t += 0.05) pts.push(`${t === 0 ? "M" : "L"} ${tToSvgX(t).toFixed(2)} ${yToSvgY(model.evalValue(t)).toFixed(2)}`);
      const curveD = pts.join(" ");

      const t0 = st.tangentT, y0 = model.evalValue(t0), slopeTan = model.evalSlope(t0);
      const tanX1 = tToSvgX(-0.5), tanY1 = yToSvgY(y0 + slopeTan * (-0.5 - t0)), tanX2 = tToSvgX(11.0), tanY2 = yToSvgY(y0 + slopeTan * (11.0 - t0));
      const tanCx = tToSvgX(t0), tanCy = yToSvgY(y0), tanLabelTransform = y0 > 6.5 ? "translate(0, 34)" : "translate(0, -16)";
      const tanLabelStr = `(${t0.toFixed(2)}s, ${formatSigned(y0, 2)}${st.unitPosition})`;

      const t1 = st.secantT1, t2 = st.secantT2, y1 = model.evalValue(t1), y2 = model.evalValue(t2);
      const slopeSec = Math.abs(t2 - t1) > 1e-4 ? (y2 - y1) / (t2 - t1) : model.evalSlope(t1);
      const secX1 = tToSvgX(-0.5), secY1 = yToSvgY(y1 + slopeSec * (-0.5 - t1)), secX2 = tToSvgX(11.0), secY2 = yToSvgY(y1 + slopeSec * (11.0 - t1));
      const sec1Transform = y1 > 6.5 ? "translate(0, 34)" : "translate(0, -16)", sec2Transform = y2 > 6.5 ? "translate(0, 34)" : "translate(0, -16)";
      const sec1Str = `(${t1.toFixed(1)}s, ${formatSigned(y1, 1)}${st.unitPosition})`, sec2Str = `(${t2.toFixed(1)}s, ${formatSigned(y2, 1)}${st.unitPosition})`;

      const clipId = `plotClip_${probId}_${Math.random().toString(36).slice(2, 7)}`;

      return `
      <div class="spline-graph-widget bg-[#f8fafc] border border-slate-200/90 rounded-2xl p-3 sm:p-5 my-3" data-prob-id="${probId}" onclick="event.stopPropagation()">
        <div class="max-w-3xl mx-auto mb-3 flex flex-wrap items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div class="flex flex-wrap items-center gap-4 sm:gap-6">
            <label class="inline-flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" data-role="chk-tangent" ${st.showTangent ? "checked" : ""} onchange="toggleSplineTool(${probId}, 'tangent', this.checked)" class="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer accent-rose-600" />
              <span class="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700"><span class="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>Draw Tangent</span>
            </label>
            <label class="inline-flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" data-role="chk-secant" ${st.showSecant ? "checked" : ""} onchange="toggleSplineTool(${probId}, 'secant', this.checked)" class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600" />
              <span class="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700"><span class="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>Draw Secant</span>
            </label>
          </div>
          <span class="text-[11px] text-slate-500 font-medium">Drag handles on curve or hover to inspect coordinates</span>
        </div>
        <div class="max-w-3xl mx-auto bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-4 shadow-2xs">
          <div class="w-full overflow-hidden">
            <svg data-role="svg-graph" viewBox="0 0 740 420" class="w-full h-auto block no-select touch-none">
              <defs><clipPath id="${clipId}"><rect x="95" y="20" width="560" height="335" /></clipPath></defs>
              <g>${gridHTML}</g><g>${zeroHTML}</g><g>${axesHTML}</g>
              <g clip-path="url(#${clipId})">
                <path data-role="curve-path" d="${curveD}" fill="none" stroke="#256eb8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
                <line data-role="secant-line" x1="${secX1}" y1="${secY1}" x2="${secX2}" y2="${secY2}" stroke="#059669" stroke-width="2.5" stroke-dasharray="7,5" class="${st.showSecant ? "" : "hidden"}" />
                <line data-role="tangent-line" x1="${tanX1}" y1="${tanY1}" x2="${tanX2}" y2="${tanY2}" stroke="#e11d48" stroke-width="2.5" class="${st.showTangent ? "" : "hidden"}" />
                <g data-role="crosshair" class="hidden pointer-events-none">
                  <line data-role="crosshair-v" x1="0" y1="25" x2="0" y2="355" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" />
                  <line data-role="crosshair-h" x1="95" y1="0" x2="645" y2="0" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" />
                  <circle data-role="crosshair-dot" cx="0" cy="0" r="3.5" fill="#475569" />
                  <g data-role="crosshair-label" class="hidden">
                    <rect data-role="crosshair-label-bg" x="0" y="0" width="124" height="24" rx="6" fill="#0f172a" stroke="#e11d48" stroke-width="1.5" />
                    <text data-role="crosshair-label-text" x="62" y="16" text-anchor="middle" fill="#ffffff" font-size="11" class="mono" font-weight="600"></text>
                  </g>
                </g>
              </g>
              <rect x="95" y="20" width="560" height="335" fill="rgba(0,0,0,0.0001)" pointer-events="all" class="cursor-crosshair" onpointerdown="onSplinePlotPointerDown(event, ${probId})" />
              <g data-role="secant-handles" class="${st.showSecant ? "" : "hidden"}">
                <g data-role="secant-handle-1" transform="translate(${tToSvgX(t1)}, ${yToSvgY(y1)})" class="graph-handle" onpointerdown="startSplineHandleDrag(event, ${probId}, 'secant1')">
                  <circle cx="0" cy="0" r="30" fill="rgba(0,0,0,0.001)" pointer-events="all" /><circle cx="0" cy="0" r="14" fill="rgba(5, 150, 105, 0.22)" class="handle-halo" pointer-events="none" /><circle cx="0" cy="0" r="7.5" fill="#059669" stroke="#ffffff" stroke-width="2.5" pointer-events="none" />
                  <g data-role="secant-label-group-1" transform="${sec1Transform}" pointer-events="none"><rect x="-52" y="-18" width="104" height="20" rx="5" fill="#065f46" /><text data-role="secant-label-text-1" x="0" y="-4" text-anchor="middle" fill="#ffffff" font-size="10.5" class="mono" font-weight="600">${sec1Str}</text></g>
                </g>
                <g data-role="secant-handle-2" transform="translate(${tToSvgX(t2)}, ${yToSvgY(y2)})" class="graph-handle" onpointerdown="startSplineHandleDrag(event, ${probId}, 'secant2')">
                  <circle cx="0" cy="0" r="30" fill="rgba(0,0,0,0.001)" pointer-events="all" /><circle cx="0" cy="0" r="14" fill="rgba(5, 150, 105, 0.22)" class="handle-halo" pointer-events="none" /><circle cx="0" cy="0" r="7.5" fill="#059669" stroke="#ffffff" stroke-width="2.5" pointer-events="none" />
                  <g data-role="secant-label-group-2" transform="${sec2Transform}" pointer-events="none"><rect x="-52" y="-18" width="104" height="20" rx="5" fill="#065f46" /><text data-role="secant-label-text-2" x="0" y="-4" text-anchor="middle" fill="#ffffff" font-size="10.5" class="mono" font-weight="600">${sec2Str}</text></g>
                </g>
              </g>
              <g data-role="tangent-handles" class="${st.showTangent ? "" : "hidden"}">
                <g data-role="tangent-handle" transform="translate(${tanCx}, ${tanCy})" class="graph-handle" onpointerdown="startSplineHandleDrag(event, ${probId}, 'tangent')">
                  <circle cx="0" cy="0" r="30" fill="rgba(0,0,0,0.001)" pointer-events="all" /><circle cx="0" cy="0" r="15" fill="rgba(225, 29, 72, 0.22)" class="handle-halo" pointer-events="none" /><circle cx="0" cy="0" r="7.5" fill="#e11d48" stroke="#ffffff" stroke-width="2.5" pointer-events="none" />
                  <g data-role="tangent-label-group" transform="${tanLabelTransform}" pointer-events="none"><rect x="-58" y="-19" width="116" height="21" rx="5" fill="#9f1239" /><text data-role="tangent-label-text" x="0" y="-5" text-anchor="middle" fill="#ffffff" font-size="10.5" class="mono" font-weight="600">${tanLabelStr}</text></g>
                </g>
              </g>
            </svg>
          </div>
        </div>
      </div>`;
    }

    function updateSplineWidgetsDOM(probId) {
      const st = splineWidgetStates[probId];
      if (!st || !st.model) return;
      const model = st.model;
      document.querySelectorAll(`.spline-graph-widget[data-prob-id="${probId}"]`).forEach(widget => {
        const chkTan = widget.querySelector('[data-role="chk-tangent"]');
        const chkSec = widget.querySelector('[data-role="chk-secant"]');
        if (chkTan) chkTan.checked = st.showTangent;
        if (chkSec) chkSec.checked = st.showSecant;
        const tanLine = widget.querySelector('[data-role="tangent-line"]'), tanHandles = widget.querySelector('[data-role="tangent-handles"]');
        if (tanLine && tanHandles) {
          if (!st.showTangent) { tanLine.classList.add("hidden"); tanHandles.classList.add("hidden"); }
          else {
            tanLine.classList.remove("hidden"); tanHandles.classList.remove("hidden");
            const t0 = st.tangentT, y0 = model.evalValue(t0), slope = model.evalSlope(t0);
            tanLine.setAttribute("x1", tToSvgX(-0.5)); tanLine.setAttribute("y1", yToSvgY(y0 + slope * (-0.5 - t0)));
            tanLine.setAttribute("x2", tToSvgX(11.0)); tanLine.setAttribute("y2", yToSvgY(y0 + slope * (11.0 - t0)));
            const handle = widget.querySelector('[data-role="tangent-handle"]'); if (handle) handle.setAttribute("transform", `translate(${tToSvgX(t0)}, ${yToSvgY(y0)})`);
            const lg = widget.querySelector('[data-role="tangent-label-group"]'); if (lg) lg.setAttribute("transform", y0 > 6.5 ? "translate(0, 34)" : "translate(0, -16)");
            const lt = widget.querySelector('[data-role="tangent-label-text"]'); if (lt) lt.textContent = `(${t0.toFixed(2)}s, ${formatSigned(y0, 2)}${st.unitPosition})`;
          }
        }
        const secLine = widget.querySelector('[data-role="secant-line"]'), secHandles = widget.querySelector('[data-role="secant-handles"]');
        if (secLine && secHandles) {
          if (!st.showSecant) { secLine.classList.add("hidden"); secHandles.classList.add("hidden"); }
          else {
            secLine.classList.remove("hidden"); secHandles.classList.remove("hidden");
            const t1 = st.secantT1, t2 = st.secantT2, y1 = model.evalValue(t1), y2 = model.evalValue(t2);
            const slope = Math.abs(t2 - t1) > 1e-4 ? (y2 - y1) / (t2 - t1) : model.evalSlope(t1);
            secLine.setAttribute("x1", tToSvgX(-0.5)); secLine.setAttribute("y1", yToSvgY(y1 + slope * (-0.5 - t1)));
            secLine.setAttribute("x2", tToSvgX(11.0)); secLine.setAttribute("y2", yToSvgY(y1 + slope * (11.0 - t1)));
            const h1 = widget.querySelector('[data-role="secant-handle-1"]'), h2 = widget.querySelector('[data-role="secant-handle-2"]');
            if (h1) h1.setAttribute("transform", `translate(${tToSvgX(t1)}, ${yToSvgY(y1)})`);
            if (h2) h2.setAttribute("transform", `translate(${tToSvgX(t2)}, ${yToSvgY(y2)})`);
            const lg1 = widget.querySelector('[data-role="secant-label-group-1"]'), lg2 = widget.querySelector('[data-role="secant-label-group-2"]');
            if (lg1) lg1.setAttribute("transform", y1 > 6.5 ? "translate(0, 34)" : "translate(0, -16)");
            if (lg2) lg2.setAttribute("transform", y2 > 6.5 ? "translate(0, 34)" : "translate(0, -16)");
            const lt1 = widget.querySelector('[data-role="secant-label-text-1"]'), lt2 = widget.querySelector('[data-role="secant-label-text-2"]');
            if (lt1) lt1.textContent = `(${t1.toFixed(1)}s, ${formatSigned(y1, 1)}${st.unitPosition})`;
            if (lt2) lt2.textContent = `(${t2.toFixed(1)}s, ${formatSigned(y2, 1)}${st.unitPosition})`;
          }
        }
      });
    }

    function toggleSplineTool(probId, toolName, isChecked) {
      const st = splineWidgetStates[probId];
      if (!st) return;
      if (toolName === "tangent") {
        st.showTangent = isChecked;
        if (isChecked && !st.hasMovedTangent && st.model && st.vars) st.tangentT = findNeutralSplineTimes(probId, st.model, st.vars).tangentT;
      } else if (toolName === "secant") {
        st.showSecant = isChecked;
        if (isChecked && !st.hasMovedSecant && st.model && st.vars) {
          const neutral = findNeutralSplineTimes(probId, st.model, st.vars);
          st.secantT1 = neutral.secantT1; st.secantT2 = neutral.secantT2;
        }
      }
      updateSplineWidgetsDOM(probId);
    }

    function getSvgPointFromEvent(svgEl, evt) {
      const pt = svgEl.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
      const ctm = svgEl.getScreenCTM();
      return ctm ? pt.matrixTransform(ctm.inverse()) : { x: 0, y: 0 };
    }

    function startSplineHandleDrag(evt, probId, handleType) {
      evt.stopPropagation(); evt.preventDefault();
      activeSplineDrag = { probId, handleType, svgEl: evt.currentTarget.closest("svg") };
      document.body.style.cursor = "grabbing";
    }

    function onSplinePlotPointerDown(evt, probId) {
      const st = splineWidgetStates[probId];
      if (!st || (!st.showTangent && !st.showSecant)) return;
      const svgEl = evt.currentTarget.closest("svg");
      if (!svgEl) return;
      const clickedT = Math.max(0, Math.min(10, svgXToT(getSvgPointFromEvent(svgEl, evt).x)));
      const candidates = [];
      if (st.showTangent) candidates.push({ type: "tangent", dist: Math.abs(clickedT - st.tangentT) });
      if (st.showSecant) { candidates.push({ type: "secant1", dist: Math.abs(clickedT - st.secantT1) }); candidates.push({ type: "secant2", dist: Math.abs(clickedT - st.secantT2) }); }
      if (candidates.length > 0) {
        candidates.sort((a, b) => a.dist - b.dist);
        if (candidates[0].dist < 1.8) {
          activeSplineDrag = { probId, handleType: candidates[0].type, svgEl };
          document.body.style.cursor = "grabbing";
          const snappedT = Math.round(clickedT * 20) / 20;
          if (candidates[0].type === "tangent") { st.tangentT = snappedT; st.hasMovedTangent = true; }
          else if (candidates[0].type === "secant1") { st.secantT1 = snappedT; st.hasMovedSecant = true; }
          else if (candidates[0].type === "secant2") { st.secantT2 = snappedT; st.hasMovedSecant = true; }
          updateSplineWidgetsDOM(probId);
        }
      }
    }

    window.addEventListener("pointermove", (evt) => {
      if (activeSplineDrag && activeSplineDrag.svgEl) {
        const { probId, handleType, svgEl } = activeSplineDrag;
        const st = splineWidgetStates[probId];
        if (st) {
          const snappedT = Math.max(0, Math.min(10, Math.round(svgXToT(getSvgPointFromEvent(svgEl, evt).x) * 20) / 20));
          if (handleType === "tangent") { st.tangentT = snappedT; st.hasMovedTangent = true; }
          else if (handleType === "secant1") { st.secantT1 = snappedT; st.hasMovedSecant = true; }
          else if (handleType === "secant2") { st.secantT2 = snappedT; st.hasMovedSecant = true; }
          updateSplineWidgetsDOM(probId);
        }
      }
      document.querySelectorAll(".spline-graph-widget").forEach(widget => {
        const probId = Number(widget.getAttribute("data-prob-id")), st = splineWidgetStates[probId], svgEl = widget.querySelector('[data-role="svg-graph"]');
        if (!st || !st.model || !svgEl || svgEl.getBoundingClientRect().width === 0) return;
        const svgPt = getSvgPointFromEvent(svgEl, evt);
        const crosshair = widget.querySelector('[data-role="crosshair"]'), labelGroup = widget.querySelector('[data-role="crosshair-label"]');
        if (!crosshair) return;
        if (svgPt.x >= SVG_CONFIG.xLeft && svgPt.x <= SVG_CONFIG.xRight + 20 && svgPt.y >= SVG_CONFIG.yTop && svgPt.y <= SVG_CONFIG.yBottom) {
          const tVal = Math.max(0, Math.min(10, svgXToT(svgPt.x)));
          let displayY = svgYToY(svgPt.y), hitLine = null;
          if (st.showTangent) {
            const t0 = st.tangentT, y0 = st.model.evalValue(t0), slopeTan = st.model.evalSlope(t0), yTan = y0 + slopeTan * (tVal - t0);
            const dx = (SVG_CONFIG.xRight - SVG_CONFIG.xLeft) / 10, dy = -slopeTan * (SVG_CONFIG.yBottom - SVG_CONFIG.yTop) / 10;
            if (Math.abs((svgPt.x - tToSvgX(t0)) * dy - (svgPt.y - yToSvgY(y0)) * dx) / (Math.hypot(dx, dy) || 1) < 14 && yTan >= SVG_CONFIG.yMin - 0.6 && yTan <= SVG_CONFIG.yMax + 0.6) {
              hitLine = { type: "tangent", yVal: yTan, color: "#e11d48" }; displayY = yTan;
            }
          }
          const px = tToSvgX(tVal), py = yToSvgY(displayY);
          crosshair.classList.remove("hidden");
          const chV = widget.querySelector('[data-role="crosshair-v"]'), chH = widget.querySelector('[data-role="crosshair-h"]'), dot = widget.querySelector('[data-role="crosshair-dot"]');
          if (chV) { chV.setAttribute("x1", px); chV.setAttribute("x2", px); }
          if (chH) { chH.setAttribute("y1", py); chH.setAttribute("y2", py); }
          if (dot) { dot.setAttribute("cx", px); dot.setAttribute("cy", py); }
          if (hitLine && labelGroup && dot) {
            labelGroup.classList.remove("hidden"); dot.setAttribute("r", "5"); dot.setAttribute("fill", hitLine.color);
            const labelBg = widget.querySelector('[data-role="crosshair-label-bg"]'), labelText = widget.querySelector('[data-role="crosshair-label-text"]');
            if (labelBg && labelText) {
              labelBg.setAttribute("stroke", hitLine.color); labelText.textContent = `(${tVal.toFixed(2)}s, ${formatSigned(displayY, 2)}${st.unitPosition})`;
              const badgeW = st.unitPosition.length > 2 ? 134 : 124, badgeH = 24;
              let badgeX = px + 12, badgeY = py - 28;
              if (badgeX + badgeW > SVG_CONFIG.xRight + 20) badgeX = px - badgeW - 12;
              if (badgeX < SVG_CONFIG.xLeft + 2) badgeX = SVG_CONFIG.xLeft + 2;
              if (badgeY < SVG_CONFIG.yTop) badgeY = py + 12;
              if (badgeY + badgeH > SVG_CONFIG.yBottom) badgeY = SVG_CONFIG.yBottom - badgeH;
              labelBg.setAttribute("width", badgeW); labelBg.setAttribute("height", badgeH);
              labelBg.setAttribute("x", badgeX); labelBg.setAttribute("y", badgeY);
              labelText.setAttribute("x", badgeX + badgeW / 2); labelText.setAttribute("y", badgeY + 16);
            }
          } else if (labelGroup && dot) {
            labelGroup.classList.add("hidden"); dot.setAttribute("r", "3.5"); dot.setAttribute("fill", "#475569");
          }
        } else {
          crosshair.classList.add("hidden"); if (labelGroup) labelGroup.classList.add("hidden");
        }
      });
    });

    window.addEventListener("pointerup", () => { activeSplineDrag = null; document.body.style.cursor = ""; });
    window.addEventListener("pointercancel", () => { activeSplineDrag = null; document.body.style.cursor = ""; });

    window.buildSplineModel = buildSplineModel;
    window.generateSplineProblemVars = generateSplineProblemVars;
    window.buildInteractiveSplineSVG = buildInteractiveSplineSVG;
    window.syncSplineStateWithVars = syncSplineStateWithVars;
    window.toggleSplineTool = toggleSplineTool;
    window.startSplineHandleDrag = startSplineHandleDrag;
    window.onSplinePlotPointerDown = onSplinePlotPointerDown;
}
installSplineEngine();

// 2. Builds the text shown under "Guided Solution": a short numbered list of steps.
function guidedSteps() {
  const items = Array.prototype.slice.call(arguments).filter(function (s) { return s; });
  return items.map(function (s, i) { return '<strong>Step ' + (i + 1) + ':</strong> ' + s; }).join('<br/>');
}

// 3. One drawing function per diagram name.
const DIAGRAM_DRAWERS = {
  splinePosGraph: function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return buildInteractiveSplineSVG(1, v);
  },
  splineVelGraph: function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return buildInteractiveSplineSVG(2, v);
  },
  collinearMasses: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 500 165" class="w-full max-w-lg mx-auto h-40 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <!-- Centerline axis -->
        <line x1="30" y1="75" x2="470" y2="75" stroke="${stroke}" stroke-dasharray="5 5" stroke-width="1.5"/>
        
        <!-- Mass A -->
        <circle cx="75" cy="75" r="24" fill="${boxFill}" stroke="${accent}" stroke-width="3"/>
        <text x="75" y="75" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="16" font-weight="800">A</text>
        <rect x="43" y="105" width="64" height="20" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
        <text x="75" y="119" text-anchor="middle" fill="#475569" font-size="12" font-weight="700">${v.mA} kg</text>
        
        <!-- Mass B -->
        <circle cx="230" cy="75" r="28" fill="${boxFill}" stroke="#7c3aed" stroke-width="3"/>
        <text x="230" y="75" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="16" font-weight="800">B</text>
        <rect x="198" y="108" width="64" height="20" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
        <text x="230" y="122" text-anchor="middle" fill="#475569" font-size="12" font-weight="700">${v.mB} kg</text>

        <!-- Mass C -->
        <circle cx="410" cy="75" r="22" fill="${boxFill}" stroke="#059669" stroke-width="3"/>
        <text x="410" y="75" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="16" font-weight="800">C</text>
        <rect x="378" y="103" width="64" height="20" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
        <text x="410" y="117" text-anchor="middle" fill="#475569" font-size="12" font-weight="700">${v.mC} kg</text>

        <!-- Top dimension: r_AB -->
        <line x1="75" y1="34" x2="230" y2="34" stroke="${accent}" stroke-width="2"/>
        <line x1="75" y1="28" x2="75" y2="40" stroke="${accent}" stroke-width="2"/>
        <line x1="230" y1="28" x2="230" y2="40" stroke="${accent}" stroke-width="2"/>
        <rect x="105" y="12" width="95" height="20" rx="4" fill="#ffffff" stroke="#93c5fd" stroke-width="1"/>
        <text x="152" y="26" text-anchor="middle" fill="${accent}" font-size="12" font-weight="800">r<tspan baseline-shift="sub" font-size="9">AB</tspan> = ${v.rABcm} cm</text>

        <!-- Bottom dimension: r_AC -->
        <rect x="135" y="137" width="230" height="23" rx="5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
        <text x="250" y="153" text-anchor="middle" fill="#334155" font-size="12" font-weight="700">Total r<tspan baseline-shift="sub" font-size="9">AC</tspan> = ${v.rACcm} cm (+x right &rarr;)</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  vtGraph: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 420 230" class="w-full max-w-sm mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <!-- Axes -->
        <line x1="70" y1="25" x2="70" y2="175" stroke="${stroke}" stroke-width="2.5"/>
        <line x1="70" y1="175" x2="385" y2="175" stroke="${stroke}" stroke-width="2.5"/>
        
        <!-- Axis Arrows -->
        <polygon points="70,18 65,28 75,28" fill="${stroke}"/>
        <polygon points="392,175 382,170 382,180" fill="${stroke}"/>

        <!-- Axis Labels -->
        <text x="225" y="215" text-anchor="middle" fill="${textCol}" font-size="14" font-weight="700">Time t (s)</text>
        <text x="-100" y="24" text-anchor="middle" fill="${textCol}" font-size="14" font-weight="700" transform="rotate(-90)">Speed v (m/s)</text>

        <!-- Origin Label -->
        <text x="58" y="190" text-anchor="end" fill="#64748b" font-size="13" font-weight="600">0</text>

        <!-- Guide Dashes -->
        <line x1="70" y1="65" x2="320" y2="65" stroke="#cbd5e1" stroke-dasharray="4 4" stroke-width="2"/>
        <line x1="320" y1="65" x2="320" y2="175" stroke="#cbd5e1" stroke-dasharray="4 4" stroke-width="2"/>

        <!-- Value Labels on Axes with Badges -->
        <rect x="20" y="53" width="44" height="24" rx="4" fill="#ffffff" stroke="#bfdbfe" stroke-width="1"/>
        <text x="42" y="69" text-anchor="middle" fill="${accent}" font-size="13" font-weight="800">${v.vf}</text>

        <rect x="296" y="180" width="48" height="22" rx="4" fill="#ffffff" stroke="#bfdbfe" stroke-width="1"/>
        <text x="320" y="195" text-anchor="middle" fill="${accent}" font-size="13" font-weight="800">${v.t} s</text>

        <!-- Velocity Slope Line -->
        <line x1="70" y1="175" x2="320" y2="65" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="320" cy="65" r="5.5" fill="${forceCol}"/>

        <!-- Point Coordinates Badge (comfortably above point) -->
        <rect x="205" y="26" width="130" height="26" rx="6" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5"/>
        <text x="270" y="43" text-anchor="middle" fill="${textCol}" font-size="13" font-weight="700">(${v.t} s, ${v.vf} m/s)</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  threeBlocksPush: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 480 155" class="w-full max-w-lg mx-auto h-40 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <!-- Floor line -->
        <line x1="20" y1="112" x2="460" y2="112" stroke="${stroke}" stroke-width="3"/>
        
        <!-- Applied Force F Arrow and Badge -->
        <line x1="25" y1="72" x2="95" y2="72" stroke="${forceCol}" stroke-width="4"/>
        <polygon points="95,64 107,72 95,80" fill="${forceCol}"/>
        <rect x="42" y="44" width="36" height="22" rx="4" fill="#ffffff" stroke="#fecdd3" stroke-width="1"/>
        <text x="60" y="59" text-anchor="middle" fill="${forceCol}" font-size="14" font-weight="800">F</text>
        
        <!-- Block 1 -->
        <rect x="110" y="46" width="70" height="66" rx="5" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="145" y="78" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">1</tspan></text>
        <rect x="117" y="120" width="56" height="20" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
        <text x="145" y="134" text-anchor="middle" fill="#475569" font-size="12" font-weight="700">${v.m1} kg</text>
        
        <!-- Block 2 -->
        <rect x="182" y="38" width="86" height="74" rx="5" fill="${boxFill}" stroke="#7c3aed" stroke-width="2.5"/>
        <text x="225" y="74" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">2</tspan></text>
        <rect x="197" y="120" width="56" height="20" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
        <text x="225" y="134" text-anchor="middle" fill="#475569" font-size="12" font-weight="700">${v.m2} kg</text>
        
        <!-- Block 3 -->
        <rect x="270" y="26" width="104" height="86" rx="5" fill="${boxFill}" stroke="#059669" stroke-width="2.5"/>
        <text x="322" y="68" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">3</tspan></text>
        <rect x="294" y="120" width="56" height="20" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
        <text x="322" y="134" text-anchor="middle" fill="#475569" font-size="12" font-weight="700">${v.m3} kg</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  twoBlocksPush: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 440 155" class="w-full max-w-md mx-auto h-40 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <!-- Floor line -->
        <line x1="20" y1="112" x2="420" y2="112" stroke="${stroke}" stroke-width="3"/>
        
        <!-- Applied Force F Arrow and Badge -->
        <line x1="30" y1="70" x2="115" y2="70" stroke="${forceCol}" stroke-width="4"/>
        <polygon points="115,62 127,70 115,78" fill="${forceCol}"/>
        <rect x="32" y="38" width="85" height="22" rx="4" fill="#ffffff" stroke="#fecdd3" stroke-width="1"/>
        <text x="74.5" y="53" text-anchor="middle" fill="${forceCol}" font-size="13" font-weight="800">F = ${v.F} N</text>
        
        <!-- Block 1 -->
        <rect x="125" y="34" width="110" height="78" rx="6" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="180" y="60" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="16" font-weight="800">m<tspan baseline-shift="sub" font-size="12">1</tspan></text>
        <rect x="142" y="74" width="76" height="22" rx="4" fill="#ffffff" stroke="#bfdbfe" stroke-width="1"/>
        <text x="180" y="89" text-anchor="middle" fill="${accent}" font-size="13" font-weight="700">${v.m1} kg</text>

        <!-- Block 2 -->
        <rect x="237" y="46" width="95" height="66" rx="6" fill="${boxFill}" stroke="#059669" stroke-width="2.5"/>
        <text x="285" y="68" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="16" font-weight="800">m<tspan baseline-shift="sub" font-size="12">2</tspan></text>
        <rect x="252" y="78" width="66" height="22" rx="4" fill="#ffffff" stroke="#a7f3d0" stroke-width="1"/>
        <text x="285" y="93" text-anchor="middle" fill="#059669" font-size="13" font-weight="700">${v.m2} kg</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  threeBlocksRope: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 560 155" class="w-full max-w-xl mx-auto h-40 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <!-- Floor line -->
        <line x1="15" y1="112" x2="545" y2="112" stroke="${stroke}" stroke-width="3"/>
        
        <!-- Block 1 -->
        <rect x="25" y="46" width="90" height="66" rx="6" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="70" y="68" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">1</tspan></text>
        <rect x="42" y="81" width="56" height="20" rx="4" fill="#ffffff" stroke="#bfdbfe" stroke-width="1"/>
        <text x="70" y="95" text-anchor="middle" fill="${accent}" font-size="12" font-weight="700">${v.m1} kg</text>

        <!-- Rope 1-2 & Badge -->
        <line x1="115" y1="78" x2="185" y2="78" stroke="#d97706" stroke-width="3.5"/>
        <rect x="127" y="48" width="46" height="22" rx="4" fill="#ffffff" stroke="#fde68a" stroke-width="1.2"/>
        <text x="150" y="63" text-anchor="middle" fill="#b45309" font-size="12" font-weight="800">T<tspan baseline-shift="sub" font-size="9">12</tspan></text>

        <!-- Block 2 -->
        <rect x="185" y="50" width="86" height="62" rx="6" fill="${boxFill}" stroke="#7c3aed" stroke-width="2.5"/>
        <text x="228" y="72" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">2</tspan></text>
        <rect x="200" y="83" width="56" height="20" rx="4" fill="#ffffff" stroke="#ddd6fe" stroke-width="1"/>
        <text x="228" y="97" text-anchor="middle" fill="#7c3aed" font-size="12" font-weight="700">${v.m2} kg</text>

        <!-- Rope 2-3 & Badge -->
        <line x1="271" y1="78" x2="341" y2="78" stroke="#d97706" stroke-width="3.5"/>
        <rect x="283" y="48" width="46" height="22" rx="4" fill="#ffffff" stroke="#fde68a" stroke-width="1.2"/>
        <text x="306" y="63" text-anchor="middle" fill="#b45309" font-size="12" font-weight="800">T<tspan baseline-shift="sub" font-size="9">23</tspan></text>

        <!-- Block 3 -->
        <rect x="341" y="55" width="82" height="57" rx="6" fill="${boxFill}" stroke="#059669" stroke-width="2.5"/>
        <text x="382" y="74" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">3</tspan></text>
        <rect x="354" y="85" width="56" height="20" rx="4" fill="#ffffff" stroke="#a7f3d0" stroke-width="1"/>
        <text x="382" y="99" text-anchor="middle" fill="#059669" font-size="12" font-weight="700">${v.m3} kg</text>

        <!-- Pulling Force F & Badge -->
        <line x1="423" y1="78" x2="490" y2="78" stroke="${forceCol}" stroke-width="4"/>
        <polygon points="490,70 503,78 490,86" fill="${forceCol}"/>
        <rect x="430" y="48" width="80" height="22" rx="4" fill="#ffffff" stroke="#fecdd3" stroke-width="1.2"/>
        <text x="470" y="63" text-anchor="middle" fill="${forceCol}" font-size="12" font-weight="800">F = ${v.F} N</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  atwood: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 340 230" class="w-full max-w-xs mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <!-- Ceiling Support -->
        <line x1="100" y1="18" x2="240" y2="18" stroke="${stroke}" stroke-width="4" stroke-linecap="round"/>
        <line x1="170" y1="18" x2="170" y2="48" stroke="${stroke}" stroke-width="3.5"/>
        
        <!-- Pulley -->
        <circle cx="170" cy="48" r="30" fill="#e2e8f0" stroke="${accent}" stroke-width="3.5"/>
        <circle cx="170" cy="48" r="6" fill="${stroke}"/>

        <!-- Ropes -->
        <line x1="140" y1="48" x2="140" y2="135" stroke="#d97706" stroke-width="3"/>
        <line x1="200" y1="48" x2="200" y2="105" stroke="#d97706" stroke-width="3"/>

        <!-- Mass 1 (Left, Lower) -->
        <rect x="110" y="135" width="60" height="52" rx="6" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="140" y="152" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">1</tspan></text>
        <rect x="117" y="162" width="46" height="20" rx="4" fill="#ffffff" stroke="#bfdbfe" stroke-width="1"/>
        <text x="140" y="176" text-anchor="middle" fill="${accent}" font-size="12" font-weight="700">${v.m1} kg</text>

        <!-- Mass 2 (Right, Higher) -->
        <rect x="172" y="105" width="56" height="46" rx="6" fill="${boxFill}" stroke="#059669" stroke-width="2.5"/>
        <text x="200" y="121" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">2</tspan></text>
        <rect x="177" y="131" width="46" height="20" rx="4" fill="#ffffff" stroke="#a7f3d0" stroke-width="1"/>
        <text x="200" y="145" text-anchor="middle" fill="#059669" font-size="12" font-weight="700">${v.m2} kg</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  halfAtwood: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 420 200" class="w-full max-w-sm mx-auto h-50 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <!-- Table Base -->
        <rect x="30" y="85" width="240" height="100" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        
        <!-- Pulley at corner -->
        <circle cx="272" cy="85" r="18" fill="${boxFill}" stroke="${accent}" stroke-width="3"/>
        <circle cx="272" cy="85" r="4.5" fill="${stroke}"/>

        <!-- Mass 2 on table -->
        <rect x="90" y="40" width="76" height="45" rx="6" fill="${boxFill}" stroke="#7c3aed" stroke-width="2.5"/>
        <text x="128" y="55" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">2</tspan></text>
        <rect x="100" y="64" width="56" height="20" rx="4" fill="#ffffff" stroke="#ddd6fe" stroke-width="1"/>
        <text x="128" y="78" text-anchor="middle" fill="#7c3aed" font-size="12" font-weight="700">${v.m2} kg</text>

        <!-- String connecting masses -->
        <line x1="166" y1="68" x2="272" y2="68" stroke="#d97706" stroke-width="3"/>
        <line x1="290" y1="85" x2="290" y2="135" stroke="#d97706" stroke-width="3"/>

        <!-- Mass 1 hanging -->
        <rect x="262" y="135" width="56" height="48" rx="6" fill="${boxFill}" stroke="#059669" stroke-width="2.5"/>
        <text x="290" y="150" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">1</tspan></text>
        <rect x="267" y="160" width="46" height="20" rx="4" fill="#ffffff" stroke="#a7f3d0" stroke-width="1"/>
        <text x="290" y="174" text-anchor="middle" fill="#059669" font-size="12" font-weight="700">${v.m1} kg</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  symmetricRopes: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    {
      const hasTheta = typeof v.theta === 'number';
      return `<svg viewBox="0 0 440 190" class="w-full max-w-sm mx-auto h-48 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <!-- Ceiling -->
        <line x1="30" y1="26" x2="410" y2="26" stroke="${stroke}" stroke-width="4" stroke-linecap="round"/>
        
        <!-- Support Ropes -->
        <line x1="75" y1="26" x2="220" y2="92" stroke="#d97706" stroke-width="3.5"/>
        <line x1="365" y1="26" x2="220" y2="92" stroke="#d97706" stroke-width="3.5"/>
        
        ${hasTheta ? `
        <!-- Left Angle Reference & Arc -->
        <line x1="75" y1="26" x2="145" y2="26" stroke="#94a3b8" stroke-dasharray="3 3" stroke-width="1.5"/>
        <path d="M 120 26 A 45 45 0 0 1 116 46" fill="none" stroke="${accent}" stroke-width="2"/>
        <rect x="126" y="32" width="76" height="22" rx="4" fill="#ffffff" stroke="#93c5fd" stroke-width="1.2"/>
        <text x="164" y="47" text-anchor="middle" fill="${accent}" font-size="12" font-weight="800">&theta; = ${v.theta}&deg;</text>

        <!-- Right Angle Reference & Arc -->
        <line x1="365" y1="26" x2="295" y2="26" stroke="#94a3b8" stroke-dasharray="3 3" stroke-width="1.5"/>
        <path d="M 320 26 A 45 45 0 0 0 324 46" fill="none" stroke="${accent}" stroke-width="2"/>
        <rect x="238" y="32" width="76" height="22" rx="4" fill="#ffffff" stroke="#93c5fd" stroke-width="1.2"/>
        <text x="276" y="47" text-anchor="middle" fill="${accent}" font-size="12" font-weight="800">&theta; = ${v.theta}&deg;</text>
        ` : `
        ${v.FT ? `
        <rect x="95" y="36" width="84" height="22" rx="4" fill="#ffffff" stroke="#fde68a" stroke-width="1.2"/>
        <text x="137" y="51" text-anchor="middle" fill="#b45309" font-size="12" font-weight="800">T = ${v.FT} N</text>
        <rect x="261" y="36" width="84" height="22" rx="4" fill="#ffffff" stroke="#fde68a" stroke-width="1.2"/>
        <text x="303" y="51" text-anchor="middle" fill="#b45309" font-size="12" font-weight="800">T = ${v.FT} N</text>
        ` : ''}
        `}

        <!-- Knot and Vertical Drop -->
        <circle cx="220" cy="92" r="5" fill="#b45309"/>
        <line x1="220" y1="92" x2="220" y2="120" stroke="#d97706" stroke-width="3.5"/>

        <!-- Suspended Mass Block -->
        <rect x="185" y="120" width="70" height="50" rx="6" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="220" y="142" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">Mass</text>
        <text x="220" y="158" text-anchor="middle" dominant-baseline="central" fill="#475569" font-size="12" font-weight="700">${v.W ? v.W + ' N' : (v.m ? v.m + ' kg' : '')}</text>
      </svg>`;
    }
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  twoMenRopesRock: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 460 195" class="w-full max-w-md mx-auto h-48 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <!-- Left & Right Platforms -->
        <line x1="15" y1="55" x2="115" y2="55" stroke="${stroke}" stroke-width="3"/>
        <line x1="345" y1="45" x2="445" y2="45" stroke="${stroke}" stroke-width="3"/>

        <!-- Left Person -->
        <circle cx="65" cy="22" r="8" fill="${boxFill}" stroke="${textCol}" stroke-width="2.5"/>
        <line x1="65" y1="30" x2="65" y2="45" stroke="${textCol}" stroke-width="2.8"/>
        <line x1="65" y1="45" x2="56" y2="55" stroke="${textCol}" stroke-width="2.8"/>
        <line x1="65" y1="45" x2="74" y2="55" stroke="${textCol}" stroke-width="2.8"/>

        <!-- Right Person -->
        <circle cx="395" cy="14" r="8" fill="${boxFill}" stroke="${textCol}" stroke-width="2.5"/>
        <line x1="395" y1="22" x2="395" y2="36" stroke="${textCol}" stroke-width="2.8"/>
        <line x1="395" y1="36" x2="386" y2="45" stroke="${textCol}" stroke-width="2.8"/>
        <line x1="395" y1="36" x2="404" y2="45" stroke="${textCol}" stroke-width="2.8"/>

        <!-- Ropes to Rock -->
        <line x1="72" y1="38" x2="230" y2="112" stroke="#d97706" stroke-width="3.5"/>
        <line x1="388" y1="30" x2="230" y2="112" stroke="#d97706" stroke-width="3.5"/>

        <!-- Horizontal Reference Line at Rock Knot -->
        <line x1="125" y1="112" x2="335" y2="112" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1.5"/>

        <!-- Left Rope Labels -->
        <rect x="92" y="64" width="88" height="22" rx="4" fill="#ffffff" stroke="#93c5fd" stroke-width="1.2"/>
        <text x="136" y="79" text-anchor="middle" fill="${accent}" font-size="12" font-weight="800">${v.T1} N @ ${v.theta1}&deg;</text>

        <!-- Right Rope Labels -->
        <rect x="280" y="60" width="82" height="22" rx="4" fill="#ffffff" stroke="#fde68a" stroke-width="1.2"/>
        <text x="321" y="75" text-anchor="middle" fill="#b45309" font-size="12" font-weight="800">T<tspan baseline-shift="sub" font-size="9">2</tspan>, &theta;<tspan baseline-shift="sub" font-size="9">2</tspan> = ?</text>

        <!-- Suspended Rock -->
        <circle cx="230" cy="146" r="28" fill="#cbd5e1" stroke="${stroke}" stroke-width="2.5"/>
        <line x1="230" y1="112" x2="230" y2="118" stroke="#d97706" stroke-width="3.5"/>
        <text x="230" y="146" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="13" font-weight="800">${v.m} kg</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  inclineAtwood: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", textCol = "#0f172a", boxFill = "#f8fafc", G = "#059669", O = "#d97706";
    const th = v.theta || 26, t = th * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t), xr = 290;
    const run = Math.min(250, 105 / Math.tan(t)), H = run * Math.tan(t), x0 = xr - run, vy = 100, gy = vy + H;
    const ux = c, uy = -sn, nx = -sn, ny = -c;
    const Cx = xr + 7 * nx + 24 * ux, Cy = vy + 7 * ny + 24 * uy;
    const Tx = Cx + 13 * nx, Ty = Cy + 13 * ny;
    const s = 0.34, px = x0 + run * s, py = gy - H * s;
    const ax = px + 32 * c - 20 * sn, ay = py - 32 * sn - 20 * c;
    const bx = Cx + 13, bTop = Cy + 50;
    const mx = (ax + Tx) / 2, my = (ay + Ty) / 2;
    return `<svg viewBox="0 0 440 225" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <polygon points="${x0},${gy} ${xr},${gy} ${xr},${vy}" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <line x1="${xr}" y1="${vy}" x2="${Cx}" y2="${Cy}" stroke="${stroke}" stroke-width="3"/>
        <circle cx="${Cx}" cy="${Cy}" r="13" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/><circle cx="${Cx}" cy="${Cy}" r="3.5" fill="${stroke}"/>
        <path d="M ${x0 + 55} ${gy} A 55 55 0 0 0 ${x0 + 55 * c} ${gy - 55 * sn}" fill="none" stroke="${accent}" stroke-width="2.2"/>
        <text x="${x0 + 62}" y="${th < 16 ? gy + 17 : gy - 6}" text-anchor="start" fill="${accent}" font-size="12.5" font-weight="800">&theta; = ${th}&deg;</text>
        <g transform="translate(${px}, ${py}) rotate(${-th})">
          <rect x="-32" y="-36" width="64" height="36" rx="5" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
          <text x="0" y="-18" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="12" font-weight="800">m<tspan baseline-shift="sub" font-size="9">2</tspan> = ${v.m2} kg</text>
        </g>
        <line x1="${ax}" y1="${ay}" x2="${Tx}" y2="${Ty}" stroke="${O}" stroke-width="3"/>
        <path d="M ${Tx} ${Ty} A 13 13 0 0 1 ${bx} ${Cy}" fill="none" stroke="${O}" stroke-width="3"/>
        <line x1="${bx}" y1="${Cy}" x2="${bx}" y2="${bTop}" stroke="${O}" stroke-width="3"/>
        <rect x="${bx - 30}" y="${bTop}" width="60" height="44" rx="5" fill="${boxFill}" stroke="${G}" stroke-width="2.5"/>
        <text x="${bx}" y="${bTop + 22}" text-anchor="middle" dominant-baseline="central" fill="${G}" font-size="12" font-weight="800">m<tspan baseline-shift="sub" font-size="9">1</tspan> = ?</text>
        <text x="${mx - 22}" y="${my - 16}" text-anchor="middle" fill="#b45309" font-size="12.5" font-weight="800">F<tspan baseline-shift="sub" font-size="9">T</tspan> = ${v.FT} N</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  incline: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", textCol = "#0f172a", boxFill = "#f8fafc";
    const th = v.theta || 30, t = th * Math.PI / 180, gy = 175, x0 = 40;
    const run = Math.min(340, 135 / Math.tan(t)), H = run * Math.tan(t), xr = x0 + run, yt = gy - H;
    const s = 0.38, px = x0 + run * s, py = yt + H * s;
    const lx = th < 16 ? xr - 58 : xr - 58, ly = th < 16 ? gy + 17 : gy - 8;
    return `<svg viewBox="0 0 440 200" class="w-full max-w-md mx-auto h-52 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <polygon points="${x0},${gy} ${xr},${gy} ${x0},${yt}" fill="#e2e8f0" stroke="${stroke}" stroke-width="3"/>
        <path d="M ${xr - 50} ${gy} A 50 50 0 0 1 ${xr - 50 * Math.cos(t)} ${gy - 50 * Math.sin(t)}" fill="none" stroke="${accent}" stroke-width="2.5"/>
        <text x="${lx}" y="${ly}" text-anchor="end" fill="${accent}" font-size="14" font-weight="800">&theta; = ${th}&deg;</text>
        <g transform="translate(${px}, ${py}) rotate(${th})">
          <rect x="-32" y="-38" width="64" height="38" rx="6" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
          <text x="0" y="-19" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="16" font-weight="800">m</text>
        </g>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  inclinePull: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", textCol = "#0f172a", boxFill = "#f8fafc", accent = "#2563eb";
    const th = (v.theta || 26), t = th * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t);
    const gy = 190, run = Math.min(230, 115 / Math.tan(t)), H = run * Math.tan(t), x0 = 260 - run, yTop = gy - H;
    // crate sits on the slope; rope leaves its right side parallel to the slope
    const s = 0.34, px = x0 + run * s, py = gy - H * s;
    const ax = px + 28 * c - 17 * sn, ay = py - 28 * sn - 17 * c;
    const hx = 305, L = (hx - ax) / c, hy = ay - L * sn;
    const mx = (ax + hx) / 2, my = (ay + hy) / 2;
    const mx0 = 338, shY = yTop - 40;
    const fLabel = (v.F !== undefined) ? "F = " + v.F + " N" : "F = ?";
    const note = (v.F !== undefined) ? "rough incline (finding &mu;k), crate accelerates up the slope at a = " + v.a + " m/s&sup2;" : "frictionless incline, crate accelerates up the slope at a = " + v.a + " m/s&sup2;";
    return `<svg viewBox="0 0 460 236" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <polygon points="${x0},${gy} 260,${gy} 260,${yTop}" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <rect x="260" y="${yTop}" width="170" height="${H}" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <path d="M ${x0 + 60} ${gy} A 60 60 0 0 0 ${x0 + 60 * c} ${gy - 60 * sn}" fill="none" stroke="${textCol}" stroke-width="1.8"/>
        <text x="${x0 + 68}" y="${th < 18 ? gy + 16 : gy - 6}" text-anchor="start" fill="${textCol}" font-size="13" font-weight="700">&theta; = ${th}&deg;</text>
        <g transform="translate(${px}, ${py}) rotate(${-th})">
          <rect x="-28" y="-34" width="56" height="34" rx="5" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
          <text x="0" y="-17" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="12" font-weight="700">${v.m} kg</text>
        </g>
        <line x1="${ax}" y1="${ay}" x2="${hx}" y2="${hy}" stroke="#d97706" stroke-width="3"/>
        <polygon points="${hx - 12 * c + 4 * sn},${hy + 12 * sn + 4 * c} ${hx + 3 * c},${hy - 3 * sn} ${hx - 12 * c - 4 * sn},${hy + 12 * sn - 4 * c}" fill="#d97706" stroke="#d97706" stroke-width="1"/>
        <text x="${mx - 30}" y="${my - 20}" text-anchor="middle" fill="#b45309" font-size="13" font-weight="700">${fLabel}</text>
        <circle cx="${mx0}" cy="${yTop - 50}" r="9" fill="${boxFill}" stroke="${textCol}" stroke-width="2.5"/>
        <line x1="${mx0}" y1="${yTop - 41}" x2="${mx0}" y2="${yTop - 20}" stroke="${textCol}" stroke-width="3"/>
        <line x1="${mx0}" y1="${yTop - 20}" x2="${mx0 - 9}" y2="${yTop}" stroke="${textCol}" stroke-width="3"/>
        <line x1="${mx0}" y1="${yTop - 20}" x2="${mx0 + 9}" y2="${yTop}" stroke="${textCol}" stroke-width="3"/>
        <line x1="${mx0}" y1="${shY}" x2="${hx}" y2="${hy}" stroke="${textCol}" stroke-width="2.5"/>
        <text x="230" y="230" text-anchor="middle" fill="#475569" font-size="12" font-weight="700">${note}</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  posTimeGraph: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 1050 480" class="w-full max-w-2xl mx-auto h-auto bg-white rounded-2xl border border-slate-200 p-2 shadow-xs select-none">
        <defs>
          <pattern id="kinGrid" width="85" height="35" patternUnits="userSpaceOnUse" x="85" y="50">
            <path d="M 85 0 L 0 0 0 35" fill="none" stroke="#e2e8f0" stroke-width="1"/>
          </pattern>
        </defs>
        <rect x="85" y="50" width="850" height="350" fill="url(#kinGrid)" />
        <line x1="85" y1="330" x2="935" y2="330" stroke="${accent}" stroke-width="2" stroke-dasharray="6,3" />
        <text x="942" y="335" font-size="18" font-weight="bold" fill="${accent}" class="mono">x = 0 m</text>
        <line x1="85" y1="400" x2="935" y2="400" stroke="${textCol}" stroke-width="2"/>
        <line x1="85" y1="45" x2="85" y2="408" stroke="${textCol}" stroke-width="2.5"/>
        ${[0,1,2,3,4,5,6,7,8,9,10].map(t => `
          <line x1="${85 + t*85}" y1="394" x2="${85 + t*85}" y2="406" stroke="${textCol}" stroke-width="2"/>
          <text x="${85 + t*85}" y="432" font-size="22" font-weight="bold" fill="#334155" text-anchor="middle">${t}</text>
        `).join('')}
        <text x="510" y="466" font-size="22" font-weight="bold" fill="#334155" text-anchor="middle">Time t (seconds)</text>
        ${[-2,-1,0,1,2,3,4,5,6,7,8].map(y => {
          const cy = 400 - (y + 2) * 35;
          return `
            <line x1="75" y1="${cy}" x2="85" y2="${cy}" stroke="${textCol}" stroke-width="2"/>
            <text x="70" y="${cy + 7}" font-size="22" font-weight="bold" fill="#334155" text-anchor="end">${y > 0 ? '+' + y : y}</text>
          `;
        }).join('')}
        <text x="24" y="225" font-size="22" font-weight="bold" fill="#334155" text-anchor="middle" transform="rotate(-90, 24, 225)">Position x (meters)</text>
        <path d="M 85 330 C 240 185, 280 185, 340 190 C 415 195, 485 295, 595 365 C 655 400, 720 365, 880 190 C 925 140, 960 85, 975 50" fill="none" stroke="${accent}" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="85" cy="330" r="5" fill="${accent}" />
        <circle cx="340" cy="190" r="4.5" fill="${accent}" />
        <circle cx="595" cy="365" r="4.5" fill="${accent}" />
        <circle cx="850" cy="225" r="4.5" fill="${accent}" />
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  elevatorVtGraph: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    {
      const padL = 65, padR = 35, padT = 35, padB = 45;
      const w = 540, h = 230;
      const graphW = w - padL - padR;
      const graphH = h - padT - padB;
      const t1 = v.t1 || 4, t2 = v.t2 || 10, t3 = v.t3 || 14, vMax = v.vMax || 20;
      const getX = (t) => padL + (t / t3) * graphW;
      const getY = (vel) => (h - padB) - (vel / vMax) * graphH;
      const x0 = getX(0), y0 = getY(0);
      const x1 = getX(t1), y1 = getY(vMax);
      const x2 = getX(t2), y2 = getY(vMax);
      const x3 = getX(t3), y3 = getY(0);
      return `<svg viewBox="0 0 ${w} ${h}" class="w-full max-w-lg mx-auto h-52 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="${stroke}" stroke-width="2.5"/>
        <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="${stroke}" stroke-width="2.5"/>
        <polygon points="${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="rgba(37, 99, 235, 0.12)" />
        <polyline points="${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="none" stroke="${accent}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
        <line x1="${padL}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1.5"/>
        <line x1="${x1}" y1="${y1}" x2="${x1}" y2="${h - padB}" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1.5"/>
        <line x1="${x2}" y1="${y2}" x2="${x2}" y2="${h - padB}" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1.5"/>
        <text x="${x0}" y="${h - padB + 18}" text-anchor="middle" fill="${textCol}" font-size="13" font-weight="700">0</text>
        <text x="${x1}" y="${h - padB + 18}" text-anchor="middle" fill="${textCol}" font-size="13" font-weight="700">t<tspan baseline-shift="sub" font-size="10">1</tspan> = ${t1} s</text>
        <text x="${x2}" y="${h - padB + 18}" text-anchor="middle" fill="${textCol}" font-size="13" font-weight="700">t<tspan baseline-shift="sub" font-size="10">2</tspan> = ${t2} s</text>
        <text x="${x3}" y="${h - padB + 18}" text-anchor="middle" fill="${textCol}" font-size="13" font-weight="700">t<tspan baseline-shift="sub" font-size="10">3</tspan> = ${t3} s</text>
        <text x="${padL - 10}" y="${y1 + 5}" text-anchor="end" fill="${accent}" font-size="13" font-weight="800">${vMax}</text>
        <text x="${padL - 10}" y="${y0 + 4}" text-anchor="end" fill="${textCol}" font-size="13" font-weight="700">0</text>
        <text x="${padL - 8}" y="${padT - 12}" text-anchor="end" fill="${textCol}" font-size="13" font-weight="800">v (m/s)</text>
        <text x="${padL + graphW / 2}" y="${h - 4}" text-anchor="middle" fill="${textCol}" font-size="13" font-weight="800">Time t (seconds)</text>
      </svg>`;
    }
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  projBaseball: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const t = (v.theta || 29) * Math.PI / 180, gy = 192, sc = 0.55;
    const by = gy - v.y0Cm * sc, bx = 180, L = 70, ex = 404;
    const half = (ex - bx) * 0.5, cy = by - half * Math.tan(t), py = (u) => (1 - u) * (1 - u) * by + 2 * u * (1 - u) * cy + u * u * gy;
    const ua = (by - cy) / ((by - cy) + (gy - cy)), ax = (1 - ua) * (1 - ua) * bx + 2 * ua * (1 - ua) * (bx + half) + ua * ua * ex, ay = py(ua);
    const sh = gy - 84, person = `<circle cx="76" cy="${gy - 100}" r="9" fill="${B}" stroke="${T}" stroke-width="2.5"/><line x1="76" y1="${gy - 91}" x2="76" y2="${gy - 52}" stroke="${T}" stroke-width="3"/><line x1="76" y1="${gy - 52}" x2="66" y2="${gy}" stroke="${T}" stroke-width="3"/><line x1="76" y1="${gy - 52}" x2="90" y2="${gy}" stroke="${T}" stroke-width="3"/><line x1="76" y1="${sh}" x2="126" y2="${by + 8}" stroke="${T}" stroke-width="3"/>`;
    return svg(215, gnd(gy) + person + `<line x1="122" y1="${by + 10}" x2="${bx - 2}" y2="${by + 2}" stroke="#b45309" stroke-width="7" stroke-linecap="round"/>` + `<line x1="${bx}" y1="${by}" x2="${bx + 90}" y2="${by}" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + `<path d="M ${bx} ${by} Q ${bx + half} ${cy} ${ex} ${gy}" fill="none" stroke="${G}" stroke-width="2.5" stroke-dasharray="6 5"/>` + ar(bx, by, bx + L * Math.cos(t), by - L * Math.sin(t), A) + `<circle cx="${bx}" cy="${by}" r="6" fill="#ffffff" stroke="${R}" stroke-width="2.5"/>` + `<path d="M ${bx + 40} ${by} A 40 40 0 0 0 ${bx + 40 * Math.cos(t)} ${by - 40 * Math.sin(t)}" fill="none" stroke="${A}" stroke-width="2"/>` + tx(bx + 48, by + 16, `&theta; = ${v.theta}&deg;`, A, "start", 12) + tx(bx + L * Math.cos(t) - 12, by - L * Math.sin(t) - 4, `v${sb("0")}`, A, "end", 13) + `<circle cx="${ax}" cy="${ay}" r="4" fill="${O}"/>` + tx(ax - 6, ay - 16, "apex (v" + sb("y") + " = 0)", O, "start", 12) + `<circle cx="${ex}" cy="${gy}" r="4.5" fill="${G}"/>` + tx(ex, gy + 18, "landing", G, "middle", 12) + `<line x1="320" y1="${by}" x2="320" y2="${gy}" stroke="${S}" stroke-width="1.5"/><line x1="314" y1="${by}" x2="326" y2="${by}" stroke="${S}" stroke-width="1.5"/><line x1="314" y1="${gy}" x2="326" y2="${gy}" stroke="${S}" stroke-width="1.5"/>` + tx(332, (by + gy) / 2 + 4, `y${sb("0")} = ${v.y0Cm} cm`, "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  projCannonElevated: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 360 170" class="w-full max-w-md mx-auto h-48 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs select-none">
        <line x1="10" y1="135" x2="230" y2="135" stroke="${stroke}" stroke-width="2.5"/>
        <path d="M230 135 L230 75 L340 75 L340 150 L230 150 Z" fill="#e2e8f0" stroke="${stroke}" stroke-width="2"/>
        <text x="285" y="64" font-size="13" font-weight="800" fill="${accent}" text-anchor="middle">Target (+${v.hTarget} m)</text>
        <g transform="translate(48, 118) rotate(-44)">
          <rect x="-14" y="-7" width="48" height="14" rx="3" fill="#1e293b"/>
        </g>
        <circle cx="48" cy="122" r="12" fill="#cbd5e1" stroke="#334155" stroke-width="2.5"/>
        <path d="M75 92 Q155 14 275 75" fill="none" stroke="${accent}" stroke-width="2.5" stroke-dasharray="5,4"/>
        <circle cx="275" cy="75" r="5" fill="${forceCol}"/>
        <line x1="275" y1="75" x2="298" y2="94" stroke="${forceCol}" stroke-width="2.5"/>
        <text x="308" y="108" font-size="13" font-weight="800" fill="${forceCol}">v<tspan baseline-shift="sub" font-size="9">impact</tspan></text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  projPelican: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 360 170" class="w-full max-w-md mx-auto h-48 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs select-none">
        <path d="M0 142 C40 138 60 146 100 142 C140 138 160 146 200 142 C240 138 260 146 300 142 L360 142" fill="none" stroke="${accent}" stroke-width="2.5"/>
        <line x1="65" y1="32" x2="320" y2="32" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4"/>
        <circle cx="75" cy="32" r="4.5" fill="${accent}"/>
        <text x="75" y="20" font-size="12" font-weight="800" fill="#475569" text-anchor="middle">Release</text>
        <path d="M75 32 Q175 32 275 142" fill="none" stroke="${accent}" stroke-width="2.5" stroke-dasharray="5,4"/>
        <circle cx="275" cy="142" r="4.5" fill="${forceCol}"/>
        <line x1="75" y1="32" x2="75" y2="142" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
        <text x="66" y="92" font-size="13" font-weight="800" fill="${textCol}" text-anchor="end">h = ${v.hDrop} m</text>
        <text x="175" y="160" font-size="13" font-weight="800" fill="${accent}" text-anchor="middle">Δx = ${v.distX} m</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  projSoccer: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 360 160" class="w-full max-w-md mx-auto h-44 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs select-none">
        <line x1="15" y1="130" x2="345" y2="130" stroke="${stroke}" stroke-width="2.5"/>
        <circle cx="65" cy="122" r="6" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
        <path d="M65 122 Q180 26 295 122" fill="none" stroke="${accent}" stroke-width="2.5" stroke-dasharray="5,4"/>
        <circle cx="180" cy="74" r="4" fill="${accent}"/>
        <line x1="180" y1="74" x2="180" y2="130" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
        <text x="180" y="64" font-size="13" font-weight="800" fill="${accent}" text-anchor="middle">h<tspan baseline-shift="sub" font-size="9">max</tspan></text>
        <line x1="65" y1="122" x2="108" y2="90" stroke="${forceCol}" stroke-width="2.5"/>
        <text x="82" y="84" font-size="13" font-weight="800" fill="${forceCol}">v<tspan baseline-shift="sub" font-size="9">0</tspan> = ${v.v0} m/s</text>
        <text x="108" y="118" font-size="13" font-weight="800" fill="${textCol}">&theta; = ${v.theta}&deg;</text>
        <text x="180" y="150" font-size="13" font-weight="800" fill="#475569" text-anchor="middle">Horizontal Range R</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  projCliffDiver: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const gy = 205, top = 75, H = gy - top, k = H / v.hCliff, cx = 140, rx = cx + v.distRocks * k;
    const rocks = `M ${cx} ${gy} ` + [0.17, 0.34, 0.52, 0.7, 0.86, 1].map(function (f, i) { return `L ${(cx + (rx - cx) * f).toFixed(1)} ${i % 2 === 0 ? gy - 14 : gy}`; }).join(" ") + ` Z`;
    const runner = `<circle cx="112" cy="${top - 48}" r="8" fill="${B}" stroke="${T}" stroke-width="2.5"/><line x1="112" y1="${top - 40}" x2="116" y2="${top - 18}" stroke="${T}" stroke-width="3"/><line x1="116" y1="${top - 18}" x2="104" y2="${top}" stroke="${T}" stroke-width="3"/><line x1="116" y1="${top - 18}" x2="130" y2="${top - 4}" stroke="${T}" stroke-width="3"/><line x1="114" y1="${top - 34}" x2="130" y2="${top - 42}" stroke="${T}" stroke-width="3"/><line x1="114" y1="${top - 34}" x2="100" y2="${top - 26}" stroke="${T}" stroke-width="3"/>`;
    return svg(255, `<rect x="${cx}" y="${gy}" width="${300 - cx + 120}" height="14" fill="#bae6fd" opacity="0.8"/><rect x="15" y="${top}" width="${cx - 15}" height="${H + 14}" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><path d="${rocks}" fill="#cbd5e1" stroke="${S}" stroke-width="2"/>` + runner + ar(cx + 4, top - 22, cx + 70, top - 22, A) + tx(cx + 38, top - 30, "v" + sb("x,min") + " = ?", A, "middle", 13) + `<path d="M ${cx} ${top} Q ${(cx + rx) / 2} ${top} ${rx} ${gy}" fill="none" stroke="${G}" stroke-width="2.5" stroke-dasharray="6 5"/><circle cx="${rx}" cy="${gy}" r="4.5" fill="${G}"/>` + tx(rx + 10, gy - 22, "lands just past the rocks", G, "start", 12) + `<line x1="100" y1="${top}" x2="100" y2="${gy}" stroke="${S}" stroke-width="1.5"/><line x1="94" y1="${top}" x2="106" y2="${top}" stroke="${S}" stroke-width="1.5"/><line x1="94" y1="${gy}" x2="106" y2="${gy}" stroke="${S}" stroke-width="1.5"/>` + tx(86, (top + gy) / 2 + 4, `h = ${v.hCliff} m`, "#475569", "end", 13) + `<line x1="${cx}" y1="${gy + 24}" x2="${rx}" y2="${gy + 24}" stroke="${R}" stroke-width="1.5"/><line x1="${cx}" y1="${gy + 18}" x2="${cx}" y2="${gy + 30}" stroke="${R}" stroke-width="1.5"/><line x1="${rx}" y1="${gy + 18}" x2="${rx}" y2="${gy + 30}" stroke="${R}" stroke-width="1.5"/>` + tx((cx + rx) / 2, gy + 38, `rocks extend ${v.distRocks} m`, R, "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  projAirplane: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 360 170" class="w-full max-w-md mx-auto h-48 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs select-none">
        <line x1="0" y1="140" x2="360" y2="140" stroke="${accent}" stroke-width="2.2"/>
        <path d="M235 140 C250 123 305 123 325 140 Z" fill="#fcd34d" stroke="#d97706" stroke-width="2"/>
        <text x="280" y="156" font-size="12.5" font-weight="800" fill="#b45309" text-anchor="middle">Target Island</text>
        <line x1="65" y1="34" x2="320" y2="34" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4"/>
        <circle cx="75" cy="34" r="4" fill="${accent}"/>
        <text x="180" y="20" font-size="13" font-weight="800" fill="${accent}" text-anchor="middle">v<tspan baseline-shift="sub" font-size="9">0</tspan> = ${v.v0} m/s</text>
        <path d="M75 34 Q178 34 280 137" fill="none" stroke="${accent}" stroke-width="2.5" stroke-dasharray="5,4"/>
        <circle cx="280" cy="137" r="4.5" fill="${forceCol}"/>
        <line x1="75" y1="34" x2="75" y2="140" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
        <text x="66" y="90" font-size="13" font-weight="800" fill="${textCol}" text-anchor="end">h = ${v.hKm} km</text>
        <text x="172" y="156" font-size="13" font-weight="800" fill="${accent}" text-anchor="middle">Lead Distance Δx</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  stackedBlocks: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 400 252" class="w-full max-w-md mx-auto h-60 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <!-- Ground -->
        <line x1="20" y1="215" x2="280" y2="215" stroke="${stroke}" stroke-width="3"/>
        ${[26,44,62,80,98,116,134,152,170,188,206,224,242,260].map(x => `<line x1="${x}" y1="215" x2="${x - 9}" y2="226" stroke="#94a3b8" stroke-width="1.6"/>`).join('')}
        <text x="150" y="246" text-anchor="middle" fill="#64748b" font-size="12" font-weight="700">Ground</text>

        <!-- Block 3 (bottom) -->
        <rect x="50" y="153" width="200" height="62" rx="5" fill="${boxFill}" stroke="#059669" stroke-width="2.5"/>
        <text x="150" y="184" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">3</tspan> = ${v.m3} kg</text>
        <text x="264" y="188" fill="#047857" font-size="12" font-weight="800">Block 3 (bottom)</text>

        <!-- Block 2 (middle) -->
        <rect x="65" y="91" width="170" height="62" rx="5" fill="${boxFill}" stroke="#7c3aed" stroke-width="2.5"/>
        <text x="150" y="122" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">2</tspan> = ${v.m2} kg</text>
        <text x="264" y="126" fill="#6d28d9" font-size="12" font-weight="800">Block 2 (middle)</text>

        <!-- Block 1 (top) -->
        <rect x="80" y="29" width="140" height="62" rx="5" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="150" y="60" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="15" font-weight="800">m<tspan baseline-shift="sub" font-size="11">1</tspan> = ${v.m1} kg</text>
        <text x="264" y="64" fill="#1d4ed8" font-size="12" font-weight="800">Block 1 (top)</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  hangingBuckets: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 400 270" class="w-full max-w-md mx-auto h-60 bg-slate-50 rounded-2xl border border-slate-200 p-3">
        <!-- Ceiling support -->
        <line x1="100" y1="22" x2="200" y2="22" stroke="${stroke}" stroke-width="3"/>
        ${[106,120,134,148,162,176,190].map(x => `<line x1="${x}" y1="22" x2="${x + 9}" y2="11" stroke="#94a3b8" stroke-width="1.6"/>`).join('')}

        <!-- Top rope -->
        <line x1="150" y1="22" x2="150" y2="68" stroke="#7c3aed" stroke-width="3" stroke-dasharray="1 0"/>
        <text x="222" y="50" fill="#6d28d9" font-size="12" font-weight="800">Top rope</text>
        <line x1="156" y1="46" x2="216" y2="46" stroke="#a78bfa" stroke-width="1.2"/>

        <!-- Top bucket -->
        <path d="M100 84 Q150 50 200 84" fill="none" stroke="#94a3b8" stroke-width="2"/>
        <path d="M90 84 L210 84 L194 134 L106 134 Z" fill="${boxFill}" stroke="${accent}" stroke-width="2.5" stroke-linejoin="round"/>
        <text x="150" y="110" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="13" font-weight="800">m<tspan baseline-shift="sub" font-size="10">1</tspan> = ${v.m1} kg</text>

        <!-- Bottom rope -->
        <line x1="150" y1="134" x2="150" y2="180" stroke="#059669" stroke-width="3"/>
        <text x="222" y="162" fill="#047857" font-size="12" font-weight="800">Bottom rope</text>
        <line x1="156" y1="158" x2="216" y2="158" stroke="#6ee7b7" stroke-width="1.2"/>

        <!-- Bottom bucket -->
        <path d="M100 196 Q150 162 200 196" fill="none" stroke="#94a3b8" stroke-width="2"/>
        <path d="M90 196 L210 196 L194 246 L106 246 Z" fill="${boxFill}" stroke="#059669" stroke-width="2.5" stroke-linejoin="round"/>
        <text x="150" y="222" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="13" font-weight="800">m<tspan baseline-shift="sub" font-size="10">2</tspan> = ${v.m2} kg</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  boxPullUp: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", forceCol = "#dc2626", textCol = "#0f172a", boxFill = "#f8fafc";
    const arrow = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const t = (v.theta || 19) * Math.PI / 180, L = 130, ox = 250, oy = 125;
    return `<svg viewBox="0 0 440 200" class="w-full max-w-md mx-auto h-52 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <line x1="20" y1="160" x2="420" y2="160" stroke="${stroke}" stroke-width="3"/>
        <rect x="150" y="90" width="100" height="70" rx="5" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="200" y="125" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="14" font-weight="800">${v.W} N</text>
        <line x1="${ox}" y1="${oy}" x2="${ox + L + 10}" y2="${oy}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>
        ${arrow(ox, oy, ox + L * Math.cos(t), oy - L * Math.sin(t), forceCol)}
        <path d="M ${ox + 60} ${oy} A 60 60 0 0 0 ${ox + 60 * Math.cos(t)} ${oy - 60 * Math.sin(t)}" fill="none" stroke="${accent}" stroke-width="2"/>
        <text x="${ox + 72}" y="${oy + 18}" fill="${accent}" font-size="12.5" font-weight="800">&theta; = ${v.theta}&deg;</text>
        <text x="${ox + L * Math.cos(t) - 10}" y="${oy - L * Math.sin(t) - 8}" fill="${forceCol}" font-size="13" font-weight="800">F = ${v.F} N</text>
        <text x="30" y="148" fill="#475569" font-size="11.5" font-weight="700">&mu;<tspan baseline-shift="sub" font-size="8">k</tspan> = ${v.mu}</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  cratePushDown: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", forceCol = "#dc2626", textCol = "#0f172a", boxFill = "#f8fafc";
    const arrow = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const t = (v.theta || 22) * Math.PI / 180, L = 120, hx = 170, hy = 105;
    return `<svg viewBox="0 0 440 200" class="w-full max-w-md mx-auto h-52 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <line x1="20" y1="165" x2="420" y2="165" stroke="${stroke}" stroke-width="3"/>
        <rect x="170" y="85" width="110" height="80" rx="5" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="225" y="125" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="14" font-weight="800">${v.m} kg</text>
        <line x1="${hx - L * Math.cos(t)}" y1="${hy - L * Math.sin(t)}" x2="${hx - L * Math.cos(t) + 95}" y2="${hy - L * Math.sin(t)}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>
        ${arrow(hx - L * Math.cos(t), hy - L * Math.sin(t), hx, hy, forceCol)}
        <path d="M ${hx - L * Math.cos(t) + 60} ${hy - L * Math.sin(t)} A 60 60 0 0 1 ${hx - L * Math.cos(t) + 60 * Math.cos(t)} ${hy - L * Math.sin(t) + 60 * Math.sin(t)}" fill="none" stroke="${accent}" stroke-width="2"/>
        <text x="${hx - L * Math.cos(t) + 66}" y="${hy - L * Math.sin(t) - 6}" fill="${accent}" font-size="12.5" font-weight="800">&theta; = ${v.theta}&deg;</text>
        <text x="${hx - L * Math.cos(t) - 10}" y="${hy - L * Math.sin(t) - 8}" fill="${forceCol}" font-size="13" font-weight="800">F (push)</text>
        <text x="300" y="125" fill="#475569" font-size="12" font-weight="700">&mu; = ${v.mu}</text>
        <text x="300" y="145" fill="#475569" font-size="12" font-weight="700">a = ${v.a} m/s&sup2;</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  wallBlockH: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", forceCol = "#dc2626", textCol = "#0f172a", boxFill = "#f8fafc";
    const arrow = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const t = (v.theta || 32) * Math.PI / 180, L = 110, px = 270, py = 95;
    return `<svg viewBox="0 0 440 230" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <rect x="300" y="10" width="26" height="210" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <rect x="215" y="55" width="85" height="80" rx="5" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="257" y="95" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="14" font-weight="800">${v.m} kg</text>
        <line x1="${215 - L * Math.cos(t)}" y1="${py + L * Math.sin(t)}" x2="${215 - L * Math.cos(t) + 100}" y2="${py + L * Math.sin(t)}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>
        ${arrow(215 - L * Math.cos(t), py + L * Math.sin(t), 215, py, forceCol)}
        <path d="M ${215 - L * Math.cos(t) + 60} ${py + L * Math.sin(t)} A 60 60 0 0 0 ${215 - L * Math.cos(t) + 60 * Math.cos(t)} ${py + L * Math.sin(t) - 60 * Math.sin(t)}" fill="none" stroke="${accent}" stroke-width="2"/>
        <text x="${215 - L * Math.cos(t) + 66}" y="${py + L * Math.sin(t) + 18}" fill="${accent}" font-size="12.5" font-weight="800">&theta; = ${v.theta}&deg;</text>
        <text x="${215 - L * Math.cos(t) - 30}" y="${py + L * Math.sin(t) + 18}" fill="${forceCol}" font-size="13" font-weight="800">F</text>
        <text x="20" y="30" fill="#475569" font-size="11.5" font-weight="700">&mu;<tspan baseline-shift="sub" font-size="8">s</tspan> = ${v.mus},  &mu;<tspan baseline-shift="sub" font-size="8">k</tspan> = ${v.muk}</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  wallBlockV: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", forceCol = "#dc2626", textCol = "#0f172a", boxFill = "#f8fafc";
    const arrow = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const t = (v.theta || 36) * Math.PI / 180, L = 105, cx = 215, cy = 95;
    return `<svg viewBox="0 0 440 230" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <rect x="300" y="10" width="26" height="210" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <rect x="215" y="55" width="85" height="80" rx="5" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="257" y="95" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="14" font-weight="800">${v.m} kg</text>
        <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy + L + 15}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>
        ${arrow(cx - L * Math.sin(t), cy + L * Math.cos(t), cx, cy, forceCol)}
        <path d="M ${cx} ${cy + 50} A 50 50 0 0 0 ${cx - 50 * Math.sin(t)} ${cy + 50 * Math.cos(t)}" fill="none" stroke="${accent}" stroke-width="2"/>
        <text x="${cx - 110}" y="${cy + 30}" fill="${accent}" font-size="12.5" font-weight="800">&theta; = ${v.theta}&deg;</text>
        <text x="${cx - L * Math.sin(t) - 22}" y="${cy + L * Math.cos(t) + 14}" fill="${forceCol}" font-size="13" font-weight="800">F</text>
        <text x="20" y="30" fill="#475569" font-size="11.5" font-weight="700">&mu;<tspan baseline-shift="sub" font-size="8">s</tspan> = ${v.mus},  &mu;<tspan baseline-shift="sub" font-size="8">k</tspan> = ${v.muk}</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  inclineAtwoodKnown: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", textCol = "#0f172a", boxFill = "#f8fafc", G = "#059669", O = "#d97706";
    const th = v.theta || 26, t = th * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t), xr = 290;
    const run = Math.min(250, 105 / Math.tan(t)), H = run * Math.tan(t), x0 = xr - run, vy = 100, gy = vy + H;
    const ux = c, uy = -sn, nx = -sn, ny = -c;
    const Cx = xr + 7 * nx + 24 * ux, Cy = vy + 7 * ny + 24 * uy;
    const Tx = Cx + 13 * nx, Ty = Cy + 13 * ny;
    const s = 0.34, px = x0 + run * s, py = gy - H * s;
    const ax = px + 32 * c - 20 * sn, ay = py - 32 * sn - 20 * c;
    const bx = Cx + 13, bTop = Cy + 50;
    const mx = (ax + Tx) / 2, my = (ay + Ty) / 2;
    return `<svg viewBox="0 0 440 225" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <polygon points="${x0},${gy} ${xr},${gy} ${xr},${vy}" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <line x1="${xr}" y1="${vy}" x2="${Cx}" y2="${Cy}" stroke="${stroke}" stroke-width="3"/>
        <circle cx="${Cx}" cy="${Cy}" r="13" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/><circle cx="${Cx}" cy="${Cy}" r="3.5" fill="${stroke}"/>
        <path d="M ${x0 + 55} ${gy} A 55 55 0 0 0 ${x0 + 55 * c} ${gy - 55 * sn}" fill="none" stroke="${accent}" stroke-width="2.2"/>
        <text x="${x0 + 62}" y="${th < 16 ? gy + 17 : gy - 6}" text-anchor="start" fill="${accent}" font-size="12.5" font-weight="800">&theta; = ${th}&deg;</text>
        <g transform="translate(${px}, ${py}) rotate(${-th})">
          <rect x="-32" y="-36" width="64" height="36" rx="5" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
          <text x="0" y="-18" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="12" font-weight="800">m<tspan baseline-shift="sub" font-size="9">2</tspan> = ${v.m2} kg</text>
        </g>
        <line x1="${ax}" y1="${ay}" x2="${Tx}" y2="${Ty}" stroke="${O}" stroke-width="3"/>
        <path d="M ${Tx} ${Ty} A 13 13 0 0 1 ${bx} ${Cy}" fill="none" stroke="${O}" stroke-width="3"/>
        <line x1="${bx}" y1="${Cy}" x2="${bx}" y2="${bTop}" stroke="${O}" stroke-width="3"/>
        <rect x="${bx - 30}" y="${bTop}" width="60" height="44" rx="5" fill="${boxFill}" stroke="${G}" stroke-width="2.5"/>
        <text x="${bx}" y="${bTop + 22}" text-anchor="middle" dominant-baseline="central" fill="${G}" font-size="10.5" font-weight="800">m<tspan baseline-shift="sub" font-size="8">1</tspan> = ${v.m1} kg</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  sphereTwoCables: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", textCol = "#0f172a", boxFill = "#f8fafc";
    const t = (v.theta || 41) * Math.PI / 180, L = 170, sx = 190, sy = 170, r = 24;
    const ex = sx + L * Math.cos(t), ey = sy - L * Math.sin(t);
    return `<svg viewBox="0 0 440 230" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <rect x="15" y="20" width="22" height="190" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <rect x="${ex}" y="10" width="22" height="${ey - 10 + 40}" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <line x1="37" y1="${sy}" x2="${sx - r}" y2="${sy}" stroke="#d97706" stroke-width="3.5"/>
        <line x1="${sx + r * Math.cos(t)}" y1="${sy - r * Math.sin(t)}" x2="${ex}" y2="${ey}" stroke="#d97706" stroke-width="3.5"/>
        <line x1="${sx}" y1="${sy}" x2="${ex}" y2="${sy}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>
        <circle cx="${sx}" cy="${sy}" r="${r}" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="${sx}" y="${sy}" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="12" font-weight="800">${v.W} N</text>
        <path d="M ${sx + 90} ${sy} A 90 90 0 0 0 ${sx + 90 * Math.cos(t)} ${sy - 90 * Math.sin(t)}" fill="none" stroke="${accent}" stroke-width="2"/>
        <text x="${sx + 100}" y="${sy - 10}" fill="${accent}" font-size="12.5" font-weight="800">&theta; = ${v.theta}&deg;</text>
        <text x="75" y="${sy - 8}" fill="#b45309" font-size="13" font-weight="800">T<tspan baseline-shift="sub" font-size="9">1</tspan></text>
        <text x="${sx + 40}" y="${sy - 68}" fill="#b45309" font-size="13" font-weight="800">T<tspan baseline-shift="sub" font-size="9">2</tspan></text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  carMirror: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", forceCol = "#dc2626", textCol = "#0f172a", boxFill = "#f8fafc";
    const t = (v.theta || 14) * Math.PI / 180, L = 80, mx = 255, my = 70;
    const bx = mx - L * Math.sin(t), by = my + L * Math.cos(t);
    return `<svg viewBox="0 0 440 200" class="w-full max-w-md mx-auto h-52 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <line x1="20" y1="175" x2="420" y2="175" stroke="${stroke}" stroke-width="3"/>
        <path d="M 370 165 L 370 125 L 300 120 L 260 60 L 150 60 L 120 120 L 80 128 L 80 165 Z" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <path d="M 255 66 L 285 118 L 198 118 L 198 66 Z" fill="#f1f5f9" stroke="${stroke}" stroke-width="1.5"/>
        <circle cx="140" cy="158" r="17" fill="#475569" stroke="${stroke}" stroke-width="2"/>
        <circle cx="315" cy="158" r="17" fill="#475569" stroke="${stroke}" stroke-width="2"/>
        <line x1="${mx}" y1="${my}" x2="${mx}" y2="${my + L + 14}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>
        <line x1="${mx}" y1="${my}" x2="${bx}" y2="${by}" stroke="#d97706" stroke-width="2.5"/>
        <circle cx="${bx}" cy="${by}" r="10" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="${bx - 16}" y="${by + 6}" text-anchor="end" fill="${textCol}" font-size="12" font-weight="800">${v.m} kg</text>
        <path d="M ${mx} ${my + 40} A 40 40 0 0 0 ${mx - 40 * Math.sin(t)} ${my + 40 * Math.cos(t)}" fill="none" stroke="${accent}" stroke-width="2"/>
        <text x="${mx + 14}" y="${my + 70}" fill="${accent}" font-size="12.5" font-weight="800">&theta; = ${v.theta}&deg;</text>
        <line x1="335" y1="40" x2="395" y2="40" stroke="${forceCol}" stroke-width="3"/><polygon points="405,40 394,34 394,46" fill="${forceCol}"/>
        <text x="365" y="30" text-anchor="middle" fill="${forceCol}" font-size="12.5" font-weight="800">a</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  tableAndHanging: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", textCol = "#0f172a", boxFill = "#f8fafc";
    return `<svg viewBox="0 0 440 220" class="w-full max-w-md mx-auto h-52 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <rect x="30" y="100" width="290" height="14" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <rect x="60" y="114" width="14" height="95" fill="#e2e8f0" stroke="${stroke}" stroke-width="2"/>
        <circle cx="338" cy="92" r="16" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <circle cx="338" cy="92" r="4" fill="${stroke}"/>
        <rect x="120" y="55" width="90" height="45" rx="5" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="165" y="77" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="13" font-weight="800">m<tspan baseline-shift="sub" font-size="9">1</tspan> = ${v.m1} kg</text>
        <line x1="210" y1="76" x2="338" y2="76" stroke="#d97706" stroke-width="3"/>
        <line x1="354" y1="92" x2="354" y2="140" stroke="#d97706" stroke-width="3"/>
        <rect x="316" y="140" width="76" height="46" rx="5" fill="${boxFill}" stroke="#059669" stroke-width="2.5"/>
        <text x="354" y="163" text-anchor="middle" dominant-baseline="central" fill="#059669" font-size="13" font-weight="800">m<tspan baseline-shift="sub" font-size="9">2</tspan> = ${v.m2} kg</text>
        <text x="130" y="140" fill="#475569" font-size="12" font-weight="700">smooth (frictionless) table</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  lawnMower: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", forceCol = "#dc2626", textCol = "#0f172a", boxFill = "#f8fafc";
    const arrow = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const t = (v.theta || 45) * Math.PI / 180, L = 115, hx = 190, hy = 120;
    return `<svg viewBox="0 0 440 200" class="w-full max-w-md mx-auto h-52 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <line x1="20" y1="170" x2="420" y2="170" stroke="${stroke}" stroke-width="3"/>
        <rect x="185" y="115" width="110" height="38" rx="8" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="240" y="134" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="13" font-weight="800">${v.m} kg</text>
        <circle cx="205" cy="158" r="12" fill="#475569" stroke="${stroke}" stroke-width="2"/>
        <circle cx="277" cy="158" r="12" fill="#475569" stroke="${stroke}" stroke-width="2"/>
        <line x1="${hx - L * Math.cos(t)}" y1="${hy - L * Math.sin(t)}" x2="${hx}" y2="${hy}" stroke="#92400e" stroke-width="4"/>
        <line x1="${hx - L * Math.cos(t) - 14}" y1="${hy - L * Math.sin(t) - 6}" x2="${hx - L * Math.cos(t) + 12}" y2="${hy - L * Math.sin(t) + 10}" stroke="#92400e" stroke-width="5"/>
        ${arrow(hx - 70 * Math.cos(t), hy - 70 * Math.sin(t) - 22, hx - 20 * Math.cos(t), hy - 20 * Math.sin(t) - 22, forceCol)}
        <line x1="${hx - 70 * Math.cos(t)}" y1="${hy - 70 * Math.sin(t) - 22}" x2="${hx - 70 * Math.cos(t) + 100}" y2="${hy - 70 * Math.sin(t) - 22}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>
        <path d="M ${hx - 70 * Math.cos(t) + 45} ${hy - 70 * Math.sin(t) - 22} A 45 45 0 0 1 ${hx - 70 * Math.cos(t) + 45 * Math.cos(t)} ${hy - 70 * Math.sin(t) - 22 + 45 * Math.sin(t)}" fill="none" stroke="${accent}" stroke-width="2"/>
        <text x="${hx - 70 * Math.cos(t) + 50}" y="${hy - 70 * Math.sin(t) - 28}" fill="${accent}" font-size="12.5" font-weight="800">&theta; = ${v.theta}&deg;</text>
        <text x="${hx - 70 * Math.cos(t) + 108}" y="${hy - 70 * Math.sin(t) - 18}" fill="${forceCol}" font-size="13" font-weight="800">F = ${v.F} N</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  sprinter: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", forceCol = "#dc2626", textCol = "#0f172a";
    const arrow = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const t = (v.theta || 23) * Math.PI / 180, L = 120, fx = 110, fy = 170;
    return `<svg viewBox="0 0 440 200" class="w-full max-w-md mx-auto h-52 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <line x1="20" y1="175" x2="420" y2="175" stroke="${stroke}" stroke-width="3"/>
        <polygon points="95,175 125,175 125,162" fill="#94a3b8" stroke="${stroke}" stroke-width="1.5"/>
        <circle cx="205" cy="68" r="13" fill="#f8fafc" stroke="${textCol}" stroke-width="2.5"/>
        <line x1="198" y1="80" x2="160" y2="125" stroke="${textCol}" stroke-width="5" stroke-linecap="round"/>
        <line x1="160" y1="125" x2="118" y2="168" stroke="${textCol}" stroke-width="5" stroke-linecap="round"/>
        <line x1="160" y1="125" x2="180" y2="150" stroke="${textCol}" stroke-width="5" stroke-linecap="round"/>
        <line x1="180" y1="150" x2="168" y2="172" stroke="${textCol}" stroke-width="5" stroke-linecap="round"/>
        <line x1="195" y1="90" x2="225" y2="115" stroke="${textCol}" stroke-width="4" stroke-linecap="round"/>
        <line x1="${fx}" y1="${fy}" x2="${fx + L + 20}" y2="${fy}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>
        ${arrow(fx, fy, fx + L * Math.cos(t), fy - L * Math.sin(t), forceCol)}
        <path d="M ${fx + 70} ${fy} A 70 70 0 0 0 ${fx + 70 * Math.cos(t)} ${fy - 70 * Math.sin(t)}" fill="none" stroke="${accent}" stroke-width="2"/>
        <text x="${fx + 78}" y="${fy - 14}" fill="${accent}" font-size="12.5" font-weight="800">&theta; = ${v.theta}&deg;</text>
        <text x="${fx + L * Math.cos(t) + 20}" y="${fy - L * Math.sin(t) + 30}" fill="${forceCol}" font-size="13" font-weight="800">F = ${v.F} N</text>
        <text x="300" y="60" fill="#475569" font-size="12" font-weight="700">m = ${v.m} kg</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  waterSkier: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", forceCol = "#dc2626", textCol = "#0f172a";
    const t = (v.theta || 11) * Math.PI / 180, L = 200, hx = 170, hy = 105;
    return `<svg viewBox="0 0 440 200" class="w-full max-w-md mx-auto h-52 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <rect x="10" y="165" width="420" height="30" fill="#bae6fd" stroke="none"/>
        <path d="M 10 165 q 20 -8 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 20 0" fill="none" stroke="#0ea5e9" stroke-width="2.5"/>
        <line x1="120" y1="168" x2="215" y2="168" stroke="#92400e" stroke-width="5" stroke-linecap="round"/>
        <circle cx="150" cy="60" r="12" fill="#f8fafc" stroke="${textCol}" stroke-width="2.5"/>
        <line x1="150" y1="72" x2="158" y2="115" stroke="${textCol}" stroke-width="5" stroke-linecap="round"/>
        <line x1="158" y1="115" x2="140" y2="165" stroke="${textCol}" stroke-width="5" stroke-linecap="round"/>
        <line x1="158" y1="115" x2="178" y2="165" stroke="${textCol}" stroke-width="5" stroke-linecap="round"/>
        <line x1="154" y1="88" x2="${hx}" y2="${hy}" stroke="${textCol}" stroke-width="4" stroke-linecap="round"/>
        <line x1="${hx}" y1="${hy}" x2="${hx + L}" y2="${hy}" stroke="${stroke}" stroke-width="2.5" stroke-dasharray="7 5"/>
        <line x1="${hx}" y1="${hy}" x2="${hx + L * Math.cos(t)}" y2="${hy - L * Math.sin(t)}" stroke="#d97706" stroke-width="3.5"/>
        <polygon points="${hx + L * Math.cos(t) + 12},${hy - (L + 12) * Math.sin(t)} ${hx + L * Math.cos(t) - 2},${hy - L * Math.sin(t) - 7} ${hx + L * Math.cos(t) - 2},${hy - L * Math.sin(t) + 7}" fill="#d97706"/>
        <path d="M ${hx + 80} ${hy} A 80 80 0 0 0 ${hx + 80 * Math.cos(t)} ${hy - 80 * Math.sin(t)}" fill="none" stroke="${accent}" stroke-width="2"/>
        <text x="${hx + 92}" y="${hy + 18}" fill="${accent}" font-size="12" font-weight="800">&theta; = ${v.theta}&deg; (part b)</text>
        <text x="${hx + 60}" y="${hy - 28}" fill="${forceCol}" font-size="13" font-weight="800">T = ${v.T} N</text>
        <text x="${hx + 150}" y="${hy + 38}" fill="#475569" font-size="11" font-weight="700">horizontal (part a)</text>
        <text x="20" y="30" fill="#475569" font-size="12" font-weight="700">m = ${v.m} kg,  &mu;<tspan baseline-shift="sub" font-size="8">k</tspan> = ${v.mu}</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  twoMenRopesRockRightKnown: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b";
    const accent = "#2563eb";
    const forceCol = "#dc2626";
    const textCol = "#0f172a";
    const boxFill = "#f8fafc";

    return `<svg viewBox="0 0 460 195" class="w-full max-w-md mx-auto h-48 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <!-- Left & Right Platforms -->
        <line x1="15" y1="55" x2="115" y2="55" stroke="${stroke}" stroke-width="3"/>
        <line x1="345" y1="45" x2="445" y2="45" stroke="${stroke}" stroke-width="3"/>

        <!-- Left Person -->
        <circle cx="65" cy="22" r="8" fill="${boxFill}" stroke="${textCol}" stroke-width="2.5"/>
        <line x1="65" y1="30" x2="65" y2="45" stroke="${textCol}" stroke-width="2.8"/>
        <line x1="65" y1="45" x2="56" y2="55" stroke="${textCol}" stroke-width="2.8"/>
        <line x1="65" y1="45" x2="74" y2="55" stroke="${textCol}" stroke-width="2.8"/>

        <!-- Right Person -->
        <circle cx="395" cy="14" r="8" fill="${boxFill}" stroke="${textCol}" stroke-width="2.5"/>
        <line x1="395" y1="22" x2="395" y2="36" stroke="${textCol}" stroke-width="2.8"/>
        <line x1="395" y1="36" x2="386" y2="45" stroke="${textCol}" stroke-width="2.8"/>
        <line x1="395" y1="36" x2="404" y2="45" stroke="${textCol}" stroke-width="2.8"/>

        <!-- Ropes to Rock -->
        <line x1="72" y1="38" x2="230" y2="112" stroke="#d97706" stroke-width="3.5"/>
        <line x1="388" y1="30" x2="230" y2="112" stroke="#d97706" stroke-width="3.5"/>

        <!-- Horizontal Reference Line at Rock Knot -->
        <line x1="125" y1="112" x2="335" y2="112" stroke="#94a3b8" stroke-dasharray="4 4" stroke-width="1.5"/>

        <!-- Left Rope Labels -->
        <rect x="92" y="64" width="88" height="22" rx="4" fill="#ffffff" stroke="#fde68a" stroke-width="1.2"/>
        <text x="136" y="79" text-anchor="middle" fill="#b45309" font-size="12" font-weight="800">T<tspan baseline-shift="sub" font-size="9">1</tspan>, &theta;<tspan baseline-shift="sub" font-size="9">1</tspan> = ?</text>

        <!-- Right Rope Labels -->
        <rect x="280" y="60" width="88" height="22" rx="4" fill="#ffffff" stroke="#93c5fd" stroke-width="1.2"/>
        <text x="321" y="75" text-anchor="middle" fill="${accent}" font-size="12" font-weight="800">${v.T2} N @ ${v.theta2}&deg;</text>

        <!-- Suspended Rock -->
        <circle cx="230" cy="146" r="28" fill="#cbd5e1" stroke="${stroke}" stroke-width="2.5"/>
        <line x1="230" y1="112" x2="230" y2="118" stroke="#d97706" stroke-width="3.5"/>
        <text x="230" y="146" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="13" font-weight="800">${v.m} kg</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  boxSlidingStop: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", forceCol = "#dc2626", textCol = "#0f172a", boxFill = "#f8fafc";
    return `<svg viewBox="0 0 440 170" class="w-full max-w-md mx-auto h-44 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <line x1="20" y1="130" x2="420" y2="130" stroke="${stroke}" stroke-width="3"/>
        <rect x="160" y="75" width="80" height="55" rx="5" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="200" y="102" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="13" font-weight="800">box</text>
        <line x1="250" y1="60" x2="330" y2="60" stroke="${accent}" stroke-width="3"/><polygon points="342,60 330,54 330,66" fill="${accent}"/>
        <text x="290" y="48" text-anchor="middle" fill="${accent}" font-size="12.5" font-weight="800">v<tspan baseline-shift="sub" font-size="9">0</tspan> = ${v.v0} m/s</text>
        <line x1="150" y1="118" x2="80" y2="118" stroke="${forceCol}" stroke-width="3"/><polygon points="68,118 80,112 80,124" fill="${forceCol}"/>
        <text x="110" y="108" text-anchor="middle" fill="${forceCol}" font-size="12.5" font-weight="800">f<tspan baseline-shift="sub" font-size="9">k</tspan></text>
        <text x="300" y="115" fill="#475569" font-size="12" font-weight="700">&mu;<tspan baseline-shift="sub" font-size="8">k</tspan> = ${v.mu}</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  craneTrolley: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", forceCol = "#dc2626", textCol = "#0f172a", boxFill = "#f8fafc";
    const t = (v.theta || 6) * Math.PI / 180, L = 95, px = 300, py = 82;
    const bx = px - L * Math.sin(t), by = py + L * Math.cos(t);
    return `<svg viewBox="0 0 440 240" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <line x1="20" y1="225" x2="420" y2="225" stroke="${stroke}" stroke-width="3"/>
        <polygon points="75,225 100,28 125,225" fill="#fef3c7" stroke="#d97706" stroke-width="2.5"/>
        <line x1="78" y1="180" x2="122" y2="180" stroke="#d97706" stroke-width="2.5"/>
        <rect x="40" y="70" width="330" height="10" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <line x1="100" y1="32" x2="40" y2="72" stroke="${stroke}" stroke-width="2"/><line x1="100" y1="32" x2="360" y2="72" stroke="${stroke}" stroke-width="2"/>
        <rect x="${px - 14}" y="${py - 12}" width="28" height="14" rx="3" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="${px + 24}" y="${py - 4}" text-anchor="middle" fill="${accent}" font-size="12.5" font-weight="800">P</text>
        <line x1="${px}" y1="${py}" x2="${px}" y2="${py + L + 15}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>
        <line x1="${px}" y1="${py}" x2="${bx}" y2="${by}" stroke="#d97706" stroke-width="2.5"/>
        <rect x="${bx - 28}" y="${by}" width="56" height="32" rx="4" fill="${boxFill}" stroke="${accent}" stroke-width="2.5"/>
        <text x="${bx}" y="${by + 17}" text-anchor="middle" dominant-baseline="central" fill="${textCol}" font-size="12" font-weight="800">${v.m} kg</text>
        <path d="M ${px} ${py + 50} A 50 50 0 0 0 ${px - 50 * Math.sin(t)} ${py + 50 * Math.cos(t)}" fill="none" stroke="${accent}" stroke-width="2"/>
        <text x="${px + 8}" y="${py + 58}" fill="${accent}" font-size="12.5" font-weight="800">&theta; = ${v.theta}&deg;</text>
        <line x1="320" y1="30" x2="390" y2="30" stroke="${forceCol}" stroke-width="3"/><polygon points="402,30 390,24 390,36" fill="${forceCol}"/>
        <text x="355" y="20" text-anchor="middle" fill="${forceCol}" font-size="12.5" font-weight="800">a</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  highWire: function (v) {
    var __orig = function (v) {
    const stroke = "#64748b", accent = "#2563eb", textCol = "#0f172a";
    const t = (v.theta || 12) * Math.PI / 180, half = 170, cx = 220, cy = 130;
    const ex = cx + half, ey = cy - half * Math.tan(t);
    return `<svg viewBox="0 0 440 210" class="w-full max-w-md mx-auto h-52 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">
        <rect x="10" y="${ey}" width="40" height="${200 - ey}" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <rect x="390" y="${ey}" width="40" height="${200 - ey}" fill="#e2e8f0" stroke="${stroke}" stroke-width="2.5"/>
        <line x1="50" y1="${ey}" x2="${cx}" y2="${cy}" stroke="#d97706" stroke-width="3.5"/>
        <line x1="${cx}" y1="${cy}" x2="390" y2="${ey}" stroke="#d97706" stroke-width="3.5"/>
        <line x1="${cx}" y1="${cy}" x2="390" y2="${cy}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="5 4"/>
        <circle cx="${cx}" cy="${cy - 52}" r="9" fill="#f8fafc" stroke="${textCol}" stroke-width="2.5"/>
        <line x1="${cx}" y1="${cy - 43}" x2="${cx}" y2="${cy - 17}" stroke="${textCol}" stroke-width="3"/>
        <line x1="${cx}" y1="${cy - 17}" x2="${cx - 8}" y2="${cy - 1}" stroke="${textCol}" stroke-width="3"/>
        <line x1="${cx}" y1="${cy - 17}" x2="${cx + 8}" y2="${cy - 1}" stroke="${textCol}" stroke-width="3"/>
        <line x1="${cx - 22}" y1="${cy - 36}" x2="${cx + 22}" y2="${cy - 36}" stroke="${textCol}" stroke-width="3"/>
        <path d="M ${cx + 100} ${cy} A 100 100 0 0 0 ${cx + 100 * Math.cos(t)} ${cy - 100 * Math.sin(t)}" fill="none" stroke="${accent}" stroke-width="2"/>
        <text x="${cx + 108}" y="${cy + 20}" fill="${accent}" font-size="12.5" font-weight="800">&theta; = ${v.theta}&deg;</text>
        <text x="${cx + 40}" y="${cy - 52}" fill="#475569" font-size="12" font-weight="700">m = ${v.m} kg</text>
      </svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dragBlockChair: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, gnd(150) + `<rect x="178" y="108" width="82" height="9" rx="2" fill="#fde7c8" stroke="#92400e" stroke-width="2.5"/><rect x="178" y="62" width="9" height="46" rx="2" fill="#fde7c8" stroke="#92400e" stroke-width="2.5"/><line x1="182" y1="76" x2="182" y2="100" stroke="#92400e" stroke-width="1.2"/><rect x="180" y="117" width="7" height="33" fill="#fde7c8" stroke="#92400e" stroke-width="2.5"/><rect x="251" y="117" width="7" height="33" fill="#fde7c8" stroke="#92400e" stroke-width="2.5"/>` + tx(220, 138, `${v.m} kg`, T, "middle", 13) + ar(270, 112, 350, 112, R) + tx(310, 101, `F`, R) + ar(165, 140, 95, 140, O) + tx(130, 132, `f`, O) + tx(220, 176, `${v.Fs} N to start it moving, ${v.Fk} N to keep it moving at constant velocity`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dragBlockCrate: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, gnd(150) + box(170, 92, 90, 58, `${v.m} kg`) + ar(270, 121, 350, 121, R) + tx(310, 110, `F (push)`, R) + ar(160, 136, 90, 136, O) + tx(125, 128, `f${sb("k")}`, O) + tx(220, 176, `&mu;${sb("s")} = ${v.muS}, &mu;${sb("k")} = ${v.muK}, push of ${v.Fa} N or ${v.Fb} N`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dragBlockMoon: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, gnd(150) + box(170, 92, 90, 58, `${v.m} kg`) + ar(270, 121, 350, 121, R) + tx(310, 110, `F`, R) + ar(160, 136, 90, 136, O) + tx(125, 128, `f`, O) + tx(220, 176, `On the Moon: g = ${v.gMoon} m/s&sup2;, &mu;${sb("s")} = ${v.muS}, &mu;${sb("k")} = ${v.muK}`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dragBlockFridge: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, gnd(150) + `<rect x="188" y="40" width="54" height="108" rx="5" fill="#f1f5f9" stroke="${A}" stroke-width="2.5"/><line x1="188" y1="72" x2="242" y2="72" stroke="${A}" stroke-width="1.8"/><line x1="196" y1="52" x2="196" y2="64" stroke="${S}" stroke-width="3" stroke-linecap="round"/><line x1="196" y1="82" x2="196" y2="98" stroke="${S}" stroke-width="3" stroke-linecap="round"/><rect x="194" y="148" width="8" height="2" fill="${T}"/><rect x="228" y="148" width="8" height="2" fill="${T}"/>` + tx(218, 118, `${v.m} kg`, T, "middle", 13) + ar(110, 84, 186, 84, R) + tx(148, 73, `F (push)`, R) + ar(180, 138, 120, 138, O) + tx(150, 130, `f`, O) + tx(220, 176, `&mu;${sb("s")} = ${v.muS}, &mu;${sb("k")} = ${v.muK}`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dragBlockTable: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, gnd(150) + box(170, 92, 90, 58, `${v.W} N`) + ar(270, 121, 350, 121, R) + tx(310, 110, `F`, R) + ar(160, 136, 90, 136, O) + tx(125, 128, `f`, O) + tx(220, 176, `&mu;${sb("s")} = ${v.muS}, &mu;${sb("k")} = ${v.muK}`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dragBlockBeam: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, gnd(150) + `<rect x="140" y="124" width="170" height="26" rx="2" fill="#e5e7eb" stroke="${S}" stroke-width="2.5"/><line x1="140" y1="131" x2="310" y2="131" stroke="${S}" stroke-width="1.5"/><line x1="140" y1="143" x2="310" y2="143" stroke="${S}" stroke-width="1.5"/><circle cx="310" cy="137" r="4" fill="none" stroke="${T}" stroke-width="2"/>` + tx(225, 117, `${v.m} kg steel beam`, T, "middle", 12.5) + ar(314, 137, 395, 137, R) + tx(355, 126, `T (rope)`, R) + ar(132, 137, 70, 137, O) + tx(100, 129, `f`, O) + tx(220, 176, `a = ${v.a} m/s&sup2;, &mu;${sb("s")} = ${v.muS}, &mu;${sb("k")} = ${v.muK}`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dragBlockForces: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, gnd(150) + box(170, 92, 90, 58, `m = ?`) + ar(270, 121, 350, 121, R) + tx(310, 110, `${v.F1} N`, R) + ar(160, 136, 90, 136, O) + tx(125, 128, `${v.F2} N`, O) + tx(220, 176, `a = ${v.a} m/s&sup2;`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  slideMan: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, gnd(150) + `<circle cx="62" cy="106" r="8" fill="${B}" stroke="${T}" stroke-width="2.5"/><line x1="66" y1="114" x2="82" y2="140" stroke="#7c3aed" stroke-width="8" stroke-linecap="round"/><line x1="82" y1="142" x2="122" y2="136" stroke="${T}" stroke-width="4" stroke-linecap="round"/><line x1="82" y1="142" x2="106" y2="126" stroke="${T}" stroke-width="4" stroke-linecap="round"/><line x1="106" y1="126" x2="118" y2="140" stroke="${T}" stroke-width="4" stroke-linecap="round"/><line x1="70" y1="122" x2="56" y2="136" stroke="#7c3aed" stroke-width="3.5" stroke-linecap="round"/><line x1="72" y1="124" x2="92" y2="134" stroke="#7c3aed" stroke-width="3.5" stroke-linecap="round"/><path d="M 130 150 L 138 146 L 146 150 L 143 153 L 133 153 Z" fill="none" stroke="none"/><polygon points="372,147 398,147 398,151 385,156 372,151" fill="#fff" stroke="${T}" stroke-width="2"/>` + ar(30, 60, 140, 60, A) + tx(85, 50, `v${sb("0")} = ${v.v0} m/s`, A) + tx(360, 50, `stops`, A) + `<line x1="385" y1="150" x2="385" y2="70" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(150, 167, 100, 167, O) + tx(92, 171, `f${sb("k")}`, O, "end") + dim(130, 385, 184, `d = ${v.d} m`) + tx(220, 219, `${v.m} kg player`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  slideSkater: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, gnd(150) + man(95, 150) + tx(95, 170, "", T) + ar(30, 60, 140, 60, A) + tx(85, 50, `v${sb("0")} = ${v.v0} m/s`, A) + (`stops` ? tx(360, 50, `stops`, A) : "") + `<line x1="385" y1="150" x2="385" y2="70" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(150, 167, 100, 167, O) + tx(92, 171, `f${sb("k")}`, O, "end") + (`d = ${v.d} m` ? dim(130, 385, 184, `d = ${v.d} m`) : "") + tx(220, 219, `ice skater`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  slideSkaterNoDist: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, gnd(150) + man(95, 150) + tx(95, 170, "", T) + ar(30, 60, 140, 60, A) + tx(85, 50, `v${sb("0")} = ${v.v0} m/s`, A) + (`stops` ? tx(360, 50, `stops`, A) : "") + `<line x1="385" y1="150" x2="385" y2="70" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(150, 167, 100, 167, O) + tx(92, 171, `f${sb("k")}`, O, "end") + (`` ? dim(130, 385, 184, ``) : "") + tx(220, 219, `&mu;${sb("s")} = ${v.muS}, &mu;${sb("k")} = ${v.muK}`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  slideCarSkid: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, gnd(150) + car(40, 150) + ar(30, 60, 140, 60, A) + tx(85, 50, `v${sb("0")} = ?`, A) + (`stops` ? tx(360, 50, `stops`, A) : "") + `<line x1="385" y1="150" x2="385" y2="70" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(150, 167, 100, 167, O) + tx(92, 171, `f${sb("k")}`, O, "end") + (`skid marks: ${v.d} m` ? dim(130, 385, 184, `skid marks: ${v.d} m`) : "") + tx(220, 219, `&mu;${sb("k")} = ${v.mu}`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  slidePuck: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, gnd(150) + `<path d="M 70 140 L 70 148 A 22 4.5 0 0 0 114 148 L 114 140 Z" fill="#e5e7eb" stroke="${A}" stroke-width="2.5"/><ellipse cx="92" cy="140" rx="22" ry="4.5" fill="#fff" stroke="${A}" stroke-width="2.5"/>` + ar(30, 60, 140, 60, A) + tx(85, 50, `v${sb("0")} = ${v.v0} m/s`, A) + tx(360, 50, `stops`, A) + `<line x1="385" y1="150" x2="385" y2="70" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(150, 167, 100, 167, O) + tx(92, 171, `f${sb("k")}`, O, "end") + dim(130, 385, 184, `d = ${v.d} m`) + tx(220, 219, ``, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  slideCarBrake: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, gnd(150) + car(40, 150) + ar(30, 60, 140, 60, A) + tx(85, 50, `v${sb("0")} = ${v.v0} m/s`, A) + (`v = ${v.vf} m/s` ? tx(360, 50, `v = ${v.vf} m/s`, A) : "") + `<line x1="385" y1="150" x2="385" y2="70" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(150, 167, 100, 167, O) + tx(92, 171, `f${sb("k")}`, O, "end") + (`d = ${v.d} m` ? dim(130, 385, 184, `d = ${v.d} m`) : "") + tx(220, 219, `${v.m} kg car, braking`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  slideCarStop: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, gnd(150) + car(40, 150) + ar(30, 60, 140, 60, A) + tx(85, 50, `v${sb("0")} = ${v.v0} m/s`, A) + (`stops` ? tx(360, 50, `stops`, A) : "") + `<line x1="385" y1="150" x2="385" y2="70" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(150, 167, 100, 167, O) + tx(92, 171, `f${sb("k")}`, O, "end") + (`d = ${v.d} m` ? dim(130, 385, 184, `d = ${v.d} m`) : "") + tx(220, 219, `${v.m} kg car`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  slideTrain: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, gnd(150) + `${[0,1].map(i => { const x = 8 + i * 68; return `<rect x="${x}" y="116" width="62" height="28" rx="3" fill="#fef3c7" stroke="${O}" stroke-width="2.5"/><line x1="${x + 31}" y1="116" x2="${x + 31}" y2="144" stroke="${O}" stroke-width="1.2"/><circle cx="${x + 13}" cy="144" r="6" fill="#475569" stroke="${T}" stroke-width="1.5"/><circle cx="${x + 49}" cy="144" r="6" fill="#475569" stroke="${T}" stroke-width="1.5"/>`; }).join("")}<line x1="70" y1="136" x2="76" y2="136" stroke="${T}" stroke-width="2"/><line x1="138" y1="136" x2="144" y2="136" stroke="${T}" stroke-width="2"/><rect x="144" y="120" width="86" height="24" rx="3" fill="#dbeafe" stroke="${A}" stroke-width="2.5"/><rect x="144" y="102" width="30" height="42" rx="3" fill="#dbeafe" stroke="${A}" stroke-width="2.5"/><rect x="150" y="109" width="16" height="12" fill="#fff" stroke="${A}" stroke-width="1.5"/><rect x="204" y="104" width="12" height="16" fill="#dbeafe" stroke="${A}" stroke-width="2"/><path d="M 230 144 L 242 150 L 230 150 Z" fill="#dbeafe" stroke="${A}" stroke-width="2"/><circle cx="158" cy="144" r="7" fill="#475569" stroke="${T}" stroke-width="1.5"/><circle cx="184" cy="144" r="7" fill="#475569" stroke="${T}" stroke-width="1.5"/><circle cx="212" cy="144" r="7" fill="#475569" stroke="${T}" stroke-width="1.5"/>` + ar(30, 60, 140, 60, A) + tx(85, 50, `v${sb("0")} = ${v.v0Kmh} km/h`, A) + tx(360, 50, `stops`, A) + `<line x1="385" y1="150" x2="385" y2="70" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(150, 167, 100, 167, O) + tx(92, 171, `f${sb("k")}`, O, "end") + dim(245, 385, 184, `d = ${v.d} m`) + tx(220, 219, ``, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  elevCable: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(205, `<rect x="140" y="12" width="160" height="165" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/><rect x="155" y="75" width="130" height="95" rx="4" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><line x1="220" y1="12" x2="220" y2="75" stroke="${O}" stroke-width="3"/>` + tx(220, 115, `${v.WkN} kN`, T, "middle", 13) + ar(360, 130, 360, 70, R) + tx(360, 60, `a = ${v.a} m/s&sup2;`, R) + (`T = ?` ? tx(250, 45, `T = ?`, "#b45309", "start") : "") + tx(220, 198, ``, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  elevPersonDown: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(205, `<rect x="140" y="12" width="160" height="165" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/><rect x="155" y="75" width="130" height="95" rx="4" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><line x1="220" y1="12" x2="220" y2="75" stroke="${O}" stroke-width="3"/>` + man(220, 150) + `<rect x="195" y="150" width="50" height="8" fill="#cbd5e1" stroke="${S}" stroke-width="2"/>` + ar(360, 70, 360, 130, R) + tx(360, 148, `a = ${v.a} m/s&sup2;`, R) + (`` ? tx(250, 45, ``, "#b45309", "start") : "") + tx(220, 198, `scale reads ${v.m} kg when the elevator is at rest`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  elevBoxUnknown: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(205, `<rect x="140" y="12" width="160" height="165" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/><rect x="155" y="75" width="130" height="95" rx="4" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><line x1="220" y1="12" x2="220" y2="75" stroke="${O}" stroke-width="3"/>` + box(195, 105, 50, 45, "") + `<rect x="190" y="150" width="60" height="8" fill="#cbd5e1" stroke="${S}" stroke-width="2"/>` + ar(360, 130, 360, 70, R) + tx(360, 60, `a = ?`, R) + (`` ? tx(250, 45, ``, "#b45309", "start") : "") + tx(220, 198, `scale reads ${v.pct}% of the box’s usual weight`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  elevPersonUp: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(205, `<rect x="140" y="12" width="160" height="165" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/><rect x="155" y="75" width="130" height="95" rx="4" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><line x1="220" y1="12" x2="220" y2="75" stroke="${O}" stroke-width="3"/>` + man(220, 150) + `<rect x="195" y="150" width="50" height="8" fill="#cbd5e1" stroke="${S}" stroke-width="2"/>` + ar(360, 130, 360, 70, R) + tx(360, 60, `a`, R) + (`` ? tx(250, 45, ``, "#b45309", "start") : "") + tx(220, 198, `scale reads ${v.W} N at rest; speed 0 to ${v.v} m/s in ${v.t} s`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  bucketRope: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(205, `<line x1="140" y1="12" x2="300" y2="12" stroke="${S}" stroke-width="4"/><line x1="220" y1="12" x2="220" y2="85" stroke="${O}" stroke-width="3"/><path d="M 185 85 L 255 85 L 245 150 L 195 150 Z" fill="${B}" stroke="${A}" stroke-width="2.5"/>` + tx(220, 124, `${v.m} kg`, T) + tx(238, 55, "T", "#b45309", "start") + ar(120, 140, 120, 80, R) + tx(120, 70, `a = ${v.aUp} m/s&sup2;`, R) + tx(120, 163, "(part a: up)", "#475569", "middle", 11) + ar(330, 85, 330, 145, R) + tx(330, 75, `a = ${v.aDown} m/s&sup2;`, R) + tx(330, 163, "(part b: down)", "#475569", "middle", 11));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  caveRope: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(215, `<rect x="40" y="62" width="70" height="143" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><rect x="330" y="62" width="70" height="143" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><line x1="110" y1="205" x2="330" y2="205" stroke="${S}" stroke-width="3"/>` + man(75, 62) + `<line x1="85" y1="30" x2="220" y2="30" stroke="${O}" stroke-width="3"/><line x1="220" y1="30" x2="220" y2="148" stroke="${O}" stroke-width="3"/>` + man(220, 205) + ar(250, 150, 250, 90, R) + tx(262, 120, "a", R, "start") + tx(236, 80, `T${sb("max")} = ${v.Tmax} N`, "#b45309", "start") + `<line x1="365" y1="62" x2="365" y2="205" stroke="${S}" stroke-width="1.5"/>` + tx(322, 190, `depth ${v.d} m`, "#475569", "end", 12) + tx(220, 215-4, "", T));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  compass3: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(215, tx(200, 12, "N", "#94a3b8") + tx(200, 204, "S", "#94a3b8") + tx(14, 104, "W", "#94a3b8") + tx(426, 104, "E", "#94a3b8") + `<line x1="30" y1="100" x2="410" y2="100" stroke="#e2e8f0" stroke-width="1.5"/><line x1="200" y1="22" x2="200" y2="188" stroke="#e2e8f0" stroke-width="1.5"/><circle cx="200" cy="100" r="17" fill="${B}" stroke="${T}" stroke-width="2.5"/>` + (() => { const L = 55 * (v.Fw) / (Math.max(v.Fw, v.Fs, v.Fe)); const th = 180 * Math.PI / 180; return ar(200, 100, 200 + L * Math.cos(th), 100 - L * Math.sin(th), R) + tx(200 + (L + 24) * Math.cos(th), 100 - (L + 20) * Math.sin(th) + 4, `${v.Fw} N`, R); })() + (() => { const L = 55 * (v.Fs) / (Math.max(v.Fw, v.Fs, v.Fe)); const th = 270 * Math.PI / 180; return ar(200, 100, 200 + L * Math.cos(th), 100 - L * Math.sin(th), R) + tx(200 + (L + 24) * Math.cos(th), 100 - (L + 20) * Math.sin(th) + 4, `${v.Fs} N`, R); })() + (() => { const L = 55 * (v.Fe) / (Math.max(v.Fw, v.Fs, v.Fe)); const th = 0 * Math.PI / 180; return ar(200, 100, 200 + L * Math.cos(th), 100 - L * Math.sin(th), R) + tx(200 + (L + 24) * Math.cos(th), 100 - (L + 20) * Math.sin(th) + 4, `${v.Fe} N`, R); })() + tx(20, 24, `${v.m} kg`, "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  compass2: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(215, tx(200, 12, "N", "#94a3b8") + tx(200, 204, "S", "#94a3b8") + tx(14, 104, "W", "#94a3b8") + tx(426, 104, "E", "#94a3b8") + `<line x1="30" y1="100" x2="410" y2="100" stroke="#e2e8f0" stroke-width="1.5"/><line x1="200" y1="22" x2="200" y2="188" stroke="#e2e8f0" stroke-width="1.5"/><circle cx="200" cy="100" r="17" fill="${B}" stroke="${T}" stroke-width="2.5"/>` + (() => { const L = 55 * (v.Fw) / (Math.max(v.Fw, v.Fn)); const th = 180 * Math.PI / 180; return ar(200, 100, 200 + L * Math.cos(th), 100 - L * Math.sin(th), R) + tx(200 + (L + 24) * Math.cos(th), 100 - (L + 20) * Math.sin(th) + 4, `${v.Fw} N`, R); })() + (() => { const L = 55 * (v.Fn) / (Math.max(v.Fw, v.Fn)); const th = 90 * Math.PI / 180; return ar(200, 100, 200 + L * Math.cos(th), 100 - L * Math.sin(th), R) + tx(200 + (L + 24) * Math.cos(th), 100 - (L + 20) * Math.sin(th) + 4, `${v.Fn} N`, R); })() + tx(20, 24, `${v.m} kg`, "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  compassEquil: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(215, tx(200, 12, "N", "#94a3b8") + tx(200, 204, "S", "#94a3b8") + tx(14, 104, "W", "#94a3b8") + tx(426, 104, "E", "#94a3b8") + `<line x1="30" y1="100" x2="410" y2="100" stroke="#e2e8f0" stroke-width="1.5"/><line x1="200" y1="22" x2="200" y2="188" stroke="#e2e8f0" stroke-width="1.5"/><circle cx="200" cy="100" r="17" fill="${B}" stroke="${T}" stroke-width="2.5"/>` + (() => { const L = 55 * (v.A) / (Math.max(v.A, v.B)); const th = (180 + v.thetaA) * Math.PI / 180; return ar(200, 100, 200 + L * Math.cos(th), 100 - L * Math.sin(th), R) + tx(200 + (L + 24) * Math.cos(th), 100 - (L + 20) * Math.sin(th) + 4, `A = ${v.A} N`, R); })() + (() => { const L = 55 * (v.B) / (Math.max(v.A, v.B)); const th = 90 * Math.PI / 180; return ar(200, 100, 200 + L * Math.cos(th), 100 - L * Math.sin(th), R) + tx(200 + (L + 24) * Math.cos(th), 100 - (L + 20) * Math.sin(th) + 4, `B = ${v.B} N`, R); })() + tx(20, 24, ``, "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dropRockMars: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, `<rect x="15" y="190" width="410" height="14" fill="#fecaca" stroke="${S}" stroke-width="2"/>` + tx(215, 215, "Mars", "#b91c1c", "middle", 12) + `<circle cx="150" cy="30" r="12" fill="#cbd5e1" stroke="${S}" stroke-width="2.5"/>` + `<line x1="150" y1="44" x2="150" y2="170" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(150, 50, 150, 150, A) + tx(172, 110, "g = ?", A, "start") + `<line x1="260" y1="30" x2="260" y2="190" stroke="${S}" stroke-width="1.5"/><line x1="254" y1="30" x2="266" y2="30" stroke="${S}" stroke-width="1.5"/><line x1="254" y1="190" x2="266" y2="190" stroke="${S}" stroke-width="1.5"/>` + tx(274, 115, `h = ${v.h} m`, "#475569", "start") + tx(274, 135, `t = ${v.t} s`, "#475569", "start") + tx(90, 33, `${v.m} kg`, T, "end"));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dropRockPlanet: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, `<rect x="15" y="190" width="410" height="14" fill="#fecaca" stroke="${S}" stroke-width="2"/>` + tx(215, 215, "new planet", "#b91c1c", "middle", 12) + `<circle cx="150" cy="30" r="12" fill="#cbd5e1" stroke="${S}" stroke-width="2.5"/>` + `<line x1="150" y1="44" x2="150" y2="170" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(150, 50, 150, 150, A) + tx(172, 110, "g = ?", A, "start") + `<line x1="260" y1="30" x2="260" y2="190" stroke="${S}" stroke-width="1.5"/><line x1="254" y1="30" x2="266" y2="30" stroke="${S}" stroke-width="1.5"/><line x1="254" y1="190" x2="266" y2="190" stroke="${S}" stroke-width="1.5"/>` + tx(274, 115, `h = ${v.h} m`, "#475569", "start") + tx(274, 135, `t = ${v.t} s`, "#475569", "start") + tx(90, 33, `${v.m} kg`, T, "end"));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  airDragBall: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(205, `<circle cx="200" cy="85" r="22" fill="#d9f99d" stroke="#65a30d" stroke-width="2.5"/>` + `<path d="M 180 80 Q 200 70 220 80" fill="none" stroke="#fff" stroke-width="2"/>` + ar(200, 112, 200, 185, A) + tx(214, 165, "mg", A, "start") + ar(200, 58, 200, 16, R) + tx(214, 36, "F" + sb("air") + " = ?", R, "start") + ar(280, 60, 280, 130, "#475569") + tx(292, 100, `a = ${v.a} m/s&sup2;`, "#475569", "start") + tx(120, 92, `${v.m} kg ball`, T, "middle"));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  airDragSkydiver: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(205, man(200, 110, T) + `<path d="M 160 40 Q 200 -5 240 40" fill="none" stroke="none"/>` + ar(200, 112, 200, 190, A) + tx(214, 172, "W", A, "start") + ar(236, 62, 236, 22, R) + tx(250, 40, "F" + sb("air") + " = ?", R, "start") + ar(310, 60, 310, 130, "#475569") + tx(322, 100, `a = ${v.a} m/s&sup2;`, "#475569", "start"));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  airDragSkydiverFrac: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(205, man(200, 110, T) + ar(200, 112, 200, 190, A) + tx(214, 172, "W = mg", A, "start") + ar(236, 62, 236, 22, R) + tx(250, 40, "F" + sb("air") + " = W / " + v.den, R, "start") + tx(130, 90, `${v.m} kg`, T, "end") + tx(290, 100, "part b: parachute open,", "#475569", "start", 11) + tx(290, 114, "constant speed", "#475569", "start", 11));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  towerDrop: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, gnd(205) + `<g transform="rotate(-6 120 205)"><rect x="95" y="25" width="50" height="180" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><line x1="95" y1="70" x2="145" y2="70" stroke="${S}"/><line x1="95" y1="115" x2="145" y2="115" stroke="${S}"/><line x1="95" y1="160" x2="145" y2="160" stroke="${S}"/></g>` + `<rect x="170" y="30" width="22" height="16" rx="3" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>` + tx(205, 42, `${v.m} kg`, T, "start", 11) + ar(181, 55, 181, 150, A) + tx(198, 110, "falls " + v.h + " m", "#475569", "start") + tx(198, 128, "lands at " + v.vf + " m/s", "#475569", "start") + `<rect x="170" y="190" width="22" height="16" rx="3" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>`);
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  firePole: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(220, gnd(205) + `<line x1="200" y1="10" x2="200" y2="205" stroke="#94a3b8" stroke-width="7"/>` + `<circle cx="214" cy="94" r="8" fill="${B}" stroke="${T}" stroke-width="2.5"/><line x1="212" y1="102" x2="212" y2="140" stroke="${T}" stroke-width="3"/><line x1="212" y1="112" x2="203" y2="122" stroke="${T}" stroke-width="3"/><line x1="212" y1="140" x2="222" y2="170" stroke="${T}" stroke-width="3"/><line x1="212" y1="140" x2="205" y2="172" stroke="${T}" stroke-width="3"/>` + ar(240, 100, 240, 175, A) + tx(252, 140, "W", A, "start") + ar(180, 150, 180, 100, O) + tx(168, 130, "f", O, "end") + `<line x1="340" y1="10" x2="340" y2="205" stroke="${S}" stroke-width="1.5"/><line x1="334" y1="10" x2="346" y2="10" stroke="${S}"/><line x1="334" y1="205" x2="346" y2="205" stroke="${S}"/>` + tx(332, 110, `${v.h} m`, "#475569", "end") + tx(110, 100, `${v.m} kg`, T, "middle") + tx(110, 118, `lands at ${v.vf} m/s`, "#475569", "middle", 11));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  planetWeight: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, `<rect x="15" y="140" width="410" height="30" fill="#fde68a" stroke="${S}" stroke-width="2"/>` + `<path d="M 170 140 L 180 100 L 215 88 L 250 105 L 260 140 Z" fill="#94a3b8" stroke="${S}" stroke-width="2.5"/>` + tx(215, 126, "rock", T) + ar(300, 95, 300, 135, A) + tx(312, 118, "W = ?", A, "start") + tx(215, 30, `g = ${v.gPlanet} m/s&sup2; on this planet`, "#475569") + tx(215, 52, `rock: ${v.mRock} kg    boulder: weight ${v.wBoulderKN} kN`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  asteroidTug: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, `<path d="M 150 95 Q 140 55 185 45 Q 235 30 265 60 Q 290 95 255 125 Q 215 150 170 135 Q 145 125 150 95 Z" fill="#cbd5e1" stroke="${S}" stroke-width="2.5"/>` + tx(212, 92, "asteroid", T) + tx(212, 108, `${v.mExp9} &times; 10<tspan baseline-shift="super" font-size="9">9</tspan> kg`, T, "middle", 11) + box(300, 78, 36, 24, "tug", G) + ar(298, 90, 268, 90, R) + tx(300, 66, `F = ${v.fN} N`, R, "middle") + tx(212, 175, `speed change needed: ${v.dvCmS} cm/s`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  truckTrailer: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, gnd(150) + `<path d="M 40 150 L 40 100 L 85 100 L 100 78 L 150 78 L 150 150 Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="65" cy="139" r="11" fill="#475569"/><circle cx="130" cy="139" r="11" fill="#475569"/>` + tx(95, 118, `${v.m1} kg`, T, "middle", 11) + `<line x1="150" y1="130" x2="195" y2="130" stroke="${O}" stroke-width="4"/>` + `<rect x="195" y="85" width="150" height="65" rx="4" fill="${B}" stroke="${A}" stroke-width="2.5"/><circle cx="225" cy="139" r="11" fill="#475569"/><circle cx="315" cy="139" r="11" fill="#475569"/>` + tx(270, 122, `${v.m2} kg`, T, "middle", 12) + ar(30, 170, 100, 170, R) + tx(65, 184, `${v.FkN} kN (ground pushes truck)`, R, "start", 11).replace('x="65"', 'x="105"') + ar(360, 70, 420, 70, "#475569") + tx(390, 58, "a", "#475569"));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  canoeDock: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(195, `<rect x="15" y="105" width="75" height="75" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/>` + tx(52, 150, "dock", T) + `<rect x="15" y="150" width="410" height="35" fill="#bae6fd" opacity="0.8"/>` + `<path d="M 130 135 L 360 135 L 330 152 L 160 152 Z" fill="#fde68a" stroke="#92400e" stroke-width="2.5"/>` + man(245, 135) + tx(250, 175, `girl ${v.m1} kg + canoe ${v.m2} kg`, "#475569", "middle", 11) + ar(95, 120, 138, 120, R) + tx(110, 108, "F", R) + ar(370, 90, 420, 90, A) + tx(395, 78, `v = ${v.v} m/s`, A, "middle", 11) + tx(395, 106, `in ${v.t} s`, "#475569", "middle", 11));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  astronautCrate: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, `<circle cx="120" cy="60" r="10" fill="#e2e8f0" stroke="${T}" stroke-width="2.5"/><rect x="108" y="72" width="26" height="42" rx="6" fill="#e2e8f0" stroke="${T}" stroke-width="2.5"/><line x1="134" y1="85" x2="205" y2="92" stroke="${T}" stroke-width="4"/><line x1="112" y1="114" x2="105" y2="145" stroke="${T}" stroke-width="3"/><line x1="130" y1="114" x2="136" y2="145" stroke="${T}" stroke-width="3"/>` + box(205, 70, 56, 46, `${v.mC} kg`) + tx(120, 165, `astronaut ${v.mA} kg`, "#475569", "middle", 11) + ar(100, 95, 50, 95, R) + tx(75, 85, "F", R) + ar(268, 93, 330, 93, R) + tx(300, 83, "F", R) + tx(220, 30, `astronaut accelerates at ${v.aA} m/s&sup2; for ${v.t} s`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  iceTwo: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, `<rect x="15" y="150" width="410" height="14" fill="#e0f2fe" stroke="${S}" stroke-width="2"/>` + man(150, 150) + man(270, 150, G) + tx(150, 178, `boy ${v.mB} kg`, "#475569", "middle", 11) + tx(270, 178, `girl ${v.mG} kg`, "#475569", "middle", 11) + ar(135, 120, 70, 120, R) + tx(100, 108, `a = ${v.aB} m/s&sup2;`, R, "middle", 11) + ar(285, 120, 350, 120, G) + tx(325, 108, "a = ?", G, "middle", 11) + tx(215, 30, `frictionless ice, pushing for ${v.t} s`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  kayak: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, `<rect x="15" y="140" width="410" height="35" fill="#bae6fd" opacity="0.8"/>` + `<path d="M 110 128 L 330 128 L 360 138 L 300 148 L 140 148 L 80 138 Z" fill="#fca5a5" stroke="#7f1d1d" stroke-width="2.5"/>` + man(220, 128) + `<line x1="170" y1="80" x2="270" y2="120" stroke="${S}" stroke-width="3"/>` + tx(220, 172, `person ${v.mPerson} kg + kayak ${v.mKayak} kg`, "#475569", "middle", 11) + ar(375, 110, 425, 110, R) + tx(398, 98, "F", R) + tx(220, 28, `from rest to ${v.vf} m/s in ${v.dCm} cm`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  boatForces: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, `<rect x="15" y="130" width="410" height="45" fill="#bae6fd" opacity="0.8"/>` + `<path d="M 150 100 L 290 100 L 320 120 L 270 140 L 170 140 L 130 120 Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/>` + tx(220, 126, `${v.m} kg`, T, "middle", 12) + ar(140, 112, 60, 112, A) + tx(100, 100, `drive ${v.Fdrive} N`, A) + ar(310, 100, 365, 100, R) + tx(345, 88, `wind ${v.Fwind} N`, R, "middle", 11) + ar(310, 126, 365, 126, O) + tx(350, 148, `water ${v.Fwater} N`, O, "middle", 11) + tx(20, 30, "W (&minus;)", "#475569", "start", 12) + tx(420, 30, "E (+)", "#475569", "end", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  crateInTruck: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(195, gnd(165) + `<path d="M 55 151 L 55 125 L 205 125 L 205 78 L 255 78 L 285 104 L 335 108 L 345 120 L 345 151 Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5" stroke-linejoin="round"/><path d="M 55 125 L 55 105 L 63 105 L 63 125" fill="#cbd5e1" stroke="${S}" stroke-width="2"/><path d="M 215 85 L 250 85 L 270 104 L 215 104 Z" fill="#f1f5f9" stroke="${S}" stroke-width="2"/><path d="M 91 151 A 14 14 0 0 1 119 151 Z M 276 151 A 14 14 0 0 1 304 151 Z" fill="${B}" stroke="${S}" stroke-width="2"/><circle cx="105" cy="151" r="14" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="290" cy="151" r="14" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="105" cy="151" r="5" fill="#cbd5e1"/><circle cx="290" cy="151" r="5" fill="#cbd5e1"/>` + box(95, 85, 52, 40, "crate") + ar(121, 72, 181, 72, R) + tx(151, 60, "a", R) + ar(150, 116, 198, 116, O) + tx(174, 108, "f" + sb("s"), O, "middle", 11) + tx(215, 30, `truck: 0 to ${v.vf} m/s in ${v.t} s`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  ballCushion: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, `<rect x="330" y="35" width="26" height="115" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/>` + tx(343, 170, "cushion", "#475569", "middle", 11) + `<circle cx="250" cy="92" r="16" fill="#d9f99d" stroke="#65a30d" stroke-width="2.5"/>` + ar(190, 75, 240, 75, A) + tx(200, 62, `before: ${Math.abs(v.vi)} m/s`, A, "start", 11) + ar(240, 112, 190, 112, R) + tx(200, 132, `after: ${Math.abs(v.vf)} m/s`, R, "start", 11) + tx(110, 100, `${v.m} kg ball`, T, "middle", 12) + tx(220, 30, `contact time ${v.dtMs} ms`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  rocketTube: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, `<rect x="40" y="70" width="270" height="40" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/>` + `<path d="M 50 80 L 95 80 L 115 90 L 95 100 L 50 100 Z" fill="${B}" stroke="${R}" stroke-width="2.5"/><path d="M 50 80 L 38 72 L 38 108 L 50 100 Z" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>` + tx(75, 94, `${v.m} kg`, T, "middle", 10) + dim(40, 310, 135, `tube length ${v.dCm} cm`) + ar(325, 90, 410, 90, A) + tx(368, 78, `v = ${v.v} m/s`, A, "middle", 11) + tx(180, 55, "starts at rest", "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  tennisServe: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, `<ellipse cx="85" cy="85" rx="22" ry="30" fill="none" stroke="${S}" stroke-width="3"/><line x1="75" y1="113" x2="45" y2="165" stroke="${S}" stroke-width="5"/>` + `<circle cx="125" cy="85" r="10" fill="#d9f99d" stroke="#65a30d" stroke-width="2.5"/>` + `<line x1="135" y1="85" x2="300" y2="85" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + dim(125, 300, 125, `${v.dCm} cm of contact`) + ar(310, 85, 410, 85, A) + tx(360, 73, `v = ${v.vf} m/s`, A, "middle", 11) + tx(215, 40, `${v.mG} g ball, starts at rest`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  rollerCoaster: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const ty = 150;
    const train = (x, ghost) => {
      let s = `<g opacity="${ghost ? 0.5 : 1}">`;
      for (let i = 0; i < 3; i++) {
        const cx0 = x + i * 48;
        s += `<rect x="${cx0}" y="${ty - 40}" width="44" height="26" rx="6" fill="#fde68a" stroke="${R}" stroke-width="2.5"/><circle cx="${cx0 + 22}" cy="${ty - 50}" r="7" fill="${B}" stroke="${T}" stroke-width="2"/><line x1="${cx0 + 22}" y1="${ty - 43}" x2="${cx0 + 22}" y2="${ty - 36}" stroke="${T}" stroke-width="2.5"/><circle cx="${cx0 + 10}" cy="${ty - 8}" r="6" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${cx0 + 34}" cy="${ty - 8}" r="6" fill="#475569" stroke="${S}" stroke-width="2"/>`;
        if (i < 2) s += `<line x1="${cx0 + 44}" y1="${ty - 22}" x2="${cx0 + 48}" y2="${ty - 22}" stroke="${S}" stroke-width="3"/>`;
      }
      return s + `</g>`;
    };
    let supports = ""; for (let x = 30; x <= 410; x += 38) supports += `<line x1="${x}" y1="${ty + 2}" x2="${x}" y2="190" stroke="${S}" stroke-width="2"/>`;
    return svg(215, supports + `<line x1="15" y1="${ty}" x2="425" y2="${ty}" stroke="${T}" stroke-width="3.5"/><line x1="15" y1="190" x2="425" y2="190" stroke="${S}" stroke-width="2.5"/>` + train(30, false) + train(270, true) + tx(100, 70, "starts at rest", "#475569", "middle", 12) + tx(340, 60, `v = ${v.vf} m/s`, G, "middle", 13) + tx(340, 76, `after ${v.t} s`, G, "middle", 12) + ar(180, 118, 250, 118, R) + tx(215, 108, "F" + sb("net") + " = ?", R, "middle", 13) + tx(215, 40, "same straight, level track", "#475569", "middle", 11) + tx(220, 207, `${v.m} kg (car + riders)`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  carCrashTree: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(195, gnd(165) + `<rect x="345" y="30" width="30" height="135" fill="#92400e" stroke="#451a03" stroke-width="2.5"/><circle cx="360" cy="25" r="40" fill="#bbf7d0" stroke="#166534" stroke-width="2.5" opacity="0.8"/>` + car(200, 165) + `<circle cx="253" cy="134" r="7" fill="${B}" stroke="${T}" stroke-width="2.5"/><line x1="253" y1="141" x2="253" y2="160" stroke="${T}" stroke-width="3"/>` + ar(262, 150, 218, 150, R) + tx(222, 108, "F" + sb("straps"), R, "middle", 11) + ar(40, 60, 150, 60, A) + tx(95, 48, `${v.vKmh} km/h`, A) + tx(100, 100, `${v.m} kg child`, "#475569", "middle", 12) + tx(100, 118, `stops in ${v.t} s`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  crashDecel: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(195, gnd(165) + `<rect x="345" y="55" width="30" height="110" fill="#cbd5e1" stroke="${S}" stroke-width="2.5"/>` + car(200, 165) + `<circle cx="253" cy="134" r="7" fill="${B}" stroke="${T}" stroke-width="2.5"/><line x1="253" y1="141" x2="253" y2="160" stroke="${T}" stroke-width="3"/>` + ar(40, 60, 150, 60, A) + tx(95, 48, `${v.v0Kmh} km/h`, A) + ar(240, 40, 190, 40, R) + tx(215, 28, `a = ${v.gLimit} g (max survivable)`, R, "middle", 11) + tx(100, 110, `${v.m} kg person`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  sledPulled: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const t = (v.theta || 30) * Math.PI / 180, L = 120, ox = 270, oy = 125;
    return svg(185, gnd(150) + `<path d="M 150 150 L 280 150" stroke="${O}" stroke-width="0"/><rect x="170" y="118" width="85" height="32" rx="5" fill="${B}" stroke="${A}" stroke-width="2.5"/>` + tx(212, 139, `${v.m} kg`, T, "middle", 12) + `<line x1="255" y1="134" x2="${255 + L + 10}" y2="134" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(255, 134, 255 + L * Math.cos(t), 134 - L * Math.sin(t), R) + `<path d="M ${255 + 60} 134 A 60 60 0 0 0 ${255 + 60 * Math.cos(t)} ${134 - 60 * Math.sin(t)}" fill="none" stroke="${A}" stroke-width="2"/>` + tx(255 + 68, 128, `&theta; = ${v.theta}&deg;`, A, "start") + tx(255 + L * Math.cos(t) - 6, 134 - L * Math.sin(t) - 8, `T = ${v.FT} N`, R, "start") + tx(100, 138, "constant velocity", "#475569", "middle", 11));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  boxPushedBelow: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const t = (v.theta || 25) * Math.PI / 180, L = 115, hx = 170, hy = 105, tx0 = hx - L * Math.cos(t), ty0 = hy - L * Math.sin(t);
    return svg(185, gnd(155) + box(170, 80, 100, 75, `${v.W} N`) + `<line x1="${tx0}" y1="${ty0}" x2="${tx0 + 95}" y2="${ty0}" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(tx0, ty0, hx, hy, R) + `<path d="M ${tx0 + 60} ${ty0} A 60 60 0 0 1 ${tx0 + 60 * Math.cos(t)} ${ty0 + 60 * Math.sin(t)}" fill="none" stroke="${A}" stroke-width="2"/>` + tx(tx0 + 66, ty0 - 6, `&theta; = ${v.theta}&deg;`, A, "start") + tx(tx0 - 4, ty0 + 16, `F = ${v.F} N`, R, "end") + tx(310, 120, `&mu;${sb("k")} = ${v.muK}`, "#475569", "start"));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  wallBlockUp: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const t = (v.theta || 55) * Math.PI / 180, L = 100, py = 95, hx = 215, tx0 = hx - L * Math.cos(t), ty0 = py + L * Math.sin(t);
    return svg(230, `<rect x="300" y="10" width="26" height="210" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/>` + box(215, 55, 85, 80, `${v.m} kg`) + `<line x1="${tx0}" y1="${ty0}" x2="${tx0 + 100}" y2="${ty0}" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(tx0, ty0, hx, py, R) + `<path d="M ${tx0 + 55} ${ty0} A 55 55 0 0 0 ${tx0 + 55 * Math.cos(t)} ${ty0 - 55 * Math.sin(t)}" fill="none" stroke="${A}" stroke-width="2"/>` + tx(tx0 + 62, ty0 + 18, `&theta; = ${v.theta}&deg;`, A, "start") + tx(tx0 - 6, ty0 + 4, `F = ${v.F} N`, R, "end") + tx(20, 30, "pushed up the wall at constant velocity", "#475569", "start", 11));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  baseballGlove: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(185, `<circle cx="120" cy="90" r="14" fill="#fff" stroke="${T}" stroke-width="2.5"/><path d="M 108 84 Q 120 90 108 98 M 132 84 Q 120 90 132 98" fill="none" stroke="${R}" stroke-width="1.5"/>` + ar(20, 60, 100, 60, A) + tx(60, 48, `${v.v0} m/s`, A) + `<path d="M 270 55 Q 330 55 330 90 Q 330 125 270 125 Q 290 90 270 55 Z" fill="#d97706" stroke="#92400e" stroke-width="2.5"/>` + dim(170, 270, 150, `glove moves back ${v.dCm} cm`) + ar(262, 90, 205, 90, R) + tx(235, 80, "F", R) + tx(60, 120, `${v.m} kg ball`, T, "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  motCarUnknownV: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const ic = (x) => car(x, 140);
    return svg(218, gnd(140) + ic(30) + `<g opacity="0.35">` + ic(290) + `</g>` + tx(85, 76, `v${sb("0")} = ${v.v0} m/s`, A) + tx(345, 76, `v = ?`, A) + ar(150, 50, 285, 50, R) + tx(217, 40, `a = ${v.accel} m/s&sup2;`, R) + `<line x1="145" y1="140" x2="145" y2="150" stroke="${S}"/><line x1="400" y1="140" x2="400" y2="150" stroke="${S}"/>` + dim(145, 400, 168, `d = ${v.dist} m`) + tx(220, 212, `constant acceleration`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  motPitch: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const ic = (x) => man(x + 40, 140) + `<circle cx="${x + 70}" cy="104" r="6" fill="#fff" stroke="${R}" stroke-width="2"/>`;
    return svg(218, gnd(140) + ic(30) + `<g opacity="0.35">` + ic(290) + `</g>` + tx(85, 76, `starts at rest`, A) + tx(345, 76, `v = ${v.v0} m/s`, A) + ar(150, 50, 285, 50, R) + tx(217, 40, `a = ?`, R) + `<line x1="145" y1="140" x2="145" y2="150" stroke="${S}"/><line x1="400" y1="140" x2="400" y2="150" stroke="${S}"/>` + dim(145, 400, 168, `d = ${v.dist} m`) + tx(220, 212, `arm moves the ball forward while accelerating`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  motCatapult: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const ic = (x) => `<path d="M ${x} 128 L ${x + 80} 124 L ${x + 105} 112 L ${x + 112} 124 L ${x + 100} 134 L ${x + 20} 136 Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><path d="M ${x + 40} 126 L ${x + 62} 100 L ${x + 72} 100 L ${x + 62} 126 Z" fill="#cbd5e1" stroke="${S}" stroke-width="2"/>`;
    return svg(218, gnd(140) + ic(30) + `<g opacity="0.35">` + ic(290) + `</g>` + tx(85, 76, `starts at rest`, A) + tx(345, 76, `v = ${v.vFinal} m/s`, A) + ar(150, 50, 285, 50, R) + tx(217, 40, `a = constant`, R) + `<line x1="145" y1="140" x2="145" y2="150" stroke="${S}"/><line x1="400" y1="140" x2="400" y2="150" stroke="${S}"/>` + dim(145, 400, 168, `runway length = ?`) + tx(220, 212, `takeoff in ${v.tLaunch} s on the flight deck`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  motCarStop: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const ic = (x) => car(x, 140);
    return svg(218, gnd(140) + ic(30) + `<g opacity="0.35">` + ic(290) + `</g>` + tx(85, 76, `v${sb("0")} = ${v.v0} m/s`, A) + tx(345, 76, `v = 0`, A) + ar(150, 50, 285, 50, R) + tx(217, 40, `a = constant (slowing)`, R) + `<line x1="145" y1="140" x2="145" y2="150" stroke="${S}"/><line x1="400" y1="140" x2="400" y2="150" stroke="${S}"/>` + dim(145, 400, 168, `d = ?`) + tx(220, 212, `stops in ${v.timeSec} s`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  motCarKmh: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const ic = (x) => car(x, 140);
    return svg(218, gnd(140) + ic(30) + `<g opacity="0.35">` + ic(290) + `</g>` + tx(85, 76, `${v.vInitKmh} km/h`, A) + tx(345, 76, `${v.vFinalKmh} km/h`, A) + ar(150, 50, 285, 50, R) + tx(217, 40, `a = ${v.accel} m/s&sup2;`, R) + `<line x1="145" y1="140" x2="145" y2="150" stroke="${S}"/><line x1="400" y1="140" x2="400" y2="150" stroke="${S}"/>` + dim(145, 400, 168, ``) + tx(220, 212, `time needed = ?`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  motCarTD: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const ic = (x) => car(x, 140);
    return svg(218, gnd(140) + ic(30) + `<g opacity="0.35">` + ic(290) + `</g>` + tx(85, 76, `v${sb("0")} = ${v.v0} m/s`, A) + tx(345, 76, `v = ?`, A) + ar(150, 50, 285, 50, R) + tx(217, 40, `a = constant`, R) + `<line x1="145" y1="140" x2="145" y2="150" stroke="${S}"/><line x1="400" y1="140" x2="400" y2="150" stroke="${S}"/>` + dim(145, 400, 168, `d = ${v.dist} m`) + tx(220, 212, `accelerates uniformly for ${v.timeSec} s`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  motCarBrakeKmh: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const ic = (x) => car(x, 140);
    return svg(218, gnd(140) + ic(30) + `<g opacity="0.35">` + ic(290) + `</g>` + tx(85, 76, `${v.speedKmh} km/h`, A) + tx(345, 76, `v = 0`, A) + ar(150, 50, 285, 50, R) + tx(217, 40, `a = ${v.decel} m/s&sup2; (braking)`, R) + `<line x1="145" y1="140" x2="145" y2="150" stroke="${S}"/><line x1="400" y1="140" x2="400" y2="150" stroke="${S}"/>` + dim(145, 400, 168, `d = ?`) + tx(220, 212, `stopping time = ?`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  motCarFromRest: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const ic = (x) => car(x, 140);
    return svg(218, gnd(140) + ic(30) + `<g opacity="0.35">` + ic(290) + `</g>` + tx(85, 76, `starts at rest`, A) + tx(345, 76, `v = ?`, A) + ar(150, 50, 285, 50, R) + tx(217, 40, `a = ${v.accel} m/s&sup2;`, R) + `<line x1="145" y1="140" x2="145" y2="150" stroke="${S}"/><line x1="400" y1="140" x2="400" y2="150" stroke="${S}"/>` + dim(145, 400, 168, `d = ?`) + tx(220, 212, `for ${v.timeSec} s`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  motTrainBrake: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const ic = (x) => box(x, 98, 52, 42, "") + box(x + 56, 98, 52, 42, "");
    return svg(218, gnd(140) + ic(30) + `<g opacity="0.35">` + ic(290) + `</g>` + tx(85, 76, `v${sb("0")} = ${v.vInit} m/s`, A) + tx(345, 76, `v = 0`, A) + ar(150, 50, 285, 50, R) + tx(217, 40, `a = ${v.decel} m/s&sup2; (braking)`, R) + `<line x1="145" y1="140" x2="145" y2="150" stroke="${S}"/><line x1="400" y1="140" x2="400" y2="150" stroke="${S}"/>` + dim(145, 400, 168, `d = ?`) + tx(220, 212, `service brakes applied`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  reactionBrake: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(205, gnd(140) + car(30, 140) + `<g opacity="0.35">` + car(210, 140) + `</g>` + `<line x1="400" y1="40" x2="400" y2="140" stroke="${S}" stroke-width="2" stroke-dasharray="5 4"/>` + tx(88, 84, `v = ${v.v0} m/s`, A) + ar(150, 56, 210, 56, A) + tx(180, 46, `reaction time ${v.tRxn} s`, "#475569", "middle", 11) + dim(145, 270, 168, "reaction distance") + ar(285, 56, 395, 56, R) + tx(340, 46, `braking: a = ${v.decel} m/s&sup2;`, R, "middle", 11) + dim(270, 400, 168, "braking distance") + tx(220, 198, "total distance before stopping = ?", "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  crashBarrier: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(205, gnd(140) + `<rect x="350" y="50" width="34" height="90" fill="#cbd5e1" stroke="${S}" stroke-width="2.5"/>` + car(200, 140) + ar(30, 56, 150, 56, A) + tx(90, 46, `v = +${v.v0} m/s`, A) + dim(315, 350, 168, "") + tx(333, 190, `crumple zone: ${v.dist} m`, "#475569", "middle", 12) + tx(110, 130, "stops at the barrier", "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  racketBall: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(205, `<ellipse cx="230" cy="100" rx="22" ry="58" fill="none" stroke="${S}" stroke-width="4"/><line x1="230" y1="158" x2="230" y2="195" stroke="${S}" stroke-width="6"/>` + `<circle cx="180" cy="100" r="11" fill="#d9f99d" stroke="#65a30d" stroke-width="2.5"/>` + ar(40, 78, 160, 78, A) + tx(100, 66, `in: ${v.vIn} m/s`, A) + ar(160, 122, 40, 122, R) + tx(100, 142, `out: ${v.vOut} m/s`, R) + tx(330, 90, `contact time`, "#475569", "middle", 12) + tx(330, 108, `${v.tDur} s`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dropSkyscraper: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, gnd(210) + `<rect x="120" y="30" width="90" height="180" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/>` + `<g stroke="${S}" stroke-width="1.5"><line x1="120" y1="75" x2="210" y2="75"/><line x1="120" y1="120" x2="210" y2="120"/><line x1="120" y1="165" x2="210" y2="165"/></g>` + tx(165, 24, "observation deck", "#475569", "middle", 11) + `<circle cx="222" cy="36" r="8" fill="#94a3b8" stroke="${S}" stroke-width="2"/>` + ar(222, 52, 222, 160, A) + tx(238, 100, `falls for ${v.timeSec} s`, A, "start", 12) + tx(238, 118, "from rest", "#475569", "start", 12) + `<line x1="85" y1="36" x2="85" y2="210" stroke="${S}" stroke-width="1.5"/><line x1="79" y1="36" x2="91" y2="36" stroke="${S}"/><line x1="79" y1="210" x2="91" y2="210" stroke="${S}"/>` + tx(75, 126, "h = ?", "#475569", "end") + tx(238, 190, "v at ground = ?", "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dropCliffSound: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, `<rect x="15" y="170" width="410" height="45" fill="#bae6fd" opacity="0.8"/><rect x="15" y="50" width="140" height="165" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/>` + `<circle cx="185" cy="44" r="8" fill="#cbd5e1" stroke="${S}" stroke-width="2"/>` + tx(172, 24, "dropped from rest", A, "end", 12) + ar(185, 60, 185, 158, A) + `<ellipse cx="185" cy="172" rx="16" ry="4" fill="none" stroke="${S}" stroke-width="2"/>` + ar(222, 162, 222, 50, O) + `<line x1="193" y1="44" x2="240" y2="44" stroke="${S}" stroke-width="1.5" stroke-dasharray="4 4"/>` + tx(234, 112, `sound: ${343} m/s`, "#b45309", "start", 12) + tx(234, 128, "(back up to the start)", "#b45309", "start", 11) + tx(252, 30, `splash heard after ${v.tTotal} s`, "#475569", "start", 12) + `<line x1="10" y1="50" x2="10" y2="170" stroke="${S}" stroke-width="1.5"/>` + tx(28, 120, "h = ?", "#475569", "start", 13));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dropBalloon: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(225, gnd(210) + `<ellipse cx="200" cy="48" rx="30" ry="36" fill="#fde68a" stroke="#92400e" stroke-width="2.5"/><line x1="185" y1="82" x2="190" y2="96" stroke="${S}" stroke-width="1.5"/><line x1="215" y1="82" x2="210" y2="96" stroke="${S}" stroke-width="1.5"/><rect x="188" y="96" width="24" height="14" fill="#d97706" stroke="#92400e" stroke-width="2"/>` + `<rect x="194" y="120" width="12" height="10" fill="${B}" stroke="${A}" stroke-width="2"/>` + ar(200, 138, 200, 196, A) + tx(216, 170, `v = ${v.vImpact} m/s on impact`, A, "start", 12) + tx(120, 128, "released from rest", "#475569", "end", 12) + tx(250, 112, "distance fallen = ?", "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  dropHelicopter: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const gy = 205;
    const heli = `<line x1="100" y1="22" x2="200" y2="22" stroke="${T}" stroke-width="3"/><line x1="150" y1="22" x2="150" y2="30" stroke="${T}" stroke-width="3"/><ellipse cx="150" cy="46" rx="34" ry="17" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><path d="M 128 42 Q 130 32 146 32 L 146 46 L 124 46 Z" fill="#bae6fd" stroke="${S}" stroke-width="1.5"/><line x1="180" y1="42" x2="240" y2="34" stroke="${S}" stroke-width="4" stroke-linecap="round"/><polygon points="232,34 242,20 247,36" fill="#e2e8f0" stroke="${S}" stroke-width="2"/><line x1="122" y1="72" x2="182" y2="72" stroke="${T}" stroke-width="3" stroke-linecap="round"/><line x1="134" y1="60" x2="134" y2="72" stroke="${T}" stroke-width="2.5"/><line x1="168" y1="60" x2="168" y2="72" stroke="${T}" stroke-width="2.5"/>`;
    return svg(225, gnd(gy) + heli + ar(92, 48, 92, 108, A) + tx(84, 80, `${v.vDescend} m/s`, A, "end", 12) + tx(84, 96, "descending", A, "end", 12) + `<rect x="138" y="92" width="24" height="20" rx="3" fill="#fde68a" stroke="${O}" stroke-width="2.5"/>` + tx(172, 92, "crate released", O, "start", 12) + ar(150, 120, 150, 176, G) + tx(160, 150, "falls with the", G, "start", 12) + tx(160, 166, "helicopter's speed", G, "start", 12) + `<line x1="162" y1="102" x2="330" y2="102" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="330" y1="102" x2="330" y2="${gy}" stroke="${S}" stroke-width="1.5"/><line x1="324" y1="102" x2="336" y2="102" stroke="${S}" stroke-width="1.5"/><line x1="324" y1="${gy}" x2="336" y2="${gy}" stroke="${S}" stroke-width="1.5"/>` + tx(342, 158, `${v.hStart} m`, "#475569", "start", 13) + tx(342, 174, "above the ground", "#475569", "start", 11));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  throwFromCliff: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(235, `<rect x="15" y="215" width="410" height="14" fill="#e2e8f0" stroke="${S}" stroke-width="2"/><rect x="15" y="110" width="150" height="105" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/>` + man(130, 110) + ar(168, 62, 168, 14, A) + tx(182, 40, `v${sb("0")} = ${v.v0} m/s`, A, "start", 12) + `<line x1="168" y1="14" x2="260" y2="14" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + tx(270, 18, "maximum height = ?", "#475569", "start", 12) + `<line x1="215" y1="110" x2="215" y2="215" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(225, 120, 225, 205, R) + tx(236, 165, "falls to the canyon floor", "#475569", "start", 12) + `<line x1="10" y1="110" x2="10" y2="215" stroke="${S}" stroke-width="1.5"/>` + tx(24, 168, `${v.hCliff} m`, "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  jumpAstronaut: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(235, gnd(195) + man(150, 195) + `<circle cx="150" cy="147" r="10" fill="none" stroke="#2563eb" stroke-width="2"/>` + ar(150, 118, 150, 60, A) + tx(168, 88, `v${sb("0")} = ${v.v0} m/s`, A, "start", 12) + `<line x1="150" y1="40" x2="270" y2="40" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="250" y1="40" x2="250" y2="195" stroke="${S}" stroke-width="1.5"/><line x1="244" y1="195" x2="256" y2="195" stroke="${S}"/><line x1="244" y1="40" x2="256" y2="40" stroke="${S}"/>` + tx(262, 122, `H = ${v.hMax} m`, "#475569", "start", 12) + tx(220, 226, `jumping on a newly explored exoplanet; g = ?`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  jumpKangaroo: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(235, gnd(195) + `<ellipse cx="150" cy="170" rx="22" ry="14" fill="#fca5a5" stroke="#7f1d1d" stroke-width="2.5"/><ellipse cx="172" cy="150" rx="8" ry="14" fill="#fca5a5" stroke="#7f1d1d" stroke-width="2.5"/><circle cx="178" cy="136" r="7" fill="#fca5a5" stroke="#7f1d1d" stroke-width="2.5"/><path d="M 128 172 Q 105 190 90 192" fill="none" stroke="#7f1d1d" stroke-width="3"/><line x1="145" y1="182" x2="150" y2="195" stroke="#7f1d1d" stroke-width="4"/>` + ar(150, 118, 150, 60, A) + tx(168, 88, `v${sb("0")} = ?`, A, "start", 12) + `<line x1="150" y1="40" x2="270" y2="40" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="250" y1="40" x2="250" y2="195" stroke="${S}" stroke-width="1.5"/><line x1="244" y1="195" x2="256" y2="195" stroke="${S}"/><line x1="244" y1="40" x2="256" y2="40" stroke="${S}"/>` + tx(262, 122, `H = ${v.hMax} m`, "#475569", "start", 12) + tx(220, 226, `red kangaroo leaping straight up`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  jumpFlea: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(235, gnd(195) + `<ellipse cx="150" cy="188" rx="6" ry="4" fill="#78350f" stroke="${T}" stroke-width="1.5"/><line x1="146" y1="190" x2="140" y2="195" stroke="${T}" stroke-width="1.5"/><line x1="154" y1="190" x2="162" y2="195" stroke="${T}" stroke-width="1.5"/>` + ar(150, 118, 150, 60, A) + tx(168, 88, `v = ?`, A, "start", 12) + `<line x1="150" y1="40" x2="270" y2="40" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="250" y1="40" x2="250" y2="195" stroke="${S}" stroke-width="1.5"/><line x1="244" y1="195" x2="256" y2="195" stroke="${S}"/><line x1="244" y1="40" x2="256" y2="40" stroke="${S}"/>` + tx(262, 122, `H = ${v.hMm} mm`, "#475569", "start", 12) + tx(220, 226, `takeoff: a = ${v.aFlea} m/s&sup2; over a short push`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  jumpBallTotalTime: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(235, gnd(195) + `<circle cx="150" cy="185" r="8" fill="#fff" stroke="${R}" stroke-width="2.5"/>` + ar(150, 118, 150, 60, A) + tx(168, 88, `v${sb("0")} = ?`, A, "start", 12) + `<line x1="150" y1="40" x2="270" y2="40" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/><line x1="250" y1="40" x2="250" y2="195" stroke="${S}" stroke-width="1.5"/><line x1="244" y1="195" x2="256" y2="195" stroke="${S}"/><line x1="244" y1="40" x2="256" y2="40" stroke="${S}"/>` + tx(262, 122, `returns to launch level`, "#475569", "start", 12) + tx(220, 226, `total time in the air: ${v.tTotal} s`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  popUp: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const gy = 200, bl = 130, bx = 148;
    const ball = `<circle cx="${bx}" cy="112" r="6" fill="#ffffff" stroke="${R}" stroke-width="2"/>`;
    const person = `<circle cx="96" cy="112" r="9" fill="${B}" stroke="${T}" stroke-width="2.5"/><line x1="96" y1="121" x2="96" y2="158" stroke="${T}" stroke-width="3"/><line x1="96" y1="158" x2="86" y2="${gy}" stroke="${T}" stroke-width="3"/><line x1="96" y1="158" x2="108" y2="${gy}" stroke="${T}" stroke-width="3"/><line x1="96" y1="134" x2="126" y2="134" stroke="${T}" stroke-width="3"/>`;
    const bat = `<line x1="120" y1="136" x2="${bx + 6}" y2="122" stroke="#b45309" stroke-width="7" stroke-linecap="round"/>`;
    return svg(215, gnd(gy) + `<line x1="60" y1="${bl}" x2="260" y2="${bl}" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + tx(266, bl + 4, "bat level", "#475569", "start", 12) + person + bat + ball + ar(bx, 100, bx, 36, A) + tx(bx - 8, 70, "pop-up", A, "end", 12) + tx(bx - 8, 86, "(straight up)", A, "end", 12) + `<line x1="110" y1="30" x2="250" y2="30" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + tx(256, 34, "apex = ? above the ground", "#475569", "start", 12) + ar(bx + 40, 60, bx + 40, 192, G) + tx(bx + 52, 150, "falls back down", G, "start", 12) + tx(bx + 52, 166, "and lands on the turf", G, "start", 12) + `<line x1="330" y1="${bl}" x2="330" y2="${gy}" stroke="${S}" stroke-width="1.5"/><line x1="324" y1="${bl}" x2="336" y2="${bl}" stroke="${S}" stroke-width="1.5"/><line x1="324" y1="${gy}" x2="336" y2="${gy}" stroke="${S}" stroke-width="1.5"/>` + tx(342, 160, `${v.dropDist} m`, "#475569", "start", 13) + tx(342, 176, "bat level above", "#475569", "start", 11) + tx(342, 190, "the turf", "#475569", "start", 11) + tx(330, 76, `airborne ${v.tTotal} s`, O, "middle", 13));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  tennisBounce: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(235, gnd(215) + `<circle cx="100" cy="50" r="9" fill="#d9f99d" stroke="#65a30d" stroke-width="2.5"/>` + ar(100, 66, 100, 190, A) + tx(112, 120, "dropped from rest", A, "start", 12) + `<line x1="40" y1="50" x2="40" y2="215" stroke="${S}" stroke-width="1.5"/>` + tx(32, 135, `${v.hDrop} m`, "#475569", "end") + `<circle cx="260" cy="206" r="9" fill="#d9f99d" stroke="#65a30d" stroke-width="2.5"/>` + ar(260, 190, 260, 100, R) + tx(274, 150, "rebounds", R, "start", 12) + `<line x1="260" y1="86" x2="330" y2="86" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + `<line x1="340" y1="86" x2="340" y2="215" stroke="${S}" stroke-width="1.5"/>` + tx(348, 150, `${v.hRebound} m`, "#475569", "start") + tx(220, 232, `contact with floor: ${v.tContact} s`, "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  rocketBurn: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(235, gnd(215) + `<path d="M 192 205 L 192 170 L 200 156 L 208 170 L 208 205 Z" fill="${B}" stroke="${R}" stroke-width="2.5"/><path d="M 192 205 L 200 224 L 208 205 Z" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>` + ar(250, 190, 250, 140, R) + tx(262, 168, `engine: a = ${v.aEngine} m/s&sup2;`, R, "start", 12) + tx(262, 184, `for ${v.tEngine} s`, R, "start", 12) + `<line x1="150" y1="130" x2="300" y2="130" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + tx(305, 134, "fuel runs out", "#475569", "start", 11) + ar(200, 120, 200, 50, A) + tx(212, 90, "free fall (unpowered)", A, "start", 12) + `<line x1="150" y1="30" x2="300" y2="30" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + tx(305, 34, "max altitude = ?", "#475569", "start", 11));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  projTableTime: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(255, gnd(210) + `<rect x="30" y="100" width="120" height="12" fill="#cbd5e1" stroke="${S}" stroke-width="2.5"/><rect x="50" y="112" width="12" height="98" fill="#cbd5e1" stroke="${S}" stroke-width="2"/><rect x="118" y="112" width="12" height="98" fill="#cbd5e1" stroke="${S}" stroke-width="2"/>` + `<circle cx="140" cy="92" r="8" fill="#fff" stroke="${R}" stroke-width="2.5"/>` + ar(80, 78, 130, 78, A) + tx(95, 66, `v${sb("x")} = ${v.v0} m/s`, A, "middle", 12) + `<path d="M 150 92 Q 260 92 330 204" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/><circle cx="330" cy="200" r="8" fill="#fff" stroke="${R}" stroke-width="2.5"/>` + `<line x1="168" y1="100" x2="168" y2="210" stroke="${S}" stroke-width="1.5"/><line x1="162" y1="100" x2="174" y2="100" stroke="${S}"/><line x1="162" y1="210" x2="174" y2="210" stroke="${S}"/>` + tx(176, 160, `h = ${v.hCm} cm`, "#475569", "start", 12) + dim(150, 330, 230, `range = ?`) + tx(300, 140, `time of flight = ?`, "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  projTableHeight: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(255, gnd(210) + `<rect x="30" y="100" width="120" height="12" fill="#cbd5e1" stroke="${S}" stroke-width="2.5"/><rect x="50" y="112" width="12" height="98" fill="#cbd5e1" stroke="${S}" stroke-width="2"/><rect x="118" y="112" width="12" height="98" fill="#cbd5e1" stroke="${S}" stroke-width="2"/>` + `<circle cx="140" cy="92" r="8" fill="#fff" stroke="${R}" stroke-width="2.5"/>` + ar(80, 78, 130, 78, A) + tx(95, 66, `v${sb("x")} = ${v.v0} m/s`, A, "middle", 12) + `<path d="M 150 92 Q 260 92 330 204" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/><circle cx="330" cy="200" r="8" fill="#fff" stroke="${R}" stroke-width="2.5"/>` + `<line x1="168" y1="100" x2="168" y2="210" stroke="${S}" stroke-width="1.5"/><line x1="162" y1="100" x2="174" y2="100" stroke="${S}"/><line x1="162" y1="210" x2="174" y2="210" stroke="${S}"/>` + tx(176, 160, `h = ?`, "#475569", "start", 12) + dim(150, 330, 230, `x = ${v.distX} m`) + tx(300, 140, ``, "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  projTableSpeed: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(255, gnd(210) + `<rect x="30" y="100" width="120" height="12" fill="#cbd5e1" stroke="${S}" stroke-width="2.5"/><rect x="50" y="112" width="12" height="98" fill="#cbd5e1" stroke="${S}" stroke-width="2"/><rect x="118" y="112" width="12" height="98" fill="#cbd5e1" stroke="${S}" stroke-width="2"/>` + `<circle cx="140" cy="92" r="8" fill="#fff" stroke="${R}" stroke-width="2.5"/>` + ar(80, 78, 130, 78, A) + tx(95, 66, `v${sb("0")} = ${v.v0} m/s`, A, "middle", 12) + `<path d="M 150 92 Q 260 92 330 204" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/><circle cx="330" cy="200" r="8" fill="#fff" stroke="${R}" stroke-width="2.5"/>` + `<line x1="168" y1="100" x2="168" y2="210" stroke="${S}" stroke-width="1.5"/><line x1="162" y1="100" x2="174" y2="100" stroke="${S}"/><line x1="162" y1="210" x2="174" y2="210" stroke="${S}"/>` + tx(176, 160, `h = ?`, "#475569", "start", 12) + dim(150, 330, 230, ``) + tx(300, 140, `speed after ${v.tFall} s = ?`, "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  projBridge: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(250, `<rect x="15" y="190" width="410" height="35" fill="#bae6fd" opacity="0.8"/><rect x="15" y="60" width="160" height="12" fill="#cbd5e1" stroke="${S}" stroke-width="2.5"/><rect x="40" y="72" width="14" height="118" fill="#cbd5e1" stroke="${S}" stroke-width="2"/><rect x="130" y="72" width="14" height="118" fill="#cbd5e1" stroke="${S}" stroke-width="2"/>` + man(150, 60) + `<circle cx="172" cy="40" r="6" fill="#94a3b8" stroke="${S}" stroke-width="2"/>` + ar(70, 35, 140, 35, A) + tx(100, 25, `v${sb("0")} = ${v.v0} m/s`, A, "middle", 12) + `<path d="M 176 40 Q 280 40 340 186" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/><circle cx="340" cy="190" r="6" fill="#94a3b8" stroke="${S}" stroke-width="2"/>` + `<line x1="10" y1="60" x2="10" y2="190" stroke="${S}" stroke-width="1.5"/>` + tx(22, 130, "h = ?", "#475569", "start", 12) + dim(176, 340, 212, "x = ?") + tx(185, 140, `falls ${v.tFall} s`, "#475569", "start", 12) + tx(185, 158, "final speed = ?", "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  projCliffDouble: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(235, `<rect x="15" y="215" width="410" height="14" fill="#e2e8f0" stroke="${S}" stroke-width="2"/><rect x="15" y="60" width="140" height="155" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/>` + `<circle cx="168" cy="52" r="7" fill="#94a3b8" stroke="${S}" stroke-width="2"/>` + ar(110, 40, 160, 40, A) + tx(110, 28, `v${sb("0")} = ${v.v0} m/s`, A, "middle", 12) + `<path d="M 175 52 Q 290 52 350 196" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/><circle cx="350" cy="192" r="7" fill="#94a3b8" stroke="${S}" stroke-width="2"/>` + ar(350, 192, 380, 192, A) + tx(392, 180, "v = 2v" + sb("0"), A, "middle", 12) + tx(85, 120, "time until the", "#475569", "middle", 12) + tx(85, 138, "speed doubles", "#475569", "middle", 12) + tx(85, 156, "= ?", "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  projMortar: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const t = (v.theta || 29) * Math.PI / 180, L = 95, ox = 135, oy = 90, cx = ox + 110, cy = oy - 110 * Math.tan(t);
    return svg(255, `<rect x="15" y="215" width="410" height="14" fill="#e2e8f0" stroke="${S}" stroke-width="2"/><rect x="15" y="90" width="120" height="125" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/>` + `<line x1="${ox}" y1="${oy}" x2="${ox + L + 20}" y2="${oy}" stroke="${S}" stroke-width="1.5" stroke-dasharray="5 4"/>` + ar(ox, oy, ox + L * Math.cos(t), oy - L * Math.sin(t), A) + `<path d="M ${ox + 55} ${oy} A 55 55 0 0 0 ${ox + 55 * Math.cos(t)} ${oy - 55 * Math.sin(t)}" fill="none" stroke="${A}" stroke-width="2"/>` + tx(ox + 62, oy + 18, `&theta; = ${v.theta}&deg;`, A, "start", 12) + tx(ox + L * Math.cos(t) + 6, oy - L * Math.sin(t) - 6, `v${sb("0")} = ${v.v0} m/s`, A, "start", 12) + `<path d="M ${ox} ${oy} Q ${cx} ${cy} 390 213" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/>` + `<line x1="10" y1="90" x2="10" y2="215" stroke="${S}" stroke-width="1.5"/>` + tx(22, 160, `${v.hCliff} m`, "#475569", "start", 12) + dim(135, 390, 236, "range = ?"));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  curveCar: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(235, `<circle cx="220" cy="118" r="80" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/>` + `<line x1="220" y1="118" x2="300" y2="118" stroke="${A}" stroke-width="2.5"/><circle cx="220" cy="118" r="4" fill="${S}"/>` + tx(262, 110, "r = ?", A, "middle", 12) + `<rect x="288" y="96" width="24" height="44" rx="6" fill="#e2e8f0" stroke="${T}" stroke-width="2.5"/>` + ar(300, 92, 300, 40, R) + tx(316, 60, `v = ${v.v} m/s`, R, "start", 12) + tx(220, 224, `fastest speed without skidding;  &mu;${sb("s")} = ${v.muS}, &mu;${sb("k")} = ${v.muK}`, "#475569", "middle", 11) + tx(130, 20, "top view: flat circular road", "#475569", "middle", 11));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  orbitSat: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(235, `<circle cx="150" cy="118" r="62" fill="#fde68a" stroke="#92400e" stroke-width="2.5"/>` + tx(130, 135, "planet", T, "middle", 13) + `<circle cx="150" cy="118" r="100" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/>` + `<rect x="242" y="108" width="16" height="20" rx="3" fill="${B}" stroke="${A}" stroke-width="2.5"/>` + `<line x1="150" y1="118" x2="212" y2="118" stroke="${S}" stroke-width="1.5"/>` + tx(182, 110, "R", "#475569", "middle", 11) + `<line x1="212" y1="148" x2="250" y2="148" stroke="${O}" stroke-width="2.5"/>` + tx(262, 162, `h = ${v.hKm} km`, "#b45309", "start", 11) + ar(250, 100, 250, 50, R) + tx(262, 66, "v = ?", R, "start", 12) + tx(285, 120, `M = ${v.MpExp26} &times; 10<tspan baseline-shift="super" font-size="9">26</tspan> kg`, "#475569", "start", 11) + tx(285, 138, `R = ${v.RpExp7} &times; 10<tspan baseline-shift="super" font-size="9">7</tspan> m`, "#475569", "start", 11));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  curveBoats: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const P = function (r, deg) { const a = deg * Math.PI / 180; return { x: 60 + r * Math.cos(a), y: 200 - r * Math.sin(a), ux: Math.cos(a), uy: -Math.sin(a) }; };
    const boatShape = function (p, col) { const wx = -p.uy, wy = p.ux; const pt = function (a, b) { return (p.x + a * p.ux + b * wx).toFixed(1) + " " + (p.y + a * p.uy + b * wy).toFixed(1); }; return `<path d="M ${pt(-7, -14)} L ${pt(-7, 14)} L ${pt(7, 14)} L ${pt(7, -14)} Z" fill="${B}" stroke="${col}" stroke-width="2.5"/>`; };
    const a = P(130, 58), b = P(170, 36);
    return svg(235, `<circle cx="60" cy="200" r="4" fill="${S}"/><path d="M 60 70 A 130 130 0 0 1 190 200" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/><path d="M 60 30 A 170 170 0 0 1 230 200" fill="none" stroke="${S}" stroke-width="2" stroke-dasharray="6 5"/>` + `<line x1="60" y1="200" x2="${a.x}" y2="${a.y}" stroke="${A}" stroke-width="2"/>` + `<line x1="60" y1="200" x2="${b.x}" y2="${b.y}" stroke="${G}" stroke-width="2"/>` + tx(300, 120, `r${sb("A")} = ${v.rA} m (boat A)`, A, "start", 11) + tx(300, 138, `r${sb("B")} = ${v.rB} m (boat B)`, G, "start", 11) + boatShape(a, A) + boatShape(b, G) + tx(a.x - 26 * a.ux - 4, a.y - 26 * a.uy + 4, "A", A, "middle", 12) + tx(b.x + 26 * b.ux + 4, b.y + 26 * b.uy + 4, "B", G, "middle", 12) + tx(330, 40, "same centripetal", "#475569", "start", 11) + tx(330, 56, "acceleration", "#475569", "start", 11) + tx(330, 72, `v${sb("A")} / v${sb("B")} = ?`, "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  hillMotorcycle: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    const bike = `<circle cx="190" cy="114" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="190" cy="114" r="4" fill="#ffffff"/><circle cx="250" cy="114" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="250" cy="114" r="4" fill="#ffffff"/>`
      + `<line x1="190" y1="114" x2="214" y2="100" stroke="${T}" stroke-width="3.5" stroke-linecap="round"/><line x1="240" y1="86" x2="250" y2="114" stroke="${T}" stroke-width="3.5" stroke-linecap="round"/>`
      + `<path d="M 200 96 Q 204 84 220 84 L 236 88 L 240 96 L 224 104 L 204 104 Z" fill="#fde68a" stroke="${O}" stroke-width="2.5" stroke-linejoin="round"/><rect x="214" y="98" width="22" height="14" rx="3" fill="#cbd5e1" stroke="${S}" stroke-width="2"/>`
      + `<line x1="192" y1="82" x2="214" y2="82" stroke="${T}" stroke-width="5" stroke-linecap="round"/><line x1="236" y1="82" x2="246" y2="80" stroke="${T}" stroke-width="3" stroke-linecap="round"/><line x1="200" y1="108" x2="176" y2="112" stroke="${S}" stroke-width="3" stroke-linecap="round"/>`
      + `<circle cx="212" cy="56" r="8" fill="${B}" stroke="${A}" stroke-width="2.5"/><line x1="208" y1="64" x2="203" y2="80" stroke="${A}" stroke-width="3.5" stroke-linecap="round"/><line x1="210" y1="68" x2="242" y2="80" stroke="${A}" stroke-width="3" stroke-linecap="round"/><line x1="203" y1="80" x2="218" y2="98" stroke="${A}" stroke-width="3" stroke-linecap="round"/>`;
    return svg(235, `<path d="M 40 225 Q 220 20 400 225 Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/>` + bike + ar(220, 44, 220, 6, R) + tx(232, 26, "F" + sb("N") + " = ?", R, "start", 13) + ar(220, 134, 220, 182, A) + tx(232, 168, "mg", A, "start", 13) + ar(70, 70, 130, 70, G) + tx(100, 60, `v = ${v.v} m/s`, G, "middle", 12) + tx(276, 62, `${v.m} kg`, "#475569", "start", 12) + tx(276, 76, "(bike + rider)", "#475569", "start", 11) + tx(228, 212, `r = ${v.r} m (radius of the hill)`, "#475569", "start", 11));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  hotAirBalloon: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(235, `<ellipse cx="220" cy="75" rx="55" ry="62" fill="#fde68a" stroke="#92400e" stroke-width="2.5"/><line x1="190" y1="130" x2="205" y2="165" stroke="${S}" stroke-width="2"/><line x1="250" y1="130" x2="235" y2="165" stroke="${S}" stroke-width="2"/><rect x="200" y="165" width="40" height="30" fill="#d97706" stroke="#92400e" stroke-width="2.5"/>` + tx(220, 185, "basket", T, "middle", 10) + tx(220, 80, `M = ${v.M} kg`, T, "middle", 13) + ar(300, 150, 300, 90, R) + tx(312, 120, `a = ${v.a} m/s&sup2;`, R, "start", 12) + tx(312, 138, "(upward)", R, "start", 11) + tx(110, 120, "floating in", "#475569", "end", 12) + tx(110, 138, "equilibrium first", "#475569", "end", 12) + tx(220, 222, "mass dropped overboard = ?", "#475569", "middle", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  neutronStar: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const sb = (s) => `<tspan baseline-shift="sub" font-size="9">${s}</tspan>`;
    const gnd = (y) => `<line x1="15" y1="${y}" x2="425" y2="${y}" stroke="${S}" stroke-width="3"/>`;
    const man = (x, y, c) => `<circle cx="${x}" cy="${y - 48}" r="8" fill="${B}" stroke="${c || T}" stroke-width="2.5"/><line x1="${x}" y1="${y - 40}" x2="${x}" y2="${y - 18}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x - 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x}" y1="${y - 18}" x2="${x + 8}" y2="${y}" stroke="${c || T}" stroke-width="3"/><line x1="${x - 12}" y1="${y - 34}" x2="${x + 12}" y2="${y - 34}" stroke="${c || T}" stroke-width="3"/>`;
    const box = (x, y, w, h, lab, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${B}" stroke="${c || A}" stroke-width="2.5"/>` + tx(x + w / 2, y + h / 2 + 5, lab, T, "middle", 13);
    const car = (x, y) => `<path d="M ${x} ${y} L ${x} ${y - 22} L ${x + 18} ${y - 26} L ${x + 34} ${y - 46} L ${x + 80} ${y - 46} L ${x + 98} ${y - 26} L ${x + 115} ${y - 22} L ${x + 115} ${y} Z" fill="#e2e8f0" stroke="${S}" stroke-width="2.5"/><circle cx="${x + 28}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/><circle cx="${x + 88}" cy="${y - 11}" r="11" fill="#475569" stroke="${S}" stroke-width="2"/>`;
    const dim = (x1, x2, y, lab) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${S}" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/><line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}" stroke="${S}" stroke-width="1.5"/>` + tx((x1 + x2) / 2, y + 17, lab, "#475569", "middle", 12);
    const svg = (h, inner) => `<svg viewBox="0 0 440 ${h}" class="w-full max-w-md mx-auto ${h <= 190 ? "h-48" : h <= 215 ? "h-56" : "h-60"} bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">${inner}</svg>`;
    return svg(235, `<circle cx="220" cy="330" r="190" fill="#c7d2fe" stroke="#4338ca" stroke-width="2.5"/>` + tx(220, 215, "neutron star", "#312e81", "middle", 13) + `<circle cx="220" cy="62" r="8" fill="#94a3b8" stroke="${S}" stroke-width="2"/>` + ar(220, 76, 220, 134, A) + tx(236, 106, `falls from rest ${v.dCm} cm`, A, "start", 12) + tx(20, 30, `M = ${v.MExp30} &times; 10<tspan baseline-shift="super" font-size="9">30</tspan> kg`, "#475569", "start", 12) + tx(20, 48, `R = ${v.RExp3} &times; 10<tspan baseline-shift="super" font-size="9">3</tspan> m`, "#475569", "start", 12) + tx(20, 82, "g = ?", "#475569", "start", 12) + tx(20, 100, "final speed = ?", "#475569", "start", 12));
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  inclineSkier: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706", P = "#7c3aed", BR = "#92400e";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const ln = (x1, y1, x2, y2, c, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w || 3}" stroke-linecap="round"/>`;
    const rtx = (p, s, c) => `<text transform="translate(${p[0]},${p[1]}) rotate(${th})" text-anchor="middle" fill="${c}" font-size="12.5" font-weight="800">${s}</text>`;
    const th = v.theta || 30, t = th * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t), tn = Math.tan(t);const gy = 175, x0 = 40;
    const run = Math.min(340, 135 / tn), H = run * tn, xr = x0 + run, yt = gy - H;
    const sF = 0.5, px = x0 + run * sF, py = yt + H * sF;
    const loc = (lx, ly) => [px + lx * cs - ly * sn, py + lx * sn + ly * cs];
    const arrL = (x1, y1, x2, y2, c) => { const a = loc(x1, y1), b = loc(x2, y2); return ar(a[0], a[1], b[0], b[1], c); };
    const slope = `<polygon points="${x0},${gy} ${xr},${gy} ${x0},${yt}" fill="#e2e8f0" stroke="${S}" stroke-width="3"/><path d="M ${xr - 50} ${gy} A 50 50 0 0 1 ${xr - 50 * cs} ${gy - 50 * sn}" fill="none" stroke="${A}" stroke-width="2.5"/>` + tx(xr - 58, th < 16 ? gy + 17 : gy - 8, `&theta; = ${th}&deg;`, A, "end", 14);
    const head = (x, y, c) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${B}" stroke="${c || T}" stroke-width="2.5"/>`;
    const SVGOPEN = `<svg viewBox="0 0 440 215" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">`;
    const b1 = loc(-9, -4), b2 = loc(8, -4);
    const skier = `<g transform="translate(${px}, ${py}) rotate(${th})"><path d="M -36 -3 L 30 -3 Q 42 -3 45 -10" fill="none" stroke="${O}" stroke-width="4.5" stroke-linecap="round"/></g>`
      + ln(b1[0], b1[1], px - 5, py - 17, T, 3.5) + ln(px - 5, py - 17, px + 1, py - 31, T, 3.5)
      + ln(b2[0], b2[1], px + 9, py - 16, T, 3.5) + ln(px + 9, py - 16, px + 1, py - 31, T, 3.5)
      + ln(px + 1, py - 31, px + 7, py - 54, A, 7)
      + ln(px + 7, py - 51, px + 25, py - 40, A, 3.5)
      + ln(px + 25, py - 40, px - 20, py + (-20 * tn) - 2, T, 1.8)
      + head(px + 9, py - 65, A);
    const wind = v.Fwind !== undefined ? arrL(-100, -26, -52, -26, R) + rtx(loc(-76, -39), `wind ${v.Fwind} N`, R) : "";
    return SVGOPEN + slope + skier + wind + tx(px + 30, py - 70, `${v.m} kg`, T, "start", 13) + `</svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  inclineSnowboarder: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706", P = "#7c3aed", BR = "#92400e";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const ln = (x1, y1, x2, y2, c, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w || 3}" stroke-linecap="round"/>`;
    const rtx = (p, s, c) => `<text transform="translate(${p[0]},${p[1]}) rotate(${th})" text-anchor="middle" fill="${c}" font-size="12.5" font-weight="800">${s}</text>`;
    const th = v.theta || 30, t = th * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t), tn = Math.tan(t);const gy = 175, x0 = 40;
    const run = Math.min(340, 135 / tn), H = run * tn, xr = x0 + run, yt = gy - H;
    const sF = 0.5, px = x0 + run * sF, py = yt + H * sF;
    const loc = (lx, ly) => [px + lx * cs - ly * sn, py + lx * sn + ly * cs];
    const arrL = (x1, y1, x2, y2, c) => { const a = loc(x1, y1), b = loc(x2, y2); return ar(a[0], a[1], b[0], b[1], c); };
    const slope = `<polygon points="${x0},${gy} ${xr},${gy} ${x0},${yt}" fill="#e2e8f0" stroke="${S}" stroke-width="3"/><path d="M ${xr - 50} ${gy} A 50 50 0 0 1 ${xr - 50 * cs} ${gy - 50 * sn}" fill="none" stroke="${A}" stroke-width="2.5"/>` + tx(xr - 58, th < 16 ? gy + 17 : gy - 8, `&theta; = ${th}&deg;`, A, "end", 14);
    const head = (x, y, c) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${B}" stroke="${c || T}" stroke-width="2.5"/>`;
    const SVGOPEN = `<svg viewBox="0 0 440 215" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">`;
    const f1 = loc(-13, -6), f2 = loc(14, -6);
    const rider = `<g transform="translate(${px}, ${py}) rotate(${th})"><path d="M -34 -4 L 30 -4 Q 40 -4 42 -11" fill="none" stroke="${G}" stroke-width="5" stroke-linecap="round"/></g>`
      + ln(f1[0], f1[1], px - 6, py - 17, T, 3.5) + ln(px - 6, py - 17, px + 2, py - 31, T, 3.5)
      + ln(f2[0], f2[1], px + 11, py - 17, T, 3.5) + ln(px + 11, py - 17, px + 2, py - 31, T, 3.5)
      + ln(px + 2, py - 31, px + 3, py - 54, P, 8)
      + ln(px + 3, py - 50, px - 19, py - 41, P, 3.5) + ln(px + 3, py - 50, px + 25, py - 45, P, 3.5)
      + head(px + 4, py - 64, P);
    const fr = v.fk !== undefined ? arrL(-50, -26, -104, -26, O) + rtx(loc(-80, -40), `f = ${v.fk} N`, O) : "";
    return SVGOPEN + slope + rider + fr + tx(px + 30, py - 70, `${v.m} kg`, T, "start", 13) + `</svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  inclineBobsled: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706", P = "#7c3aed", BR = "#92400e";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const ln = (x1, y1, x2, y2, c, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w || 3}" stroke-linecap="round"/>`;
    const rtx = (p, s, c) => `<text transform="translate(${p[0]},${p[1]}) rotate(${th})" text-anchor="middle" fill="${c}" font-size="12.5" font-weight="800">${s}</text>`;
    const th = v.theta || 30, t = th * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t), tn = Math.tan(t);const gy = 175, x0 = 40;
    const run = Math.min(340, 135 / tn), H = run * tn, xr = x0 + run, yt = gy - H;
    const sF = 0.45, px = x0 + run * sF, py = yt + H * sF;
    const loc = (lx, ly) => [px + lx * cs - ly * sn, py + lx * sn + ly * cs];
    const arrL = (x1, y1, x2, y2, c) => { const a = loc(x1, y1), b = loc(x2, y2); return ar(a[0], a[1], b[0], b[1], c); };
    const slope = `<polygon points="${x0},${gy} ${xr},${gy} ${x0},${yt}" fill="#e2e8f0" stroke="${S}" stroke-width="3"/><path d="M ${xr - 50} ${gy} A 50 50 0 0 1 ${xr - 50 * cs} ${gy - 50 * sn}" fill="none" stroke="${A}" stroke-width="2.5"/>` + tx(xr - 58, th < 16 ? gy + 17 : gy - 8, `&theta; = ${th}&deg;`, A, "end", 14);
    const head = (x, y, c) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${B}" stroke="${c || T}" stroke-width="2.5"/>`;
    const SVGOPEN = `<svg viewBox="0 0 440 215" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">`;
    const body = `<g transform="translate(${px}, ${py}) rotate(${th})">`
      + ln(-90, -2, -84, -16, T, 3.5) + ln(-84, -16, -78, -30, T, 3.5) + ln(-70, -2, -74, -16, T, 3.5) + ln(-74, -16, -78, -30, T, 3.5)
      + ln(-78, -30, -64, -52, A, 7.5) + ln(-64, -48, -47, -28, A, 3.5)
      + `<circle cx="-59" cy="-62" r="7.5" fill="${B}" stroke="${T}" stroke-width="2.5"/>`
      + `<path d="M -46 -7 L -46 -25 Q -32 -35 10 -31 L 42 -22 Q 60 -16 56 -7 Z" fill="#fee2e2" stroke="${R}" stroke-width="2.5"/>`
      + `<circle cx="-6" cy="-39" r="6.5" fill="${A}" stroke="${T}" stroke-width="2"/>`
      + ln(-52, -2, 60, -2, T, 3) + ln(-28, -7, -28, -2, T, 2.5) + ln(32, -7, 32, -2, T, 2.5)
      + ar(-128, -22, -96, -22, R) + `</g>`;
    return SVGOPEN + slope + body + rtx(loc(-112, -36), `F`, R) + tx(...loc(14, -56), `${v.m} kg`, T, "start", 13) + `</svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  inclineLog: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706", P = "#7c3aed", BR = "#92400e";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const ln = (x1, y1, x2, y2, c, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w || 3}" stroke-linecap="round"/>`;
    const rtx = (p, s, c) => `<text transform="translate(${p[0]},${p[1]}) rotate(${th})" text-anchor="middle" fill="${c}" font-size="12.5" font-weight="800">${s}</text>`;
    const th = v.theta || 30, t = th * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t), tn = Math.tan(t);const gy = 175, x0 = 40;
    const run = Math.min(340, 135 / tn), H = run * tn, xr = x0 + run, yt = gy - H;
    const sF = 0.55, px = x0 + run * sF, py = yt + H * sF;
    const loc = (lx, ly) => [px + lx * cs - ly * sn, py + lx * sn + ly * cs];
    const arrL = (x1, y1, x2, y2, c) => { const a = loc(x1, y1), b = loc(x2, y2); return ar(a[0], a[1], b[0], b[1], c); };
    const slope = `<polygon points="${x0},${gy} ${xr},${gy} ${x0},${yt}" fill="#e2e8f0" stroke="${S}" stroke-width="3"/><path d="M ${xr - 50} ${gy} A 50 50 0 0 1 ${xr - 50 * cs} ${gy - 50 * sn}" fill="none" stroke="${A}" stroke-width="2.5"/>` + tx(xr - 58, th < 16 ? gy + 17 : gy - 8, `&theta; = ${th}&deg;`, A, "end", 14);
    const head = (x, y, c) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${B}" stroke="${c || T}" stroke-width="2.5"/>`;
    const SVGOPEN = `<svg viewBox="0 0 440 215" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">`;
    const obj = `<rect x="-42" y="-26" width="84" height="26" rx="4" fill="#fde7c8" stroke="${BR}" stroke-width="2.5"/><line x1="-34" y1="-18" x2="34" y2="-18" stroke="${BR}" stroke-width="1.2"/><line x1="-34" y1="-9" x2="34" y2="-9" stroke="${BR}" stroke-width="1.2"/><ellipse cx="42" cy="-13" rx="6" ry="13" fill="#f6d29a" stroke="${BR}" stroke-width="2.5"/><ellipse cx="42" cy="-13" rx="2.2" ry="5" fill="none" stroke="${BR}" stroke-width="1.2"/>`;
    const note = `${v.m}-kg log pulled up the ramp by a rope, a = ${v.a} m/s&sup2;`;
    return SVGOPEN + slope + `<g transform="translate(${px}, ${py}) rotate(${th})">` + obj + ar(-48, -17, -112, -17, R) + `</g>` + rtx(loc(-80, -30), `T = ?`, R) + tx(220, 207, note, "#475569", "middle", 12) + `</svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  inclineCratePull: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706", P = "#7c3aed", BR = "#92400e";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const ln = (x1, y1, x2, y2, c, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w || 3}" stroke-linecap="round"/>`;
    const rtx = (p, s, c) => `<text transform="translate(${p[0]},${p[1]}) rotate(${th})" text-anchor="middle" fill="${c}" font-size="12.5" font-weight="800">${s}</text>`;
    const th = v.theta || 30, t = th * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t), tn = Math.tan(t);const gy = 175, x0 = 40;
    const run = Math.min(340, 135 / tn), H = run * tn, xr = x0 + run, yt = gy - H;
    const sF = 0.55, px = x0 + run * sF, py = yt + H * sF;
    const loc = (lx, ly) => [px + lx * cs - ly * sn, py + lx * sn + ly * cs];
    const arrL = (x1, y1, x2, y2, c) => { const a = loc(x1, y1), b = loc(x2, y2); return ar(a[0], a[1], b[0], b[1], c); };
    const slope = `<polygon points="${x0},${gy} ${xr},${gy} ${x0},${yt}" fill="#e2e8f0" stroke="${S}" stroke-width="3"/><path d="M ${xr - 50} ${gy} A 50 50 0 0 1 ${xr - 50 * cs} ${gy - 50 * sn}" fill="none" stroke="${A}" stroke-width="2.5"/>` + tx(xr - 58, th < 16 ? gy + 17 : gy - 8, `&theta; = ${th}&deg;`, A, "end", 14);
    const head = (x, y, c) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${B}" stroke="${c || T}" stroke-width="2.5"/>`;
    const SVGOPEN = `<svg viewBox="0 0 440 215" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">`;
    const obj = `<rect x="-34" y="-34" width="68" height="34" rx="3" fill="#fde7c8" stroke="${BR}" stroke-width="2.5"/><line x1="-34" y1="-34" x2="34" y2="0" stroke="${BR}" stroke-width="1.2"/><line x1="34" y1="-34" x2="-34" y2="0" stroke="${BR}" stroke-width="1.2"/><rect x="-18" y="-22" width="36" height="14" rx="2" fill="#fff" stroke="none"/>` + `<text transform="translate(0,-13) rotate(${-0})" text-anchor="middle" dominant-baseline="central" font-size="12.5" font-weight="800" fill="${T}">${v.m} kg</text>`;
    const note = `${v.m}-kg crate pulled up the ramp at constant velocity`;
    return SVGOPEN + slope + `<g transform="translate(${px}, ${py}) rotate(${th})">` + obj + ar(-36, -17, -108, -17, R) + `</g>` + rtx(loc(-80, -30), `T = ?`, R) + tx(220, 207, note, "#475569", "middle", 12) + `</svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  },
  inclineSnowboarderFlat: function (v) {
    var __orig = function (v) {
    const S = "#64748b", A = "#2563eb", R = "#dc2626", T = "#0f172a", B = "#f8fafc", G = "#059669", O = "#d97706", P = "#7c3aed", BR = "#92400e";
    const ar = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 10; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="3"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}" fill="${c}"/>`; };
    const tx = (x, y, s, c, an, fs) => `<text x="${x}" y="${y}" text-anchor="${an || "middle"}" fill="${c || T}" font-size="${fs || 12.5}" font-weight="800">${s}</text>`;
    const ln = (x1, y1, x2, y2, c, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w || 3}" stroke-linecap="round"/>`;
    const rtx = (p, s, c) => `<text transform="translate(${p[0]},${p[1]}) rotate(${th})" text-anchor="middle" fill="${c}" font-size="12.5" font-weight="800">${s}</text>`;
    const th = v.theta || 30, t = th * Math.PI / 180, cs = Math.cos(t), sn = Math.sin(t), tn = Math.tan(t);const gy = 175, x0 = 30;
    const run = Math.min(235, 125 / tn), H = run * tn, xb = x0 + run, yt = gy - H;
    const sF = 0.5, px = x0 + run * sF, py = yt + H * sF;
    const loc = (lx, ly) => [px + lx * cs - ly * sn, py + lx * sn + ly * cs];
    const arrL = (x1, y1, x2, y2, c) => { const a = loc(x1, y1), b = loc(x2, y2); return ar(a[0], a[1], b[0], b[1], c); };
    const head = (x, y, c) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${B}" stroke="${c || T}" stroke-width="2.5"/>`;
    const ground = `<polygon points="${x0},${yt} ${xb},${gy} 425,${gy} ${x0},${gy}" fill="#e2e8f0" stroke="${S}" stroke-width="3"/><path d="M ${xb - 48} ${gy} A 48 48 0 0 1 ${xb - 48 * cs} ${gy - 48 * sn}" fill="none" stroke="${A}" stroke-width="2.5"/>` + tx(xb - 56, th < 16 ? gy + 17 : gy - 8, `&theta; = ${th}&deg;`, A, "end", 14);
    const f1 = loc(-13, -6), f2 = loc(14, -6);
    const rider = `<g transform="translate(${px}, ${py}) rotate(${th})"><path d="M -34 -4 L 30 -4 Q 40 -4 42 -11" fill="none" stroke="${G}" stroke-width="5" stroke-linecap="round"/></g>`
      + ln(f1[0], f1[1], px - 6, py - 17, T, 3.5) + ln(px - 6, py - 17, px + 2, py - 31, T, 3.5)
      + ln(f2[0], f2[1], px + 11, py - 17, T, 3.5) + ln(px + 11, py - 17, px + 2, py - 31, T, 3.5)
      + ln(px + 2, py - 31, px + 3, py - 54, P, 8)
      + ln(px + 3, py - 50, px - 19, py - 41, P, 3.5) + ln(px + 3, py - 50, px + 25, py - 45, P, 3.5)
      + head(px + 4, py - 64, P);
    return `<svg viewBox="0 0 440 215" class="w-full max-w-md mx-auto h-56 bg-slate-50 rounded-2xl border border-slate-200 p-3 shadow-xs">` + ground + rider
      + arrL(-100, -26, -52, -26, A) + rtx(loc(-76, -39), `v&#8320; = ${v.v0} m/s`, A)
      + tx(px + 30, py - 70, `${v.m} kg`, T, "start", 13)
      + tx(330, 118, `slope: ${v.d} m, &mu;k = ${v.mu1}`, T, "middle", 12.5) + tx(335, 138, `flat section: &mu;k = ${v.mu2}`, T, "middle", 12.5) + `</svg>`;
  };
    var s = __orig(v);
    var rgb = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var lum = function (h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; };
    var sat = function (h) { var c = rgb(h); return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 45; };
    s = s.replace(/<text([^>]*)>/g, function (m, a) { var col = '#111'; var f = a.match(/ fill="(#[0-9a-fA-F]{3,6})"/); if (f && sat(f[1])) col = f[1]; a = a.replace(/ fill="[^"]*"/, '').replace(/font-weight="[^"]*"/, 'font-weight="normal"'); return '<text' + a + ' fill="' + col + '" font-family="Inter, Arial, Helvetica, sans-serif">'; });
    s = s.replace(/<(rect|path|ellipse)\b[^>]*>/g, function (m) { return m.replace(/fill="(#[0-9a-fA-F]{3,6})"/, function (mm, c) { var lc = c.toLowerCase(); return (!sat(c) && lum(c) < 0.6 && lc !== '#e2e8f0' && lc !== '#cbd5e1') ? 'fill="#ddd"' : mm; }); });
    s = s.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, function (m, k, c) { var l = lum(c), lc = c.toLowerCase(); if (sat(c)) return m; if (k === 'fill') { if (l >= 0.99 || lc === '#ddd') return m; if (lc === '#e2e8f0' || lc === '#cbd5e1') return 'fill="url(#pqh)"'; return l > 0.6 ? 'fill="#fff"' : 'fill="#111"'; } return l > 0.8 ? 'stroke="#aaa"' : (l > 0.6 ? 'stroke="#777"' : 'stroke="#111"'); });
    s = s.replace(/fill="rgba\([^"]*\)"/g, 'fill="none"');
    s = s.replace(/stroke-width="([\d.]+)"/g, function (m, w) { return 'stroke-width="' + Math.max(1, Math.round(w * 65) / 100) + '"'; });
    s = s.replace(/<svg([^>]*)>/, function (m, a) { return '<svg' + a.replace('bg-slate-50', 'bg-white') + ' style="background:#fff"><defs><pattern id="pqh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#999" stroke-width="1"/></pattern></defs>'; });
    return s;
  }
};

// 4. Draws the diagram a question asks for.
function getDiagramSVG(type, v) {
  const draw = DIAGRAM_DRAWERS[type];
  return draw ? draw(v) : '';
}

// 5. The questions.
const PHYSICS_QUESTIONS = [
  // --- UNIT 1: KINEMATICS (CED 1.1 - 1.4) (#1 - #20) ---
  {
    id: "KIN-01", docNum: "Kin #1", title: "Position vs. Time Graph",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "splinePosGraph",
    baseVars: { knotsY: [0, 4, -1, 3], tAvg1: 0, tAvg2: 6, tInst1: 1.75, tDisp1: 3, tDisp2: 9, tInst2: 4.5 },
    randomize: () => generateSplineProblemVars(1),
    renderPrompt: (v) => `An object moves along a straight horizontal track. Its 10-second motion is recorded in the <strong>position vs. time</strong> graph shown below. Use the graph to answer each question part:<br/><strong>a.</strong> Average Velocity from <em>t</em> = <strong>${v.tAvg1} s</strong> to <em>t</em> = <strong>${v.tAvg2} s</strong><br/><strong>b.</strong> Instantaneous Velocity at <em>t</em> = <strong>${v.tInst1} s</strong><br/><strong>c.</strong> Time when object is at rest (separate multiple times with a comma, e.g. 1.5, 5.0)<br/><strong>d.</strong> Displacement from <em>t</em> = <strong>${v.tDisp1} s</strong> to <em>t</em> = <strong>${v.tDisp2} s</strong><br/><strong>e.</strong> Instantaneous Velocity at <em>t</em> = <strong>${v.tInst2} s</strong>`,
    parts: [
      {
        label: "a. Average Velocity",
        getLabel: (v) => `a. Average Velocity from <em>t</em> = ${v.tAvg1} s to <em>t</em> = ${v.tAvg2} s`,
        unit: "m/s",
        placeholder: "e.g. 14.2 or 1.42E1",
        customTol: (ans) => Math.max(0.01, Math.abs(ans) * 0.05),
        solve: (v) => {
          const m = buildSplineModel(v.knotsY);
          return (m.evalValue(v.tAvg2) - m.evalValue(v.tAvg1)) / (v.tAvg2 - v.tAvg1);
        },
        steps: (v, ans) => {
          const m = buildSplineModel(v.knotsY);
          const x1 = m.evalValue(v.tAvg1);
          const x2 = m.evalValue(v.tAvg2);
          return guidedSteps(
            `Average velocity is the <strong>slope of the straight line (secant)</strong> that joins the two points on the position-time graph: <em>v</em><sub>avg</sub> = &Delta;<em>x</em> / &Delta;<em>t</em>.`,
            `Read the two positions from the graph. At <em>t</em> = ${v.tAvg1} s the object is at <em>x</em> = ${x1.toFixed(2)} m, and at <em>t</em> = ${v.tAvg2} s it is at <em>x</em> = ${x2.toFixed(2)} m.`,
            `Substitute: <em>v</em><sub>avg</sub> = (${x2.toFixed(2)} m &minus; (${x1.toFixed(2)} m)) / (${v.tAvg2} s &minus; ${v.tAvg1} s) = <strong>${ans.toFixed(2)} m/s</strong>.`,
            `The sign is ${ans >= 0 ? 'positive, so on average the object moves in the +<em>x</em> direction' : 'negative, so on average the object moves in the &minus;<em>x</em> direction'}.`
          );
        }},
      {
        label: "b. Instantaneous Velocity",
        getLabel: (v) => `b. Instantaneous Velocity at <em>t</em> = ${v.tInst1} s`,
        unit: "m/s",
        placeholder: "e.g. 14.2 or 1.42E1",
        customTol: (ans) => Math.max(0.01, Math.abs(ans) * 0.05),
        solve: (v) => buildSplineModel(v.knotsY).evalSlope(v.tInst1),
        steps: (v, ans) => {
          const m = buildSplineModel(v.knotsY);
          return guidedSteps(
            `Instantaneous velocity is the <strong>slope of the tangent line</strong> to the <em>x</em>-<em>t</em> curve at that exact time, here <em>t</em> = ${v.tInst1} s.`,
            `Check <strong>Draw Tangent</strong> and drag the point along the curve to <em>t</em> = ${v.tInst1} s (the curve is at <em>x</em> = ${m.evalValue(v.tInst1).toFixed(2)} m there).`,
            `Pick two points that are far apart on the tangent line and find its slope, &Delta;<em>x</em> / &Delta;<em>t</em> &approx; <strong>${ans.toFixed(2)} m/s</strong>.`,
            `${ans >= 0 ? 'A positive slope (rising line) means the object is moving in the +<em>x</em> direction.' : 'A negative slope (falling line) means the object is moving in the &minus;<em>x</em> direction.'}`
          );
        }},
      {
        label: "c. Time when object is at rest",
        getLabel: () => `c. Time when object is at rest`,
        unit: "s",
        placeholder: "e.g. 1.5, 5.0",
        customAbsTol: 0.22,
        solveMulti: (v) => buildSplineModel(v.knotsY).findZeroSlopeTimes(),
        solve: (v) => buildSplineModel(v.knotsY).findZeroSlopeTimes()[0] || 0,
        steps: (v) => {
          const restTimes = buildSplineModel(v.knotsY).findZeroSlopeTimes();
          return guidedSteps(
            `The object is at rest when its velocity is zero. On a position-time graph, velocity is the slope, so we need the times when the <strong>slope is zero</strong> (a horizontal tangent line).`,
            `A horizontal tangent occurs at the <strong>peaks and valleys</strong> of the curve, where the object momentarily stops and turns around. Use <strong>Draw Tangent</strong> to check where the line is flat.`,
            `Read the times of those turning points from the horizontal axis: <em>t</em> &approx; <strong>${restTimes.map(r => r.toFixed(2)).join(", ")} s</strong>. Enter more than one time by separating them with a comma.`
          );
        }},
      {
        label: "d. Displacement",
        getLabel: (v) => `d. Displacement from <em>t</em> = ${v.tDisp1} s to <em>t</em> = ${v.tDisp2} s`,
        unit: "m",
        placeholder: "e.g. 14.2 or 1.42E1",
        customTol: () => 0.25,
        solve: (v) => {
          const m = buildSplineModel(v.knotsY);
          return m.evalValue(v.tDisp2) - m.evalValue(v.tDisp1);
        },
        steps: (v, ans) => {
          const m = buildSplineModel(v.knotsY);
          const x1 = m.evalValue(v.tDisp1);
          const x2 = m.evalValue(v.tDisp2);
          return guidedSteps(
            `Displacement is the <strong>change in position</strong>, final position minus initial position: &Delta;<em>x</em> = <em>x</em><sub>f</sub> &minus; <em>x</em><sub>i</sub>. It does not depend on the path taken in between.`,
            `Read the positions from the graph: <em>x</em>(${v.tDisp1} s) = ${x1.toFixed(2)} m and <em>x</em>(${v.tDisp2} s) = ${x2.toFixed(2)} m.`,
            `Substitute: &Delta;<em>x</em> = ${x2.toFixed(2)} m &minus; (${x1.toFixed(2)} m) = <strong>${ans.toFixed(2)} m</strong>.`,
            `The sign tells the direction: ${ans >= 0 ? 'positive means the final position is in the +<em>x</em> direction from the starting point' : 'negative means the final position is in the &minus;<em>x</em> direction from the starting point'}.`
          );
        }},
      {
        label: "e. Instantaneous Velocity",
        getLabel: (v) => `e. Instantaneous Velocity at <em>t</em> = ${v.tInst2} s`,
        unit: "m/s",
        placeholder: "e.g. 14.2 or 1.42E1",
        customTol: (ans) => Math.max(0.01, Math.abs(ans) * 0.05),
        solve: (v) => buildSplineModel(v.knotsY).evalSlope(v.tInst2),
        steps: (v, ans) => {
          const m = buildSplineModel(v.knotsY);
          return guidedSteps(
            `Instantaneous velocity is the <strong>slope of the tangent line</strong> to the <em>x</em>-<em>t</em> curve at that exact time, here <em>t</em> = ${v.tInst2} s.`,
            `Check <strong>Draw Tangent</strong> and drag the point to <em>t</em> = ${v.tInst2} s (the curve is at <em>x</em> = ${m.evalValue(v.tInst2).toFixed(2)} m there).`,
            `Choose two points far apart on the tangent line and calculate &Delta;<em>x</em> / &Delta;<em>t</em> &approx; <strong>${ans.toFixed(2)} m/s</strong>.`,
            `${ans >= 0 ? 'A positive slope means the object is moving in the +<em>x</em> direction.' : 'A negative slope means the object is moving in the &minus;<em>x</em> direction.'}`
          );
        }}
    ]
  },
  {
    id: "KIN-02", docNum: "Kin #2", title: "Velocity vs. Time Graph",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "splineVelGraph",
    baseVars: { knotsY: [1, 5, -1, 3], ta: 3, vb: 2, tc1: 0, tc2: 6, td: 4.5 },
    randomize: () => generateSplineProblemVars(2),
    renderPrompt: (v) => {
      const vbSign = v.vb > 0 ? `+${v.vb}` : `${v.vb}`;
      return `An object moves along a straight horizontal track. Its 10-second motion is recorded in the <strong>velocity vs. time</strong> graph shown below. Use the graph to answer each question part:<br/><strong>a.</strong> What is the object’s velocity at <em>t</em> = <strong>${v.ta} s</strong>?<br/><strong>b.</strong> At what point(s) in time is the object’s velocity <strong>${vbSign} m/s</strong>? (separate multiple times with a comma, e.g. 1.5, 5.0)<br/><strong>c.</strong> What is the average acceleration of the object from <em>t</em> = <strong>${v.tc1} s</strong> to <em>t</em> = <strong>${v.tc2} s</strong>?<br/><strong>d.</strong> What is the acceleration of the object at <em>t</em> = <strong>${v.td} s</strong>?`;
    },
    parts: [
      {
        label: "a. Velocity at specified time",
        getLabel: (v) => `a. What is the object's velocity at <em>t</em> = ${v.ta} s?`,
        unit: "m/s",
        placeholder: "e.g. 14.2 or 1.42E1",
        customTol: () => 0.20,
        solve: (v) => buildSplineModel(v.knotsY).evalValue(v.ta),
        steps: (v, ans) => guidedSteps(
          `On a velocity-time graph, the <strong>vertical axis is the velocity</strong>, so no calculation is needed. You only need to read the curve.`,
          `Find <em>t</em> = ${v.ta} s on the horizontal axis, then move straight up or down to the curve.`,
          `Read the height of the curve on the vertical axis: <em>v</em>(${v.ta} s) = <strong>${ans.toFixed(2)} m/s</strong>.`,
          `${ans >= 0 ? 'The value is positive, so the object is moving in the +<em>x</em> direction at that moment.' : 'The value is negative, so the object is moving in the &minus;<em>x</em> direction at that moment.'}`
        )},
      {
        label: "b. Time(s) for specified velocity",
        getLabel: (v) => `b. At what point(s) in time is the object's velocity ${v.vb > 0 ? '+' + v.vb : v.vb} m/s?`,
        unit: "s",
        placeholder: "e.g. 1.5, 5.0",
        customAbsTol: 0.22,
        solveMulti: (v) => buildSplineModel(v.knotsY).findTimesForValue(v.vb),
        solve: (v) => buildSplineModel(v.knotsY).findTimesForValue(v.vb)[0] || 0,
        steps: (v) => {
          const times = buildSplineModel(v.knotsY).findTimesForValue(v.vb);
          const vbSign = v.vb > 0 ? `+${v.vb}` : `${v.vb}`;
          return guidedSteps(
            `Here the velocity is given and the time is unknown, so work backwards on the graph. Find <em>v</em> = ${vbSign} m/s on the vertical axis.`,
            `Imagine a horizontal line through that value. Every point where the curve <strong>crosses that line</strong> is a time when the object has that velocity. There can be more than one crossing.`,
            `Drop straight down from each crossing to the time axis and read the times: <em>t</em> &approx; <strong>${times.map(r => r.toFixed(2)).join(", ")} s</strong>. Enter several times by separating them with a comma.`
          );
        }},
      {
        label: "c. Average acceleration",
        getLabel: (v) => `c. What is the average acceleration of the object from <em>t</em> = ${v.tc1} s to <em>t</em> = ${v.tc2} s?`,
        unit: "m/s²",
        placeholder: "e.g. 14.2 or 1.42E1",
        customTol: (ans) => Math.max(0.01, Math.abs(ans) * 0.05),
        solve: (v) => {
          const m = buildSplineModel(v.knotsY);
          return (m.evalValue(v.tc2) - m.evalValue(v.tc1)) / (v.tc2 - v.tc1);
        },
        steps: (v, ans) => {
          const m = buildSplineModel(v.knotsY);
          const v1 = m.evalValue(v.tc1);
          const v2 = m.evalValue(v.tc2);
          return guidedSteps(
            `Average acceleration is the change in velocity divided by the time taken: <em>a</em><sub>avg</sub> = &Delta;<em>v</em> / &Delta;<em>t</em>. On a <em>v</em>-<em>t</em> graph this is the slope of the straight line (secant) joining the two points.`,
            `Read the velocities from the graph: <em>v</em>(${v.tc1} s) = ${v1.toFixed(2)} m/s and <em>v</em>(${v.tc2} s) = ${v2.toFixed(2)} m/s.`,
            `Substitute: <em>a</em><sub>avg</sub> = (${v2.toFixed(2)} m/s &minus; (${v1.toFixed(2)} m/s)) / (${v.tc2} s &minus; ${v.tc1} s) = <strong>${ans.toFixed(2)} m/s²</strong>.`
          );
        }},
      {
        label: "d. Instantaneous acceleration",
        getLabel: (v) => `d. What is the acceleration of the object at <em>t</em> = ${v.td} s?`,
        unit: "m/s²",
        placeholder: "e.g. 14.2 or 1.42E1",
        customTol: (ans) => Math.max(0.01, Math.abs(ans) * 0.05),
        solve: (v) => buildSplineModel(v.knotsY).evalSlope(v.td),
        steps: (v, ans) => {
          const m = buildSplineModel(v.knotsY);
          return guidedSteps(
            `Instantaneous acceleration is the <strong>slope of the tangent line</strong> to the <em>v</em>-<em>t</em> graph at that exact time, here <em>t</em> = ${v.td} s.`,
            `Check <strong>Draw Tangent</strong> and place the point at <em>t</em> = ${v.td} s (the curve is at <em>v</em> = ${m.evalValue(v.td).toFixed(2)} m/s there).`,
            `Pick two points far apart on the tangent line and calculate &Delta;<em>v</em> / &Delta;<em>t</em> &approx; <strong>${ans.toFixed(2)} m/s²</strong>.`,
            `${ans >= 0 ? 'A rising tangent means positive acceleration (velocity increasing).' : 'A falling tangent means negative acceleration (velocity decreasing).'}`
          );
        }}
    ]
  },
  {
    id: "KIN-03", docNum: "Kin #3", title: "Astronaut Vertical Jump on Exoplanet",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "jumpAstronaut",
    baseVars: { hMax: 26.0, v0: 5.8 },
    randomize: (b) => ({ hMax: rnd(b.hMax, 0.20, 1), v0: rnd(b.v0, 0.20, 2) }),
    renderPrompt: (v) => `An astronaut on a newly explored exoplanet finds that she can jump vertically to a maximum height of <strong>${v.hMax} meters</strong> when her initial takeoff speed is <strong>${v.v0} m/s</strong>. What is the magnitude of the acceleration due to gravity on the planet?`,
    parts: [
      { label: "Gravity magnitude (<em>g</em>)", unit: "m/s²", acceptedUnits: ["m/s²", "N/kg"], solve: (v) => (v.v0 * v.v0) / (2 * v.hMax), steps: (v, ans) => guidedSteps(
          `Known: takeoff speed <em>v</em><sub>0</sub> = ${v.v0} m/s and maximum height <em>h</em><sub>max</sub> = ${v.hMax} m. Unknown: the free-fall acceleration <em>g</em> on the planet. At the top of the jump the speed is momentarily zero (<em>v</em> = 0).`,
          `Use the constant-acceleration equation that has no time in it. Taking up as positive, gravity slows the jumper: <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>g h</em><sub>max</sub>. With <em>v</em> = 0, solve for <em>g</em>: <em>g</em> = <em>v</em><sub>0</sub>&sup2; / (2 <em>h</em><sub>max</sub>).`,
          `Substitute: <em>g</em> = (${v.v0} m/s)&sup2; / (2 &times; ${v.hMax} m) = <strong>${ans.toFixed(3)} m/s²</strong>.`,
          `For comparison, that is about ${(ans / G_ACCEL).toFixed(2)} times Earth’s 9.80 m/s².`
        )}
    ]
  },
  {
    id: "KIN-04", docNum: "Kin #4", title: "Automobile Constant Acceleration: Speed and Time",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "motCarUnknownV",
    baseVars: { v0: 5.60, accel: 0.45, dist: 615 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 2), accel: rnd(b.accel, 0.20, 2), dist: Math.round(rnd(b.dist, 0.20, 0)) }),
    renderPrompt: (v) => `An automobile accelerates from an initial velocity of <strong>${v.v0} m/s</strong> at a constant rate of <strong>${v.accel} m/s&sup2;</strong>. It travels a straight-line displacement of <strong>${v.dist} m</strong> while accelerating.<br/><strong>a.</strong> What is the car’s final speed at the end of that displacement?<br/><strong>b.</strong> How long did it take to travel <strong>${v.dist} m</strong>?`,
    parts: [
      { label: "a. Final speed (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(v.v0 * v.v0 + 2 * v.accel * v.dist), steps: (v, ans) => guidedSteps(
          `Known: initial velocity <em>v</em><sub>0</sub> = ${v.v0} m/s, acceleration <em>a</em> = ${v.accel} m/s², and displacement &Delta;<em>x</em> = ${v.dist} m. Unknown: the final speed <em>v</em>. The time is not given, so choose the equation without time.`,
          `Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>a</em>&Delta;<em>x</em> and solve for <em>v</em>.`,
          `Substitute: <em>v</em>&sup2; = (${v.v0})&sup2; + 2(${v.accel})(${v.dist}) = ${(v.v0 * v.v0 + 2 * v.accel * v.dist).toFixed(2)} m²/s².`,
          `Take the square root: <em>v</em> = <strong>${ans.toFixed(2)} m/s</strong>.`
        )},
      { label: "b. Travel time (<em>t</em>)", unit: "s", solve: (v) => (Math.sqrt(v.v0 * v.v0 + 2 * v.accel * v.dist) - v.v0) / v.accel, steps: (v, ans) => {
          const vf = Math.sqrt(v.v0 * v.v0 + 2 * v.accel * v.dist);
          return guidedSteps(
            `Known: <em>v</em><sub>0</sub> = ${v.v0} m/s, <em>a</em> = ${v.accel} m/s², and from part a the final speed <em>v</em> = ${vf.toFixed(2)} m/s. Unknown: the time <em>t</em>.`,
            `Use the definition of constant acceleration, <em>v</em> = <em>v</em><sub>0</sub> + <em>a t</em>, and solve for time: <em>t</em> = (<em>v</em> &minus; <em>v</em><sub>0</sub>) / <em>a</em>.`,
            `Substitute: <em>t</em> = (${vf.toFixed(2)} m/s &minus; ${v.v0} m/s) / ${v.accel} m/s² = <strong>${ans.toFixed(2)} s</strong>.`
          );
        }}
    ]
  },
  {
    id: "KIN-05", docNum: "Kin #5", title: "Baseball Pitcher Fastball Acceleration",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "motPitch",
    baseVars: { v0: 42.0, dist: 3.5 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), dist: rnd(b.dist, 0.20, 2) }),
    renderPrompt: (v) => `A baseball pitcher throws a fastball with a release speed of <strong>${v.v0} m/s</strong>. Estimate the magnitude of the average acceleration of the ball during the throwing motion if the ball accelerates from rest over a distance of <strong>${v.dist} m</strong> from the wind-up to release.`,
    parts: [
      { label: "Average acceleration magnitude (<em>a</em>)", unit: "m/s²", solve: (v) => (v.v0 * v.v0) / (2 * v.dist), steps: (v, ans) => guidedSteps(
          `Known: the ball starts from rest (<em>v</em><sub>0</sub> = 0), reaches <em>v</em> = ${v.v0} m/s, and travels &Delta;<em>x</em> = ${v.dist} m while accelerating. Unknown: the average acceleration <em>a</em>. There is no time given, so use the equation without time.`,
          `<em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>a</em>&Delta;<em>x</em>. With <em>v</em><sub>0</sub> = 0 this gives <em>a</em> = <em>v</em>&sup2; / (2&Delta;<em>x</em>).`,
          `Substitute: <em>a</em> = (${v.v0} m/s)&sup2; / (2 &times; ${v.dist} m) = <strong>${ans.toFixed(1)} m/s²</strong>.`,
          `That is roughly ${(ans / G_ACCEL).toFixed(0)} times the acceleration due to gravity, which shows how quickly the arm must speed the ball up.`
        )}
    ]
  },
  {
    id: "KIN-06", docNum: "Kin #6", title: "Two-Stage Model Rocket Flight (4 Parts)",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "rocketBurn",
    baseVars: { aEngine: 38.0, tEngine: 1.40 },
    randomize: (b) => ({ aEngine: rnd(b.aEngine, 0.20, 1), tEngine: rnd(b.tEngine, 0.20, 2) }),
    renderPrompt: (v) => `A model rocket launches vertically from rest on the ground. Its engine produces a constant upward acceleration of <strong>${v.aEngine} m/s&sup2;</strong> for <strong>${v.tEngine} s</strong>. When fuel runs out, the rocket continues upward in unpowered free-fall under gravity.<br/><strong>a.</strong> What maximum altitude does the rocket reach?<br/><strong>b.</strong> What is the rocket’s velocity immediately before striking the ground?<br/><strong>c.</strong> What total distance does the rocket travel from launch to impact?<br/><strong>d.</strong> How long is the rocket in the air in total?`,
    parts: [
      { label: "a. Maximum altitude (<em>h</em><sub>max</sub>)", unit: "m", solve: (v) => (0.5 * v.aEngine * v.tEngine * v.tEngine) + (Math.pow(v.aEngine * v.tEngine, 2) / (2 * G_ACCEL)), steps: (v, ans) => {
          const y1 = 0.5 * v.aEngine * v.tEngine * v.tEngine;
          const v1 = v.aEngine * v.tEngine;
          const y2 = (v1 * v1) / (2 * G_ACCEL);
          return guidedSteps(
            `Split the flight into two stages: (1) the engine burns and the rocket accelerates upward from rest, and (2) the engine stops and the rocket coasts upward in free fall until it momentarily stops at the top.`,
            `Stage 1: height gained <em>y</em><sub>1</sub> = &frac12;<em>a</em><em>t</em>&sup2; = &frac12;(${v.aEngine})(${v.tEngine})&sup2; = ${y1.toFixed(2)} m. Speed at burnout <em>v</em><sub>1</sub> = <em>a t</em> = (${v.aEngine})(${v.tEngine}) = ${v1.toFixed(2)} m/s.`,
            `Stage 2: the rocket slows at <em>g</em> until <em>v</em> = 0, so <em>y</em><sub>2</sub> = <em>v</em><sub>1</sub>&sup2; / (2<em>g</em>) = (${v1.toFixed(2)})&sup2; / (2 &times; 9.80) = ${y2.toFixed(2)} m.`,
            `Add the two stages: <em>h</em><sub>max</sub> = <em>y</em><sub>1</sub> + <em>y</em><sub>2</sub> = ${y1.toFixed(2)} m + ${y2.toFixed(2)} m = <strong>${ans.toFixed(2)} m</strong>.`
          );
        }},
      { label: "b. Landing velocity (<em>v</em><sub>land</sub>)", unit: "m/s", solve: (v) => -Math.sqrt(2 * G_ACCEL * ((0.5 * v.aEngine * v.tEngine * v.tEngine) + (Math.pow(v.aEngine * v.tEngine, 2) / (2 * G_ACCEL)))), steps: (v, ans) => {
          const hMax = (0.5 * v.aEngine * v.tEngine * v.tEngine) + (Math.pow(v.aEngine * v.tEngine, 2) / (2 * G_ACCEL));
          return guidedSteps(
            `At the top of its flight the rocket is momentarily at rest. From there it falls freely through the full height from part a, <em>h</em><sub>max</sub> = ${hMax.toFixed(2)} m, back to the ground.`,
            `Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>g</em><em>h</em> with <em>v</em><sub>0</sub> = 0, so |<em>v</em>| = &radic;(2<em>g</em><em>h</em><sub>max</sub>).`,
            `Substitute: |<em>v</em>| = &radic;(2 &times; 9.80 &times; ${hMax.toFixed(2)}) = ${Math.abs(ans).toFixed(2)} m/s.`,
            `The rocket is moving downward, so with up as positive the velocity is <strong>${ans.toFixed(2)} m/s</strong>.`
          );
        }},
      { label: "c. Total distance traveled (<em>d</em><sub>total</sub>)", unit: "m", solve: (v) => 2 * ((0.5 * v.aEngine * v.tEngine * v.tEngine) + (Math.pow(v.aEngine * v.tEngine, 2) / (2 * G_ACCEL))), steps: (v, ans) => {
          const hMax = ans / 2;
          return guidedSteps(
            `Distance is the total length of the path, so it counts both the trip up and the trip down. (Displacement would be zero, because the rocket ends where it started.)`,
            `The rocket travels up a height <em>h</em><sub>max</sub> = ${hMax.toFixed(2)} m (from part a) and then falls the same height back down.`,
            `<em>d</em><sub>total</sub> = 2<em>h</em><sub>max</sub> = 2 &times; ${hMax.toFixed(2)} m = <strong>${ans.toFixed(2)} m</strong>.`
          );
        }},
      { label: "d. Total flight time (<em>t</em><sub>total</sub>)", unit: "s", solve: (v) => { const hMax = (0.5 * v.aEngine * v.tEngine * v.tEngine) + (Math.pow(v.aEngine * v.tEngine, 2) / (2 * G_ACCEL)); return v.tEngine + ((v.aEngine * v.tEngine) / G_ACCEL) + Math.sqrt((2 * hMax) / G_ACCEL); }, steps: (v, ans) => {
          const hMax = (0.5 * v.aEngine * v.tEngine * v.tEngine) + (Math.pow(v.aEngine * v.tEngine, 2) / (2 * G_ACCEL));
          const v1 = v.aEngine * v.tEngine;
          const tCoast = v1 / G_ACCEL;
          const tFall = Math.sqrt((2 * hMax) / G_ACCEL);
          return guidedSteps(
            `Find the time for each of the three parts of the flight and add them.`,
            `Powered climb: <em>t</em><sub>boost</sub> = ${v.tEngine} s (given). Coasting climb to the top: <em>v</em><sub>1</sub> = ${v1.toFixed(2)} m/s slows to zero at rate <em>g</em>, so <em>t</em><sub>coast</sub> = <em>v</em><sub>1</sub> / <em>g</em> = ${v1.toFixed(2)} / 9.80 = ${tCoast.toFixed(2)} s.`,
            `Fall from the top: <em>h</em><sub>max</sub> = &frac12;<em>g</em><em>t</em>&sup2; gives <em>t</em><sub>fall</sub> = &radic;(2<em>h</em><sub>max</sub> / <em>g</em>) = &radic;(2 &times; ${hMax.toFixed(2)} / 9.80) = ${tFall.toFixed(2)} s.`,
            `Total: <em>t</em><sub>total</sub> = ${v.tEngine} s + ${tCoast.toFixed(2)} s + ${tFall.toFixed(2)} s = <strong>${ans.toFixed(2)} s</strong>.`
          );
        }}
    ]
  },
  {
    id: "KIN-07", docNum: "Kin #7", title: "Driver Reaction Time and Total Stopping Distance",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "reactionBrake",
    baseVars: { v0: 22.0, decel: 4.10, tRxn: 0.350 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), decel: rnd(b.decel, 0.20, 2), tRxn: rnd(b.tRxn, 0.20, 3) }),
    renderPrompt: (v) => `A driver is traveling at <strong>${v.v0} m/s</strong> when an obstacle appears in the roadway. The vehicle decelerates at a maximum rate of <strong>${v.decel} m/s&sup2;</strong>. If human reaction time is <strong>${v.tRxn} s</strong> before braking begins, what total distance does the car travel before stopping?`,
    parts: [
      { label: "Total stopping distance (<em>d</em><sub>total</sub>)", unit: "m", solve: (v) => (v.v0 * v.tRxn) + (v.v0 * v.v0) / (2 * v.decel), steps: (v, ans) => {
          const dRxn = v.v0 * v.tRxn;
          const dBrake = (v.v0 * v.v0) / (2 * v.decel);
          return guidedSteps(
            `The car moves in two phases. First, during the reaction time the driver has not yet braked, so the car keeps its constant speed <em>v</em><sub>0</sub> = ${v.v0} m/s. Then the car brakes at a constant deceleration of ${v.decel} m/s² until it stops.`,
            `Reaction phase: <em>d</em><sub>rxn</sub> = <em>v</em><sub>0</sub> <em>t</em><sub>rxn</sub> = (${v.v0} m/s)(${v.tRxn} s) = ${dRxn.toFixed(2)} m.`,
            `Braking phase: use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>a</em><em>d</em> with <em>v</em> = 0, so <em>d</em><sub>brake</sub> = <em>v</em><sub>0</sub>&sup2; / (2<em>a</em>) = (${v.v0})&sup2; / (2 &times; ${v.decel}) = ${dBrake.toFixed(2)} m.`,
            `Add the two distances: <em>d</em><sub>total</sub> = ${dRxn.toFixed(2)} m + ${dBrake.toFixed(2)} m = <strong>${ans.toFixed(2)} m</strong>.`
          );
        }}
    ]
  },
  {
    id: "KIN-08", docNum: "Kin #8", title: "Aircraft Carrier Steam Catapult Launch Length",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "motCatapult",
    baseVars: { vFinal: 42.0, tLaunch: 2.00 },
    randomize: (b) => ({ vFinal: rnd(b.vFinal, 0.20, 1), tLaunch: rnd(b.tLaunch, 0.20, 2) }),
    renderPrompt: (v) => `A supersonic aircraft is launched from rest via a steam catapult on an aircraft carrier flight deck. It achieves a takeoff speed of <strong>${v.vFinal} m/s</strong> in <strong>${v.tLaunch} s</strong>. Assuming constant acceleration, what is the length of the catapult runway?`,
    parts: [
      { label: "Catapult length (&Delta;<em>x</em>)", unit: "m", solve: (v) => 0.5 * v.vFinal * v.tLaunch, steps: (v, ans) => guidedSteps(
          `Known: the aircraft starts from rest (<em>v</em><sub>0</sub> = 0), reaches <em>v</em> = ${v.vFinal} m/s, and takes <em>t</em> = ${v.tLaunch} s. The acceleration is constant. Unknown: the distance &Delta;<em>x</em> covered along the catapult.`,
          `For constant acceleration the average velocity is the mean of the starting and ending velocities, so &Delta;<em>x</em> = &frac12;(<em>v</em><sub>0</sub> + <em>v</em>)<em>t</em>. With <em>v</em><sub>0</sub> = 0 this becomes &Delta;<em>x</em> = &frac12;<em>v</em><em>t</em>.`,
          `Substitute: &Delta;<em>x</em> = &frac12;(${v.vFinal} m/s)(${v.tLaunch} s) = <strong>${ans.toFixed(2)} m</strong>.`
        )}
    ]
  },
  {
    id: "KIN-09", docNum: "Kin #9", title: "Vehicle Uniform Braking Distance from Time",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "motCarStop",
    baseVars: { v0: 27.0, timeSec: 8.00 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), timeSec: rnd(b.timeSec, 0.20, 2) }),
    renderPrompt: (v) => `A vehicle slows down uniformly from an initial velocity of <strong>${v.v0} m/s</strong> to a full stop in <strong>${v.timeSec} seconds</strong>. What total distance does it cover during this stopping period?`,
    parts: [
      { label: "Distance traveled (&Delta;<em>x</em>)", unit: "m", solve: (v) => 0.5 * v.v0 * v.timeSec, steps: (v, ans) => guidedSteps(
          `Known: the vehicle slows uniformly from <em>v</em><sub>0</sub> = ${v.v0} m/s to a stop (<em>v</em> = 0) in <em>t</em> = ${v.timeSec} s. Unknown: the distance &Delta;<em>x</em>.`,
          `For uniform (constant) acceleration, the average velocity is the mean of the first and last velocities: <em>v</em><sub>avg</sub> = (<em>v</em><sub>0</sub> + <em>v</em>) / 2 = (${v.v0} + 0) / 2 = ${(v.v0 / 2).toFixed(2)} m/s.`,
          `Distance = average velocity &times; time: &Delta;<em>x</em> = <em>v</em><sub>avg</sub><em>t</em> = (${(v.v0 / 2).toFixed(2)} m/s)(${v.timeSec} s) = <strong>${ans.toFixed(2)} m</strong>.`
        )}
    ]
  },
  {
    id: "KIN-10", docNum: "Kin #10", title: "Freight Elevator Velocity-Time Graph Analysis",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "elevatorVtGraph",
    baseVars: { vMax: 20, t1: 4, t2: 10, t3: 14 },
    randomize: () => {
      const vMax = Math.round(rnd(20, 0.20, 0));
      const t1 = Math.round(rnd(4, 0.20, 0));
      const t2 = t1 + Math.round(rnd(6, 0.20, 0));
      const t3 = t2 + Math.round(rnd(4, 0.20, 0));
      return { vMax, t1, t2, t3 };
    },
    renderPrompt: (v) => `The velocity-time graph shown illustrates the motion of a vertical test freight elevator. The elevator accelerates uniformly from rest to a peak velocity of <strong>${v.vMax} m/s</strong> at <em>t</em><sub>1</sub> = <strong>${v.t1} s</strong>, cruises at constant velocity until <em>t</em><sub>2</sub> = <strong>${v.t2} s</strong>, then brakes uniformly to rest at <em>t</em><sub>3</sub> = <strong>${v.t3} s</strong>.<br/><strong>a.</strong> What is the magnitude of the elevator’s maximum acceleration?<br/><strong>b.</strong> What is the total vertical displacement of the elevator?`,
    parts: [
      { label: "a. Maximum acceleration magnitude (|<em>a</em>|<sub>max</sub>)", unit: "m/s²", solve: (v) => Math.max(v.vMax / v.t1, v.vMax / (v.t3 - v.t2)), steps: (v, ans) => {
          const a1 = v.vMax / v.t1, a3 = v.vMax / (v.t3 - v.t2);
          return guidedSteps(
            `On a velocity-time graph, acceleration is the <strong>slope</strong>. The graph has three sections: a speed-up (0 to ${v.t1} s), a constant-velocity cruise (${v.t1} to ${v.t2} s, slope zero), and a slow-down (${v.t2} to ${v.t3} s). Only the speed-up and slow-down have acceleration.`,
            `Speed-up: |<em>a</em><sub>1</sub>| = &Delta;<em>v</em> / &Delta;<em>t</em> = ${v.vMax} m/s / ${v.t1} s = ${a1.toFixed(2)} m/s².`,
            `Slow-down: |<em>a</em><sub>3</sub>| = ${v.vMax} m/s / (${v.t3} s &minus; ${v.t2} s) = ${a3.toFixed(2)} m/s².`,
            `The maximum magnitude is the larger of the two (the steeper line): <strong>${ans.toFixed(2)} m/s²</strong>.`
          );
        }},
      { label: "b. Total vertical displacement (&Delta;<em>y</em>)", unit: "m", solve: (v) => 0.5 * (v.t3 + (v.t2 - v.t1)) * v.vMax, steps: (v, ans) => {
          const A1 = 0.5 * v.t1 * v.vMax, A2 = (v.t2 - v.t1) * v.vMax, A3 = 0.5 * (v.t3 - v.t2) * v.vMax;
          return guidedSteps(
            `On a velocity-time graph, <strong>displacement is the area between the graph and the time axis</strong>. Split the shape into a triangle, a rectangle, and another triangle.`,
            `Speed-up triangle: &frac12;(${v.t1} s)(${v.vMax} m/s) = ${A1.toFixed(1)} m. Cruise rectangle: (${v.t2} s &minus; ${v.t1} s)(${v.vMax} m/s) = ${A2.toFixed(1)} m. Slow-down triangle: &frac12;(${v.t3} s &minus; ${v.t2} s)(${v.vMax} m/s) = ${A3.toFixed(1)} m.`,
            `Add the areas: &Delta;<em>y</em> = ${A1.toFixed(1)} + ${A2.toFixed(1)} + ${A3.toFixed(1)} = <strong>${ans.toFixed(1)} m</strong>. (This equals the trapezoid formula &frac12;[<em>t</em><sub>3</sub> + (<em>t</em><sub>2</sub> &minus; <em>t</em><sub>1</sub>)]<em>v</em><sub>max</sub>.)`
          );
        }}
    ]
  },
  {
    id: "KIN-11", docNum: "Kin #11", title: "Tennis Ball Rebound Average Acceleration",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "racketBall",
    baseVars: { vIn: 45.0, vOut: 39.0, tDur: 0.062 },
    randomize: (b) => ({ vIn: rnd(b.vIn, 0.20, 1), vOut: rnd(b.vOut, 0.20, 1), tDur: rnd(b.tDur, 0.20, 3) }),
    renderPrompt: (v) => `A tennis ball travels horizontally toward a player at a speed of <strong>${v.vIn} m/s</strong>. The player strikes the ball directly back in the opposite direction, and <strong>${v.tDur} seconds</strong> later the ball departs the strings at <strong>${v.vOut} m/s</strong>. What is the magnitude of the average acceleration experienced by the ball during contact?`,
    parts: [
      { label: "Average acceleration magnitude (|<em>a</em><sub>avg</sub>|)", unit: "m/s²", solve: (v) => (v.vOut + v.vIn) / v.tDur, steps: (v, ans) => guidedSteps(
          `Velocity is a vector, so choose a direction first. Take the direction the ball leaves the racket as <strong>positive</strong>. Then the ball arrives with velocity &minus;${v.vIn} m/s and leaves with velocity +${v.vOut} m/s.`,
          `Average acceleration is the change in velocity over the time: <em>a</em><sub>avg</sub> = (<em>v</em><sub>out</sub> &minus; <em>v</em><sub>in</sub>) / &Delta;<em>t</em>.`,
          `Substitute: <em>a</em><sub>avg</sub> = (${v.vOut} m/s &minus; (&minus;${v.vIn} m/s)) / ${v.tDur} s = (${(v.vOut + v.vIn).toFixed(1)} m/s) / ${v.tDur} s.`,
          `Magnitude: |<em>a</em><sub>avg</sub>| = <strong>${ans.toFixed(1)} m/s²</strong>. The velocity change is large because the ball reverses direction, so the two speeds <em>add</em>.`
        )}
    ]
  },
  {
    id: "KIN-12", docNum: "Kin #12", title: "Crash Test Vehicle Crumple Zone Deceleration and g's",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "crashBarrier",
    baseVars: { v0: 26.0, dist: 0.77 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), dist: rnd(b.dist, 0.20, 2) }),
    renderPrompt: (v) => `A test vehicle traveling at <strong>+${v.v0} m/s</strong> crashes into a rigid barrier. The crumple zone compresses and the cabin stops in <strong>${v.dist} m</strong>.<br/><strong>a.</strong> What is the magnitude of the average acceleration during impact?<br/><strong>b.</strong> How many <em>g</em>’s of acceleration does the vehicle experience?`,
    parts: [
      { label: "a. Average acceleration magnitude (|<em>a</em>|)", unit: "m/s²", solve: (v) => (v.v0 * v.v0) / (2 * v.dist), steps: (v, ans) => guidedSteps(
          `Known: initial velocity <em>v</em><sub>0</sub> = ${v.v0} m/s, final velocity <em>v</em> = 0 (the car stops), and stopping distance &Delta;<em>x</em> = ${v.dist} m. No time is given, so use the equation without time.`,
          `<em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>a</em>&Delta;<em>x</em>. With <em>v</em> = 0 this gives |<em>a</em>| = <em>v</em><sub>0</sub>&sup2; / (2&Delta;<em>x</em>).`,
          `Substitute: |<em>a</em>| = (${v.v0} m/s)&sup2; / (2 &times; ${v.dist} m) = <strong>${ans.toFixed(1)} m/s²</strong>. The acceleration is negative (opposite to the motion), and the question asks for its magnitude.`
        )},
      { label: "b. Acceleration in <em>g</em>'s", unit: "g's", acceptedUnits: ["g's", "No units"], solve: (v) => ((v.v0 * v.v0) / (2 * v.dist)) / G_ACCEL, steps: (v, ans) => {
          const a = (v.v0 * v.v0) / (2 * v.dist);
          return guidedSteps(
            `A &ldquo;<em>g</em>&rdquo; is one unit of 9.80 m/s². To express an acceleration in <em>g</em>’s, divide it by 9.80 m/s².`,
            `Use the magnitude from part a: |<em>a</em>| = ${a.toFixed(1)} m/s².`,
            `Number of <em>g</em>’s = ${a.toFixed(1)} / 9.80 = <strong>${ans.toFixed(2)} g’s</strong>.`
          );
        }}
    ]
  },
  {
    id: "KIN-13", docNum: "Kin #13", title: "Highway Passing Time with Unit Conversion (km/h to m/s)",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "motCarKmh",
    baseVars: { vInitKmh: 60, accel: 4.0, vFinalKmh: 90 },
    randomize: (b) => {
      const vInitKmh = Math.round(rnd(b.vInitKmh, 0.20, 0));
      const vFinalKmh = vInitKmh + Math.round(rnd(30, 0.20, 0));
      return { vInitKmh, accel: rnd(b.accel, 0.20, 2), vFinalKmh };
    },
    renderPrompt: (v) => `A car traveling at <strong>${v.vInitKmh} km/h</strong> accelerates at a constant rate of <strong>${v.accel} m/s&sup2;</strong>. How much time is required to increase its speed to <strong>${v.vFinalKmh} km/h</strong>?`,
    parts: [
      { label: "Required time (<em>t</em>)", unit: "s", solve: (v) => ((v.vFinalKmh / 3.6) - (v.vInitKmh / 3.6)) / v.accel, steps: (v, ans) => {
          const v0 = v.vInitKmh / 3.6, vf = v.vFinalKmh / 3.6;
          return guidedSteps(
            `The acceleration is in m/s², so first convert both speeds from km/h to m/s. Since 1 m/s = 3.6 km/h, divide by 3.6.`,
            `<em>v</em><sub>0</sub> = ${v.vInitKmh} km/h &divide; 3.6 = ${v0.toFixed(2)} m/s, and <em>v</em><sub>f</sub> = ${v.vFinalKmh} km/h &divide; 3.6 = ${vf.toFixed(2)} m/s.`,
            `Use <em>v</em><sub>f</sub> = <em>v</em><sub>0</sub> + <em>a t</em> and solve for time: <em>t</em> = (<em>v</em><sub>f</sub> &minus; <em>v</em><sub>0</sub>) / <em>a</em>.`,
            `Substitute: <em>t</em> = (${vf.toFixed(2)} m/s &minus; ${v0.toFixed(2)} m/s) / ${v.accel} m/s² = <strong>${ans.toFixed(2)} s</strong>.`
          );
        }}
    ]
  },
  {
    id: "KIN-14", docNum: "Kin #14", title: "Final Velocity from Average Velocity and Displacement",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "motCarTD",
    baseVars: { v0: 4.00, timeSec: 15.0, dist: 235 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 2), timeSec: rnd(b.timeSec, 0.20, 1), dist: Math.round(rnd(b.dist, 0.20, 0)) }),
    renderPrompt: (v) => `A car with an initial velocity of <strong>${v.v0} m/s</strong> accelerates uniformly over <strong>${v.timeSec} s</strong>, traveling a displacement of <strong>${v.dist} m</strong>. What is the car’s velocity at the end of the <strong>${v.timeSec} s</strong> interval?`,
    parts: [
      { label: "Final velocity (<em>v</em>)", unit: "m/s", solve: (v) => (2 * v.dist / v.timeSec) - v.v0, steps: (v, ans) => guidedSteps(
          `Known: initial velocity <em>v</em><sub>0</sub> = ${v.v0} m/s, time <em>t</em> = ${v.timeSec} s, and displacement &Delta;<em>x</em> = ${v.dist} m. Unknown: the final velocity <em>v</em>. The acceleration is constant, so average velocity = &Delta;<em>x</em> / <em>t</em> = (<em>v</em><sub>0</sub> + <em>v</em>) / 2.`,
          `Average velocity: &Delta;<em>x</em> / <em>t</em> = ${v.dist} m / ${v.timeSec} s = ${(v.dist / v.timeSec).toFixed(2)} m/s.`,
          `Solve for the final velocity: <em>v</em> = 2(&Delta;<em>x</em> / <em>t</em>) &minus; <em>v</em><sub>0</sub> = 2(${(v.dist / v.timeSec).toFixed(2)}) &minus; ${v.v0}.`,
          `<em>v</em> = <strong>${ans.toFixed(2)} m/s</strong>.`
        )}
    ]
  },
  {
    id: "KIN-15", docNum: "Kin #15", title: "Weather Balloon Instrument Package Free-Fall",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "dropBalloon",
    baseVars: { vImpact: -73.5 },
    randomize: (b) => ({ vImpact: -rnd(Math.abs(b.vImpact), 0.20, 1) }),
    renderPrompt: (v) => `A high-altitude weather balloon releases an instrument package from rest. The package strikes the ground below at a velocity of <strong>${v.vImpact} m/s</strong> (downward).<br/><strong>a.</strong> How far did the package fall (positive distance)?<br/><strong>b.</strong> How long was the package falling?`,
    parts: [
      { label: "a. Fall distance (<em>h</em>)", unit: "m", solve: (v) => (v.vImpact * v.vImpact) / (2 * G_ACCEL), steps: (v, ans) => guidedSteps(
          `Known: the package starts from rest (<em>v</em><sub>0</sub> = 0) and hits the ground at |<em>v</em>| = ${Math.abs(v.vImpact)} m/s. The only acceleration is gravity, <em>g</em> = 9.80 m/s². Unknown: the fall distance <em>h</em>.`,
          `No time is given, so use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>g h</em>. With <em>v</em><sub>0</sub> = 0: <em>h</em> = <em>v</em>&sup2; / (2<em>g</em>).`,
          `Substitute: <em>h</em> = (${Math.abs(v.vImpact)} m/s)&sup2; / (2 &times; 9.80 m/s²) = <strong>${ans.toFixed(1)} m</strong>.`
        )},
      { label: "b. Fall time (<em>t</em>)", unit: "s", solve: (v) => Math.abs(v.vImpact) / G_ACCEL, steps: (v, ans) => guidedSteps(
          `Known: the package starts from rest, falls with acceleration <em>g</em> = 9.80 m/s², and reaches speed |<em>v</em>| = ${Math.abs(v.vImpact)} m/s. Unknown: the time <em>t</em>.`,
          `For free fall from rest, <em>v</em> = <em>g t</em>, so <em>t</em> = |<em>v</em>| / <em>g</em>.`,
          `Substitute: <em>t</em> = ${Math.abs(v.vImpact)} m/s / 9.80 m/s² = <strong>${ans.toFixed(2)} s</strong>.`
        )}
    ]
  },
  {
    id: "KIN-16", docNum: "Kin #16", title: "Vertical Projectile Launch Speed from Total Flight Time",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "jumpBallTotalTime",
    baseVars: { tTotal: 8.30 },
    randomize: (b) => ({ tTotal: rnd(b.tTotal, 0.20, 2) }),
    renderPrompt: (v) => `A projectile launched vertically upward returns to its launch elevation after <strong>${v.tTotal} seconds</strong> in the air. Neglecting air drag, what was its initial launch speed?`,
    parts: [
      { label: "Initial launch speed (<em>v</em><sub>0</sub>)", unit: "m/s", solve: (v) => G_ACCEL * (v.tTotal / 2), steps: (v, ans) => guidedSteps(
          `Without air drag, the trip up and the trip down take the same time. So the time to reach the top is half of the total: <em>t</em><sub>up</sub> = ${v.tTotal} s / 2 = ${(v.tTotal / 2).toFixed(2)} s.`,
          `At the top the velocity is zero, so <em>v</em> = <em>v</em><sub>0</sub> &minus; <em>g t</em><sub>up</sub> = 0, which gives <em>v</em><sub>0</sub> = <em>g t</em><sub>up</sub>.`,
          `Substitute: <em>v</em><sub>0</sub> = (9.80 m/s²)(${(v.tTotal / 2).toFixed(2)} s) = <strong>${ans.toFixed(2)} m/s</strong>.`
        )}
    ]
  },
  {
    id: "KIN-17", docNum: "Kin #17", title: "Pop-Up Baseball Landing Below Bat Height",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "popUp",
    baseVars: { tTotal: 5.00, dropDist: 1.40 },
    randomize: (b) => ({ tTotal: rnd(b.tTotal, 0.20, 2), dropDist: rnd(b.dropDist, 0.20, 2) }),
    renderPrompt: (v) => `During a baseball game, a batter pops a ball straight up into the air. The ball remains airborne for <strong>${v.tTotal} s</strong> before landing on the turf <strong>${v.dropDist} meters</strong> below the height where it made contact with the bat.<br/><strong>a.</strong> How high above the ground does the ball climb at its apex?<br/><strong>b.</strong> With what speed did the ball leave the bat?`,
    parts: [
      { label: "a. Maximum height above ground (<em>H</em><sub>max</sub>)", unit: "m", solve: (v) => { const v0 = (0.5 * G_ACCEL * v.tTotal * v.tTotal - v.dropDist) / v.tTotal; return v.dropDist + (v0 * v0) / (2 * G_ACCEL); }, steps: (v, ans) => {
          const v0 = (0.5 * G_ACCEL * v.tTotal * v.tTotal - v.dropDist) / v.tTotal;
          const climb = (v0 * v0) / (2 * G_ACCEL);
          return guidedSteps(
            `Take up as positive. The ball lands ${v.dropDist} m <em>below</em> the bat, so its total displacement is &Delta;<em>y</em> = &minus;${v.dropDist} m after <em>t</em> = ${v.tTotal} s. First find the launch speed: &minus;${v.dropDist} = <em>v</em><sub>0</sub><em>t</em> &minus; &frac12;<em>g</em><em>t</em>&sup2;, so <em>v</em><sub>0</sub> = (&frac12;<em>g</em><em>t</em>&sup2; &minus; ${v.dropDist}) / <em>t</em> = ${v0.toFixed(2)} m/s (this is part b).`,
            `At the apex the velocity is zero, so the climb above the bat is <em>v</em><sub>0</sub>&sup2; / (2<em>g</em>) = (${v0.toFixed(2)})&sup2; / (2 &times; 9.80) = ${climb.toFixed(2)} m.`,
            `The ground is ${v.dropDist} m <em>below</em> the bat, so add that height: <em>H</em><sub>max</sub> = ${v.dropDist} m + ${climb.toFixed(2)} m = <strong>${ans.toFixed(2)} m</strong>.`
          );
        }},
      { label: "b. Initial speed from bat (<em>v</em><sub>0</sub>)", unit: "m/s", solve: (v) => (0.5 * G_ACCEL * v.tTotal * v.tTotal - v.dropDist) / v.tTotal, steps: (v, ans) => guidedSteps(
          `Take up as positive and the bat as the starting point. The ball lands ${v.dropDist} m below the bat after <em>t</em> = ${v.tTotal} s, so &Delta;<em>y</em> = &minus;${v.dropDist} m, and the acceleration is &minus;<em>g</em>.`,
          `Use &Delta;<em>y</em> = <em>v</em><sub>0</sub><em>t</em> &minus; &frac12;<em>g</em><em>t</em>&sup2; and solve for <em>v</em><sub>0</sub>: <em>v</em><sub>0</sub> = (&Delta;<em>y</em> + &frac12;<em>g</em><em>t</em>&sup2;) / <em>t</em> = (&frac12;<em>g</em><em>t</em>&sup2; &minus; ${v.dropDist}) / <em>t</em>.`,
          `Substitute: <em>v</em><sub>0</sub> = (&frac12;(9.80)(${v.tTotal})&sup2; &minus; ${v.dropDist}) / ${v.tTotal} = (${(0.5 * G_ACCEL * v.tTotal * v.tTotal).toFixed(2)} &minus; ${v.dropDist}) / ${v.tTotal} = <strong>${ans.toFixed(2)} m/s</strong>.`
        )}
    ]
  },
  {
    id: "KIN-18", docNum: "Kin #18", title: "Rebounding Tennis Ball Floor Impact Acceleration",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "tennisBounce",
    baseVars: { hDrop: 1.20, hRebound: 1.00, tContact: 0.010 },
    randomize: (b) => ({ hDrop: rnd(b.hDrop, 0.20, 2), hRebound: rnd(b.hRebound, 0.20, 2), tContact: rnd(b.tContact, 0.20, 3) }),
    renderPrompt: (v) => `A tennis ball is dropped from rest at an initial elevation of <strong>${v.hDrop} m</strong>, strikes the floor, and rebounds to a height of <strong>${v.hRebound} m</strong>.<br/><strong>a.</strong> What is its velocity as it strikes the floor?<br/><strong>b.</strong> What is its velocity as it leaves the floor?<br/><strong>c.</strong> If contact with the floor lasts <strong>${v.tContact} s</strong>, find the average acceleration during the bounce.`,
    parts: [
      { label: "a. Impact velocity (<em>v</em><sub>1</sub>)", unit: "m/s", solve: (v) => -Math.sqrt(2 * G_ACCEL * v.hDrop), steps: (v, ans) => guidedSteps(
          `Choose up as positive. The ball starts from rest at height ${v.hDrop} m and falls freely, so <em>v</em><sub>0</sub> = 0 and it falls a distance <em>h</em> = ${v.hDrop} m.`,
          `Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>g</em><em>h</em> (speed) = 2<em>g</em><em>h</em>, so the speed is &radic;(2<em>g</em><em>h</em>) = &radic;(2 &times; 9.80 &times; ${v.hDrop}) = ${Math.abs(ans).toFixed(2)} m/s.`,
          `The ball is moving <em>downward</em>, which is the negative direction: <em>v</em><sub>1</sub> = <strong>${ans.toFixed(2)} m/s</strong>.`
        )},
      { label: "b. Rebound velocity (<em>v</em><sub>2</sub>)", unit: "m/s", solve: (v) => Math.sqrt(2 * G_ACCEL * v.hRebound), steps: (v, ans) => guidedSteps(
          `Think of the rebound as the reverse of a free fall: the ball leaves the floor with just enough upward speed to rise to ${v.hRebound} m, where its velocity is momentarily zero.`,
          `Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>g</em><em>h</em> with <em>v</em> = 0 at the top, so <em>v</em><sub>2</sub> = &radic;(2<em>g</em><em>h</em><sub>rebound</sub>) = &radic;(2 &times; 9.80 &times; ${v.hRebound}).`,
          `The ball is moving upward (positive): <em>v</em><sub>2</sub> = <strong>+${ans.toFixed(2)} m/s</strong>.`
        )},
      { label: "c. Floor contact average acceleration (<em>a</em><sub>avg</sub>)", unit: "m/s²", solve: (v) => (Math.sqrt(2 * G_ACCEL * v.hRebound) - (-Math.sqrt(2 * G_ACCEL * v.hDrop))) / v.tContact, steps: (v, ans) => {
          const v1 = -Math.sqrt(2 * G_ACCEL * v.hDrop), v2 = Math.sqrt(2 * G_ACCEL * v.hRebound);
          return guidedSteps(
            `Average acceleration is the change in velocity divided by the time: <em>a</em><sub>avg</sub> = (<em>v</em><sub>2</sub> &minus; <em>v</em><sub>1</sub>) / &Delta;<em>t</em>.`,
            `From parts a and b (up is positive): <em>v</em><sub>1</sub> = ${v1.toFixed(2)} m/s just before contact and <em>v</em><sub>2</sub> = +${v2.toFixed(2)} m/s just after.`,
            `Substitute: <em>a</em><sub>avg</sub> = (${v2.toFixed(2)} m/s &minus; (${v1.toFixed(2)} m/s)) / ${v.tContact} s = ${(v2 - v1).toFixed(2)} / ${v.tContact} = <strong>${ans.toFixed(1)} m/s²</strong>.`,
            `The result is positive (upward) and very large, because the velocity changes direction in only a hundredth of a second.`
          );
        }}
    ]
  },
  {
    id: "KIN-19", docNum: "Kin #19", title: "High-Performance Vehicle Braking Time and Distance",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "motCarBrakeKmh",
    baseVars: { decel: 7.70, speedKmh: 89.0 },
    randomize: (b) => ({ decel: rnd(b.decel, 0.20, 2), speedKmh: rnd(b.speedKmh, 0.20, 1) }),
    renderPrompt: (v) => `A high-performance vehicle brakes at <strong>${v.decel} m/s&sup2;</strong>. If its initial cruising speed is <strong>${v.speedKmh} km/h</strong>:<br/><strong>a.</strong> How long does it take to stop?<br/><strong>b.</strong> How far does it travel during braking?`,
    parts: [
      { label: "a. Stopping time (<em>t</em>)", unit: "s", solve: (v) => (v.speedKmh / 3.6) / v.decel, steps: (v, ans) => {
          const v0 = v.speedKmh / 3.6;
          return guidedSteps(
            `Convert the speed to m/s first, because the deceleration is in m/s². Divide km/h by 3.6: <em>v</em><sub>0</sub> = ${v.speedKmh} / 3.6 = ${v0.toFixed(2)} m/s.`,
            `The car stops, so the final velocity is 0: <em>v</em> = <em>v</em><sub>0</sub> &minus; <em>a</em><em>t</em> = 0, which gives <em>t</em> = <em>v</em><sub>0</sub> / <em>a</em>.`,
            `Substitute: <em>t</em> = ${v0.toFixed(2)} m/s / ${v.decel} m/s² = <strong>${ans.toFixed(2)} s</strong>.`
          );
        }},
      { label: "b. Stopping distance (&Delta;<em>x</em>)", unit: "m", solve: (v) => Math.pow(v.speedKmh / 3.6, 2) / (2 * v.decel), steps: (v, ans) => {
          const v0 = v.speedKmh / 3.6;
          return guidedSteps(
            `Use the speed in m/s: <em>v</em><sub>0</sub> = ${v.speedKmh} km/h &divide; 3.6 = ${v0.toFixed(2)} m/s. Known: <em>a</em> = ${v.decel} m/s² (slowing) and the final speed is 0.`,
            `Use the equation without time: <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>a</em>&Delta;<em>x</em> with <em>v</em> = 0, so &Delta;<em>x</em> = <em>v</em><sub>0</sub>&sup2; / (2<em>a</em>).`,
            `Substitute: &Delta;<em>x</em> = (${v0.toFixed(2)} m/s)&sup2; / (2 &times; ${v.decel} m/s²) = <strong>${ans.toFixed(2)} m</strong>.`
          );
        }}
    ]
  },
  {
    id: "KIN-20", docNum: "Kin #20", title: "Jumping Flea Takeoff Speed and Acceleration Duration",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "jumpFlea",
    baseVars: { aFlea: 1500, hMm: 20.0 },
    randomize: (b) => ({ aFlea: Math.round(rnd(b.aFlea, 0.20, 0)), hMm: rnd(b.hMm, 0.20, 1) }),
    renderPrompt: (v) => `A flea generates an explosive leg acceleration of <strong>${v.aFlea} m/s&sup2;</strong> during takeoff, allowing it to jump vertically to an apex of <strong>${v.hMm} mm</strong>.<br/><strong>a.</strong> What is the flea’s speed when leaving the ground?<br/><strong>b.</strong> How long did the takeoff acceleration phase last?`,
    parts: [
      { label: "a. Takeoff speed (<em>v</em><sub>takeoff</sub>)", unit: "m/s", solve: (v) => Math.sqrt(2 * G_ACCEL * (v.hMm / 1000)), steps: (v, ans) => guidedSteps(
          `After the flea leaves the ground, only gravity acts on it. At the top of the jump its velocity is zero, and the height is ${v.hMm} mm. Convert to meters first: <em>h</em> = ${v.hMm} mm &divide; 1000 = ${(v.hMm / 1000).toFixed(4)} m.`,
          `Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>g</em><em>h</em> with <em>v</em> = 0 at the top, so the takeoff speed is <em>v</em><sub>takeoff</sub> = &radic;(2<em>g</em><em>h</em>).`,
          `Substitute: <em>v</em><sub>takeoff</sub> = &radic;(2 &times; 9.80 &times; ${(v.hMm / 1000).toFixed(4)}) = <strong>${ans.toFixed(3)} m/s</strong>.`
        )},
      { label: "b. Takeoff acceleration duration (<em>t</em>)", unit: "s", solve: (v) => Math.sqrt(2 * G_ACCEL * (v.hMm / 1000)) / v.aFlea, steps: (v, ans) => {
          const vt = Math.sqrt(2 * G_ACCEL * (v.hMm / 1000));
          return guidedSteps(
            `During takeoff the flea speeds up from rest (0) to the takeoff speed from part a, <em>v</em><sub>takeoff</sub> = ${vt.toFixed(3)} m/s, with the constant acceleration <em>a</em> = ${v.aFlea} m/s².`,
            `Use <em>v</em> = <em>a</em><em>t</em> (starting from rest), so <em>t</em> = <em>v</em><sub>takeoff</sub> / <em>a</em>.`,
            `Substitute: <em>t</em> = ${vt.toFixed(3)} m/s / ${v.aFlea} m/s² = <strong>${ans.toExponential(3)} s</strong>, which is only a few thousandths of a second.`
          );
        }}
    ]
  },
  {
    id: "KIN-21", docNum: "Kin #21", title: "Crate Released from Descending Helicopter",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "dropHelicopter",
    baseVars: { vDescend: 5.80, hStart: 153 },
    randomize: (b) => ({ vDescend: rnd(b.vDescend, 0.20, 2), hStart: Math.round(rnd(b.hStart, 0.20, 0)) }),
    renderPrompt: (v) => `A helicopter is descending vertically at a constant speed of <strong>${v.vDescend} m/s</strong>. When it is <strong>${v.hStart} m</strong> above ground level, a crate is released.<br/><strong>a.</strong> How long does it take for the crate to reach the ground?<br/><strong>b.</strong> What is the crate’s velocity immediately before touchdown?`,
    parts: [
      { label: "a. Fall time (<em>t</em>)", unit: "s", solve: (v) => (-v.vDescend + Math.sqrt(v.vDescend * v.vDescend + 2 * G_ACCEL * v.hStart)) / G_ACCEL, steps: (v, ans) => guidedSteps(
          `Take up as positive. The crate is released <strong>while moving downward with the helicopter</strong>, so its initial velocity is <em>v</em><sub>0</sub> = &minus;${v.vDescend} m/s (not zero). It falls &Delta;<em>y</em> = &minus;${v.hStart} m with acceleration &minus;<em>g</em>.`,
          `Use &Delta;<em>y</em> = <em>v</em><sub>0</sub><em>t</em> &minus; &frac12;<em>g</em><em>t</em>&sup2;: &minus;${v.hStart} = &minus;${v.vDescend}<em>t</em> &minus; 4.90<em>t</em>&sup2;. Rearranged: 4.90<em>t</em>&sup2; + ${v.vDescend}<em>t</em> &minus; ${v.hStart} = 0.`,
          `Solve with the quadratic formula and keep the positive root: <em>t</em> = [&minus;${v.vDescend} + &radic;(${v.vDescend}&sup2; + 4(4.90)(${v.hStart}))] / (2 &times; 4.90) = <strong>${ans.toFixed(2)} s</strong>.`
        )},
      { label: "b. Landing velocity (<em>v</em>)", unit: "m/s", solve: (v) => -Math.sqrt(v.vDescend * v.vDescend + 2 * G_ACCEL * v.hStart), steps: (v, ans) => guidedSteps(
          `Known: initial velocity <em>v</em><sub>0</sub> = &minus;${v.vDescend} m/s (downward), fall height ${v.hStart} m, and acceleration &minus;<em>g</em>. Unknown: the velocity just before the crate hits the ground.`,
          `Use the equation without time: <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>g</em><em>h</em>, where <em>h</em> = ${v.hStart} m is the distance fallen.`,
          `Substitute: <em>v</em>&sup2; = (${v.vDescend})&sup2; + 2(9.80)(${v.hStart}) = ${(v.vDescend * v.vDescend + 2 * G_ACCEL * v.hStart).toFixed(2)} m²/s², so the speed is ${Math.abs(ans).toFixed(2)} m/s.`,
          `The crate is moving downward, so the velocity is <strong>${ans.toFixed(2)} m/s</strong>.`
        )}
    ]
  },
  {
    id: "KIN-22", docNum: "Kin #22", title: "Stone Dropped off Ocean Cliff with Speed of Sound Splash",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "dropCliffSound",
    baseVars: { tTotal: 4.10 },
    randomize: (b) => ({ tTotal: rnd(b.tTotal, 0.20, 2) }),
    renderPrompt: (v) => `A stone is dropped from rest off an ocean cliff. The audible splash from striking the water is heard <strong>${v.tTotal} seconds</strong> later. Given that the speed of sound in air is <strong>343 m/s</strong>, determine the height of the cliff.`,
    parts: [
      { label: "Cliff height (<em>h</em>)", unit: "m", solve: (v) => { const A = 1 / (343 * 343); const B = -((2 * v.tTotal / 343) + (2 / G_ACCEL)); const C = v.tTotal * v.tTotal; return (-B - Math.sqrt(B * B - 4 * A * C)) / (2 * A); }, steps: (v, ans) => {
          const A = 1 / (343 * 343), B = -((2 * v.tTotal / 343) + (2 / G_ACCEL)), C = v.tTotal * v.tTotal;
          const tFall = Math.sqrt(2 * ans / G_ACCEL), tSound = ans / 343;
          return guidedSteps(
            `The ${v.tTotal} s you hear includes two times: the time for the stone to fall, <em>t</em><sub>fall</sub> = &radic;(2<em>h</em> / <em>g</em>), plus the time for the sound to travel back up, <em>t</em><sub>sound</sub> = <em>h</em> / 343.`,
            `Write <em>t</em><sub>total</sub> = &radic;(2<em>h</em> / <em>g</em>) + <em>h</em> / 343. Isolate the square root, square both sides, and collect terms to get a quadratic in <em>h</em>: (1/343&sup2;)<em>h</em>&sup2; &minus; (2<em>t</em><sub>total</sub> / 343 + 2/<em>g</em>)<em>h</em> + <em>t</em><sub>total</sub>&sup2; = 0.`,
            `Put in the numbers: <em>A</em> = ${A.toExponential(3)}, <em>B</em> = ${B.toFixed(4)}, <em>C</em> = ${C.toFixed(2)}. The quadratic formula gives two roots, and the smaller one is physical (the larger one makes the fall time longer than the total time): <em>h</em> = (&minus;<em>B</em> &minus; &radic;(<em>B</em>&sup2; &minus; 4<em>A</em><em>C</em>)) / (2<em>A</em>) = <strong>${ans.toFixed(2)} m</strong>.`,
            `Check: <em>t</em><sub>fall</sub> = ${tFall.toFixed(2)} s and <em>t</em><sub>sound</sub> = ${tSound.toFixed(2)} s, which add to ${(tFall + tSound).toFixed(2)} s.`
          );
        }}
    ]
  },
  {
    id: "KIN-23", docNum: "Kin #23", title: "Red Kangaroo Vertical Leap Time and Takeoff Speed",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "jumpKangaroo",
    baseVars: { hMax: 1.42 },
    randomize: (b) => ({ hMax: rnd(b.hMax, 0.20, 2) }),
    renderPrompt: (v) => `A red kangaroo leaps vertically upward to a maximum clearance height of <strong>${v.hMax} m</strong>.<br/><strong>a.</strong> How long was the kangaroo in the air before landing back down?<br/><strong>b.</strong> What was its takeoff speed?`,
    parts: [
      { label: "a. Total airborne time (<em>t</em><sub>total</sub>)", unit: "s", solve: (v) => 2 * Math.sqrt((2 * v.hMax) / G_ACCEL), steps: (v, ans) => guidedSteps(
          `Only gravity acts once the kangaroo leaves the ground. Known: maximum clearance <em>h</em><sub>max</sub> = ${v.hMax} m. Unknown: the total time in the air. By symmetry, the time up equals the time down.`,
          `Find the fall time from the top: <em>h</em><sub>max</sub> = &frac12;<em>g</em><em>t</em>&sup2;, so <em>t</em><sub>fall</sub> = &radic;(2<em>h</em><sub>max</sub> / <em>g</em>) = &radic;(2 &times; ${v.hMax} / 9.80) = ${Math.sqrt(2 * v.hMax / G_ACCEL).toFixed(3)} s.`,
          `Double it for the trip up and the trip down: <em>t</em><sub>total</sub> = 2 &times; ${Math.sqrt(2 * v.hMax / G_ACCEL).toFixed(3)} s = <strong>${ans.toFixed(2)} s</strong>.`
        )},
      { label: "b. Takeoff speed (<em>v</em><sub>0</sub>)", unit: "m/s", solve: (v) => Math.sqrt(2 * G_ACCEL * v.hMax), steps: (v, ans) => guidedSteps(
          `At the top of the leap the vertical velocity is zero. Known: <em>h</em><sub>max</sub> = ${v.hMax} m, <em>v</em> = 0 at the top, and <em>a</em> = &minus;<em>g</em>. Unknown: the takeoff speed <em>v</em><sub>0</sub>.`,
          `Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>g</em><em>h</em><sub>max</sub> with <em>v</em> = 0, so <em>v</em><sub>0</sub> = &radic;(2<em>g</em><em>h</em><sub>max</sub>).`,
          `Substitute: <em>v</em><sub>0</sub> = &radic;(2 &times; 9.80 &times; ${v.hMax}) = <strong>${ans.toFixed(2)} m/s</strong>.`
        )}
    ]
  },
  {
    id: "KIN-24", docNum: "Kin #24", title: "Vehicle Accelerating from Rest: Distance and Final Velocity",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "motCarFromRest",
    baseVars: { accel: 3.20, timeSec: 6.00 },
    randomize: (b) => ({ accel: rnd(b.accel, 0.20, 2), timeSec: rnd(b.timeSec, 0.20, 2) }),
    renderPrompt: (v) => `A vehicle accelerates from rest with a constant acceleration of <strong>${v.accel} m/s&sup2;</strong> for <strong>${v.timeSec} seconds</strong>.<br/><strong>a.</strong> What distance does it cover during this period?<br/><strong>b.</strong> What is its final velocity?`,
    parts: [
      { label: "a. Distance covered (&Delta;<em>x</em>)", unit: "m", solve: (v) => 0.5 * v.accel * v.timeSec * v.timeSec, steps: (v, ans) => guidedSteps(
          `Known: starts from rest (<em>v</em><sub>0</sub> = 0), <em>a</em> = ${v.accel} m/s², <em>t</em> = ${v.timeSec} s. Unknown: the distance &Delta;<em>x</em>.`,
          `Use &Delta;<em>x</em> = <em>v</em><sub>0</sub><em>t</em> + &frac12;<em>a</em><em>t</em>&sup2;. Since <em>v</em><sub>0</sub> = 0, this reduces to &Delta;<em>x</em> = &frac12;<em>a</em><em>t</em>&sup2;.`,
          `Substitute: &Delta;<em>x</em> = &frac12;(${v.accel} m/s²)(${v.timeSec} s)&sup2; = <strong>${ans.toFixed(2)} m</strong>.`
        )},
      { label: "b. Final velocity (<em>v</em>)", unit: "m/s", solve: (v) => v.accel * v.timeSec, steps: (v, ans) => guidedSteps(
          `Known: starts from rest, <em>a</em> = ${v.accel} m/s², <em>t</em> = ${v.timeSec} s. Unknown: the final velocity <em>v</em>.`,
          `Use <em>v</em> = <em>v</em><sub>0</sub> + <em>a</em><em>t</em>. With <em>v</em><sub>0</sub> = 0, <em>v</em> = <em>a</em><em>t</em>.`,
          `Substitute: <em>v</em> = (${v.accel} m/s²)(${v.timeSec} s) = <strong>${ans.toFixed(2)} m/s</strong>.`
        )}
    ]
  },
  {
    id: "KIN-25", docNum: "Kin #25", title: "Steel Sphere Dropped from Skyscraper Observation Deck",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "dropSkyscraper",
    baseVars: { timeSec: 4.50 },
    randomize: (b) => ({ timeSec: rnd(b.timeSec, 0.20, 2) }),
    renderPrompt: (v) => `A steel sphere is dropped from rest from the observation deck of a skyscraper and strikes the ground <strong>${v.timeSec} s</strong> later.<br/><strong>a.</strong> How tall is the observation deck?<br/><strong>b.</strong> With what speed does the sphere hit the pavement?`,
    parts: [
      { label: "a. Deck height (<em>y</em>)", unit: "m", solve: (v) => 0.5 * G_ACCEL * v.timeSec * v.timeSec, steps: (v, ans) => guidedSteps(
          `Take down as positive. The sphere is <em>dropped</em>, so <em>v</em><sub>0</sub> = 0, <em>a</em> = <em>g</em> = 9.80 m/s², and it falls for <em>t</em> = ${v.timeSec} s. The distance fallen equals the deck height.`,
          `Use <em>y</em> = <em>v</em><sub>0</sub><em>t</em> + &frac12;<em>g</em><em>t</em>&sup2;, which reduces to <em>y</em> = &frac12;<em>g</em><em>t</em>&sup2;.`,
          `Substitute: <em>y</em> = &frac12;(9.80)(${v.timeSec})&sup2; = <strong>${ans.toFixed(2)} m</strong>.`
        )},
      { label: "b. Impact speed (<em>v</em>)", unit: "m/s", solve: (v) => G_ACCEL * v.timeSec, steps: (v, ans) => guidedSteps(
          `Same motion as part a: dropped from rest, <em>a</em> = <em>g</em>, <em>t</em> = ${v.timeSec} s. Unknown: the speed at impact.`,
          `Use <em>v</em> = <em>v</em><sub>0</sub> + <em>g</em><em>t</em>, with <em>v</em><sub>0</sub> = 0, so <em>v</em> = <em>g</em><em>t</em>.`,
          `Substitute: <em>v</em> = (9.80 m/s²)(${v.timeSec} s) = <strong>${ans.toFixed(2)} m/s</strong>.`,
          `Check with energy-free kinematics: <em>v</em> = &radic;(2<em>g</em><em>y</em>) = &radic;(2 &times; 9.80 &times; ${(0.5 * G_ACCEL * v.timeSec * v.timeSec).toFixed(2)}) = ${ans.toFixed(2)} m/s, which agrees.`
        )}
    ]
  },
  {
    id: "KIN-26", docNum: "Kin #26", title: "Commuter Train Service Braking Distance",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "motTrainBrake",
    baseVars: { vInit: 30.0, decel: 1.50 },
    randomize: (b) => ({ vInit: rnd(b.vInit, 0.20, 1), decel: rnd(b.decel, 0.20, 2) }),
    renderPrompt: (v) => `A commuter train cruising at an initial speed of <strong>${v.vInit} m/s</strong> applies service brakes, producing a constant deceleration of <strong>${v.decel} m/s&sup2;</strong>. How far does the train travel before coming to a stop?`,
    parts: [
      { label: "Stopping distance (&Delta;<em>x</em>)", unit: "m", solve: (v) => (v.vInit * v.vInit) / (2 * v.decel), steps: (v, ans) => guidedSteps(
          `Known: initial speed <em>v</em><sub>0</sub> = ${v.vInit} m/s, final speed <em>v</em> = 0 (stops), and a deceleration of ${v.decel} m/s², so <em>a</em> = &minus;${v.decel} m/s² if forward is positive. No time is given.`,
          `Use the equation without time: <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>a</em>&Delta;<em>x</em>. With <em>v</em> = 0, &Delta;<em>x</em> = &minus;<em>v</em><sub>0</sub>&sup2; / (2<em>a</em>) = <em>v</em><sub>0</sub>&sup2; / (2 &times; ${v.decel}).`,
          `Substitute: &Delta;<em>x</em> = (${v.vInit} m/s)&sup2; / (2 &times; ${v.decel} m/s²) = <strong>${ans.toFixed(1)} m</strong>.`
        )}
    ]
  },
  {
    id: "KIN-27", docNum: "Kin #27", title: "Stone Thrown Upward from Edge of Sheer Cliff",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "throwFromCliff",
    baseVars: { v0: 18.0, hCliff: 25.0 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), hCliff: rnd(b.hCliff, 0.20, 1) }),
    renderPrompt: (v) => `A stone is thrown vertically upward with an initial velocity of <strong>${v.v0} m/s</strong> from the edge of a sheer cliff <strong>${v.hCliff} m</strong> high.<br/><strong>a.</strong> What is the maximum height reached by the stone above the base of the cliff?<br/><strong>b.</strong> How long does it take for the stone to hit the canyon floor below?`,
    parts: [
      { label: "a. Max height above cliff base (<em>H</em><sub>max</sub>)", unit: "m", solve: (v) => v.hCliff + (v.v0 * v.v0) / (2 * G_ACCEL), steps: (v, ans) => guidedSteps(
          `The stone rises until its velocity is zero. Known: <em>v</em><sub>0</sub> = ${v.v0} m/s upward, <em>a</em> = &minus;<em>g</em>. First find how far it rises above the cliff edge.`,
          `Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>g</em>&Delta;<em>y</em> with <em>v</em> = 0: &Delta;<em>y</em> = <em>v</em><sub>0</sub>&sup2; / (2<em>g</em>) = (${v.v0})&sup2; / 19.6 = ${((v.v0 * v.v0) / (2 * G_ACCEL)).toFixed(2)} m.`,
          `The question asks for height above the <em>base</em> of the cliff, so add the cliff height: <em>H</em><sub>max</sub> = ${v.hCliff} m + ${((v.v0 * v.v0) / (2 * G_ACCEL)).toFixed(2)} m = <strong>${ans.toFixed(2)} m</strong>.`
        )},
      { label: "b. Total flight time (<em>t</em>)", unit: "s", solve: (v) => (v.v0 + Math.sqrt(v.v0 * v.v0 + 2 * G_ACCEL * v.hCliff)) / G_ACCEL, steps: (v, ans) => guidedSteps(
          `Take up as positive with the origin at the cliff edge. The stone ends ${v.hCliff} m <em>below</em> the start, so &Delta;<em>y</em> = &minus;${v.hCliff} m, with <em>v</em><sub>0</sub> = +${v.v0} m/s and <em>a</em> = &minus;9.80 m/s².`,
          `Use &Delta;<em>y</em> = <em>v</em><sub>0</sub><em>t</em> &minus; &frac12;<em>g</em><em>t</em>&sup2;: &minus;${v.hCliff} = ${v.v0}<em>t</em> &minus; 4.90<em>t</em>&sup2;, or 4.90<em>t</em>&sup2; &minus; ${v.v0}<em>t</em> &minus; ${v.hCliff} = 0.`,
          `Quadratic formula, keeping the positive root: <em>t</em> = [${v.v0} + &radic;(${v.v0}&sup2; + 4(4.90)(${v.hCliff}))] / (2 &times; 4.90) = <strong>${ans.toFixed(2)} s</strong>.`,
          `The negative root is a time before the throw, so it is rejected.`
        )}
    ]
  },

  // --- UNIT 1: 2D KINEMATICS AND PROJECTILE MOTION (CED 1.5) ---
  {
    id: "PROJ-01", docNum: "Proj #1", title: "Rock Thrown Horizontally from a Bridge (4 Parts)",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projBridge",
    baseVars: { v0: 12.0, tFall: 2.28 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), tFall: rnd(b.tFall, 0.20, 2) }),
    renderPrompt: (v) => `Paula throws a rock horizontally with a speed of <strong>${v.v0} m/s</strong> from a bridge, and it falls for <strong>${v.tFall} seconds</strong> before reaching the water below.<br/><strong>a.</strong> How high is the bridge from the water below?<br/><strong>b.</strong> How far horizontally does the rock travel before striking the water?<br/><strong>c.</strong> What is the rock’s speed as it reaches the water?<br/><strong>d.</strong> What is the rock’s direction just before hitting the water?`,
    parts: [
      { label: "a. Bridge height (<em>h</em>)", unit: "m", solve: (v) => 0.5 * G_ACCEL * v.tFall * v.tFall, steps: (v, ans) => guidedSteps(
          `Split the motion into horizontal and vertical parts. The rock is thrown horizontally, so its initial <em>vertical</em> velocity is zero. Known: <em>t</em> = ${v.tFall} s, <em>v</em><sub>0y</sub> = 0, <em>a</em><sub>y</sub> = 9.80 m/s² (down). Unknown: the height <em>h</em>.`,
          `Use the vertical equation <em>h</em> = <em>v</em><sub>0y</sub><em>t</em> + &frac12;<em>g</em><em>t</em>&sup2;, which reduces to <em>h</em> = &frac12;<em>g</em><em>t</em>&sup2;.`,
          `Substitute: <em>h</em> = &frac12;(9.80)(${v.tFall})&sup2; = <strong>${ans.toFixed(2)} m</strong>.`
        )},
      { label: "b. Horizontal distance (&Delta;<em>x</em>)", unit: "m", solve: (v) => v.v0 * v.tFall, steps: (v, ans) => guidedSteps(
          `Horizontally there is no acceleration, so the horizontal velocity stays constant at <em>v</em><sub>x</sub> = ${v.v0} m/s. The time in the air (${v.tFall} s) is the same for both directions.`,
          `Use &Delta;<em>x</em> = <em>v</em><sub>x</sub><em>t</em>.`,
          `Substitute: &Delta;<em>x</em> = (${v.v0} m/s)(${v.tFall} s) = <strong>${ans.toFixed(2)} m</strong>.`
        )},
      { label: "c. Impact speed (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(v.v0 * v.v0 + Math.pow(G_ACCEL * v.tFall, 2)), steps: (v, ans) => guidedSteps(
          `The speed at the water combines both velocity components. Horizontal: <em>v</em><sub>x</sub> = ${v.v0} m/s (unchanged).`,
          `Vertical: <em>v</em><sub>y</sub> = <em>v</em><sub>0y</sub> &minus; <em>g</em><em>t</em> = 0 &minus; (9.80)(${v.tFall}) = &minus;${(G_ACCEL * v.tFall).toFixed(2)} m/s (downward).`,
          `Combine with the Pythagorean theorem: <em>v</em> = &radic;(<em>v</em><sub>x</sub>&sup2; + <em>v</em><sub>y</sub>&sup2;) = &radic;(${v.v0}&sup2; + ${(G_ACCEL * v.tFall).toFixed(2)}&sup2;) = <strong>${ans.toFixed(2)} m/s</strong>.`
        )},
      { label: "d. Impact direction (&theta;)", unit: "°", directionOptions: ["above the horizontal", "below the horizontal"], expectedDirection: "below the horizontal", solve: (v) => Math.atan((G_ACCEL * v.tFall) / v.v0) * RAD2DEG, steps: (v, ans) => guidedSteps(
          `The direction comes from the two velocity components just before impact: <em>v</em><sub>x</sub> = ${v.v0} m/s and |<em>v</em><sub>y</sub>| = <em>g</em><em>t</em> = ${(G_ACCEL * v.tFall).toFixed(2)} m/s (downward).`,
          `Use the tangent of the angle below the horizontal: tan &theta; = |<em>v</em><sub>y</sub>| / <em>v</em><sub>x</sub> = ${(G_ACCEL * v.tFall).toFixed(2)} / ${v.v0}.`,
          `&theta; = arctan(${((G_ACCEL * v.tFall) / v.v0).toFixed(3)}) = <strong>${ans.toFixed(1)}&deg; below the horizontal</strong>, because the rock is moving downward and to the right.`
        )}
    ]
  },
  {
    id: "PROJ-02", docNum: "Proj #2", title: "Marble Rolling Off Tabletop Speed",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projTableSpeed",
    baseVars: { v0: 2.0, tFall: 0.30 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 2), tFall: rnd(b.tFall, 0.20, 2) }),
    renderPrompt: (v) => `A marble rolls off the edge of a tabletop with a horizontal speed of <strong>${v.v0} m/s</strong>. What is its speed <strong>${v.tFall} s</strong> later?`,
    parts: [
      { label: "Speed after elapsed time (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(v.v0 * v.v0 + Math.pow(G_ACCEL * v.tFall, 2)), steps: (v, ans) => guidedSteps(
          `The marble leaves the table moving only horizontally, so its horizontal velocity stays <em>v</em><sub>x</sub> = ${v.v0} m/s, while gravity builds up a downward vertical velocity.`,
          `After ${v.tFall} s the vertical velocity is <em>v</em><sub>y</sub> = <em>g</em><em>t</em> = (9.80)(${v.tFall}) = ${(G_ACCEL * v.tFall).toFixed(2)} m/s downward.`,
          `The speed is the magnitude of the combined velocity: <em>v</em> = &radic;(<em>v</em><sub>x</sub>&sup2; + <em>v</em><sub>y</sub>&sup2;) = &radic;(${v.v0}&sup2; + ${(G_ACCEL * v.tFall).toFixed(2)}&sup2;) = <strong>${ans.toFixed(2)} m/s</strong>.`
        )}
    ]
  },
  {
    id: "PROJ-03", docNum: "Proj #3", title: "Baseball Home Run Hit at an Angle from Initial Height",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projBaseball",
    baseVars: { theta: 29.0, y0Cm: 96.0, v0: 48.0 },
    randomize: (b) => ({ theta: rnd(b.theta, 0.18, 1), y0Cm: rnd(b.y0Cm, 0.18, 1), v0: rnd(b.v0, 0.18, 1) }),
    renderPrompt: (v) => `A baseball player hits a home run which leaves the bat at an angle of <strong>${v.theta}&deg;</strong> above the horizontal, a height of <strong>${v.y0Cm} cm</strong> above the ground, and an initial launch speed of <strong>${v.v0} m/s</strong>.<br/><strong>a.</strong> How high above the ground was the ball at its highest point?<br/><strong>b.</strong> How far did the ball land from where it was hit (horizontal distance along ground)?`,
    parts: [
      { label: "a. Maximum height above ground (<em>H</em><sub>max</sub>)", unit: "m", solve: (v) => (v.y0Cm / 100) + Math.pow(v.v0 * Math.sin(v.theta * DEG2RAD), 2) / (2 * G_ACCEL), steps: (v, ans) => {
          const vy0 = v.v0 * Math.sin(v.theta * DEG2RAD);
          const rise = vy0 * vy0 / (2 * G_ACCEL);
          return guidedSteps(
            `Only the vertical motion matters for height. Find the initial vertical velocity: <em>v</em><sub>0y</sub> = <em>v</em><sub>0</sub> sin &theta; = ${v.v0} sin(${v.theta}&deg;) = ${vy0.toFixed(2)} m/s.`,
            `At the highest point the vertical velocity is zero, so the rise above the bat is <em>v</em><sub>0y</sub>&sup2; / (2<em>g</em>) = (${vy0.toFixed(2)})&sup2; / 19.6 = ${rise.toFixed(2)} m.`,
            `The ball started ${(v.y0Cm / 100).toFixed(2)} m above the ground (${v.y0Cm} cm), so <em>H</em><sub>max</sub> = ${(v.y0Cm / 100).toFixed(2)} m + ${rise.toFixed(2)} m = <strong>${ans.toFixed(2)} m</strong>.`
          );
        }},
      { label: "b. Horizontal distance landed (&Delta;<em>x</em>)", unit: "m", solve: (v) => { const rad = v.theta * DEG2RAD; const vx = v.v0 * Math.cos(rad); const vy0 = v.v0 * Math.sin(rad); const y0 = v.y0Cm / 100; const tFlight = (vy0 + Math.sqrt(vy0 * vy0 + 2 * G_ACCEL * y0)) / G_ACCEL; return vx * tFlight; }, steps: (v, ans) => {
          const rad = v.theta * DEG2RAD;
          const vx = v.v0 * Math.cos(rad), vy0 = v.v0 * Math.sin(rad), y0 = v.y0Cm / 100;
          const tf = (vy0 + Math.sqrt(vy0 * vy0 + 2 * G_ACCEL * y0)) / G_ACCEL;
          return guidedSteps(
            `Components: <em>v</em><sub>0x</sub> = ${v.v0} cos(${v.theta}&deg;) = ${vx.toFixed(2)} m/s and <em>v</em><sub>0y</sub> = ${v.v0} sin(${v.theta}&deg;) = ${vy0.toFixed(2)} m/s. Starting height <em>y</em><sub>0</sub> = ${y0.toFixed(2)} m.`,
            `Find the flight time from the vertical motion. The ball ends at the ground, so &Delta;<em>y</em> = &minus;${y0.toFixed(2)} m: &minus;${y0.toFixed(2)} = ${vy0.toFixed(2)}<em>t</em> &minus; 4.90<em>t</em>&sup2;.`,
            `Quadratic formula, positive root: <em>t</em> = [${vy0.toFixed(2)} + &radic;(${vy0.toFixed(2)}&sup2; + 2(9.80)(${y0.toFixed(2)}))] / 9.80 = ${tf.toFixed(2)} s.`,
            `The horizontal velocity is constant, so &Delta;<em>x</em> = <em>v</em><sub>0x</sub><em>t</em> = (${vx.toFixed(2)})(${tf.toFixed(2)}) = <strong>${ans.toFixed(2)} m</strong>.`
          );
        }}
    ]
  },
  {
    id: "PROJ-04", docNum: "Proj #4", title: "Rock Thrown Horizontally from Cliff: Time for Speed to Multiply",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projCliffDouble",
    baseVars: { v0: 12.6, multWord: "double", multFactor: 2 },
    randomize: (b) => {
      const opts = [{ word: "double", factor: 2 }, { word: "triple", factor: 3 }, { word: "quadruple", factor: 4 }];
      const pick = opts[Math.floor(Math.random() * opts.length)];
      return { v0: rnd(b.v0, 0.20, 1), multWord: pick.word, multFactor: pick.factor };
    },
    renderPrompt: (v) => `A rock is thrown horizontally off of a cliff with a speed of <strong>${v.v0} m/s</strong>. How long would it take for the rock’s speed to <strong>${v.multWord}</strong>?`,
    parts: [
      { label: "Time for speed to multiply (<em>t</em>)", unit: "s", solve: (v) => (v.v0 * Math.sqrt(v.multFactor * v.multFactor - 1)) / G_ACCEL, steps: (v, ans) => guidedSteps(
          `The horizontal velocity stays <em>v</em><sub>0</sub> = ${v.v0} m/s. The vertical velocity grows as <em>v</em><sub>y</sub> = <em>g</em><em>t</em>. The speed is <em>v</em> = &radic;(<em>v</em><sub>0</sub>&sup2; + (<em>g</em><em>t</em>)&sup2;).`,
          `We want the speed to ${v.multWord}, so <em>v</em> = ${v.multFactor}<em>v</em><sub>0</sub>. Square both sides: <em>v</em><sub>0</sub>&sup2; + (<em>g</em><em>t</em>)&sup2; = ${v.multFactor * v.multFactor}<em>v</em><sub>0</sub>&sup2;, so (<em>g</em><em>t</em>)&sup2; = ${v.multFactor * v.multFactor - 1}<em>v</em><sub>0</sub>&sup2;.`,
          `Take the square root and solve for time: <em>t</em> = <em>v</em><sub>0</sub>&radic;${v.multFactor * v.multFactor - 1} / <em>g</em> = (${v.v0})(${Math.sqrt(v.multFactor * v.multFactor - 1).toFixed(3)}) / 9.80 = <strong>${ans.toFixed(2)} s</strong>.`
        )}
    ]
  },
  {
    id: "PROJ-05", docNum: "Proj #5", title: "Cannonball Fired at Elevated Target (3 Parts)",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projCannonElevated",
    baseVars: { v0: 93.0, theta: 44.0, hTarget: 75.0 },
    randomize: (b) => {
      const v0 = rnd(b.v0, 0.15, 1);
      const theta = rnd(b.theta, 0.12, 1);
      const maxH = Math.pow(v0 * Math.sin(theta * DEG2RAD), 2) / (2 * G_ACCEL);
      const hTarget = Number(Math.min(rnd(b.hTarget, 0.15, 1), maxH * 0.75).toFixed(1));
      return { v0, theta, hTarget };
    },
    renderPrompt: (v) => `A cannonball is fired from ground level with a velocity of <strong>${v.v0} m/s</strong> at an angle of <strong>${v.theta}&deg;</strong> above the horizontal, and it hits its target as it descends at an elevation of <strong>${v.hTarget} meters</strong> higher than the ground below.<br/><strong>a.</strong> How long does it take the cannonball to hit its target?<br/><strong>b.</strong> What is the cannonball’s speed when it hits its target?<br/><strong>c.</strong> What is the direction of the cannonball’s velocity when it hits its target?`,
    parts: [
      { label: "a. Flight time to target (<em>t</em>)", unit: "s", solve: (v) => { const vy0 = v.v0 * Math.sin(v.theta * DEG2RAD); return (vy0 + Math.sqrt(vy0 * vy0 - 2 * G_ACCEL * v.hTarget)) / G_ACCEL; }, steps: (v, ans) => {
          const vy0 = v.v0 * Math.sin(v.theta * DEG2RAD);
          const disc = vy0 * vy0 - 2 * G_ACCEL * v.hTarget;
          const tUp = (vy0 - Math.sqrt(disc)) / G_ACCEL;
          return guidedSteps(
            `Use only the vertical motion. <em>v</em><sub>0y</sub> = ${v.v0} sin(${v.theta}&deg;) = ${vy0.toFixed(2)} m/s, and the target is ${v.hTarget} m above the launch point, so &Delta;<em>y</em> = +${v.hTarget} m.`,
            `Set up &Delta;<em>y</em> = <em>v</em><sub>0y</sub><em>t</em> &minus; &frac12;<em>g</em><em>t</em>&sup2;: 4.90<em>t</em>&sup2; &minus; ${vy0.toFixed(2)}<em>t</em> + ${v.hTarget} = 0.`,
            `The quadratic gives two times. The smaller one, ${tUp.toFixed(2)} s, is when the ball passes that height on the way <em>up</em>. The problem says the ball hits the target as it <em>descends</em>, so take the larger root.`,
            `<em>t</em> = [${vy0.toFixed(2)} + &radic;(${vy0.toFixed(2)}&sup2; &minus; 4(4.90)(${v.hTarget}))] / (2 &times; 4.90) = <strong>${ans.toFixed(2)} s</strong>.`
          );
        }},
      { label: "b. Impact speed (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(v.v0 * v.v0 - 2 * G_ACCEL * v.hTarget), steps: (v, ans) => guidedSteps(
          `The speed at a given height depends only on the height change, since gravity does the same work whatever path is taken. Known: launch speed ${v.v0} m/s, target ${v.hTarget} m higher.`,
          `Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>g</em>&Delta;<em>y</em> for the total speed (this works for the combined motion because the horizontal part does not change).`,
          `Substitute: <em>v</em> = &radic;(${v.v0}&sup2; &minus; 2 &times; 9.80 &times; ${v.hTarget}) = &radic;(${(v.v0 * v.v0 - 2 * G_ACCEL * v.hTarget).toFixed(1)}) = <strong>${ans.toFixed(2)} m/s</strong>.`
        )},
      { label: "c. Direction at impact (&theta;)", unit: "°", directionOptions: ["above the horizontal", "below the horizontal"], expectedDirection: "below the horizontal", solve: (v) => { const rad = v.theta * DEG2RAD; const vx = v.v0 * Math.cos(rad); const vy0 = v.v0 * Math.sin(rad); const vy = Math.sqrt(vy0 * vy0 - 2 * G_ACCEL * v.hTarget); return Math.atan(vy / vx) * RAD2DEG; }, steps: (v, ans) => {
          const rad = v.theta * DEG2RAD;
          const vx = v.v0 * Math.cos(rad);
          const vy = Math.sqrt(Math.pow(v.v0 * Math.sin(rad), 2) - 2 * G_ACCEL * v.hTarget);
          return guidedSteps(
            `Horizontal velocity never changes: <em>v</em><sub>x</sub> = ${v.v0} cos(${v.theta}&deg;) = ${vx.toFixed(2)} m/s.`,
            `Vertical speed at the target: |<em>v</em><sub>y</sub>| = &radic;(<em>v</em><sub>0y</sub>&sup2; &minus; 2<em>g</em><em>h</em>) = ${vy.toFixed(2)} m/s. The ball is descending, so <em>v</em><sub>y</sub> points downward.`,
            `tan &theta; = |<em>v</em><sub>y</sub>| / <em>v</em><sub>x</sub> = ${vy.toFixed(2)} / ${vx.toFixed(2)}, so &theta; = <strong>${ans.toFixed(1)}&deg; below the horizontal</strong>.`
          );
        }}
    ]
  },
  {
    id: "PROJ-06", docNum: "Proj #6", title: "Table Height from Horizontal Roll Speed and Range",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projTableHeight",
    baseVars: { v0: 5.9, distX: 2.2 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 2), distX: rnd(b.distX, 0.20, 2) }),
    renderPrompt: (v) => `A ball rolls off the edge of a table with a horizontal speed of <strong>${v.v0} m/s</strong>, and the ball lands <strong>${v.distX} meters</strong> from the bottom base of the table. How tall is the table?`,
    parts: [
      { label: "Table height (<em>h</em>)", unit: "m", solve: (v) => 0.5 * G_ACCEL * Math.pow(v.distX / v.v0, 2), steps: (v, ans) => guidedSteps(
          `The ball leaves the table horizontally, so it has no initial vertical velocity. Horizontally it moves at constant speed <em>v</em><sub>0</sub> = ${v.v0} m/s for ${v.distX} m, which sets the time in the air.`,
          `<em>t</em> = &Delta;<em>x</em> / <em>v</em><sub>0</sub> = ${v.distX} / ${v.v0} = ${(v.distX / v.v0).toFixed(3)} s.`,
          `That is also the time to fall the table height: <em>h</em> = &frac12;<em>g</em><em>t</em>&sup2; = &frac12;(9.80)(${(v.distX / v.v0).toFixed(3)})&sup2; = <strong>${ans.toFixed(2)} m</strong>.`
        )}
    ]
  },
  {
    id: "PROJ-07", docNum: "Proj #7", title: "Pelican Dropping Fish Horizontal Speed",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projPelican",
    baseVars: { hDrop: 8.40, distX: 9.10 },
    randomize: (b) => ({ hDrop: rnd(b.hDrop, 0.20, 2), distX: rnd(b.distX, 0.20, 2) }),
    renderPrompt: (v) => `A pelican flying along a horizontal path drops a fish from a height of <strong>${v.hDrop} meters</strong>. The fish travels <strong>${v.distX} meters</strong> horizontally before it hits the water below. What is the pelican’s speed?`,
    parts: [
      { label: "Pelican speed (<em>v</em><sub>0</sub>)", unit: "m/s", solve: (v) => v.distX / Math.sqrt((2 * v.hDrop) / G_ACCEL), steps: (v, ans) => {
          const t = Math.sqrt((2 * v.hDrop) / G_ACCEL);
          return guidedSteps(
            `When the fish is released it shares the pelican's horizontal speed and has no vertical velocity. The fish's horizontal speed therefore equals the pelican's speed <em>v</em><sub>0</sub>. Known: drop height ${v.hDrop} m and horizontal distance ${v.distX} m.`,
            `Find the fall time from the vertical motion: <em>h</em> = &frac12;<em>g</em><em>t</em>&sup2;, so <em>t</em> = &radic;(2<em>h</em> / <em>g</em>) = &radic;(2 &times; ${v.hDrop} / 9.80) = ${t.toFixed(2)} s.`,
            `Horizontally the speed is constant: <em>v</em><sub>0</sub> = &Delta;<em>x</em> / <em>t</em> = ${v.distX} m / ${t.toFixed(2)} s = <strong>${ans.toFixed(2)} m/s</strong>.`
          );
        }}
    ]
  },
  {
    id: "PROJ-08", docNum: "Proj #8", title: "Soccer Ball Kicked at an Angle from Ground Level (4 Parts)",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projSoccer",
    baseVars: { v0: 19.0, theta: 28.0, tCheck: 1.50 },
    randomize: (b) => {
      const v0 = rnd(b.v0, 0.18, 1);
      const theta = rnd(b.theta, 0.15, 1);
      const tFlight = (2 * v0 * Math.sin(theta * DEG2RAD)) / G_ACCEL;
      const tCheck = Number((tFlight * 0.78).toFixed(2));
      return { v0, theta, tCheck };
    },
    renderPrompt: (v) => `A soccer ball is kicked from ground level with an initial speed of <strong>${v.v0} m/s</strong> at an angle of <strong>${v.theta}&deg;</strong> above the ground.<br/><strong>a.</strong> How high is the soccer ball at its highest point?<br/><strong>b.</strong> For how long is the soccer ball in the air?<br/><strong>c.</strong> What is the soccer ball’s horizontal range?<br/><strong>d.</strong> What is the soccer ball’s speed after <strong>${v.tCheck} seconds</strong>?`,
    parts: [
      { label: "a. Maximum apex height (<em>h</em><sub>max</sub>)", unit: "m", solve: (v) => Math.pow(v.v0 * Math.sin(v.theta * DEG2RAD), 2) / (2 * G_ACCEL), steps: (v, ans) => {
          const vy0 = v.v0 * Math.sin(v.theta * DEG2RAD);
          return guidedSteps(
            `Break the launch velocity into components. Vertical: <em>v</em><sub>0y</sub> = <em>v</em><sub>0</sub> sin &theta; = ${v.v0} sin(${v.theta}&deg;) = ${vy0.toFixed(2)} m/s.`,
            `At the top the vertical velocity is zero, so use <em>v</em>&sup2; = <em>v</em><sub>0y</sub>&sup2; &minus; 2<em>g</em><em>h</em> with <em>v</em> = 0: <em>h</em><sub>max</sub> = <em>v</em><sub>0y</sub>&sup2; / (2<em>g</em>).`,
            `Substitute: <em>h</em><sub>max</sub> = (${vy0.toFixed(2)})&sup2; / (2 &times; 9.80) = <strong>${ans.toFixed(2)} m</strong>.`
          );
        }},
      { label: "b. Total airborne time (<em>t</em><sub>flight</sub>)", unit: "s", solve: (v) => (2 * v.v0 * Math.sin(v.theta * DEG2RAD)) / G_ACCEL, steps: (v, ans) => {
          const vy0 = v.v0 * Math.sin(v.theta * DEG2RAD);
          return guidedSteps(
            `The ball starts and ends at ground level, so the net vertical displacement is zero. First, <em>v</em><sub>0y</sub> = ${v.v0} sin(${v.theta}&deg;) = ${vy0.toFixed(2)} m/s.`,
            `Set &Delta;<em>y</em> = <em>v</em><sub>0y</sub><em>t</em> &minus; &frac12;<em>g</em><em>t</em>&sup2; = 0. The non-zero solution is <em>t</em> = 2<em>v</em><sub>0y</sub> / <em>g</em> (time up equals time down).`,
            `Substitute: <em>t</em> = 2(${vy0.toFixed(2)}) / 9.80 = <strong>${ans.toFixed(2)} s</strong>.`
          );
        }},
      { label: "c. Horizontal range (<em>R</em>)", unit: "m", solve: (v) => (v.v0 * v.v0 * Math.sin(2 * v.theta * DEG2RAD)) / G_ACCEL, steps: (v, ans) => {
          const vx = v.v0 * Math.cos(v.theta * DEG2RAD);
          const tf = (2 * v.v0 * Math.sin(v.theta * DEG2RAD)) / G_ACCEL;
          return guidedSteps(
            `The horizontal velocity is constant: <em>v</em><sub>0x</sub> = ${v.v0} cos(${v.theta}&deg;) = ${vx.toFixed(2)} m/s.`,
            `The ball is in the air for <em>t</em><sub>flight</sub> = ${tf.toFixed(2)} s (from part b), so the range is <em>R</em> = <em>v</em><sub>0x</sub><em>t</em><sub>flight</sub>.`,
            `Substitute: <em>R</em> = (${vx.toFixed(2)})(${tf.toFixed(2)}) = <strong>${ans.toFixed(2)} m</strong>. (Equivalently, <em>R</em> = <em>v</em><sub>0</sub>&sup2; sin 2&theta; / <em>g</em>.)`
          );
        }},
      { label: "d. Speed at specified time (<em>v</em>)", unit: "m/s", solve: (v) => { const rad = v.theta * DEG2RAD; const vx = v.v0 * Math.cos(rad); const vy = v.v0 * Math.sin(rad) - G_ACCEL * v.tCheck; return Math.sqrt(vx * vx + vy * vy); }, steps: (v, ans) => {
          const rad = v.theta * DEG2RAD;
          const vx = v.v0 * Math.cos(rad), vy = v.v0 * Math.sin(rad) - G_ACCEL * v.tCheck;
          return guidedSteps(
            `Find both velocity components at <em>t</em> = ${v.tCheck} s. Horizontal (unchanged): <em>v</em><sub>x</sub> = ${vx.toFixed(2)} m/s.`,
            `Vertical: <em>v</em><sub>y</sub> = <em>v</em><sub>0y</sub> &minus; <em>g</em><em>t</em> = ${(v.v0 * Math.sin(rad)).toFixed(2)} &minus; (9.80)(${v.tCheck}) = ${vy.toFixed(2)} m/s. ${vy >= 0 ? 'It is still positive, so the ball is still rising.' : 'It is negative, so the ball is already descending.'}`,
            `Combine: <em>v</em> = &radic;(<em>v</em><sub>x</sub>&sup2; + <em>v</em><sub>y</sub>&sup2;) = &radic;(${vx.toFixed(2)}&sup2; + (${vy.toFixed(2)})&sup2;) = <strong>${ans.toFixed(2)} m/s</strong>.`
          );
        }}
    ]
  },
  {
    id: "PROJ-09", docNum: "Proj #9", title: "Marble Rolling Off a Table: Flight Time and Range",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projTableTime",
    baseVars: { v0: 1.48, hCm: 125 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 2), hCm: Math.round(rnd(b.hCm, 0.20, 0)) }),
    renderPrompt: (v) => `A marble moving at <strong>${v.v0} m/s</strong> rolls horizontally off the top edge of a <strong>${v.hCm} cm</strong> high table.<br/><strong>a.</strong> How long was the marble in flight?<br/><strong>b.</strong> How far from the base of the table did it strike the floor?`,
    parts: [
      { label: "a. Flight time (<em>t</em>)", unit: "s", solve: (v) => Math.sqrt((2 * (v.hCm / 100)) / G_ACCEL), steps: (v, ans) => guidedSteps(
          `The marble leaves the table horizontally, so its initial vertical velocity is 0. Convert the height to meters: <em>h</em> = ${v.hCm} cm = ${v.hCm / 100} m.`,
          `Only vertical motion decides the flight time: <em>h</em> = &frac12;<em>g</em><em>t</em>&sup2;, so <em>t</em> = &radic;(2<em>h</em> / <em>g</em>).`,
          `Substitute: <em>t</em> = &radic;(2 &times; ${v.hCm / 100} / 9.80) = <strong>${ans.toFixed(2)} s</strong>.`
        )},
      { label: "b. Horizontal distance (&Delta;<em>x</em>)", unit: "m", solve: (v) => v.v0 * Math.sqrt((2 * (v.hCm / 100)) / G_ACCEL), steps: (v, ans) => {
          const t = Math.sqrt((2 * (v.hCm / 100)) / G_ACCEL);
          return guidedSteps(
            `Horizontally the marble moves at a constant ${v.v0} m/s for the entire flight time found in part a, <em>t</em> = ${t.toFixed(2)} s.`,
            `Use &Delta;<em>x</em> = <em>v</em><sub>0</sub><em>t</em>.`,
            `Substitute: &Delta;<em>x</em> = (${v.v0} m/s)(${t.toFixed(2)} s) = <strong>${ans.toFixed(2)} m</strong>.`
          );
        }}
    ]
  },
  {
    id: "PROJ-10", docNum: "Proj #10", title: "Cliff Diver Minimum Horizontal Speed to Clear Rocks",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projCliffDiver",
    baseVars: { hCliff: 13.2, distRocks: 6.4 },
    randomize: (b) => ({ hCliff: rnd(b.hCliff, 0.20, 1), distRocks: rnd(b.distRocks, 0.20, 1) }),
    renderPrompt: (v) => `A cliff diver runs horizontally off a cliff with an initial height of <strong>${v.hCliff} meters</strong> and wants to clear rocks below. If the rocks extend <strong>${v.distRocks} meters</strong> past the cliff’s edge, what minimum initial horizontal speed must he have to safely clear the rocks below?`,
    parts: [
      { label: "Minimum initial speed (<em>v</em><sub>x,min</sub>)", unit: "m/s", solve: (v) => v.distRocks / Math.sqrt((2 * v.hCliff) / G_ACCEL), steps: (v, ans) => {
          const t = Math.sqrt((2 * v.hCliff) / G_ACCEL);
          return guidedSteps(
            `To clear the rocks, the diver must travel at least ${v.distRocks} m horizontally in the time it takes him to fall ${v.hCliff} m. He leaves horizontally, so his initial vertical velocity is 0.`,
            `Fall time: <em>h</em> = &frac12;<em>g</em><em>t</em>&sup2;, so <em>t</em> = &radic;(2<em>h</em> / <em>g</em>) = &radic;(2 &times; ${v.hCliff} / 9.80) = ${t.toFixed(2)} s.`,
            `Minimum horizontal speed: <em>v</em><sub>x,min</sub> = &Delta;<em>x</em> / <em>t</em> = ${v.distRocks} m / ${t.toFixed(2)} s = <strong>${ans.toFixed(2)} m/s</strong>. Any faster and he lands farther out.`
          );
        }}
    ]
  },
  {
    id: "PROJ-11", docNum: "Proj #11", title: "Mortar Shell Fired from a Cliff (5 Parts)",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projMortar",
    baseVars: { v0: 123, theta: 29.0, hCliff: 50.0 },
    randomize: (b) => ({ v0: Math.round(rnd(b.v0, 0.18, 0)), theta: rnd(b.theta, 0.15, 1), hCliff: rnd(b.hCliff, 0.20, 1) }),
    renderPrompt: (v) => `A mortar shell is launched with an initial velocity of <strong>${v.v0} m/s</strong> at an angle of <strong>${v.theta}&deg;</strong> above the horizontal from a point on a cliff <strong>${v.hCliff} m</strong> above a level plain below.<br/><strong>a.</strong> How long is the shell in the air before landing?<br/><strong>b.</strong> How far from the base of the cliff does the mortar shell strike the ground?<br/><strong>c.</strong> What is the shell’s speed just before it lands?<br/><strong>d.</strong> What is the direction of the shell’s velocity just before it lands?<br/><strong>e.</strong> How high is the shell above the level plain at its highest point?`,
    parts: [
      { label: "a. Airborne flight time (<em>t</em>)", unit: "s", solve: (v) => { const vy0 = v.v0 * Math.sin(v.theta * DEG2RAD); return (vy0 + Math.sqrt(vy0 * vy0 + 2 * G_ACCEL * v.hCliff)) / G_ACCEL; }, steps: (v, ans) => {
          const vy0 = v.v0 * Math.sin(v.theta * DEG2RAD);
          return guidedSteps(
            `Take up as positive with the origin at the launch point. <em>v</em><sub>0y</sub> = ${v.v0} sin(${v.theta}&deg;) = ${vy0.toFixed(2)} m/s. The plain is ${v.hCliff} m below, so &Delta;<em>y</em> = &minus;${v.hCliff} m.`,
            `Use &Delta;<em>y</em> = <em>v</em><sub>0y</sub><em>t</em> &minus; &frac12;<em>g</em><em>t</em>&sup2;: &minus;${v.hCliff} = ${vy0.toFixed(2)}<em>t</em> &minus; 4.90<em>t</em>&sup2;, i.e. 4.90<em>t</em>&sup2; &minus; ${vy0.toFixed(2)}<em>t</em> &minus; ${v.hCliff} = 0.`,
            `Quadratic formula, positive root: <em>t</em> = [${vy0.toFixed(2)} + &radic;(${vy0.toFixed(2)}&sup2; + 4(4.90)(${v.hCliff}))] / (2 &times; 4.90) = <strong>${ans.toFixed(2)} s</strong>.`
          );
        }},
      { label: "b. Horizontal impact distance (&Delta;<em>x</em>)", unit: "m", solve: (v) => { const rad = v.theta * DEG2RAD; const vx = v.v0 * Math.cos(rad); const vy0 = v.v0 * Math.sin(rad); const t = (vy0 + Math.sqrt(vy0 * vy0 + 2 * G_ACCEL * v.hCliff)) / G_ACCEL; return vx * t; }, steps: (v, ans) => {
          const rad = v.theta * DEG2RAD;
          const vx = v.v0 * Math.cos(rad), vy0 = v.v0 * Math.sin(rad);
          const t = (vy0 + Math.sqrt(vy0 * vy0 + 2 * G_ACCEL * v.hCliff)) / G_ACCEL;
          return guidedSteps(
            `Horizontal velocity is constant: <em>v</em><sub>0x</sub> = ${v.v0} cos(${v.theta}&deg;) = ${vx.toFixed(2)} m/s.`,
            `Use the flight time from part a, <em>t</em> = ${t.toFixed(2)} s.`,
            `&Delta;<em>x</em> = <em>v</em><sub>0x</sub><em>t</em> = (${vx.toFixed(2)})(${t.toFixed(2)}) = <strong>${ans.toFixed(1)} m</strong> from the base of the cliff.`
          );
        }},
      { label: "c. Landing speed (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(v.v0 * v.v0 + 2 * G_ACCEL * v.hCliff), steps: (v, ans) => guidedSteps(
          `The speed at the plain depends only on how far the shell has dropped relative to the launch point, not on the path or the angle. Known: <em>v</em><sub>0</sub> = ${v.v0} m/s, and the shell ends ${v.hCliff} m <em>below</em> the launch point.`,
          `Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>g</em>(drop), since a drop adds speed.`,
          `Substitute: <em>v</em> = &radic;(${v.v0}&sup2; + 2 &times; 9.80 &times; ${v.hCliff}) = &radic;(${(v.v0 * v.v0 + 2 * G_ACCEL * v.hCliff).toFixed(0)}) = <strong>${ans.toFixed(2)} m/s</strong>.`
        )},
      { label: "d. Landing direction (&theta;)", unit: "°", directionOptions: ["above the horizontal", "below the horizontal"], expectedDirection: "below the horizontal", solve: (v) => { const rad = v.theta * DEG2RAD; const vx = v.v0 * Math.cos(rad); const vy0 = v.v0 * Math.sin(rad); const vyLand = Math.sqrt(vy0 * vy0 + 2 * G_ACCEL * v.hCliff); return Math.atan(vyLand / vx) * RAD2DEG; }, steps: (v, ans) => {
          const rad = v.theta * DEG2RAD;
          const vx = v.v0 * Math.cos(rad), vy = Math.sqrt(Math.pow(v.v0 * Math.sin(rad), 2) + 2 * G_ACCEL * v.hCliff);
          return guidedSteps(
            `Horizontal component: <em>v</em><sub>x</sub> = ${vx.toFixed(2)} m/s (constant).`,
            `Vertical component just before landing: |<em>v</em><sub>y</sub>| = &radic;(<em>v</em><sub>0y</sub>&sup2; + 2<em>g</em><em>h</em><sub>cliff</sub>) = ${vy.toFixed(2)} m/s, directed downward.`,
            `tan &theta; = |<em>v</em><sub>y</sub>| / <em>v</em><sub>x</sub> = ${vy.toFixed(2)} / ${vx.toFixed(2)}, so &theta; = <strong>${ans.toFixed(1)}&deg; below the horizontal</strong>.`
          );
        }},
      { label: "e. Maximum height above level plain (<em>H</em><sub>max</sub>)", unit: "m", solve: (v) => v.hCliff + Math.pow(v.v0 * Math.sin(v.theta * DEG2RAD), 2) / (2 * G_ACCEL), steps: (v, ans) => {
          const vy0 = v.v0 * Math.sin(v.theta * DEG2RAD);
          const rise = vy0 * vy0 / (2 * G_ACCEL);
          return guidedSteps(
            `The highest point is where the vertical velocity is zero. <em>v</em><sub>0y</sub> = ${v.v0} sin(${v.theta}&deg;) = ${vy0.toFixed(2)} m/s.`,
            `Rise above the launch point: <em>v</em><sub>0y</sub>&sup2; / (2<em>g</em>) = (${vy0.toFixed(2)})&sup2; / 19.6 = ${rise.toFixed(2)} m.`,
            `The launch point is ${v.hCliff} m above the plain, so <em>H</em><sub>max</sub> = ${v.hCliff} + ${rise.toFixed(2)} = <strong>${ans.toFixed(1)} m</strong>.`
          );
        }}
    ]
  },
  {
    id: "PROJ-12", docNum: "Proj #12", title: "Airplane Dropping Emergency Supplies to an Island",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projAirplane",
    baseVars: { v0: 174, hKm: 1.20 },
    randomize: (b) => ({ v0: Math.round(rnd(b.v0, 0.18, 0)), hKm: rnd(b.hKm, 0.20, 2) }),
    renderPrompt: (v) => `An airplane is carrying emergency supplies which it is going to drop to people on an island below. The airplane is traveling horizontally at <strong>${v.v0} m/s</strong>, at an altitude of <strong>${v.hKm} km</strong> above the ground. What horizontal distance before the island should the plane release the supplies?`,
    parts: [
      { label: "Release distance before island (&Delta;<em>x</em>)", unit: "m", solve: (v) => v.v0 * Math.sqrt((2 * (v.hKm * 1000)) / G_ACCEL), steps: (v, ans) => {
          const t = Math.sqrt((2 * v.hKm * 1000) / G_ACCEL);
          return guidedSteps(
            `The supplies leave the plane with the plane's horizontal speed (${v.v0} m/s) and no vertical velocity. Convert the altitude: <em>h</em> = ${v.hKm} km = ${v.hKm * 1000} m.`,
            `Fall time: <em>h</em> = &frac12;<em>g</em><em>t</em>&sup2;, so <em>t</em> = &radic;(2<em>h</em> / <em>g</em>) = &radic;(2 &times; ${v.hKm * 1000} / 9.80) = ${t.toFixed(2)} s.`,
            `During that time the supplies keep moving forward at ${v.v0} m/s: &Delta;<em>x</em> = <em>v</em><sub>0</sub><em>t</em> = (${v.v0})(${t.toFixed(2)}) = <strong>${ans.toFixed(1)} m</strong>. The plane must release them this far <em>before</em> reaching the island.`
          );
        }}
    ]
  },

  // --- UNIT 2: CIRCULAR MOTION AND GRAVITATION (CED 2.6 & 2.9) ---
  {
    id: "CMG-01", docNum: "Set 1 #1", title: "Maximum Unbanked Curve Speed and Radius",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation", diagram: "curveCar",
    baseVars: { muS: 0.91, muK: 0.76, v: 32.8 },
    randomize: (b) => { const muK = rnd(b.muK, 0.15, 2); return { muS: Number((muK + rnd(0.15, 0.2, 2)).toFixed(2)), muK, v: rnd(b.v, 0.20, 1) }; },
    renderPrompt: (v) => `A car is driving along a flat road with coefficients of static and kinetic friction of <strong>${v.muS}</strong> and <strong>${v.muK}</strong>, respectively. The fastest the car can drive along a circular path without skidding is <strong>${v.v} m/s</strong>. What is the radius of the car's path?`,
    parts: [{ label: "Radius of circular path (<em>r</em>)", unit: "m", solve: (v) => (v.v * v.v) / (v.muS * G_ACCEL), steps: (v, ans) => guidedSteps(
          `On a flat road the only horizontal force on the car is friction, so static friction supplies the centripetal force. At the maximum speed, friction is at its limit: <em>f</em><sub>s,max</sub> = &mu;<sub>s</sub><em>F</em><sub>N</sub> = &mu;<sub>s</sub><em>m</em><em>g</em> (the car is not accelerating vertically, so <em>F</em><sub>N</sub> = <em>m</em><em>g</em>). Use &mu;<sub>s</sub> = ${v.muS}, not &mu;<sub>k</sub>, because the car is not skidding.`,
          `Set the friction equal to the centripetal force: &mu;<sub>s</sub><em>m</em><em>g</em> = <em>m</em><em>v</em>&sup2; / <em>r</em>. The mass cancels, leaving <em>r</em> = <em>v</em>&sup2; / (&mu;<sub>s</sub><em>g</em>).`,
          `Substitute: <em>r</em> = (${v.v} m/s)&sup2; / (${v.muS} &times; 9.80 m/s²) = <strong>${ans.toFixed(2)} m</strong>.`
        )}]
  },
  {
    id: "CMG-02", docNum: "Set 1 #2", title: "Collinear 3-Mass Gravitational Net Force",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation", diagram: "collinearMasses",
    baseVars: { rABcm: 28.3, rACcm: 66.8, mA: 53.7, mB: 82.9, mC: 49.3 },
    randomize: (b) => { const rAB = rnd(b.rABcm, 0.18, 1); return { rABcm: rAB, rACcm: Number((rAB + rnd(b.rACcm - b.rABcm, 0.18, 1)).toFixed(1)), mA: rnd(b.mA, 0.20, 1), mB: rnd(b.mB, 0.20, 1), mC: rnd(b.mC, 0.20, 1) }; },
    renderPrompt: (v) => `From center to center, the distance between mass A and B is <strong>${v.rABcm} cm</strong> and from A to C is <strong>${v.rACcm} cm</strong> (with A on the left, B in the middle, and C on the right). If <em>m</em><sub>A</sub> = <strong>${v.mA} kg</strong>, <em>m</em><sub>B</sub> = <strong>${v.mB} kg</strong>, and <em>m</em><sub>C</sub> = <strong>${v.mC} kg</strong>, what is the gravitational net force on mass B? Let the positive direction be to the right.`,
    parts: [{ label: "Net gravitational force on B (<em>F</em><sub>net,B</sub>)", unit: "N", solve: (v) => (G_CONST * v.mC * v.mB) / Math.pow((v.rACcm - v.rABcm)/100, 2) - (G_CONST * v.mA * v.mB) / Math.pow(v.rABcm/100, 2), steps: (v, ans) => {
          const rBC = (v.rACcm - v.rABcm) / 100, rAB = v.rABcm / 100;
          const fA = G_CONST * v.mA * v.mB / (rAB * rAB), fC = G_CONST * v.mC * v.mB / (rBC * rBC);
          return guidedSteps(
            `Mass B feels two gravitational pulls: A pulls B toward the <em>left</em> (negative), and C pulls B toward the <em>right</em> (positive). Find the distance from B to C: <em>r</em><sub>BC</sub> = ${v.rACcm} cm &minus; ${v.rABcm} cm = ${(v.rACcm - v.rABcm).toFixed(1)} cm = ${rBC.toFixed(3)} m. Also <em>r</em><sub>AB</sub> = ${rAB.toFixed(3)} m.`,
            `Each force uses <em>F</em> = <em>G</em><em>m</em><sub>1</sub><em>m</em><sub>2</sub> / <em>r</em>&sup2; with <em>G</em> = 6.67 &times; 10<sup>&minus;11</sup>. Pull from A: <em>F</em><sub>AB</sub> = ${fA.toExponential(3)} N (left). Pull from C: <em>F</em><sub>CB</sub> = ${fC.toExponential(3)} N (right).`,
            `Add them with signs (right is positive): <em>F</em><sub>net,B</sub> = ${fC.toExponential(3)} &minus; ${fA.toExponential(3)} = <strong>${ans.toExponential(3)} N</strong>.`,
            `${ans >= 0 ? 'The result is positive, so the net force on B points to the right (toward C).' : 'The result is negative, so the net force on B points to the left (toward A).'}`
          );
        }}]
  },
  {
    id: "CMG-03", docNum: "Set 1 #3", title: "Satellite Orbital Speed Around a Planet",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation", diagram: "orbitSat",
    baseVars: { hKm: 2089, MpExp26: 5.38, RpExp7: 8.33 },
    randomize: (b) => ({ hKm: Math.round(rnd(b.hKm, 0.20, 0)), MpExp26: rnd(b.MpExp26, 0.20, 2), RpExp7: rnd(b.RpExp7, 0.20, 2) }),
    renderPrompt: (v) => `A satellite is placed in a circular orbit <strong>${v.hKm.toLocaleString()} kilometers</strong> above the surface of a planet. The planet has a mass of <strong>${v.MpExp26} &times; 10<sup>26</sup> kg</strong> and a radius of <strong>${v.RpExp7} &times; 10<sup>7</sup> meters</strong>. Find the orbital speed of the satellite.`,
    parts: [{ label: "Orbital speed (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt((G_CONST * v.MpExp26 * 1e26) / (v.RpExp7 * 1e7 + v.hKm * 1e3)), steps: (v, ans) => {
          const r = v.RpExp7 * 1e7 + v.hKm * 1e3;
          return guidedSteps(
            `For a circular orbit, gravity supplies the centripetal force: <em>G</em><em>M</em><em>m</em> / <em>r</em>&sup2; = <em>m</em><em>v</em>&sup2; / <em>r</em>, so <em>v</em> = &radic;(<em>G</em><em>M</em> / <em>r</em>). The satellite's mass cancels.`,
            `The orbital radius <em>r</em> is measured from the planet's <em>center</em>, so add the radius and the altitude (in meters): <em>r</em> = ${v.RpExp7} &times; 10<sup>7</sup> m + ${v.hKm} km = ${v.RpExp7 * 1e7} m + ${v.hKm * 1e3} m = ${r.toExponential(4)} m.`,
            `Substitute: <em>v</em> = &radic;[(6.67 &times; 10<sup>&minus;11</sup>)(${v.MpExp26} &times; 10<sup>26</sup>) / ${r.toExponential(4)}] = <strong>${ans.toFixed(1)} m/s</strong>.`
          );
        }}]
  },
  {
    id: "CMG-04", docNum: "Set 1 #4", title: "Ratio of Speedboat Speeds at Equal Centripetal Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation", diagram: "curveBoats",
    baseVars: { rA: 173, rB: 259 },
    randomize: (b) => ({ rA: Math.round(rnd(b.rA, 0.20, 0)), rB: Math.round(rnd(b.rB, 0.20, 0)) }),
    renderPrompt: (v) => `Speedboat A negotiates a curve whose radius is <strong>${v.rA} m</strong>; Speedboat B negotiates a curve of radius <strong>${v.rB} m</strong> at identical centripetal acceleration. What is the ratio <em>v</em><sub>A</sub> / <em>v</em><sub>B</sub>?`,
    parts: [{ label: "Speed ratio (<em>v</em><sub>A</sub> / <em>v</em><sub>B</sub>)", unit: "No units", solve: (v) => Math.sqrt(v.rA / v.rB), steps: (v, ans) => guidedSteps(
          `Both boats have the same centripetal acceleration <em>a</em><sub>c</sub>. Centripetal acceleration is <em>a</em><sub>c</sub> = <em>v</em>&sup2; / <em>r</em>, so <em>v</em> = &radic;(<em>a</em><sub>c</sub><em>r</em>) for each boat.`,
          `Write the ratio: <em>v</em><sub>A</sub> / <em>v</em><sub>B</sub> = &radic;(<em>a</em><sub>c</sub><em>r</em><sub>A</sub>) / &radic;(<em>a</em><sub>c</sub><em>r</em><sub>B</sub>). The acceleration cancels, leaving &radic;(<em>r</em><sub>A</sub> / <em>r</em><sub>B</sub>).`,
          `Substitute: <em>v</em><sub>A</sub> / <em>v</em><sub>B</sub> = &radic;(${v.rA} / ${v.rB}) = &radic;${(v.rA / v.rB).toFixed(4)} = <strong>${ans.toFixed(3)}</strong>.`,
          `The ratio is less than 1 because boat A has the tighter curve, so it must move slower to have the same acceleration.`
        )}]
  },
  {
    id: "CMG-05", docNum: "Set 1 #5", title: "Normal Force on Motorcycle Cresting a Hill",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation", diagram: "hillMotorcycle",
    baseVars: { v: 19.3, r: 116, m: 291 },
    randomize: (b) => ({ v: rnd(b.v, 0.18, 1), r: Math.round(rnd(b.r, 0.18, 0)), m: Math.round(rnd(b.m, 0.20, 0)) }),
    renderPrompt: (v) => `A motorcycle (total mass <strong>${v.m} kg</strong>) travels at <strong>${v.v} m/s</strong> over a hill of radius <strong>${v.r} m</strong>. Find the normal force.`,
    parts: [{ label: "Normal force (<em>F</em><sub>N</sub>)", unit: "N", solve: (v) => v.m * (G_ACCEL - (v.v * v.v) / v.r), steps: (v, ans) => {
          const need = v.m * v.v * v.v / v.r;
          return guidedSteps(
            `At the top of the hill, the center of the circle is <em>below</em> the motorcycle, so the net force must point downward with magnitude <em>m</em><em>v</em>&sup2; / <em>r</em>. Forces: weight <em>m</em><em>g</em> (down) and normal force <em>F</em><sub>N</sub> (up).`,
            `Newton's second law, down positive: <em>m</em><em>g</em> &minus; <em>F</em><sub>N</sub> = <em>m</em><em>v</em>&sup2; / <em>r</em>, so <em>F</em><sub>N</sub> = <em>m</em>(<em>g</em> &minus; <em>v</em>&sup2; / <em>r</em>).`,
            `Compute the parts: weight = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(1)} N, and the required centripetal force is <em>m</em><em>v</em>&sup2; / <em>r</em> = ${v.m} &times; ${v.v}&sup2; / ${v.r} = ${need.toFixed(1)} N.`,
            `<em>F</em><sub>N</sub> = ${(v.m * G_ACCEL).toFixed(1)} &minus; ${need.toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>. It is less than the weight, which is why you feel lighter going over a hill.`
          );
        }}]
  },
  {
    id: "CMG-07", docNum: "Set 1 #7", title: "Planetary Weight from Speed-Time Graph",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation", diagram: "vtGraph",
    baseVars: { m: 17.4, t: 4.0, vf: 24.8 },
    randomize: (b) => { const m = rnd(b.m, 0.20, 1); const t = rnd(b.t, 0.20, 1); return { m, t, vf: Number((rnd(6.2, 0.25, 2) * t).toFixed(1)) }; },
    renderPrompt: (v) => `An object of mass <strong>${v.m} kg</strong> is released on a planet; its speed graph reaches <strong><em>v</em> = ${v.vf} m/s</strong> at <strong><em>t</em> = ${v.t} s</strong>. Find its weight on this planet.`,
    parts: [{ label: "Weight on planet (<em>W</em>)", unit: "N", solve: (v) => v.m * (v.vf / v.t), steps: (v, ans) => guidedSteps(
          `The graph shows the object speeding up uniformly from rest, so the slope of the speed-time graph is the acceleration due to gravity on this planet: <em>g</em><sub>p</sub> = &Delta;<em>v</em> / &Delta;<em>t</em> = ${v.vf} m/s / ${v.t} s = ${(v.vf / v.t).toFixed(2)} m/s².`,
          `Weight is the gravitational force: <em>W</em> = <em>m</em><em>g</em><sub>p</sub>, using the local value of <em>g</em>, not 9.80.`,
          `Substitute: <em>W</em> = (${v.m} kg)(${(v.vf / v.t).toFixed(2)} m/s²) = <strong>${ans.toFixed(1)} N</strong>.`
        )}]
  },
  {
    id: "CMG-08", docNum: "Set 1 #8", title: "Neutron Star Surface Gravity and Fall Speed",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation", diagram: "neutronStar",
    baseVars: { MExp30: 3.47, RExp3: 6.30, dCm: 8.30 },
    randomize: (b) => ({ MExp30: rnd(b.MExp30, 0.20, 2), RExp3: rnd(b.RExp3, 0.20, 2), dCm: rnd(b.dCm, 0.20, 2) }),
    renderPrompt: (v) => `A neutron star has mass <strong>${v.MExp30} &times; 10<sup>30</sup> kg</strong> and radius <strong>${v.RExp3} &times; 10<sup>3</sup> m</strong>.<br/><strong>a.</strong> What is the gravitational field strength <em>g</em> on the star?<br/><strong>b.</strong> How fast would an object be moving after falling from rest a distance of <strong>${v.dCm} cm</strong>?`,
    parts: [
      { label: "a. Gravitational field strength (<em>g</em>)", unit: "N/kg", acceptedUnits: ["N/kg", "m/s²"], solve: (v) => (G_CONST * v.MExp30 * 1e30) / Math.pow(v.RExp3 * 1e3, 2), steps: (v, ans) => guidedSteps(
          `The gravitational field strength at the surface is <em>g</em> = <em>G</em><em>M</em> / <em>R</em>&sup2;. Write the mass and radius in plain units: <em>M</em> = ${v.MExp30} &times; 10<sup>30</sup> kg, <em>R</em> = ${v.RExp3} &times; 10<sup>3</sup> m.`,
          `Substitute: <em>g</em> = (6.67 &times; 10<sup>&minus;11</sup>)(${v.MExp30} &times; 10<sup>30</sup>) / (${v.RExp3} &times; 10<sup>3</sup>)&sup2;.`,
          `<em>g</em> = <strong>${ans.toExponential(3)} N/kg</strong> (the same as m/s²), which is about ${(ans / G_ACCEL).toExponential(1)} times Earth's.`
        )},
      { label: "b. Final speed after falling (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(2 * ((G_CONST * v.MExp30 * 1e30) / Math.pow(v.RExp3 * 1e3, 2)) * (v.dCm / 100)), steps: (v, ans) => {
          const g = (G_CONST * v.MExp30 * 1e30) / Math.pow(v.RExp3 * 1e3, 2);
          return guidedSteps(
            `Treat <em>g</em> as constant over this tiny fall, using the value from part a: <em>g</em> = ${g.toExponential(3)} m/s². The object starts from rest and falls <em>d</em> = ${v.dCm} cm = ${(v.dCm / 100).toFixed(3)} m.`,
            `Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>g</em><em>d</em> with <em>v</em><sub>0</sub> = 0, so <em>v</em> = &radic;(2<em>g</em><em>d</em>).`,
            `Substitute: <em>v</em> = &radic;(2 &times; ${g.toExponential(3)} &times; ${(v.dCm / 100).toFixed(3)}) = <strong>${ans.toExponential(3)} m/s</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-12", docNum: "Set 2 #12", title: "Rock Dropped on Mars: Gravity and Weight",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation", diagram: "dropRockMars",
    baseVars: { m: 2.00, h: 1.00, t: 0.736 },
    randomize: (b) => { const m = rnd(b.m, 0.2, 2); const h = rnd(b.h, 0.2, 2); return { m, h, t: Number(Math.sqrt((2 * h) / 3.69).toFixed(3)) }; },
    renderPrompt: (v) => `A <strong>${v.m} kg</strong> rock falls <strong>${v.h} m</strong> on Mars in <strong>${v.t} s</strong>.<br/><strong>a.</strong> Mars gravity <em>g</em>?<br/><strong>b.</strong> Rock weight on Mars?`,
    parts: [
      { label: "a. Acceleration due to gravity (<em>g</em><sub>Mars</sub>)", unit: "m/s²", acceptedUnits: ["m/s²", "N/kg"], solve: (v) => (2 * v.h) / (v.t * v.t), steps: (v, ans) => guidedSteps(
          `The rock is dropped, so it starts from rest (<em>v</em><sub>0</sub> = 0) and falls <em>h</em> = ${v.h} m in <em>t</em> = ${v.t} s with constant acceleration. Unknown: that acceleration, which is Mars's gravity.`,
          `Use <em>h</em> = &frac12;<em>g</em><em>t</em>&sup2; and solve for <em>g</em>: <em>g</em> = 2<em>h</em> / <em>t</em>&sup2;.`,
          `Substitute: <em>g</em><sub>Mars</sub> = 2(${v.h}) / (${v.t})&sup2; = <strong>${ans.toFixed(2)} m/s²</strong>, which is about ${(ans / G_ACCEL * 100).toFixed(0)}% of Earth's gravity.`
        )},
      { label: "b. Weight of rock (<em>W</em><sub>Mars</sub>)", unit: "N", solve: (v) => v.m * ((2 * v.h) / (v.t * v.t)), steps: (v, ans) => {
          const g = (2 * v.h) / (v.t * v.t);
          return guidedSteps(
            `Weight is the gravitational force on the rock, which depends on the local gravity. Use <em>g</em><sub>Mars</sub> = ${g.toFixed(2)} m/s² from part a, <em>not</em> 9.80.`,
            `<em>W</em> = <em>m</em><em>g</em><sub>Mars</sub>.`,
            `Substitute: <em>W</em> = (${v.m} kg)(${g.toFixed(2)} m/s²) = <strong>${ans.toFixed(2)} N</strong>. The rock's mass is still ${v.m} kg; only its weight changes.`
          );
        }}
    ]
  },

  // --- UNIT 2: FORCE AND TRANSLATIONAL DYNAMICS - FRICTION (CED 2.7) ---
  {
    id: "DYN-02", docNum: "Set 2 #2", title: "Static and Kinetic Friction of a Chair",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "dragBlockChair",
    baseVars: { m: 25, Fs: 165, Fk: 127 },
    randomize: (b) => { const m = rnd(b.m, 0.2, 1); const Fk = Math.round(rnd(b.Fk, 0.2, 0)); return { m, Fs: Math.round(Fk + rnd(b.Fs - b.Fk, 0.2, 0)), Fk }; },
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> chair requires an applied force of <strong>${v.Fs} N</strong> to start moving, and <strong>${v.Fk} N</strong> of force to maintain a constant velocity.<br/><strong>a.</strong> Find &mu;<sub>s</sub>.<br/><strong>b.</strong> Find &mu;<sub>k</sub>.`,
    parts: [
      { label: "a. Coefficient of static friction (&mu;<sub>s</sub>)", unit: "No units", solve: (v) => v.Fs / (v.m * G_ACCEL), steps: (v, ans) => guidedSteps(
          `To <em>start</em> the chair moving you must overcome static friction, so the maximum static friction is <em>f</em><sub>s,max</sub> = ${v.Fs} N. On a level floor the normal force equals the weight: <em>F</em><sub>N</sub> = <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(1)} N.`,
          `The definition of the coefficient: <em>f</em><sub>s,max</sub> = &mu;<sub>s</sub><em>F</em><sub>N</sub>, so &mu;<sub>s</sub> = <em>f</em><sub>s,max</sub> / <em>F</em><sub>N</sub>.`,
          `Substitute: &mu;<sub>s</sub> = ${v.Fs} / ${(v.m * G_ACCEL).toFixed(1)} = <strong>${ans.toFixed(3)}</strong> (no units).`
        )},
      { label: "b. Coefficient of kinetic friction (&mu;<sub>k</sub>)", unit: "No units", solve: (v) => v.Fk / (v.m * G_ACCEL), steps: (v, ans) => guidedSteps(
          `At constant velocity the net force is zero, so the applied force equals the kinetic friction: <em>f</em><sub>k</sub> = ${v.Fk} N. The normal force is again <em>m</em><em>g</em> = ${(v.m * G_ACCEL).toFixed(1)} N.`,
          `Use <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em><sub>N</sub>, so &mu;<sub>k</sub> = <em>f</em><sub>k</sub> / <em>F</em><sub>N</sub>.`,
          `Substitute: &mu;<sub>k</sub> = ${v.Fk} / ${(v.m * G_ACCEL).toFixed(1)} = <strong>${ans.toFixed(3)}</strong>. It is smaller than &mu;<sub>s</sub>, as expected, since it is easier to keep something moving than to start it.`
        )}
    ]
  },
  {
    id: "DYN-03", docNum: "Set 2 #3", title: "Baseball Player Sliding into Home Plate",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "slideMan",
    baseVars: { m: 65.0, v0: 4.10, d: 1.90 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 1), v0: rnd(b.v0, 0.2, 2), d: rnd(b.d, 0.2, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> baseball player runs towards home plate at <strong>${v.v0} m/s</strong>. He slides into home plate and comes to rest after <strong>${v.d} meters</strong>.<br/><strong>a.</strong> What is the magnitude of his acceleration?<br/><strong>b.</strong> What is the coefficient of kinetic friction between the player and the ground?`,
    parts: [
      { label: "a. Magnitude of acceleration (|<em>a</em>|)", unit: "m/s²", solve: (v) => (v.v0 * v.v0) / (2 * v.d), steps: (v, ans) => guidedSteps(
          `Known: initial speed <em>v</em><sub>0</sub> = ${v.v0} m/s, final speed 0, distance <em>d</em> = ${v.d} m. The time is not given, so use the equation without time.`,
          `<em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>a</em><em>d</em> with <em>v</em> = 0 gives <em>a</em> = &minus;<em>v</em><sub>0</sub>&sup2; / (2<em>d</em>). The magnitude is <em>v</em><sub>0</sub>&sup2; / (2<em>d</em>).`,
          `Substitute: |<em>a</em>| = (${v.v0})&sup2; / (2 &times; ${v.d}) = <strong>${ans.toFixed(2)} m/s²</strong> (directed opposite to his motion).`
        )},
      { label: "b. Coefficient of kinetic friction (&mu;<sub>k</sub>)", unit: "No units", solve: (v) => ((v.v0 * v.v0) / (2 * v.d)) / G_ACCEL, steps: (v, ans) => {
          const a = (v.v0 * v.v0) / (2 * v.d);
          return guidedSteps(
            `The only horizontal force is kinetic friction, so <em>f</em><sub>k</sub> = <em>m</em>|<em>a</em>|. The normal force equals his weight, <em>F</em><sub>N</sub> = <em>m</em><em>g</em>.`,
            `Set &mu;<sub>k</sub><em>m</em><em>g</em> = <em>m</em>|<em>a</em>|. The mass cancels: &mu;<sub>k</sub> = |<em>a</em>| / <em>g</em>.`,
            `Using |<em>a</em>| = ${a.toFixed(2)} m/s² from part a: &mu;<sub>k</sub> = ${a.toFixed(2)} / 9.80 = <strong>${ans.toFixed(3)}</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-07", docNum: "Set 2 #7", title: "Sled Pulled at an Angle at Constant Velocity",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "sledPulled",
    baseVars: { m: 3, theta: 30, FT: 4 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 2), theta: rnd(b.theta, 0.15, 1), FT: rnd(b.FT, 0.2, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> sled is pulled at a constant velocity with tension force of <strong>${v.FT} N</strong> angled <strong>${v.theta}&deg;</strong> above horizontal. What is &mu;<sub>k</sub>?`,
    parts: [{ label: "Coefficient of kinetic friction (&mu;<sub>k</sub>)", unit: "No units", solve: (v) => (v.FT * Math.cos(v.theta * DEG2RAD)) / (v.m * G_ACCEL - v.FT * Math.sin(v.theta * DEG2RAD)), steps: (v, ans) => {
          const th = v.theta * DEG2RAD;
          const fx = v.FT * Math.cos(th), fy = v.FT * Math.sin(th);
          return guidedSteps(
            `Constant velocity means the net force is zero in both directions. Forces on the sled: tension ${v.FT} N at ${v.theta}&deg; above horizontal, weight <em>m</em><em>g</em> = ${(v.m * G_ACCEL).toFixed(2)} N down, normal force <em>F</em><sub>N</sub> up, and kinetic friction <em>f</em><sub>k</sub> backward.`,
            `Vertical: <em>F</em><sub>N</sub> + <em>F</em><sub>T</sub> sin &theta; = <em>m</em><em>g</em>, so <em>F</em><sub>N</sub> = <em>m</em><em>g</em> &minus; <em>F</em><sub>T</sub> sin &theta; = ${(v.m * G_ACCEL).toFixed(2)} &minus; ${fy.toFixed(2)} = ${(v.m * G_ACCEL - fy).toFixed(2)} N. (The upward pull on the rope reduces the normal force.)`,
            `Horizontal: <em>f</em><sub>k</sub> = <em>F</em><sub>T</sub> cos &theta; = ${fx.toFixed(2)} N.`,
            `&mu;<sub>k</sub> = <em>f</em><sub>k</sub> / <em>F</em><sub>N</sub> = ${fx.toFixed(2)} / ${(v.m * G_ACCEL - fy).toFixed(2)} = <strong>${ans.toFixed(3)}</strong>.`
          );
        }}]
  },
  {
    id: "DYN-09", docNum: "Set 2 #9", title: "Ice Skater Coasting to a Halt",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "slideSkater",
    baseVars: { v0: 10.0, d: 100.0 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.2, 1), d: rnd(b.d, 0.2, 1) }),
    renderPrompt: (v) => `An ice skater moving at <strong>${v.v0} m/s</strong> coasts to rest over <strong>${v.d} m</strong>. What is &mu;<sub>k</sub>?`,
    parts: [{ label: "Coefficient of friction (&mu;<sub>k</sub>)", unit: "No units", solve: (v) => (v.v0 * v.v0) / (2 * G_ACCEL * v.d), steps: (v, ans) => guidedSteps(
          `The skater coasts to rest, so the only horizontal force is kinetic friction: <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>m</em><em>g</em>, which gives a deceleration <em>a</em> = &mu;<sub>k</sub><em>g</em> (the mass cancels).`,
          `Use the kinematic equation without time, with final speed 0: <em>v</em><sub>0</sub>&sup2; = 2<em>a</em><em>d</em> = 2&mu;<sub>k</sub><em>g</em><em>d</em>.`,
          `Solve for &mu;<sub>k</sub>: &mu;<sub>k</sub> = <em>v</em><sub>0</sub>&sup2; / (2<em>g</em><em>d</em>) = ${v.v0}&sup2; / (2 &times; 9.80 &times; ${v.d}) = <strong>${ans.toFixed(4)}</strong>. This small value is typical of ice.`
        )}]
  },
  {
    id: "DYN-24", docNum: "Set 2 #24", title: "Dragging an Accelerating Steel Beam with Friction",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "dragBlockBeam",
    baseVars: { m: 76, a: 4, muS: 0.74, muK: 0.57 },
    randomize: (b) => { const muK = rnd(b.muK, 0.15, 2); return { m: rnd(b.m, 0.2, 1), a: rnd(b.a, 0.2, 2), muS: Number((muK + 0.17).toFixed(2)), muK }; },
    renderPrompt: (v) => `A rope accelerates a <strong>${v.m}-kg</strong> metal beam horizontally at <strong>${v.a} m/s&sup2;</strong> with &mu;<sub>s</sub> = <strong>${v.muS}</strong>, &mu;<sub>k</sub> = <strong>${v.muK}</strong>. What is the magnitude of the tension in the rope?`,
    parts: [{ label: "Rope tension (<em>F</em><sub>T</sub>)", unit: "N", solve: (v) => v.m * (v.a + v.muK * G_ACCEL), steps: (v, ans) => guidedSteps(
          `The beam is already <em>moving</em> (it is accelerating), so the friction is kinetic, and &mu;<sub>k</sub> = ${v.muK} is the one to use (&mu;<sub>s</sub> is not needed). Forces along the motion: rope tension <em>F</em><sub>T</sub> forward, kinetic friction <em>f</em><sub>k</sub> backward. On a level floor <em>F</em><sub>N</sub> = <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(1)} N.`,
          `Kinetic friction: <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em><sub>N</sub> = ${v.muK} &times; ${(v.m * G_ACCEL).toFixed(1)} = ${(v.muK * v.m * G_ACCEL).toFixed(1)} N.`,
          `Newton's second law: <em>F</em><sub>T</sub> &minus; <em>f</em><sub>k</sub> = <em>m</em><em>a</em>, so <em>F</em><sub>T</sub> = <em>m</em><em>a</em> + <em>f</em><sub>k</sub> = (${v.m})(${v.a}) + ${(v.muK * v.m * G_ACCEL).toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>.`
        )}]
  },
  {
    id: "DYN-26", docNum: "Set 2 #26", title: "Initial Car Speed from Police Skid Marks",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "slideCarSkid",
    baseVars: { d: 90, mu: 0.5 },
    randomize: (b) => ({ d: rnd(b.d, 0.2, 1), mu: rnd(b.mu, 0.2, 2) }),
    renderPrompt: (v) => `Police measure a car’s skid marks to be <strong>${v.d} m</strong> long, and the road’s coefficient of kinetic friction to be <strong>${v.mu}</strong>. What was the initial speed of the car?`,
    parts: [{ label: "Initial speed (<em>v</em><sub>0</sub>)", unit: "m/s", solve: (v) => Math.sqrt(2 * v.mu * G_ACCEL * v.d), steps: (v, ans) => guidedSteps(
          `While skidding, the only horizontal force is kinetic friction, so <em>f</em><sub>k</sub> = &mu;<em>m</em><em>g</em> and the deceleration is <em>a</em> = &mu;<em>g</em> = ${v.mu} &times; 9.80 = ${(v.mu * G_ACCEL).toFixed(2)} m/s². The mass cancels, so it isn't needed.`,
          `The car skids to a stop (final speed 0) over <em>d</em> = ${v.d} m. Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>a</em><em>d</em> = 0, so <em>v</em><sub>0</sub> = &radic;(2<em>a</em><em>d</em>) = &radic;(2&mu;<em>g</em><em>d</em>).`,
          `Substitute: <em>v</em><sub>0</sub> = &radic;(2 &times; ${v.mu} &times; 9.80 &times; ${v.d}) = <strong>${ans.toFixed(2)} m/s</strong> (about ${(ans * 3.6).toFixed(0)} km/h).`
        )}]
  },
  {
    id: "DYN-27", docNum: "Set 2 #27", title: "Wooden Crate Static Threshold vs. Kinetic Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "dragBlockCrate",
    baseVars: { m: 28, muS: 0.5, muK: 0.3, Fa: 105, Fb: 145, t: 3 },
    randomize: (b) => { const m = rnd(b.m, 0.15, 1); const fsMax = 0.50 * m * G_ACCEL; return { m, muS: 0.5, muK: 0.3, Fa: Math.round(fsMax * 0.77), Fb: Math.round(fsMax * 1.08), t: rnd(b.t, 0.15, 1) }; },
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> crate has &mu;<sub>s</sub> = <strong>${v.muS}</strong>, &mu;<sub>k</sub> = <strong>${v.muK}</strong>.<br/><strong>a.</strong> What is the speed of the crate after <strong>${v.t} s</strong> with a <strong>${v.Fa} N</strong> push?<br/><strong>b.</strong> What is the speed of the crate after <strong>${v.t} s</strong> with a <strong>${v.Fb} N</strong> push?`,
    parts: [
      { label: "a. Speed with <em>F</em><sub>a</sub>", unit: "m/s", solve: () => 0, steps: (v, ans) => {
          const fs = v.muS * v.m * G_ACCEL;
          return guidedSteps(
            `First check whether the push is big enough to start the crate moving. The maximum static friction is <em>f</em><sub>s,max</sub> = &mu;<sub>s</sub><em>m</em><em>g</em> = ${v.muS} &times; ${v.m} &times; 9.80 = ${fs.toFixed(1)} N.`,
            `The applied force ${v.Fa} N is ${v.Fa < fs ? 'less' : 'more'} than ${fs.toFixed(1)} N. ${v.Fa < fs ? 'Static friction can match the push exactly, so the net force is zero and the crate does not move.' : ''}`,
            `Since the crate never starts moving, its speed after ${v.t} s is <strong>${ans.toFixed(0)} m/s</strong>.`
          );
        }},
      { label: "b. Speed with <em>F</em><sub>b</sub>", unit: "m/s", solve: (v) => ((v.Fb - v.muK * v.m * G_ACCEL) / v.m) * v.t, steps: (v, ans) => {
          const fs = v.muS * v.m * G_ACCEL, fk = v.muK * v.m * G_ACCEL, a = (v.Fb - fk) / v.m;
          return guidedSteps(
            `Check the threshold: <em>f</em><sub>s,max</sub> = &mu;<sub>s</sub><em>m</em><em>g</em> = ${fs.toFixed(1)} N. The push ${v.Fb} N is larger, so the crate <em>does</em> start moving, and from then on the friction is kinetic.`,
            `Kinetic friction: <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>m</em><em>g</em> = ${v.muK} &times; ${v.m} &times; 9.80 = ${fk.toFixed(1)} N. Newton's second law: <em>a</em> = (<em>F</em> &minus; <em>f</em><sub>k</sub>) / <em>m</em> = (${v.Fb} &minus; ${fk.toFixed(1)}) / ${v.m} = ${a.toFixed(3)} m/s².`,
            `Starting from rest, <em>v</em> = <em>a</em><em>t</em> = (${a.toFixed(3)})(${v.t}) = <strong>${ans.toFixed(2)} m/s</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-28", docNum: "Set 2 #28", title: "Hockey Puck Sliding on Frozen Pond",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "slidePuck",
    baseVars: { v0: 20, d: 120 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.2, 1), d: rnd(b.d, 0.2, 1) }),
    renderPrompt: (v) => `A puck sliding at <strong>${v.v0} m/s</strong> travels <strong>${v.d} m</strong> as it slides to rest. Find &mu;<sub>k</sub>.`,
    parts: [{ label: "Coefficient of kinetic friction (&mu;<sub>k</sub>)", unit: "No units", solve: (v) => (v.v0 * v.v0) / (2 * G_ACCEL * v.d), steps: (v, ans) => guidedSteps(
          `Kinetic friction is the only horizontal force on the puck: <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>m</em><em>g</em>, so the deceleration is <em>a</em> = &mu;<sub>k</sub><em>g</em>.`,
          `The puck stops after <em>d</em> = ${v.d} m: <em>v</em><sub>0</sub>&sup2; = 2<em>a</em><em>d</em> = 2&mu;<sub>k</sub><em>g</em><em>d</em>.`,
          `Solve: &mu;<sub>k</sub> = <em>v</em><sub>0</sub>&sup2; / (2<em>g</em><em>d</em>) = ${v.v0}&sup2; / (2 &times; 9.80 &times; ${v.d}) = <strong>${ans.toFixed(3)}</strong>.`
        )}]
  },
  {
    id: "DYN-35", docNum: "Set 2 #35", title: "Static and Kinetic Friction on the Moon",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "dragBlockMoon",
    baseVars: { gMoon: 1.62, m: 423, muS: 0.74, muK: 0.57 },
    randomize: (b) => { const muK = rnd(b.muK, 0.15, 2); return { gMoon: 1.62, m: Math.round(rnd(b.m, 0.2, 0)), muS: Number((muK + 0.17).toFixed(2)), muK }; },
    renderPrompt: (v) => `On the moon (<em>g</em> = <strong>${v.gMoon} m/s&sup2;</strong>), a <strong>${v.m}-kg</strong> bin has coefficients of static and kinetic friction of <strong>${v.muS}</strong> and <strong>${v.muK}</strong>, respectively.<br/><strong>a.</strong> What force is required to start the bin in motion?<br/><strong>b.</strong> What force is required to slide it with a constant velocity?`,
    parts: [
      { label: "a. Force to start moving (<em>f</em><sub>s,max</sub>)", unit: "N", solve: (v) => v.muS * v.m * v.gMoon, steps: (v, ans) => guidedSteps(
          `To <em>start</em> the bin moving, the push must equal the maximum static friction: <em>F</em> = <em>f</em><sub>s,max</sub> = &mu;<sub>s</sub><em>F</em><sub>N</sub>. On a level surface the normal force is <em>F</em><sub>N</sub> = <em>m</em><em>g</em><sub>moon</sub> = ${v.m} &times; ${v.gMoon} = ${(v.m * v.gMoon).toFixed(1)} N (use the Moon's gravity, not 9.80).`,
          `Substitute: <em>f</em><sub>s,max</sub> = ${v.muS} &times; ${(v.m * v.gMoon).toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>.`
        )},
      { label: "b. Force for constant velocity (<em>f</em><sub>k</sub>)", unit: "N", solve: (v) => v.muK * v.m * v.gMoon, steps: (v, ans) => guidedSteps(
          `For a constant velocity the net force is zero, so the push equals the kinetic friction: <em>F</em> = <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em><sub>N</sub>, with <em>F</em><sub>N</sub> = <em>m</em><em>g</em><sub>moon</sub> = ${(v.m * v.gMoon).toFixed(1)} N.`,
          `Substitute: <em>f</em><sub>k</sub> = ${v.muK} &times; ${(v.m * v.gMoon).toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>. This is less than the force needed to start the bin moving in part a.`
        )}
    ]
  },
  {
    id: "DYN-45", docNum: "Doc 1 #5", title: "Ice Skater Coasting to Rest with Friction",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "slideSkaterNoDist",
    baseVars: { v0: 5.72, muS: 0.19, muK: 0.12 },
    randomize: (b) => { const muK = rnd(b.muK, 0.15, 2); return { v0: rnd(b.v0, 0.15, 2), muS: Number((muK + 0.07).toFixed(2)), muK }; },
    renderPrompt: (v) => `An ice skater moving at <strong>${v.v0} m/s</strong> coasts to rest, and &mu;<sub>s</sub> = <strong>${v.muS}</strong> and &mu;<sub>k</sub> = <strong>${v.muK}</strong>.<br/><strong>a.</strong> What is the magnitude of her acceleration?<br/><strong>b.</strong> How much time does it take her to stop?`,
    parts: [
      { label: "a. Magnitude of acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => v.muK * G_ACCEL, steps: (v, ans) => guidedSteps(
          `Once the skater is coasting, the only horizontal force is kinetic friction (she is sliding, so use &mu;<sub>k</sub> = ${v.muK}; &mu;<sub>s</sub> is not needed). On level ice <em>F</em><sub>N</sub> = <em>m</em><em>g</em>.`,
          `Newton's second law: <em>m</em><em>a</em> = <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>m</em><em>g</em>, so |<em>a</em>| = &mu;<sub>k</sub><em>g</em>. The mass cancels.`,
          `Substitute: |<em>a</em>| = ${v.muK} &times; 9.80 = <strong>${ans.toFixed(3)} m/s²</strong> (directed opposite to her motion).`
        )},
      { label: "b. Time to come to rest (<em>t</em>)", unit: "s", solve: (v) => v.v0 / (v.muK * G_ACCEL), steps: (v, ans) => {
          const a = v.muK * G_ACCEL;
          return guidedSteps(
            `She slows uniformly from <em>v</em><sub>0</sub> = ${v.v0} m/s to 0 with a deceleration of ${a.toFixed(3)} m/s² (from part a).`,
            `Use <em>v</em> = <em>v</em><sub>0</sub> &minus; <em>a</em><em>t</em> = 0, so <em>t</em> = <em>v</em><sub>0</sub> / <em>a</em>.`,
            `Substitute: <em>t</em> = ${v.v0} / ${a.toFixed(3)} = <strong>${ans.toFixed(3)} s</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-49", docNum: "Doc 2 #1", title: "Refrigerator on Floor (Static vs. Kinetic Push)",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "dragBlockFridge",
    baseVars: { m: 63, muS: 0.83, muK: 0.64, Fpush: 475, aTarget: 2.3 },
    randomize: (b) => { const m = rnd(b.m, 0.15, 1); return { m, muS: 0.83, muK: 0.64, Fpush: Math.round(0.83 * m * G_ACCEL * 0.93), aTarget: rnd(b.aTarget, 0.15, 2) }; },
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> refrigerator has &mu;<sub>s</sub> = <strong>${v.muS}</strong> and &mu;<sub>k</sub> = <strong>${v.muK}</strong>.<br/><strong>a.</strong> What would the friction force be on the refrigerator if pushed with <strong>${v.Fpush} N</strong> of force?<br/><strong>b.</strong> What force is needed to start moving the refrigerator?<br/><strong>c.</strong> What force is needed to accelerate the refrigerator at <strong>${v.aTarget} m/s&sup2;</strong>?`,
    parts: [
      { label: "a. Friction acting during push (<em>f</em><sub>s</sub>)", unit: "N", solve: (v) => v.Fpush, steps: (v, ans) => {
          const fs = v.muS * v.m * G_ACCEL;
          return guidedSteps(
            `First decide whether the refrigerator moves. The most static friction can provide is <em>f</em><sub>s,max</sub> = &mu;<sub>s</sub><em>m</em><em>g</em> = ${v.muS} &times; ${v.m} &times; 9.80 = ${fs.toFixed(1)} N.`,
            `The push is ${v.Fpush} N, which is ${v.Fpush < fs ? 'less' : 'more'} than ${fs.toFixed(1)} N. ${v.Fpush < fs ? 'So the refrigerator does <em>not</em> move, and the net force is zero.' : ''}`,
            `With no acceleration, static friction exactly balances the push: <em>f</em><sub>s</sub> = <strong>${ans.toFixed(1)} N</strong>. (Static friction adjusts to match the push, up to its maximum.)`
          );
        }},
      { label: "b. Force to start moving (<em>f</em><sub>s,max</sub>)", unit: "N", solve: (v) => v.muS * v.m * G_ACCEL, steps: (v, ans) => guidedSteps(
          `To start the refrigerator moving, the push must reach the maximum static friction. On a level floor, <em>F</em><sub>N</sub> = <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(1)} N.`,
          `<em>f</em><sub>s,max</sub> = &mu;<sub>s</sub><em>F</em><sub>N</sub> = ${v.muS} &times; ${(v.m * G_ACCEL).toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>.`,
          `Any push larger than this starts it moving.`
        )},
      { label: "c. Force to slide with target acceleration", unit: "N", solve: (v) => v.muK * v.m * G_ACCEL + v.m * v.aTarget, steps: (v, ans) => {
          const fk = v.muK * v.m * G_ACCEL;
          return guidedSteps(
            `Once it is sliding, kinetic friction applies: <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>m</em><em>g</em> = ${v.muK} &times; ${v.m} &times; 9.80 = ${fk.toFixed(1)} N, acting against the motion.`,
            `Newton's second law: <em>F</em> &minus; <em>f</em><sub>k</sub> = <em>m</em><em>a</em>, so <em>F</em> = <em>f</em><sub>k</sub> + <em>m</em><em>a</em>.`,
            `Substitute: <em>F</em> = ${fk.toFixed(1)} + (${v.m})(${v.aTarget}) = ${fk.toFixed(1)} + ${(v.m * v.aTarget).toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-50", docNum: "Doc 2 #6", title: "Block on Horizontal Table Static and Kinetic Friction",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "dragBlockTable",
    baseVars: { W: 53.2, muS: 0.685, muK: 0.433 },
    randomize: (b) => {
      const muK = rnd(b.muK, 0.15, 3);
      const muS = Number((muK + rnd(b.muS - b.muK, 0.15, 3)).toFixed(3));
      return { W: rnd(b.W, 0.20, 1), muS, muK };
    },
    renderPrompt: (v) => `A block whose weight is <strong>${v.W} N</strong> rests on a horizontal table. The coefficients of static and kinetic friction are <strong>${v.muS}</strong> and <strong>${v.muK}</strong>, respectively.<br/><strong>a.</strong> How much force is required to start the block moving?<br/><strong>b.</strong> How much force is required to push it across the table with a constant velocity?`,
    parts: [
      { label: "a. Force required to start moving (<em>f</em><sub>s,max</sub>)", unit: "N", solve: (v) => v.muS * v.W, steps: (v, ans) => guidedSteps(
          `The block is on a horizontal table, so the normal force equals its weight: <em>F</em><sub>N</sub> = <em>W</em> = ${v.W} N (the weight is given directly, so there is no need to multiply by <em>g</em>).`,
          `To start it moving, the push must equal the maximum static friction: <em>f</em><sub>s,max</sub> = &mu;<sub>s</sub><em>F</em><sub>N</sub>.`,
          `Substitute: <em>f</em><sub>s,max</sub> = ${v.muS} &times; ${v.W} = <strong>${ans.toFixed(2)} N</strong>.`
        )},
      { label: "b. Force required for constant velocity (<em>f</em><sub>k</sub>)", unit: "N", solve: (v) => v.muK * v.W, steps: (v, ans) => guidedSteps(
          `For constant velocity the net force is zero, so the push equals the kinetic friction. The normal force is still <em>F</em><sub>N</sub> = <em>W</em> = ${v.W} N.`,
          `<em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em><sub>N</sub>.`,
          `Substitute: <em>f</em><sub>k</sub> = ${v.muK} &times; ${v.W} = <strong>${ans.toFixed(2)} N</strong>. This is less than the force needed to start it moving.`
        )}
    ]
  },
  {
    id: "DYN-62", docNum: "Set 3 #8", title: "Box Pushed Across Floor with Downward-Angled Force",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "boxPushedBelow",
    baseVars: { W: 78.4, F: 62.0, theta: 25.0, muK: 0.20 },
    randomize: (b) => ({ W: rnd(b.W, 0.18, 1), F: rnd(b.F, 0.18, 1), theta: rnd(b.theta, 0.15, 1), muK: rnd(b.muK, 0.15, 2) }),
    renderPrompt: (v) => `A <strong>${v.W}-N</strong> box is pushed across the floor with a force of <strong>${v.F} N</strong> in a direction <strong>${v.theta}&deg;</strong> below the horizontal. If the coefficient of kinetic friction between the box and floor is <strong>${v.muK}</strong>, what is the magnitude of the acceleration of the box?`,
    parts: [
      {
        label: "Magnitude of acceleration (<em>a</em>)", unit: "m/s²",
        solve: (v) => {
          const m = v.W / G_ACCEL;
          const FN = v.W + v.F * Math.sin(v.theta * DEG2RAD);
          const fk = v.muK * FN;
          return (v.F * Math.cos(v.theta * DEG2RAD) - fk) / m;
        },
        steps: (v, ans) => {
          const th = v.theta * DEG2RAD, m = v.W / G_ACCEL;
          const FN = v.W + v.F * Math.sin(th), fk = v.muK * FN, Fx = v.F * Math.cos(th);
          return guidedSteps(
            `The push is angled <em>downward</em>, so it has a horizontal part <em>F</em> cos &theta; = ${Fx.toFixed(2)} N (forward) and a vertical part <em>F</em> sin &theta; = ${(v.F * Math.sin(th)).toFixed(2)} N (pressing into the floor). The weight is given as <em>W</em> = ${v.W} N, so the mass is <em>m</em> = <em>W</em> / <em>g</em> = ${m.toFixed(2)} kg.`,
            `Vertical balance: <em>F</em><sub>N</sub> = <em>W</em> + <em>F</em> sin &theta; = ${v.W} + ${(v.F * Math.sin(th)).toFixed(2)} = ${FN.toFixed(2)} N. The downward push increases the normal force, and so increases friction. Kinetic friction: <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em><sub>N</sub> = ${v.muK} &times; ${FN.toFixed(2)} = ${fk.toFixed(2)} N.`,
            `Horizontal Newton's second law: <em>a</em> = (<em>F</em> cos &theta; &minus; <em>f</em><sub>k</sub>) / <em>m</em> = (${Fx.toFixed(2)} &minus; ${fk.toFixed(2)}) / ${m.toFixed(2)} = <strong>${ans.toFixed(2)} m/s²</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-63", docNum: "Set 3 #9", title: "Block of Wood Pushed Up a Wall at Constant Velocity",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "wallBlockUp",
    baseVars: { m: 4.0, F: 63.0, theta: 55.0 },
    randomize: (b) => {
      const m = rnd(b.m, 0.15, 1);
      const theta = rnd(b.theta, 0.10, 1);
      const minF = (m * G_ACCEL) / Math.sin(theta * DEG2RAD);
      const F = Number(Math.max(rnd(b.F, 0.15, 1), minF * 1.25).toFixed(1));
      return { m, F, theta };
    },
    renderPrompt: (v) => `A block of wood of mass <strong>${v.m} kg</strong> is pushed up a wall at a constant velocity with a force of <strong>${v.F} N</strong> into a wall acting in a direction of <strong>${v.theta}&deg;</strong> above the horizontal. What is the coefficient of kinetic friction?`,
    parts: [
      {
        label: "Coefficient of kinetic friction (&mu;<sub>k</sub>)", unit: "No units",
        solve: (v) => (v.F * Math.sin(v.theta * DEG2RAD) - v.m * G_ACCEL) / (v.F * Math.cos(v.theta * DEG2RAD)),
        steps: (v, ans) => {
          const th = v.theta * DEG2RAD;
          const FN = v.F * Math.cos(th), up = v.F * Math.sin(th), fk = up - v.m * G_ACCEL;
          return guidedSteps(
            `The block is pressed against a vertical wall. Split the push into a part into the wall, <em>F</em> cos &theta; = ${FN.toFixed(2)} N, and a part along the wall (upward), <em>F</em> sin &theta; = ${up.toFixed(2)} N. The wall pushes back with a normal force equal to the horizontal part: <em>F</em><sub>N</sub> = ${FN.toFixed(2)} N.`,
            `The block moves up at constant velocity, so the net force along the wall is zero. Up: ${up.toFixed(2)} N. Down: weight <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(2)} N plus kinetic friction (which opposes the upward motion). So <em>f</em><sub>k</sub> = ${up.toFixed(2)} &minus; ${(v.m * G_ACCEL).toFixed(2)} = ${fk.toFixed(2)} N.`,
            `&mu;<sub>k</sub> = <em>f</em><sub>k</sub> / <em>F</em><sub>N</sub> = ${fk.toFixed(2)} / ${FN.toFixed(2)} = <strong>${ans.toFixed(3)}</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-64", docNum: "Set 3 #10", title: "Crate in the Back of an Accelerating Pick-Up Truck",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "crateInTruck",
    baseVars: { vf: 14.3, t: 6.2 },
    randomize: (b) => ({ vf: rnd(b.vf, 0.20, 1), t: rnd(b.t, 0.20, 1) }),
    renderPrompt: (v) => `A crate is in the back of a parked pick-up truck. The truck accelerates from rest to <strong>${v.vf} m/s</strong> in <strong>${v.t} seconds</strong>. What minimum coefficient of static friction must there be between the crate and the truck so that the crate doesn’t slide within the truck?`,
    parts: [
      {
        label: "Minimum coefficient of static friction (&mu;<sub>s,min</sub>)", unit: "No units",
        solve: (v) => (v.vf / v.t) / G_ACCEL,
        steps: (v, ans) => {
          const a = v.vf / v.t;
          return guidedSteps(
            `The crate must accelerate with the truck (it must not slide). The only horizontal force on the crate is static friction from the truck bed, so static friction produces the crate's acceleration. First find the truck's acceleration: <em>a</em> = &Delta;<em>v</em> / &Delta;<em>t</em> = ${v.vf} / ${v.t} = ${a.toFixed(3)} m/s².`,
            `Newton's second law for the crate: <em>f</em><sub>s</sub> = <em>m</em><em>a</em>. The most friction available is &mu;<sub>s</sub><em>m</em><em>g</em> (the normal force is <em>m</em><em>g</em>). The <em>minimum</em> &mu;<sub>s</sub> is when friction is just enough: &mu;<sub>s</sub><em>m</em><em>g</em> = <em>m</em><em>a</em>, so &mu;<sub>s,min</sub> = <em>a</em> / <em>g</em>.`,
            `Substitute: &mu;<sub>s,min</sub> = ${a.toFixed(3)} / 9.80 = <strong>${ans.toFixed(3)}</strong>. A larger &mu;<sub>s</sub> keeps the crate from sliding.`
          );
        }}
    ]
  },

  // --- UNIT 2: FORCE AND TRANSLATIONAL DYNAMICS - INCLINED PLANES ---
  {
    id: "DYN-18", docNum: "Set 2 #18", title: "Time to Slide Down a Rough Incline",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
    baseVars: { L: 5.30, theta: 27, muK: 0.39 },
    randomize: (b) => ({ L: rnd(b.L, 0.2, 2), theta: Math.round(rnd(29, 0.12, 0)), muK: rnd(0.32, 0.15, 2) }),
    renderPrompt: (v) => `A mass is released from rest at the top of a <strong>${v.L}-m</strong> incline at <strong>${v.theta}&deg;</strong> with &mu;<sub>k</sub> = <strong>${v.muK}</strong>. How long does it take to reach the bottom?`,
    parts: [{ label: "Time to reach bottom (<em>t</em>)", unit: "s", solve: (v) => Math.sqrt((2 * v.L) / (G_ACCEL * (Math.sin(v.theta * DEG2RAD) - v.muK * Math.cos(v.theta * DEG2RAD)))), steps: (v, ans) => {
          const th = v.theta * DEG2RAD;
          const a = G_ACCEL * (Math.sin(th) - v.muK * Math.cos(th));
          return guidedSteps(
            `Take down the incline as positive. Along the incline: the weight component <em>m</em><em>g</em> sin &theta; pulls down the slope and kinetic friction &mu;<sub>k</sub><em>F</em><sub>N</sub> opposes the motion. Perpendicular to the incline, <em>F</em><sub>N</sub> = <em>m</em><em>g</em> cos &theta;.`,
            `Newton's second law along the slope: <em>m</em><em>a</em> = <em>m</em><em>g</em> sin &theta; &minus; &mu;<sub>k</sub><em>m</em><em>g</em> cos &theta;, so <em>a</em> = <em>g</em>(sin &theta; &minus; &mu;<sub>k</sub> cos &theta;) = 9.80(sin ${v.theta}&deg; &minus; ${v.muK} cos ${v.theta}&deg;) = ${a.toFixed(3)} m/s².`,
            `Now kinematics from rest over <em>L</em> = ${v.L} m: <em>L</em> = &frac12;<em>a</em><em>t</em>&sup2;, so <em>t</em> = &radic;(2<em>L</em> / <em>a</em>) = &radic;(2 &times; ${v.L} / ${a.toFixed(3)}) = <strong>${ans.toFixed(2)} s</strong>.`
          );
        }}]
  },
  {
    id: "DYN-22", docNum: "Set 2 #22", title: "Frictionless Inclined Plane Kinematics and Dynamics",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
    baseVars: { theta: 35, L: 7.4 },
    randomize: (b) => ({ theta: rnd(b.theta, 0.15, 1), L: rnd(b.L, 0.2, 2) }),
    renderPrompt: (v) => `A block beginning at the top of a <strong>${v.L} m</strong> long ramp that forms a <strong>${v.theta}&deg;</strong> with the horizontal slides without friction to the bottom.<br/><strong>a.</strong> What is the acceleration of the block?<br/><strong>b.</strong> What is the speed of the block at the bottom?<br/><strong>c.</strong> What is the block’s travel time?`,
    parts: [
      { label: "a. Acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => G_ACCEL * Math.sin(v.theta * DEG2RAD), steps: (v, ans) => guidedSteps(
          `On a frictionless incline only two forces act: weight and the normal force. The normal force cancels the part of the weight perpendicular to the ramp, so the net force is the weight component along the ramp: <em>m</em><em>g</em> sin &theta;.`,
          `Newton's second law along the ramp: <em>m</em><em>a</em> = <em>m</em><em>g</em> sin &theta;, so <em>a</em> = <em>g</em> sin &theta;. The mass cancels.`,
          `Substitute: <em>a</em> = 9.80 sin ${v.theta}&deg; = <strong>${ans.toFixed(2)} m/s²</strong> (down the ramp).`
        )},
      { label: "b. Speed at bottom (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(2 * G_ACCEL * Math.sin(v.theta * DEG2RAD) * v.L), steps: (v, ans) => {
          const a = G_ACCEL * Math.sin(v.theta * DEG2RAD);
          return guidedSteps(
            `The block starts from rest and slides <em>L</em> = ${v.L} m with the constant acceleration from part a, <em>a</em> = ${a.toFixed(2)} m/s².`,
            `Use the equation without time: <em>v</em>&sup2; = 2<em>a</em><em>L</em>.`,
            `<em>v</em> = &radic;(2 &times; ${a.toFixed(2)} &times; ${v.L}) = <strong>${ans.toFixed(2)} m/s</strong>.`
          );
        }},
      { label: "c. Time to bottom (<em>t</em>)", unit: "s", solve: (v) => Math.sqrt((2 * v.L) / (G_ACCEL * Math.sin(v.theta * DEG2RAD))), steps: (v, ans) => {
          const a = G_ACCEL * Math.sin(v.theta * DEG2RAD);
          return guidedSteps(
            `Same motion: starts from rest, acceleration <em>a</em> = ${a.toFixed(2)} m/s², distance <em>L</em> = ${v.L} m.`,
            `Use <em>L</em> = &frac12;<em>a</em><em>t</em>&sup2;, so <em>t</em> = &radic;(2<em>L</em> / <em>a</em>).`,
            `Substitute: <em>t</em> = &radic;(2 &times; ${v.L} / ${a.toFixed(2)}) = <strong>${ans.toFixed(2)} s</strong>. Check: <em>v</em> = <em>a</em><em>t</em> = ${(a * ans).toFixed(2)} m/s, which matches part b.`
          );
        }}
    ]
  },
  {
    id: "DYN-30", docNum: "Set 2 #30", title: "Block Sliding Down Incline at Constant Velocity",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
    baseVars: { v: 6.0, theta: 25 },
    randomize: (b) => ({ v: rnd(b.v, 0.2, 1), theta: Math.round(rnd(b.theta, 0.2, 0)) }),
    renderPrompt: (v) => `A block slides down a <strong>${v.theta}&deg;</strong> ramp at constant speed <strong>${v.v} m/s</strong>. Find &mu;<sub>k</sub>.`,
    parts: [{ label: "Coefficient of kinetic friction (&mu;<sub>k</sub>)", unit: "No units", solve: (v) => Math.tan(v.theta * DEG2RAD), steps: (v, ans) => guidedSteps(
          `Constant speed means zero acceleration, so the forces along the ramp balance. Down the slope: the weight component <em>m</em><em>g</em> sin &theta;. Up the slope: kinetic friction &mu;<sub>k</sub><em>F</em><sub>N</sub>. Perpendicular to the ramp, <em>F</em><sub>N</sub> = <em>m</em><em>g</em> cos &theta;. (The speed ${v.v} m/s is not needed.)`,
          `Set the net force along the ramp to zero: <em>m</em><em>g</em> sin &theta; = &mu;<sub>k</sub><em>m</em><em>g</em> cos &theta;. The mass and <em>g</em> cancel, leaving &mu;<sub>k</sub> = sin &theta; / cos &theta; = tan &theta;.`,
          `Substitute: &mu;<sub>k</sub> = tan ${v.theta}&deg; = <strong>${ans.toFixed(3)}</strong>.`
        )}]
  },
  {
    id: "DYN-34", docNum: "Set 2 #34", title: "Finding Coefficient of Friction on an Inclined Ramp",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
    baseVars: { m: 15.0, theta: 28.0, a: 2.30 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 1), theta: rnd(b.theta, 0.15, 1), a: rnd(b.a, 0.15, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> crate slides down a <strong>${v.theta}&deg;</strong> ramp, and it accelerates at a rate of <strong>${v.a} m/s&sup2;</strong>. What is the coefficient of kinetic friction between the crate and ramp?`,
    parts: [{ label: "Coefficient of kinetic friction (&mu;<sub>k</sub>)", unit: "No units", solve: (v) => (G_ACCEL * Math.sin(v.theta * DEG2RAD) - v.a) / (G_ACCEL * Math.cos(v.theta * DEG2RAD)), steps: (v, ans) => {
          const gs = G_ACCEL * Math.sin(v.theta * DEG2RAD), gc = G_ACCEL * Math.cos(v.theta * DEG2RAD);
          return guidedSteps(
            `Take down the ramp as positive. Along the ramp: <em>m</em><em>a</em> = <em>m</em><em>g</em> sin &theta; &minus; &mu;<sub>k</sub><em>F</em><sub>N</sub>, with <em>F</em><sub>N</sub> = <em>m</em><em>g</em> cos &theta; perpendicular to the ramp. The mass cancels: <em>a</em> = <em>g</em> sin &theta; &minus; &mu;<sub>k</sub><em>g</em> cos &theta;.`,
            `Solve for &mu;<sub>k</sub>: &mu;<sub>k</sub> = (<em>g</em> sin &theta; &minus; <em>a</em>) / (<em>g</em> cos &theta;).`,
            `Compute the pieces: <em>g</em> sin ${v.theta}&deg; = ${gs.toFixed(3)} m/s² and <em>g</em> cos ${v.theta}&deg; = ${gc.toFixed(3)} m/s². Then &mu;<sub>k</sub> = (${gs.toFixed(3)} &minus; ${v.a}) / ${gc.toFixed(3)} = <strong>${ans.toFixed(3)}</strong>.`
          );
        }}]
  },
  {
    id: "DYN-43", docNum: "Doc 1 #3", title: "Skier Accelerating Down Slope Aided by Wind",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "inclineSkier",
    baseVars: { m: 51, theta: 23, Fwind: 82, muS: 0.25, muK: 0.16, L: 236 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), theta: rnd(b.theta, 0.12, 1), Fwind: rnd(b.Fwind, 0.18, 1), muS: 0.25, muK: rnd(b.muK, 0.15, 2), L: Math.round(rnd(b.L, 0.15, 0)) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> skier goes down a <strong>${v.theta}&deg;</strong> slope aided by a wind force of <strong>${v.Fwind} N</strong> parallel to the slope. The skier’s motion is opposed by friction and &mu;<sub>k</sub> = <strong>${v.muK}</strong>.<br/><strong>a.</strong> Find the magnitude of the skier’s acceleration down hill.<br/><strong>b.</strong> If she begins at rest, determine the time it will take her to reach the bottom <strong>${v.L} m</strong> away.`,
    parts: [
      { label: "a. Magnitude of acceleration down hill (<em>a</em>)", unit: "m/s²", solve: (v) => (v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD) + v.Fwind - v.muK * v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD)) / v.m, steps: (v, ans) => {
          const th = v.theta * DEG2RAD;
          const w = v.m * G_ACCEL * Math.sin(th), fk = v.muK * v.m * G_ACCEL * Math.cos(th);
          return guidedSteps(
            `Take down the slope as positive. Forces along the slope: the weight component <em>m</em><em>g</em> sin &theta; = ${w.toFixed(1)} N (down), the wind ${v.Fwind} N (down, since it aids her), and kinetic friction <em>f</em><sub>k</sub> (up).`,
            `Friction needs the normal force <em>F</em><sub>N</sub> = <em>m</em><em>g</em> cos &theta; = ${(v.m * G_ACCEL * Math.cos(th)).toFixed(1)} N, so <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em><sub>N</sub> = ${v.muK} &times; ${(v.m * G_ACCEL * Math.cos(th)).toFixed(1)} = ${fk.toFixed(1)} N.`,
            `Newton's second law: <em>a</em> = (<em>m</em><em>g</em> sin &theta; + <em>F</em><sub>wind</sub> &minus; <em>f</em><sub>k</sub>) / <em>m</em> = (${w.toFixed(1)} + ${v.Fwind} &minus; ${fk.toFixed(1)}) / ${v.m} = <strong>${ans.toFixed(3)} m/s²</strong>.`
          );
        }},
      { label: "b. Time to reach the bottom (<em>t</em>)", unit: "s", solve: (v) => Math.sqrt((2 * v.L) / ((v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD) + v.Fwind - v.muK * v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD)) / v.m)), steps: (v, ans) => {
          const th = v.theta * DEG2RAD;
          const a = (v.m * G_ACCEL * Math.sin(th) + v.Fwind - v.muK * v.m * G_ACCEL * Math.cos(th)) / v.m;
          return guidedSteps(
            `She starts from rest and accelerates at <em>a</em> = ${a.toFixed(3)} m/s² (from part a) over <em>L</em> = ${v.L} m.`,
            `Use <em>L</em> = &frac12;<em>a</em><em>t</em>&sup2;, so <em>t</em> = &radic;(2<em>L</em> / <em>a</em>).`,
            `Substitute: <em>t</em> = &radic;(2 &times; ${v.L} / ${a.toFixed(3)}) = <strong>${ans.toFixed(3)} s</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-47", docNum: "Doc 1 #7", title: "Log Pulled Up Incline with Acceleration and Friction",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "inclineLog",
    baseVars: { m: 185, theta: 25.8, muK: 0.67, a: 0.48 },
    randomize: (b) => ({ m: Math.round(rnd(b.m, 0.15, 0)), theta: rnd(b.theta, 0.12, 1), muK: rnd(b.muK, 0.15, 2), a: rnd(b.a, 0.20, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> log is pulled up a <strong>${v.theta}&deg;</strong> ramp accelerating at <strong>${v.a} m/s&sup2;</strong> with &mu;<sub>k</sub> = <strong>${v.muK}</strong>. Find the tension in the rope.`,
    parts: [{ label: "Tension in the rope (<em>F</em><sub>T</sub>)", unit: "N", solve: (v) => v.m * (v.a + G_ACCEL * Math.sin(v.theta * DEG2RAD) + v.muK * G_ACCEL * Math.cos(v.theta * DEG2RAD)), steps: (v, ans) => {
          const th = v.theta * DEG2RAD;
          const w = v.m * G_ACCEL * Math.sin(th), N = v.m * G_ACCEL * Math.cos(th);
          return guidedSteps(
            `Take up the ramp as positive. Forces along the ramp: tension <em>F</em><sub>T</sub> (up), the weight component <em>m</em><em>g</em> sin &theta; = ${w.toFixed(1)} N (down), and kinetic friction (down, opposing the upward motion). Perpendicular to the ramp, <em>F</em><sub>N</sub> = <em>m</em><em>g</em> cos &theta; = ${N.toFixed(1)} N.`,
            `Kinetic friction: <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em><sub>N</sub> = ${v.muK} &times; ${N.toFixed(1)} = ${(v.muK * N).toFixed(1)} N.`,
            `Newton's second law: <em>F</em><sub>T</sub> &minus; <em>m</em><em>g</em> sin &theta; &minus; <em>f</em><sub>k</sub> = <em>m</em><em>a</em>, so <em>F</em><sub>T</sub> = (${v.m})(${v.a}) + ${w.toFixed(1)} + ${(v.muK * N).toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }}]
  },
  {
    id: "DYN-51", docNum: "Doc 2 #7", title: "Skier Down Hill Components and Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "inclineSkier",
    baseVars: { m: 74, theta: 37, muS: 0.16, muK: 0.11 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), theta: rnd(b.theta, 0.12, 1), muS: 0.16, muK: rnd(b.muK, 0.15, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> skier descends a <strong>${v.theta}&deg;</strong> hill with &mu;<sub>s</sub> = <strong>${v.muS}</strong> and &mu;<sub>k</sub> = <strong>${v.muK}</strong>.<br/><strong>a.</strong> What is the gravity component down hill?<br/><strong>b.</strong> What is the magnitude of the kinetic friction?<br/><strong>c.</strong> What is the skier’s acceleration?`,
    parts: [
      { label: "a. Gravity component down hill (<em>F</em><sub>gx</sub>)", unit: "N", solve: (v) => v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD), steps: (v, ans) => guidedSteps(
          `Tilt the axes so that <em>x</em> points down the hill. Only the component of the weight along the slope pulls the skier downhill: the weight <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(1)} N, and the angle between the weight and the perpendicular to the slope is &theta;, so the downhill component uses sine.`,
          `<em>F</em><sub>gx</sub> = <em>m</em><em>g</em> sin &theta; = ${(v.m * G_ACCEL).toFixed(1)} sin ${v.theta}&deg; = <strong>${ans.toFixed(1)} N</strong>.`
        )},
      { label: "b. Kinetic friction force (<em>f</em><sub>k</sub>)", unit: "N", solve: (v) => v.muK * v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD), steps: (v, ans) => {
          const N = v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD);
          return guidedSteps(
            `Kinetic friction depends on the normal force. Perpendicular to the slope the skier does not accelerate, so <em>F</em><sub>N</sub> = <em>m</em><em>g</em> cos &theta; = ${(v.m * G_ACCEL).toFixed(1)} cos ${v.theta}&deg; = ${N.toFixed(1)} N.`,
            `The skier is sliding, so use &mu;<sub>k</sub> = ${v.muK} (not &mu;<sub>s</sub>): <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em><sub>N</sub> = ${v.muK} &times; ${N.toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }},
      { label: "c. Magnitude of acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => G_ACCEL * (Math.sin(v.theta * DEG2RAD) - v.muK * Math.cos(v.theta * DEG2RAD)), steps: (v, ans) => {
          const gx = v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD), fk = v.muK * v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD);
          return guidedSteps(
            `Net force along the slope (down is positive): <em>F</em><sub>net</sub> = <em>F</em><sub>gx</sub> &minus; <em>f</em><sub>k</sub> = ${gx.toFixed(1)} &minus; ${fk.toFixed(1)} = ${(gx - fk).toFixed(1)} N.`,
            `Newton's second law: <em>a</em> = <em>F</em><sub>net</sub> / <em>m</em> = ${(gx - fk).toFixed(1)} / ${v.m}.`,
            `<em>a</em> = <strong>${ans.toFixed(3)} m/s²</strong>. (Equivalent to <em>g</em>(sin &theta; &minus; &mu;<sub>k</sub> cos &theta;), since the mass cancels.)`
          );
        }}
    ]
  },
  {
    id: "DYN-55", docNum: "Set 3 #1", title: "Skier on Frictionless Hill: Weight Components, Normal Force and Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "inclineSkier",
    baseVars: { m: 59.0, theta: 23.0 },
    randomize: (b) => ({ m: rnd(b.m, 0.20, 1), theta: rnd(b.theta, 0.15, 1) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> skier skis down a <strong>${v.theta}&deg;</strong> hill without any friction.<br/><strong>a.</strong> What is the magnitude of her weight in the x-direction?<br/><strong>b.</strong> What is the magnitude of her weight in the y-direction?<br/><strong>c.</strong> What is the magnitude of the normal force acting on her?<br/><strong>d.</strong> What is the magnitude of her acceleration down the hill?`,
    parts: [
      { label: "a. Magnitude of weight in x-direction (<em>F</em><sub>gx</sub>)", unit: "N", solve: (v) => v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD), steps: (v, ans) => guidedSteps(
          `Choose <em>x</em> along the slope (downhill) and <em>y</em> perpendicular to it. The weight <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(1)} N points straight down and is split into two components.`,
          `The component along the slope uses sine of the slope angle: <em>F</em><sub>gx</sub> = <em>m</em><em>g</em> sin &theta;.`,
          `Substitute: <em>F</em><sub>gx</sub> = ${(v.m * G_ACCEL).toFixed(1)} sin ${v.theta}&deg; = <strong>${ans.toFixed(1)} N</strong>.`
        )},
      { label: "b. Magnitude of weight in y-direction (<em>F</em><sub>gy</sub>)", unit: "N", solve: (v) => v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD), steps: (v, ans) => guidedSteps(
          `The component of the weight perpendicular to the slope uses cosine of the slope angle (the other component from part a used sine).`,
          `<em>F</em><sub>gy</sub> = <em>m</em><em>g</em> cos &theta; = ${(v.m * G_ACCEL).toFixed(1)} cos ${v.theta}&deg;.`,
          `<em>F</em><sub>gy</sub> = <strong>${ans.toFixed(1)} N</strong>, directed into the slope.`
        )},
      { label: "c. Magnitude of normal force (<em>F</em><sub>N</sub>)", unit: "N", solve: (v) => v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD), steps: (v, ans) => guidedSteps(
          `The skier does not accelerate perpendicular to the slope (she stays on the surface), so the forces in that direction balance: the normal force <em>F</em><sub>N</sub> pushes out of the slope and the weight component <em>F</em><sub>gy</sub> pushes into it.`,
          `<em>F</em><sub>N</sub> = <em>F</em><sub>gy</sub> = <em>m</em><em>g</em> cos &theta;.`,
          `So <em>F</em><sub>N</sub> = <strong>${ans.toFixed(1)} N</strong>, which is less than her full weight ${(v.m * G_ACCEL).toFixed(1)} N because the surface is tilted.`
        )},
      { label: "d. Magnitude of acceleration down hill (<em>a</em>)", unit: "m/s²", solve: (v) => G_ACCEL * Math.sin(v.theta * DEG2RAD), steps: (v, ans) => guidedSteps(
          `With no friction, the only force along the slope is the weight component <em>F</em><sub>gx</sub> = <em>m</em><em>g</em> sin &theta; = ${(v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD)).toFixed(1)} N (from part a).`,
          `Newton's second law along the slope: <em>m</em><em>a</em> = <em>m</em><em>g</em> sin &theta;, so <em>a</em> = <em>g</em> sin &theta;. The mass cancels.`,
          `Substitute: <em>a</em> = 9.80 sin ${v.theta}&deg; = <strong>${ans.toFixed(2)} m/s²</strong>.`
        )}
    ]
  },
  {
    id: "DYN-56", docNum: "Set 3 #2", title: "Snowboarder Down Hill with Opposing Friction Force",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "inclineSnowboarder",
    baseVars: { m: 82.0, theta: 41.0, fk: 265, v0: 2.60, d: 13.0 },
    randomize: (b) => {
      const m = rnd(b.m, 0.20, 1);
      const theta = rnd(b.theta, 0.12, 1);
      const fgx = m * G_ACCEL * Math.sin(theta * DEG2RAD);
      const fk = Math.round(fgx * rnd(0.50, 0.15, 2));
      return { m, theta, fk, v0: rnd(b.v0, 0.20, 2), d: rnd(b.d, 0.20, 1) };
    },
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> snowboarder travels down a <strong>${v.theta}&deg;</strong> hill. There are <strong>${v.fk} N</strong> of friction opposing his motion.<br/><strong>a.</strong> What is the magnitude of his acceleration?<br/><strong>b.</strong> If he has an initial speed of <strong>${v.v0} m/s</strong>, what will his speed be after he travels an additional <strong>${v.d} meters</strong>?`,
    parts: [
      { label: "a. Magnitude of acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => (v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD) - v.fk) / v.m, steps: (v, ans) => {
          const w = v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD);
          return guidedSteps(
            `Take down the hill as positive. Along the slope the snowboarder feels the weight component <em>m</em><em>g</em> sin &theta; = ${v.m} &times; 9.80 &times; sin ${v.theta}&deg; = ${w.toFixed(1)} N (down) and the ${v.fk} N of friction (up). The friction force is given, so there is no need to use &mu; or the normal force.`,
            `Net force: ${w.toFixed(1)} &minus; ${v.fk} = ${(w - v.fk).toFixed(1)} N down the hill.`,
            `Newton's second law: <em>a</em> = <em>F</em><sub>net</sub> / <em>m</em> = ${(w - v.fk).toFixed(1)} / ${v.m} = <strong>${ans.toFixed(2)} m/s²</strong>.`
          );
        }},
      { label: "b. Speed after additional distance (<em>v</em><sub>f</sub>)", unit: "m/s", solve: (v) => { const a = (v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD) - v.fk) / v.m; return Math.sqrt(v.v0 * v.v0 + 2 * a * v.d); }, steps: (v, ans) => {
          const a = (v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD) - v.fk) / v.m;
          return guidedSteps(
            `Known: initial speed <em>v</em><sub>0</sub> = ${v.v0} m/s, acceleration <em>a</em> = ${a.toFixed(2)} m/s² (from part a), distance <em>d</em> = ${v.d} m. No time is given.`,
            `Use <em>v</em><sub>f</sub>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>a</em><em>d</em> = ${v.v0}&sup2; + 2(${a.toFixed(2)})(${v.d}) = ${(v.v0 * v.v0 + 2 * a * v.d).toFixed(2)} m²/s².`,
            `Take the square root: <em>v</em><sub>f</sub> = <strong>${ans.toFixed(2)} m/s</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-57", docNum: "Set 3 #3", title: "Man Pulling Crate Up a Frictionless Incline",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "inclinePull",
    baseVars: { m: 43.0, theta: 26.0, a: 1.30 },
    randomize: (b) => ({ m: rnd(b.m, 0.20, 1), theta: rnd(b.theta, 0.15, 1), a: rnd(b.a, 0.20, 2) }),
    renderPrompt: (v) => `The man pictured pulls a <strong>${v.m}-kg</strong> crate up a frictionless <strong>${v.theta}&deg;</strong> incline. (There is friction where he’s standing, so he doesn’t move.) If he accelerates the crate at a rate of <strong>${v.a} m/s&sup2;</strong>, with how much force is he pulling on the rope?`,
    parts: [
      { label: "Pulling force on rope (<em>F</em><sub>T</sub>)", unit: "N", solve: (v) => v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD) + v.m * v.a, steps: (v, ans) => {
          const w = v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD);
          return guidedSteps(
            `Take up the incline as positive. The incline is frictionless, so the only forces along the slope on the crate are the rope tension <em>F</em><sub>T</sub> (up) and the weight component <em>m</em><em>g</em> sin &theta; = ${v.m} &times; 9.80 &times; sin ${v.theta}&deg; = ${w.toFixed(1)} N (down).`,
            `Newton's second law: <em>F</em><sub>T</sub> &minus; <em>m</em><em>g</em> sin &theta; = <em>m</em><em>a</em>, so <em>F</em><sub>T</sub> = <em>m</em><em>g</em> sin &theta; + <em>m</em><em>a</em>.`,
            `Substitute: <em>F</em><sub>T</sub> = ${w.toFixed(1)} + (${v.m})(${v.a}) = ${w.toFixed(1)} + ${(v.m * v.a).toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }}
    ]
  },

  // --- UNIT 2: FORCE AND TRANSLATIONAL DYNAMICS - MULTI-BODY SYSTEMS & PULLEYS (CED 2.1 & 2.5) ---
  {
    id: "DYN-06", docNum: "Set 2 #6", title: "Truck Towing a Horse Trailer",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Multi-Body Systems and Pulleys", diagram: "truckTrailer",
    baseVars: { m1: 3300, m2: 4500, FkN: 8.58 },
    randomize: (b) => ({ m1: Math.round(rnd(b.m1, 0.2, 0)), m2: Math.round(rnd(b.m2, 0.2, 0)), FkN: rnd(b.FkN, 0.2, 2) }),
    renderPrompt: (v) => `A <strong>${v.m1.toLocaleString()}-kg</strong> truck tows a <strong>${v.m2.toLocaleString()}-kg</strong> trailer with the ground pushing the truck with a force of <strong>${v.FkN} kN</strong>.<br/><strong>a.</strong> Determine the acceleration of the truck.<br/><strong>b.</strong> What net force is exerted on the trailer?<br/><strong>c.</strong> What force does the trailer pull on the truck with?`,
    parts: [
      { label: "a. Acceleration of the truck (<em>a</em>)", unit: "m/s²", solve: (v) => (v.FkN * 1000) / (v.m1 + v.m2), steps: (v, ans) => guidedSteps(
          `Treat the truck and trailer as one system moving together. The only external horizontal force is the ${v.FkN} kN (${v.FkN * 1000} N) push of the ground on the truck. The total mass is <em>m</em><sub>1</sub> + <em>m</em><sub>2</sub> = ${v.m1} + ${v.m2} = ${v.m1 + v.m2} kg.`,
          `Newton's second law for the system: <em>a</em> = <em>F</em> / (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>).`,
          `Substitute: <em>a</em> = ${v.FkN * 1000} N / ${v.m1 + v.m2} kg = <strong>${ans.toFixed(3)} m/s²</strong>. The trailer has the same acceleration.`
        )},
      { label: "b. Net force exerted on the trailer (<em>F</em><sub>T</sub>)", unit: "N", solve: (v) => v.m2 * ((v.FkN * 1000) / (v.m1 + v.m2)), steps: (v, ans) => {
          const a = (v.FkN * 1000) / (v.m1 + v.m2);
          return guidedSteps(
            `The trailer has the same acceleration as the truck, <em>a</em> = ${a.toFixed(3)} m/s² (from part a). Its mass is <em>m</em><sub>2</sub> = ${v.m2} kg.`,
            `The net force on the trailer is just Newton's second law applied to the trailer alone: <em>F</em><sub>net</sub> = <em>m</em><sub>2</sub><em>a</em>.`,
            `Substitute: <em>F</em><sub>net</sub> = (${v.m2} kg)(${a.toFixed(3)} m/s²) = <strong>${ans.toFixed(1)} N</strong>. The only horizontal force that does this is the hitch pulling forward on the trailer.`
          );
        }},
      { label: "c. Force the trailer pulls on the truck with", unit: "N", solve: (v) => v.m2 * ((v.FkN * 1000) / (v.m1 + v.m2)), steps: (v, ans) => guidedSteps(
          `The only horizontal force on the trailer is the pull from the truck, so the net force on the trailer from part b (${ans.toFixed(1)} N) <em>is</em> that pull.`,
          `Newton's third law: if the truck pulls the trailer forward with a force, the trailer pulls back on the truck with an equal force in the opposite direction.`,
          `So the trailer pulls on the truck with <strong>${ans.toFixed(1)} N</strong> backward.`
        )}
    ]
  },
  {
    id: "DYN-11", docNum: "Set 2 #11", title: "Three Contact Blocks Pushed by Unknown Force F",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Multi-Body Systems and Pulleys", diagram: "threeBlocksPush",
    baseVars: { F23: 72, m1: 6, m2: 9, m3: 14 },
    randomize: (b) => ({ F23: rnd(b.F23, 0.2, 1), m1: rnd(b.m1, 0.2, 1), m2: rnd(b.m2, 0.2, 1), m3: rnd(b.m3, 0.2, 1) }),
    renderPrompt: (v) => `Force <em>F</em> acts on blocks <em>m</em><sub>1</sub> = <strong>${v.m1} kg</strong>, <em>m</em><sub>2</sub> = <strong>${v.m2} kg</strong>, <em>m</em><sub>3</sub> = <strong>${v.m3} kg</strong>. Blocks 2 and 3 push with <strong>${v.F23} N</strong>.<br/><strong>a.</strong> What is their acceleration?<br/><strong>b.</strong> What is the force between 1 and 2?<br/><strong>c.</strong> What is the magnitude of force <em>F</em>?`,
    parts: [
      { label: "a. Acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => v.F23 / v.m3, steps: (v, ans) => guidedSteps(
          `Block 3 is the last in line, so the <em>only</em> horizontal force on it is the ${v.F23} N push from block 2. Newton's second law for block 3 alone: <em>F</em><sub>23</sub> = <em>m</em><sub>3</sub><em>a</em>.`,
          `Solve for the acceleration: <em>a</em> = <em>F</em><sub>23</sub> / <em>m</em><sub>3</sub>.`,
          `Substitute: <em>a</em> = ${v.F23} N / ${v.m3} kg = <strong>${ans.toFixed(2)} m/s²</strong>. All three blocks share this acceleration.`
        )},
      { label: "b. Contact force <em>F</em><sub>12</sub>", unit: "N", solve: (v) => (v.m2 + v.m3) * (v.F23 / v.m3), steps: (v, ans) => {
          const a = v.F23 / v.m3;
          return guidedSteps(
            `The force between blocks 1 and 2 must accelerate everything ahead of it, which is blocks 2 and 3 together. Their combined mass is ${v.m2} + ${v.m3} = ${v.m2 + v.m3} kg.`,
            `Newton's second law for the system of blocks 2 and 3: <em>F</em><sub>12</sub> = (<em>m</em><sub>2</sub> + <em>m</em><sub>3</sub>)<em>a</em>, with <em>a</em> = ${a.toFixed(2)} m/s² from part a.`,
            `Substitute: <em>F</em><sub>12</sub> = (${v.m2 + v.m3} kg)(${a.toFixed(2)} m/s²) = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }},
      { label: "c. Applied force <em>F</em>", unit: "N", solve: (v) => (v.m1 + v.m2 + v.m3) * (v.F23 / v.m3), steps: (v, ans) => {
          const a = v.F23 / v.m3;
          return guidedSteps(
            `The applied force <em>F</em> acts on block 1 and must accelerate all three blocks together. Total mass: ${v.m1} + ${v.m2} + ${v.m3} = ${v.m1 + v.m2 + v.m3} kg.`,
            `Newton's second law for the whole system: <em>F</em> = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub> + <em>m</em><sub>3</sub>)<em>a</em>.`,
            `Substitute: <em>F</em> = (${v.m1 + v.m2 + v.m3} kg)(${a.toFixed(2)} m/s²) = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-13", docNum: "Set 2 #13", title: "Standard Atwood Machine Acceleration and Tension",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Multi-Body Systems and Pulleys", diagram: "atwood",
    baseVars: { m1: 44, m2: 23 },
    randomize: (b) => { const m2 = rnd(b.m2, 0.2, 1); return { m1: Number((m2 + rnd(b.m1 - b.m2, 0.2, 1)).toFixed(1)), m2 }; },
    renderPrompt: (v) => `An Atwood machine has masses <em>m</em><sub>1</sub> = <strong>${v.m1} kg</strong> and <em>m</em><sub>2</sub> = <strong>${v.m2} kg</strong>.<br/><strong>a.</strong> What is the acceleration of the masses?<br/><strong>b.</strong> What is the tension in the string?`,
    parts: [
      { label: "a. Acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => ((v.m1 - v.m2) * G_ACCEL) / (v.m1 + v.m2), steps: (v, ans) => guidedSteps(
          `The heavier mass <em>m</em><sub>1</sub> = ${v.m1} kg accelerates downward and the lighter mass <em>m</em><sub>2</sub> = ${v.m2} kg accelerates upward, both with the same magnitude <em>a</em> since the string stays taut. Let each mass's direction of motion be positive.`,
          `Newton's second law for each mass: <em>m</em><sub>1</sub><em>g</em> &minus; <em>F</em><sub>T</sub> = <em>m</em><sub>1</sub><em>a</em> and <em>F</em><sub>T</sub> &minus; <em>m</em><sub>2</sub><em>g</em> = <em>m</em><sub>2</sub><em>a</em>. Add the two equations; the tension cancels: (<em>m</em><sub>1</sub> &minus; <em>m</em><sub>2</sub>)<em>g</em> = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)<em>a</em>.`,
          `<em>a</em> = (<em>m</em><sub>1</sub> &minus; <em>m</em><sub>2</sub>)<em>g</em> / (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>) = (${v.m1} &minus; ${v.m2})(9.80) / (${v.m1} + ${v.m2}) = <strong>${ans.toFixed(2)} m/s²</strong>.`
        )},
      { label: "b. Tension (<em>F</em><sub>T</sub>)", unit: "N", solve: (v) => (2 * v.m1 * v.m2 * G_ACCEL) / (v.m1 + v.m2), steps: (v, ans) => {
          const a = ((v.m1 - v.m2) * G_ACCEL) / (v.m1 + v.m2);
          return guidedSteps(
            `Use the acceleration from part a, <em>a</em> = ${a.toFixed(2)} m/s², and apply Newton's second law to just <em>one</em> of the masses. The lighter mass is easier: it moves up, so <em>F</em><sub>T</sub> &minus; <em>m</em><sub>2</sub><em>g</em> = <em>m</em><sub>2</sub><em>a</em>.`,
            `Solve for the tension: <em>F</em><sub>T</sub> = <em>m</em><sub>2</sub>(<em>g</em> + <em>a</em>) = ${v.m2}(9.80 + ${a.toFixed(2)}) = <strong>${ans.toFixed(1)} N</strong>.`,
            `Check with the heavier mass: <em>F</em><sub>T</sub> = <em>m</em><sub>1</sub>(<em>g</em> &minus; <em>a</em>) = ${v.m1}(9.80 &minus; ${a.toFixed(2)}) = ${(v.m1 * (G_ACCEL - a)).toFixed(1)} N, which agrees. The tension lies between the two weights.`
          );
        }}
    ]
  },
  {
    id: "DYN-16", docNum: "Set 2 #16", title: "Three Masses Connected by Ropes on Frictionless Surface",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Multi-Body Systems and Pulleys", diagram: "threeBlocksRope",
    baseVars: { m1: 40.0, m2: 30.0, m3: 20.0, F: 315 },
    randomize: (b) => ({ m1: rnd(b.m1, 0.2, 1), m2: rnd(b.m2, 0.2, 1), m3: rnd(b.m3, 0.2, 1), F: Math.round(rnd(b.F, 0.2, 0)) }),
    renderPrompt: (v) => `Masses <em>m</em><sub>1</sub> = <strong>${v.m1} kg</strong>, <em>m</em><sub>2</sub> = <strong>${v.m2} kg</strong>, <em>m</em><sub>3</sub> = <strong>${v.m3} kg</strong> are pulled by <strong>${v.F} N</strong>.<br/><strong>a.</strong> Tension <em>T</em><sub>12</sub>?<br/><strong>b.</strong> Tension <em>T</em><sub>23</sub>?`,
    parts: [
      { label: "a. Tension <em>T</em><sub>12</sub>", unit: "N", solve: (v) => v.m1 * (v.F / (v.m1 + v.m2 + v.m3)), steps: (v, ans) => {
          const a = v.F / (v.m1 + v.m2 + v.m3);
          return guidedSteps(
            `The surface is frictionless and the ropes stay taut, so all three masses have the same acceleration. Treat the whole system: <em>a</em> = <em>F</em> / (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub> + <em>m</em><sub>3</sub>) = ${v.F} / ${v.m1 + v.m2 + v.m3} = ${a.toFixed(3)} m/s².`,
            `The rope between masses 1 and 2 is the only horizontal force on mass 1 (the end of the chain farthest from the pull). Apply Newton's second law to mass 1: <em>T</em><sub>12</sub> = <em>m</em><sub>1</sub><em>a</em>.`,
            `Substitute: <em>T</em><sub>12</sub> = (${v.m1} kg)(${a.toFixed(3)} m/s²) = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }},
      { label: "b. Tension <em>T</em><sub>23</sub>", unit: "N", solve: (v) => (v.m1 + v.m2) * (v.F / (v.m1 + v.m2 + v.m3)), steps: (v, ans) => {
          const a = v.F / (v.m1 + v.m2 + v.m3);
          return guidedSteps(
            `Use the common acceleration <em>a</em> = ${v.F} / ${v.m1 + v.m2 + v.m3} = ${a.toFixed(3)} m/s². The rope between masses 2 and 3 must pull masses 1 and 2 together, so choose them as the system (mass ${v.m1 + v.m2} kg).`,
            `Newton's second law for masses 1 and 2: <em>T</em><sub>23</sub> = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)<em>a</em>.`,
            `Substitute: <em>T</em><sub>23</sub> = (${v.m1 + v.m2} kg)(${a.toFixed(3)} m/s²) = <strong>${ans.toFixed(1)} N</strong>. This is larger than <em>T</em><sub>12</sub> because it has more mass to accelerate.`
          );
        }}
    ]
  },
  {
    id: "DYN-33", docNum: "Set 2 #33", title: "Half-Atwood Machine (Table and Hanging Mass)",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Multi-Body Systems and Pulleys", diagram: "halfAtwood",
    baseVars: { m2: 9, m1: 16 },
    randomize: (b) => ({ m2: rnd(b.m2, 0.2, 1), m1: rnd(b.m1, 0.2, 1) }),
    renderPrompt: (v) => `Mass 2 (<strong>${v.m2} kg</strong>) is on a frictionless table, and it’s connected to hanging mass 1 (<strong>${v.m1} kg</strong>).<br/><strong>a.</strong> What is the acceleration of the masses?<br/><strong>b.</strong> What is the tension in the string connecting them?`,
    parts: [
      { label: "a. Acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => (v.m1 * G_ACCEL) / (v.m1 + v.m2), steps: (v, ans) => guidedSteps(
          `The two masses are connected by a string, so they have the same acceleration size <em>a</em>. On the frictionless table, the only horizontal force on mass 2 is the tension: <em>F</em><sub>T</sub> = <em>m</em><sub>2</sub><em>a</em>. For the hanging mass 1 (down positive): <em>m</em><sub>1</sub><em>g</em> &minus; <em>F</em><sub>T</sub> = <em>m</em><sub>1</sub><em>a</em>.`,
          `Substitute the first equation into the second: <em>m</em><sub>1</sub><em>g</em> &minus; <em>m</em><sub>2</sub><em>a</em> = <em>m</em><sub>1</sub><em>a</em>, so <em>a</em> = <em>m</em><sub>1</sub><em>g</em> / (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>).`,
          `Substitute: <em>a</em> = (${v.m1})(9.80) / (${v.m1} + ${v.m2}) = <strong>${ans.toFixed(2)} m/s²</strong>.`
        )},
      { label: "b. Tension (<em>F</em><sub>T</sub>)", unit: "N", solve: (v) => (v.m1 * v.m2 * G_ACCEL) / (v.m1 + v.m2), steps: (v, ans) => {
          const a = (v.m1 * G_ACCEL) / (v.m1 + v.m2);
          return guidedSteps(
            `Only the string pulls mass 2 along the frictionless table, so the tension is the net force on it: <em>F</em><sub>T</sub> = <em>m</em><sub>2</sub><em>a</em>, using <em>a</em> = ${a.toFixed(2)} m/s² from part a.`,
            `Substitute: <em>F</em><sub>T</sub> = (${v.m2} kg)(${a.toFixed(2)} m/s²) = <strong>${ans.toFixed(1)} N</strong>.`,
            `Check with mass 1: <em>F</em><sub>T</sub> = <em>m</em><sub>1</sub>(<em>g</em> &minus; <em>a</em>) = ${v.m1}(9.80 &minus; ${a.toFixed(2)}) = ${(v.m1 * (G_ACCEL - a)).toFixed(1)} N, which agrees. The tension is less than the hanging weight ${(v.m1 * G_ACCEL).toFixed(1)} N because mass 1 is accelerating downward.`
          );
        }}
    ]
  },
  {
    id: "DYN-40", docNum: "Set 2 #40", title: "Two Contact Blocks on a Frictionless Surface",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Multi-Body Systems and Pulleys", diagram: "twoBlocksPush",
    baseVars: { m1: 6.00, m2: 4.00, F: 27.0 },
    randomize: (b) => ({ m1: rnd(b.m1, 0.2, 2), m2: rnd(b.m2, 0.2, 2), F: rnd(b.F, 0.2, 1) }),
    renderPrompt: (v) => `A <strong>${v.m1}-kg</strong> block touches a <strong>${v.m2}-kg</strong> block on a frictionless table, pushed by <strong>${v.F} N</strong>. Find contact force on block 2.`,
    parts: [{ label: "Contact force on block 2 (<em>F</em><sub>12</sub>)", unit: "N", solve: (v) => v.m2 * (v.F / (v.m1 + v.m2)), steps: (v, ans) => {
          const a = v.F / (v.m1 + v.m2);
          return guidedSteps(
            `The blocks move together, so first find their common acceleration by treating them as one ${v.m1 + v.m2} kg system pushed by ${v.F} N: <em>a</em> = <em>F</em> / (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>) = ${v.F} / ${v.m1 + v.m2} = ${a.toFixed(3)} m/s².`,
            `Block 2 is at the front, so the only horizontal force on it is the contact force from block 1. Newton's second law for block 2: <em>F</em><sub>12</sub> = <em>m</em><sub>2</sub><em>a</em>.`,
            `Substitute: <em>F</em><sub>12</sub> = (${v.m2} kg)(${a.toFixed(3)} m/s²) = <strong>${ans.toFixed(2)} N</strong>. It is less than the full ${v.F} N because block 1 has to use part of the push to accelerate itself.`
          );
        }}]
  },
  {
    id: "DYN-65", docNum: "Set 3 #11", title: "Connected Blocks on a Frictionless Incline (Finding Hanging Mass)",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Multi-Body Systems and Pulleys", diagram: "inclineAtwood",
    baseVars: { m2: 14.0, theta: 25.0, FT: 43.0 },
    randomize: (b) => ({ m2: rnd(b.m2, 0.15, 1), theta: rnd(b.theta, 0.12, 1), FT: rnd(b.FT, 0.15, 1) }),
    renderPrompt: (v) => `Block two (<em>m</em><sub>2</sub> = <strong>${v.m2} kg</strong>) is on a frictionless incline that forms a <strong>${v.theta}&deg;</strong> angle with the horizontal. If the tension in the cable connecting the two blocks is <strong>${v.FT} N</strong>, what is the mass of block one?`,
    parts: [
      {
        label: "Mass of block one (<em>m</em><sub>1</sub>)", unit: "kg",
        solve: (v) => {
          const a = G_ACCEL * Math.sin(v.theta * DEG2RAD) - (v.FT / v.m2);
          return v.FT / (G_ACCEL + a);
        },
        steps: (v, ans) => {
          const a = G_ACCEL * Math.sin(v.theta * DEG2RAD) - (v.FT / v.m2);
          return guidedSteps(
            `Block 2 is on the frictionless incline and block 1 hangs from the cable. Both have the same acceleration size <em>a</em>. For block 2 (down the incline positive): <em>m</em><sub>2</sub><em>g</em> sin &theta; &minus; <em>F</em><sub>T</sub> = <em>m</em><sub>2</sub><em>a</em>.`,
            `Solve for <em>a</em>: <em>a</em> = <em>g</em> sin &theta; &minus; <em>F</em><sub>T</sub> / <em>m</em><sub>2</sub> = 9.80 sin ${v.theta}&deg; &minus; ${v.FT} / ${v.m2} = ${a.toFixed(3)} m/s². (A positive value means block 2 moves down the incline while block 1 rises.)`,
            `For hanging block 1, which moves upward with the same acceleration: <em>F</em><sub>T</sub> &minus; <em>m</em><sub>1</sub><em>g</em> = <em>m</em><sub>1</sub><em>a</em>, so <em>m</em><sub>1</sub> = <em>F</em><sub>T</sub> / (<em>g</em> + <em>a</em>) = ${v.FT} / (9.80 + ${a.toFixed(3)}) = <strong>${ans.toFixed(2)} kg</strong>.`
          );
        }}
    ]
  },

  // --- UNIT 2: FORCE AND TRANSLATIONAL DYNAMICS - ELEVATORS & APPARENT WEIGHT ---
  {
    id: "DYN-05", docNum: "Set 2 #5", title: "Elevator Cable Tension Accelerating Upward",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Elevators and Apparent Weight", diagram: "elevCable",
    baseVars: { WkN: 10, a: 3 },
    randomize: (b) => ({ WkN: rnd(b.WkN, 0.2, 1), a: rnd(b.a, 0.2, 2) }),
    renderPrompt: (v) => `An elevator weighing <strong>${v.WkN} kN</strong> accelerates upward at <strong>${v.a} m/s&sup2;</strong>. Find the tension in the cable supporting the elevator.`,
    parts: [{ label: "Cable tension (<em>F</em><sub>T</sub>)", unit: "N", solve: (v) => (v.WkN * 1000) * (1 + v.a / G_ACCEL), steps: (v, ans) => {
          const W = v.WkN * 1000, m = W / G_ACCEL;
          return guidedSteps(
            `Take up as positive. The forces on the elevator are the cable tension <em>F</em><sub>T</sub> (up) and its weight <em>W</em> = ${W} N (down). The mass is <em>m</em> = <em>W</em> / <em>g</em> = ${W} / 9.80 = ${m.toFixed(1)} kg.`,
            `Newton's second law: <em>F</em><sub>T</sub> &minus; <em>W</em> = <em>m</em><em>a</em>, so <em>F</em><sub>T</sub> = <em>W</em> + <em>m</em><em>a</em> = <em>W</em>(1 + <em>a</em>/<em>g</em>).`,
            `Substitute: <em>F</em><sub>T</sub> = ${W} + (${m.toFixed(1)})(${v.a}) = <strong>${ans.toFixed(0)} N</strong>. The tension is larger than the weight because the cable must also provide the net upward force.`
          );
        }}]
  },
  {
    id: "DYN-20", docNum: "Set 2 #20", title: "Bathroom Scale Reading in Downward Elevator",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Elevators and Apparent Weight", diagram: "elevPersonDown",
    baseVars: { m: 61, a: 2 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 1), a: rnd(b.a, 0.2, 1) }),
    renderPrompt: (v) => `Florence stands on a scale in an elevator at rest, and the scale reads <strong>${v.m} kg</strong>. What does the scale read when the elevator accelerates downward at <strong>${v.a} m/s&sup2;</strong>?`,
    parts: [{ label: "Scale reading", unit: "kg", altUnitSolutions: [{ unit: "N", solve: (v) => v.m * (G_ACCEL - v.a) }], solve: (v) => (v.m * (G_ACCEL - v.a)) / G_ACCEL, steps: (v, ans) => {
          const N = v.m * (G_ACCEL - v.a);
          return guidedSteps(
            `A scale reads the normal force on the person. Take down as positive for the downward-accelerating elevator. Forces on Florence: weight <em>m</em><em>g</em> (down) and the scale's normal force <em>F</em><sub>N</sub> (up). Her mass is ${v.m} kg (the reading at rest).`,
            `Newton's second law: <em>m</em><em>g</em> &minus; <em>F</em><sub>N</sub> = <em>m</em><em>a</em>, so <em>F</em><sub>N</sub> = <em>m</em>(<em>g</em> &minus; <em>a</em>) = ${v.m}(9.80 &minus; ${v.a}) = ${N.toFixed(1)} N.`,
            `The scale is marked in kilograms, so it shows the normal force divided by <em>g</em>: ${N.toFixed(1)} / 9.80 = <strong>${ans.toFixed(2)} kg</strong> (equivalently ${N.toFixed(1)} N). She reads lighter because the elevator accelerates downward.`
          );
        }}]
  },
  {
    id: "DYN-25", docNum: "Set 2 #25", title: "Elevator Acceleration from Percentage Scale Reading",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Elevators and Apparent Weight", diagram: "elevBoxUnknown",
    baseVars: { pct: 113 },
    randomize: () => ({ pct: Math.round(rnd(115, 0.08, 0)) }),
    renderPrompt: (v) => `A box is on a scale in an elevator, and the scale reads <strong>${v.pct}%</strong> of the box’s usual weight. Find the magnitude and direction of the elevator’s acceleration.`,
    parts: [{ label: "Acceleration magnitude (<em>a</em>)", unit: "m/s²", directionOptions: ["Upward", "Downward"], expectedDirection: "Upward", solve: (v) => ((v.pct / 100) - 1) * G_ACCEL, steps: (v, ans) => guidedSteps(
          `The scale reads the normal force: <em>F</em><sub>N</sub> = ${v.pct}% of the weight = ${(v.pct / 100).toFixed(2)}<em>m</em><em>g</em>. Because this is <em>more</em> than the weight, the net force must point upward.`,
          `Take up as positive. Newton's second law: <em>F</em><sub>N</sub> &minus; <em>m</em><em>g</em> = <em>m</em><em>a</em>, so ${(v.pct / 100).toFixed(2)}<em>m</em><em>g</em> &minus; <em>m</em><em>g</em> = <em>m</em><em>a</em>. The mass cancels: <em>a</em> = (${(v.pct / 100).toFixed(2)} &minus; 1)<em>g</em>.`,
          `Substitute: <em>a</em> = ${((v.pct / 100) - 1).toFixed(2)} &times; 9.80 = <strong>${ans.toFixed(2)} m/s², upward</strong>. (The elevator could be speeding up while rising, or slowing down while descending.)`
        )}]
  },
  {
    id: "DYN-38", docNum: "Set 2 #38", title: "Elevator Scale Reading During Upward Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Elevators and Apparent Weight", diagram: "elevPersonUp",
    baseVars: { W: 706, v: 1.2, t: 0.80 },
    randomize: (b) => ({ W: Math.round(rnd(b.W, 0.2, 0)), v: rnd(b.v, 0.2, 2), t: rnd(b.t, 0.2, 2) }),
    renderPrompt: (v) => `A scale reads <strong>${v.W} N</strong> at rest. If the elevator reaches upward speed <strong>${v.v} m/s</strong> in <strong>${v.t} s</strong>, what does the scale read?`,
    parts: [{ label: "Scale reading (<em>F</em><sub>N</sub>)", unit: "N", solve: (v) => v.W + (v.W / G_ACCEL) * (v.v / v.t), steps: (v, ans) => {
          const m = v.W / G_ACCEL, a = v.v / v.t;
          return guidedSteps(
            `At rest the scale reads the person's weight, so <em>W</em> = ${v.W} N and the mass is <em>m</em> = <em>W</em> / <em>g</em> = ${v.W} / 9.80 = ${m.toFixed(1)} kg. The acceleration is <em>a</em> = &Delta;<em>v</em> / &Delta;<em>t</em> = ${v.v} / ${v.t} = ${a.toFixed(2)} m/s² upward.`,
            `The scale reads the normal force <em>F</em><sub>N</sub>. With up positive: <em>F</em><sub>N</sub> &minus; <em>m</em><em>g</em> = <em>m</em><em>a</em>, so <em>F</em><sub>N</sub> = <em>m</em><em>g</em> + <em>m</em><em>a</em> = <em>W</em> + <em>m</em><em>a</em>.`,
            `Substitute: <em>F</em><sub>N</sub> = ${v.W} + (${m.toFixed(1)})(${a.toFixed(2)}) = <strong>${ans.toFixed(1)} N</strong>. The reading is greater than the weight while the elevator speeds up upward.`
          );
        }}]
  },
  {
    id: "DYN-42", docNum: "Doc 1 #2", title: "Boy Pulled Vertically from Cave with Rope Limit",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Elevators and Apparent Weight", diagram: "caveRope",
    baseVars: { W: 519.4, d: 29.6, Tmax: 588 },
    randomize: (b) => { const W = rnd(b.W, 0.15, 1); return { W, d: rnd(b.d, 0.15, 1), Tmax: Number((W + rnd(70, 0.20, 1)).toFixed(1)) }; },
    renderPrompt: (v) => `A boy who weighs <strong>${v.W} N</strong> is pulled up vertically from a <strong>${v.d}-m</strong> cave. The maximum tension the rope can withstand is <strong>${v.Tmax} N</strong>. Find the shortest time the boy can exit the cave.`,
    parts: [{ label: "Shortest time (<em>t</em>)", unit: "s", solve: (v) => Math.sqrt((2 * v.d) / ((v.Tmax - v.W) / (v.W / G_ACCEL))), steps: (v, ans) => {
          const m = v.W / G_ACCEL, a = (v.Tmax - v.W) / m;
          return guidedSteps(
            `The shortest time comes from the largest acceleration, which occurs when the rope tension is at its limit <em>T</em><sub>max</sub> = ${v.Tmax} N. The boy's mass is <em>m</em> = <em>W</em> / <em>g</em> = ${v.W} / 9.80 = ${m.toFixed(1)} kg.`,
            `Take up as positive: <em>T</em><sub>max</sub> &minus; <em>W</em> = <em>m</em><em>a</em><sub>max</sub>, so <em>a</em><sub>max</sub> = (${v.Tmax} &minus; ${v.W}) / ${m.toFixed(1)} = ${a.toFixed(3)} m/s².`,
            `He starts from rest and rises <em>d</em> = ${v.d} m: <em>d</em> = &frac12;<em>a</em><em>t</em>&sup2;, so <em>t</em> = &radic;(2<em>d</em> / <em>a</em><sub>max</sub>) = &radic;(2 &times; ${v.d} / ${a.toFixed(3)}) = <strong>${ans.toFixed(3)} s</strong>.`
          );
        }}]
  },

  // --- UNIT 2: FORCE AND TRANSLATIONAL DYNAMICS - 2D FORCES & VECTORS ---
  {
    id: "DYN-04", docNum: "Set 2 #4", title: "2D Cardinal Forces and Acceleration Vector",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors", diagram: "compass3",
    baseVars: { Fw: 11.1, Fs: 18.3, Fe: 19.8, m: 1.4 },
    randomize: (b) => { const Fw = rnd(b.Fw, 0.2, 1); return { Fw, Fs: rnd(b.Fs, 0.2, 1), Fe: Number((Fw + rnd(b.Fe - b.Fw, 0.2, 1)).toFixed(1)), m: rnd(b.m, 0.2, 1) }; },
    renderPrompt: (v) => `Forces of <strong>${v.Fw} N west</strong>, <strong>${v.Fs} N south</strong>, and <strong>${v.Fe} N east</strong> act on a <strong>${v.m}-kg</strong> mass. Find the magnitude and direction of the acceleration.`,
    parts: [
      { label: "Magnitude of acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => Math.hypot(v.Fe - v.Fw, v.Fs) / v.m, steps: (v, ans) => {
          const fx = v.Fe - v.Fw;
          return guidedSteps(
            `Treat east as +x and north as +y. East-west forces: ${v.Fe} N east and ${v.Fw} N west, so <em>F</em><sub>x</sub> = ${v.Fe} &minus; ${v.Fw} = ${fx.toFixed(1)} N. North-south: only ${v.Fs} N south, so <em>F</em><sub>y</sub> = &minus;${v.Fs} N.`,
            `Net force magnitude (Pythagorean theorem): <em>F</em><sub>net</sub> = &radic;(${fx.toFixed(1)}&sup2; + ${v.Fs}&sup2;) = ${Math.hypot(fx, v.Fs).toFixed(2)} N.`,
            `Newton's second law: <em>a</em> = <em>F</em><sub>net</sub> / <em>m</em> = ${Math.hypot(fx, v.Fs).toFixed(2)} / ${v.m} = <strong>${ans.toFixed(2)} m/s²</strong>.`
          );
        }},
      { label: "Direction angle (relative to East/West)", unit: "°", directionOptions: ["South of East", "North of East", "South of West", "North of West"], expectedDirection: "South of East", solve: (v) => Math.atan2(v.Fs, v.Fe - v.Fw) * RAD2DEG, steps: (v, ans) => {
          const fx = v.Fe - v.Fw;
          return guidedSteps(
            `The acceleration points in the same direction as the net force. The components are <em>F</em><sub>x</sub> = ${fx.toFixed(1)} N (${fx >= 0 ? 'east' : 'west'}) and <em>F</em><sub>y</sub> = ${v.Fs} N (south).`,
            `Use tan &theta; = (south component) / (${fx >= 0 ? 'east' : 'west'} component) = ${v.Fs} / ${Math.abs(fx).toFixed(1)}.`,
            `&theta; = arctan(${(v.Fs / Math.abs(fx)).toFixed(3)}) = <strong>${Math.abs(ans).toFixed(1)}&deg; south of ${fx >= 0 ? 'east' : 'west'}</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-19", docNum: "Set 2 #19", title: "Orthogonal Forces Net Force and Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors", diagram: "compass2",
    baseVars: { Fw: 8.5, Fn: 13.2, m: 6.8 },
    randomize: (b) => ({ Fw: rnd(b.Fw, 0.2, 2), Fn: rnd(b.Fn, 0.2, 1), m: rnd(b.m, 0.2, 2) }),
    renderPrompt: (v) => `Forces of <strong>${v.Fw} N west</strong> and <strong>${v.Fn} N north</strong> act on a <strong>${v.m}-kg</strong> mass.<br/><strong>a.</strong> What is the net force on the mass?<br/><strong>b.</strong> What is the magnitude of the mass’s acceleration?<br/><strong>c.</strong> What is the direction of the mass’s acceleration?`,
    parts: [
      { label: "a. Net force (<em>F</em><sub>net</sub>)", unit: "N", solve: (v) => Math.hypot(v.Fw, v.Fn), steps: (v, ans) => guidedSteps(
          `The two forces are perpendicular (west and north), so they form the legs of a right triangle and the net force is the hypotenuse.`,
          `Pythagorean theorem: <em>F</em><sub>net</sub> = &radic;(<em>F</em><sub>w</sub>&sup2; + <em>F</em><sub>n</sub>&sup2;).`,
          `Substitute: <em>F</em><sub>net</sub> = &radic;(${v.Fw}&sup2; + ${v.Fn}&sup2;) = <strong>${ans.toFixed(2)} N</strong>.`
        )},
      { label: "b. Acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => Math.hypot(v.Fw, v.Fn) / v.m, steps: (v, ans) => guidedSteps(
          `Apply Newton's second law to the net force from part a, <em>F</em><sub>net</sub> = ${Math.hypot(v.Fw, v.Fn).toFixed(2)} N, and the mass ${v.m} kg.`,
          `<em>a</em> = <em>F</em><sub>net</sub> / <em>m</em>.`,
          `Substitute: <em>a</em> = ${Math.hypot(v.Fw, v.Fn).toFixed(2)} N / ${v.m} kg = <strong>${ans.toFixed(2)} m/s²</strong>.`
        )},
      { label: "c. Direction angle", unit: "°", directionOptions: ["North of West", "South of West", "North of East", "South of East"], expectedDirection: "North of West", solve: (v) => Math.atan2(v.Fn, v.Fw) * RAD2DEG, steps: (v, ans) => guidedSteps(
          `The acceleration points in the direction of the net force. The net force has a ${v.Fw} N component toward the west and a ${v.Fn} N component toward the north, so it points between north and west.`,
          `The angle measured from west toward north: tan &theta; = (north component) / (west component) = ${v.Fn} / ${v.Fw}.`,
          `&theta; = arctan(${(v.Fn / v.Fw).toFixed(3)}) = <strong>${ans.toFixed(1)}&deg; north of west</strong>.`
        )}
    ]
  },
  {
    id: "DYN-21", docNum: "Set 2 #21", title: "Equilibrant of Two 2D Force Vectors",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors", diagram: "compassEquil",
    baseVars: { A: 5.20, thetaA: 20.0, B: 8.10 },
    randomize: (b) => ({ A: rnd(b.A, 0.15, 2), thetaA: rnd(b.thetaA, 0.15, 1), B: rnd(b.B, 0.15, 2) }),
    renderPrompt: (v) => `Force A = <strong>${v.A} N @ ${v.thetaA}&deg; south of west</strong> and Force B = <strong>${v.B} N north</strong>. Find the equilibrant force.`,
    parts: [
      { label: "Equilibrant magnitude (<em>E</em>)", unit: "N", solve: (v) => Math.hypot(-v.A * Math.cos(v.thetaA * DEG2RAD), -v.A * Math.sin(v.thetaA * DEG2RAD) + v.B), steps: (v, ans) => {
          const rad = v.thetaA * DEG2RAD;
          const Ax = -v.A * Math.cos(rad), Ay = -v.A * Math.sin(rad);
          const Rx = Ax, Ry = Ay + v.B;
          return guidedSteps(
            `The equilibrant is the force that balances the other two, so it equals the <em>resultant</em> reversed. First find the resultant by components (east = +x, north = +y). Force A (${v.A} N at ${v.thetaA}&deg; south of west): <em>A</em><sub>x</sub> = &minus;${v.A} cos ${v.thetaA}&deg; = ${Ax.toFixed(2)} N, <em>A</em><sub>y</sub> = &minus;${v.A} sin ${v.thetaA}&deg; = ${Ay.toFixed(2)} N.`,
            `Force B (${v.B} N north): <em>B</em><sub>x</sub> = 0, <em>B</em><sub>y</sub> = +${v.B} N. Add: <em>R</em><sub>x</sub> = ${Rx.toFixed(2)} N, <em>R</em><sub>y</sub> = ${Ay.toFixed(2)} + ${v.B} = ${Ry.toFixed(2)} N.`,
            `The equilibrant has the same size as the resultant: <em>E</em> = &radic;(<em>R</em><sub>x</sub>&sup2; + <em>R</em><sub>y</sub>&sup2;) = &radic;(${Rx.toFixed(2)}&sup2; + ${Ry.toFixed(2)}&sup2;) = <strong>${ans.toFixed(2)} N</strong>, pointing opposite to the resultant.`
          );
        }},
      { label: "Equilibrant angle", unit: "°", directionOptions: ["South of East", "North of East", "South of West", "North of West"], expectedDirection: "South of East", solve: (v) => Math.atan2(Math.abs(v.B - v.A * Math.sin(v.thetaA * DEG2RAD)), Math.abs(v.A * Math.cos(v.thetaA * DEG2RAD))) * RAD2DEG, steps: (v, ans) => {
          const rad = v.thetaA * DEG2RAD;
          const Rx = -v.A * Math.cos(rad), Ry = -v.A * Math.sin(rad) + v.B;
          return guidedSteps(
            `From part a, the resultant of A and B is <em>R</em><sub>x</sub> = ${Rx.toFixed(2)} N (west) and <em>R</em><sub>y</sub> = ${Ry.toFixed(2)} N (${Ry >= 0 ? 'north' : 'south'}).`,
            `The equilibrant points the opposite way: ${Math.abs(Rx).toFixed(2)} N toward the <em>east</em> and ${Math.abs(Ry).toFixed(2)} N toward the <em>${Ry >= 0 ? 'south' : 'north'}</em>.`,
            `The angle from the east axis: tan &theta; = ${Math.abs(Ry).toFixed(2)} / ${Math.abs(Rx).toFixed(2)}, so &theta; = <strong>${ans.toFixed(1)}&deg; ${Ry >= 0 ? 'south' : 'north'} of east</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-32", docNum: "Set 2 #32", title: "Angle Between Two Symmetric Support Ropes",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors", diagram: "symmetricRopes",
    baseVars: { m: 65.0, FT: 1085 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), FT: Math.round(rnd(b.FT, 0.15, 0)) }),
    renderPrompt: (v) => `Two symmetric ropes (tension <strong>${v.FT} N</strong> each) support a <strong>${v.m}-kg</strong> mass. Find the angle between the two ropes.`,
    parts: [{ label: "Angle between ropes (&phi;)", unit: "°", solve: (v) => 180 - 2 * (Math.asin((v.m * G_ACCEL) / (2 * v.FT)) * RAD2DEG), steps: (v, ans) => {
          const th = Math.asin((v.m * G_ACCEL) / (2 * v.FT)) * RAD2DEG;
          return guidedSteps(
            `The mass hangs at rest, so the forces balance. Each rope makes an angle &theta;<sub>h</sub> with the horizontal, and the weight is <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(1)} N. The horizontal parts of the two tensions cancel by symmetry.`,
            `Vertical balance: 2<em>F</em><sub>T</sub> sin &theta;<sub>h</sub> = <em>m</em><em>g</em>, so sin &theta;<sub>h</sub> = <em>m</em><em>g</em> / (2<em>F</em><sub>T</sub>) = ${(v.m * G_ACCEL).toFixed(1)} / ${2 * v.FT} = ${((v.m * G_ACCEL) / (2 * v.FT)).toFixed(4)}, so &theta;<sub>h</sub> = ${th.toFixed(2)}&deg; above the horizontal.`,
            `The angle <em>between</em> the ropes is measured across the top. Each rope is ${th.toFixed(2)}&deg; from the horizontal on its side, so the angle between them is &phi; = 180&deg; &minus; 2 &times; ${th.toFixed(2)}&deg; = <strong>${ans.toFixed(1)}&deg;</strong>.`
          );
        }}]
  },

  // --- UNIT 2: FORCE AND TRANSLATIONAL DYNAMICS - NEWTON'S 3RD LAW (CED 2.3) ---
  {
    id: "DYN-01", docNum: "Set 2 #1", title: "Girl in a Canoe Pushing Off a Dock",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's 3rd Law and Impulse", diagram: "canoeDock",
    baseVars: { m1: 52, m2: 27, v: 0.30, t: 0.75 },
    randomize: (b) => ({ m1: Math.round(rnd(b.m1, 0.2, 0)), m2: Math.round(rnd(b.m2, 0.2, 0)), v: rnd(b.v, 0.2, 2), t: rnd(b.t, 0.2, 2) }),
    renderPrompt: (v) => `A <strong>${v.m1}-kg</strong> girl in a <strong>${v.m2}-kg</strong> canoe pushes from a dock to <strong>${v.v} m/s</strong> in <strong>${v.t} s</strong>. Find average force on the canoe.`,
    parts: [{ label: "Average force on canoe (<em>F</em><sub>avg</sub>)", unit: "N", solve: (v) => ((v.m1 + v.m2) * v.v) / v.t, steps: (v, ans) => {
          const M = v.m1 + v.m2;
          return guidedSteps(
            `Treat the girl and canoe as one object, since they speed up together. Total mass: <em>M</em> = ${v.m1} + ${v.m2} = ${M} kg. They start at rest and reach ${v.v} m/s in ${v.t} s.`,
            `Average acceleration: <em>a</em> = &Delta;<em>v</em> / &Delta;<em>t</em> = ${v.v} / ${v.t} = ${(v.v / v.t).toFixed(3)} m/s².`,
            `Newton's second law: <em>F</em><sub>avg</sub> = <em>M</em><em>a</em> = (${M} kg)(${(v.v / v.t).toFixed(3)} m/s²) = <strong>${ans.toFixed(2)} N</strong>. (Equivalently, impulse = change in momentum: <em>F</em><em>t</em> = <em>M</em><em>v</em>.)`
          );
        }}]
  },
  {
    id: "DYN-17", docNum: "Set 2 #17", title: "Astronaut Pushing a Crate in Deep Space",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's 3rd Law and Impulse", diagram: "astronautCrate",
    baseVars: { mA: 128, mC: 52, aA: 1.3, t: 1.8 },
    randomize: (b) => ({ mA: Math.round(rnd(b.mA, 0.2, 0)), mC: rnd(b.mC, 0.2, 1), aA: rnd(b.aA, 0.2, 2), t: rnd(b.t, 0.2, 2) }),
    renderPrompt: (v) => `A <strong>${v.mA}-kg</strong> astronaut pushes a <strong>${v.mC}-kg</strong> crate, and he accelerates at <strong>${v.aA} m/s&sup2;</strong> for <strong>${v.t} s</strong>.<br/><strong>a.</strong> What is the force on the crate?<br/><strong>b.</strong> What is the force on the astronaut?<br/><strong>c.</strong> What is the crate’s acceleration?<br/><strong>d.</strong> What is the astronaut’s speed as he floats away?<br/><strong>e.</strong> What is the crate’s speed as it floats away?`,
    parts: [
      { label: "a. Force on crate (<em>F</em>)", unit: "N", solve: (v) => v.mA * v.aA, steps: (v, ans) => guidedSteps(
          `The astronaut accelerates at ${v.aA} m/s², so the net force on him is <em>F</em> = <em>m</em><sub>A</sub><em>a</em><sub>A</sub> = (${v.mA})(${v.aA}) = ${ans.toFixed(1)} N. In deep space the crate pushes back on him, and that is the only force.`,
          `Newton's third law: the astronaut pushes the crate with a force equal in size to the force the crate pushes on him.`,
          `So the force on the crate is <strong>${ans.toFixed(1)} N</strong>, directed away from the astronaut.`
        )},
      { label: "b. Force on astronaut (<em>F</em>)", unit: "N", solve: (v) => v.mA * v.aA, steps: (v, ans) => guidedSteps(
          `Newton's second law for the astronaut: <em>F</em> = <em>m</em><sub>A</sub><em>a</em><sub>A</sub>.`,
          `Substitute: <em>F</em> = (${v.mA} kg)(${v.aA} m/s²) = <strong>${ans.toFixed(1)} N</strong>.`,
          `This matches the force he exerts on the crate (part a), as Newton's third law requires, but it is directed the opposite way.`
        )},
      { label: "c. Crate acceleration (<em>a</em><sub>C</sub>)", unit: "m/s²", solve: (v) => (v.mA * v.aA) / v.mC, steps: (v, ans) => {
          const F = v.mA * v.aA;
          return guidedSteps(
            `The crate feels the same force found in parts a and b: <em>F</em> = ${F.toFixed(1)} N. Its mass is <em>m</em><sub>C</sub> = ${v.mC} kg, which is smaller than the astronaut's.`,
            `Newton's second law for the crate: <em>a</em><sub>C</sub> = <em>F</em> / <em>m</em><sub>C</sub>.`,
            `Substitute: <em>a</em><sub>C</sub> = ${F.toFixed(1)} N / ${v.mC} kg = <strong>${ans.toFixed(2)} m/s²</strong>. The lighter object accelerates more.`
          );
        }},
      { label: "d. Astronaut final speed (<em>v</em><sub>A</sub>)", unit: "m/s", solve: (v) => v.aA * v.t, steps: (v, ans) => guidedSteps(
          `The astronaut starts at rest and accelerates at a constant ${v.aA} m/s² for ${v.t} s while he is pushing.`,
          `Use <em>v</em> = <em>v</em><sub>0</sub> + <em>a</em><em>t</em> with <em>v</em><sub>0</sub> = 0.`,
          `Substitute: <em>v</em><sub>A</sub> = (${v.aA} m/s²)(${v.t} s) = <strong>${ans.toFixed(2)} m/s</strong>. After the push ends there is no force, so he floats away at this constant speed.`
        )},
      { label: "e. Crate final speed (<em>v</em><sub>C</sub>)", unit: "m/s", solve: (v) => ((v.mA * v.aA) / v.mC) * v.t, steps: (v, ans) => {
          const aC = (v.mA * v.aA) / v.mC;
          return guidedSteps(
            `The crate also starts at rest and accelerates for the same ${v.t} s, but with its own acceleration <em>a</em><sub>C</sub> = ${aC.toFixed(2)} m/s² from part c.`,
            `Use <em>v</em> = <em>a</em><em>t</em>.`,
            `Substitute: <em>v</em><sub>C</sub> = (${aC.toFixed(2)} m/s²)(${v.t} s) = <strong>${ans.toFixed(2)} m/s</strong>, in the opposite direction from the astronaut. Check: momentum is conserved because ${v.mA} &times; ${(v.aA * v.t).toFixed(2)} &asymp; ${v.mC} &times; ${ans.toFixed(2)}.`
          );
        }}
    ]
  },
  {
    id: "DYN-39", docNum: "Set 2 #39", title: "Boy and Girl Pushing Off on Frictionless Ice",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's 3rd Law and Impulse", diagram: "iceTwo",
    baseVars: { mB: 64, mG: 49, aB: 3.2, t: 2.1 },
    randomize: (b) => ({ mB: Math.round(rnd(b.mB, 0.2, 0)), mG: Math.round(rnd(b.mG, 0.2, 0)), aB: rnd(b.aB, 0.2, 1), t: rnd(b.t, 0.2, 1) }),
    renderPrompt: (v) => `A <strong>${v.mB}-kg</strong> boy and <strong>${v.mG}-kg</strong> girl initially at rest on frictionless ice push off of each other. The boy accelerates at <strong>${v.aB} m/s&sup2;</strong> for <strong>${v.t} s</strong>. Find the girl's speed.`,
    parts: [{ label: "Girl's speed (<em>v</em><sub>G</sub>)", unit: "m/s", solve: (v) => ((v.mB * v.aB) / v.mG) * v.t, steps: (v, ans) => {
          const F = v.mB * v.aB;
          return guidedSteps(
            `On frictionless ice the only horizontal force on each skater is the push from the other. The boy's net force is <em>F</em> = <em>m</em><sub>B</sub><em>a</em><sub>B</sub> = (${v.mB})(${v.aB}) = ${F.toFixed(1)} N.`,
            `Newton's third law: the girl feels an equal force ${F.toFixed(1)} N in the opposite direction, for the same ${v.t} s. Her acceleration is <em>a</em><sub>G</sub> = <em>F</em> / <em>m</em><sub>G</sub> = ${F.toFixed(1)} / ${v.mG} = ${(F / v.mG).toFixed(3)} m/s².`,
            `She starts at rest, so <em>v</em><sub>G</sub> = <em>a</em><sub>G</sub><em>t</em> = (${(F / v.mG).toFixed(3)})(${v.t}) = <strong>${ans.toFixed(2)} m/s</strong>. She is lighter, so she moves faster than the boy.`
          );
        }}]
  },
  {
    id: "DYN-46", docNum: "Doc 1 #6", title: "Billiard Ball Rebound off Pool Table Cushion",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's 3rd Law and Impulse", diagram: "ballCushion",
    baseVars: { vi: 2.4, vf: 2.07, dtMs: 2.86, m: 0.38 },
    randomize: (b) => ({ vi: rnd(b.vi, 0.15, 2), vf: rnd(b.vf, 0.15, 2), dtMs: rnd(b.dtMs, 0.15, 2), m: rnd(b.m, 0.15, 3) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> ball hits a cushion at <strong>&minus;${v.vi} m/s</strong> and rebounds at <strong>+${v.vf} m/s</strong> in <strong>${v.dtMs} ms</strong>.<br/><strong>a.</strong> What is the ball’s average acceleration?<br/><strong>b.</strong> What is the average net force on the ball?`,
    parts: [
      { label: "a. Average acceleration (<em>a</em><sub>avg</sub>)", unit: "m/s²", acceptNegative: true, solve: (v) => (v.vi + v.vf) / (v.dtMs * 1e-3), steps: (v, ans) => guidedSteps(
          `Choose the direction of the rebound as positive. The ball's velocity changes from <em>v</em><sub>i</sub> = &minus;${v.vi} m/s to <em>v</em><sub>f</sub> = +${v.vf} m/s. Convert the time: ${v.dtMs} ms = ${v.dtMs} &times; 10<sup>&minus;3</sup> s.`,
          `Average acceleration: <em>a</em><sub>avg</sub> = &Delta;<em>v</em> / &Delta;<em>t</em> = (<em>v</em><sub>f</sub> &minus; <em>v</em><sub>i</sub>) / &Delta;<em>t</em>. The change in velocity is +${v.vf} &minus; (&minus;${v.vi}) = +${(v.vf + v.vi).toFixed(2)} m/s, because the velocity reverses direction.`,
          `Substitute: <em>a</em><sub>avg</sub> = ${(v.vf + v.vi).toFixed(2)} / (${v.dtMs} &times; 10<sup>&minus;3</sup>) = <strong>${ans.toFixed(1)} m/s²</strong>, directed away from the cushion.`
        )},
      { label: "b. Average net force (<em>F</em><sub>avg</sub>)", unit: "N", acceptNegative: true, solve: (v) => v.m * ((v.vi + v.vf) / (v.dtMs * 1e-3)), steps: (v, ans) => {
          const a = (v.vi + v.vf) / (v.dtMs * 1e-3);
          return guidedSteps(
            `Use Newton's second law with the average acceleration from part a, <em>a</em><sub>avg</sub> = ${a.toFixed(1)} m/s², and the ball's mass ${v.m} kg.`,
            `<em>F</em><sub>avg</sub> = <em>m</em><em>a</em><sub>avg</sub>.`,
            `Substitute: <em>F</em><sub>avg</sub> = (${v.m} kg)(${a.toFixed(1)} m/s²) = <strong>${ans.toFixed(1)} N</strong>, directed away from the cushion. This is large because the contact time is only a few milliseconds.`
          );
        }}
    ]
  },

  // --- UNIT 2: FORCE AND TRANSLATIONAL DYNAMICS - GENERAL DYNAMICS & NEWTON'S 2ND LAW (CED 2.2, 2.4, 2.5) ---
  {
    id: "CMG-06", docNum: "Set 1 #6", title: "Hot-Air Balloon Ballast Mass Dropped",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "hotAirBalloon",
    baseVars: { M: 372, a: 0.21 },
    randomize: (b) => ({ M: Math.round(rnd(b.M, 0.20, 0)), a: rnd(b.a, 0.20, 3) }),
    renderPrompt: (v) => `A hot-air balloon with a mass of <strong>${v.M} kg</strong> is floating in equilibrium. How much mass must be dropped overboard so it accelerates upward at <strong>${v.a} m/s&sup2;</strong>?`,
    parts: [{ label: "Mass dropped overboard (&Delta;<em>m</em>)", unit: "kg", solve: (v) => (v.M * v.a) / (G_ACCEL + v.a), steps: (v, ans) => guidedSteps(
          `In equilibrium the upward buoyant force on the balloon equals its weight: <em>F</em><sub>up</sub> = <em>M</em><em>g</em> = ${v.M} &times; 9.80 = ${(v.M * G_ACCEL).toFixed(1)} N. Dropping ballast does not change this upward force, only the mass left to lift: <em>m</em><sub>new</sub> = <em>M</em> &minus; &Delta;<em>m</em>.`,
          `Newton's second law with up positive: <em>F</em><sub>up</sub> &minus; <em>m</em><sub>new</sub><em>g</em> = <em>m</em><sub>new</sub><em>a</em>. Substitute <em>F</em><sub>up</sub> = <em>M</em><em>g</em> and <em>m</em><sub>new</sub> = <em>M</em> &minus; &Delta;<em>m</em>: <em>M</em><em>g</em> = (<em>M</em> &minus; &Delta;<em>m</em>)(<em>g</em> + <em>a</em>).`,
          `Solve for &Delta;<em>m</em>: &Delta;<em>m</em> = <em>M</em><em>a</em> / (<em>g</em> + <em>a</em>) = (${v.M})(${v.a}) / (9.80 + ${v.a}) = <strong>${ans.toFixed(2)} kg</strong>.`
        )}]
  },
  {
    id: "DYN-08", docNum: "Set 2 #8", title: "Antitank Rocket Accelerated in Launch Tube",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "rocketTube",
    baseVars: { m: 2.7, v: 50, dCm: 90 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 2), v: rnd(b.v, 0.2, 1), dCm: rnd(b.dCm, 0.2, 1) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> rocket beginning at rest reaches <strong>${v.v} m/s</strong> while accelerating through a <strong>${v.dCm}-cm</strong> tube. Find the net force on the rocket.`,
    parts: [{ label: "Net force (<em>F</em><sub>net</sub>)", unit: "N", solve: (v) => (v.m * v.v * v.v) / (2 * (v.dCm / 100)), steps: (v, ans) => {
          const d = v.dCm / 100, a = (v.v * v.v) / (2 * d);
          return guidedSteps(
            `First find the acceleration inside the tube. Known: starts at rest, final speed ${v.v} m/s, distance <em>d</em> = ${v.dCm} cm = ${d.toFixed(2)} m. No time is given.`,
            `Use <em>v</em>&sup2; = 2<em>a</em><em>d</em>, so <em>a</em> = <em>v</em>&sup2; / (2<em>d</em>) = ${v.v}&sup2; / (2 &times; ${d.toFixed(2)}) = ${a.toFixed(0)} m/s².`,
            `Newton's second law: <em>F</em><sub>net</sub> = <em>m</em><em>a</em> = (${v.m} kg)(${a.toFixed(0)} m/s²) = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }}]
  },
  {
    id: "DYN-10", docNum: "Set 2 #10", title: "Air Resistance on a Dropped Tennis Ball",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "airDragBall",
    baseVars: { m: 0.23, a: 9.6 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 2), a: rnd(9.20, 0.04, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> tennis ball is released from rest, and it falls downward at <strong>${v.a} m/s&sup2;</strong>. Find the air resistance force on the tennis ball.`,
    parts: [{ label: "Air resistance force (<em>F</em><sub>air</sub>)", unit: "N", acceptNegative: true, solve: (v) => v.m * (G_ACCEL - v.a), steps: (v, ans) => guidedSteps(
          `Two forces act on the falling ball: weight <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(4)} N downward, and air resistance <em>F</em><sub>air</sub> upward. Take down as positive. The ball accelerates at only ${v.a} m/s², which is less than <em>g</em>, so something is holding it back.`,
          `Newton's second law: <em>m</em><em>g</em> &minus; <em>F</em><sub>air</sub> = <em>m</em><em>a</em>, so <em>F</em><sub>air</sub> = <em>m</em>(<em>g</em> &minus; <em>a</em>).`,
          `Substitute: <em>F</em><sub>air</sub> = ${v.m}(9.80 &minus; ${v.a}) = <strong>${ans.toFixed(4)} N</strong>, directed upward (opposing the motion).`
        )}]
  },
  {
    id: "DYN-14", docNum: "Set 2 #14", title: "Braking Force to Meet Speed Limit Sign",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "slideCarBrake",
    baseVars: { m: 1950, v0: 24.6, vf: 11.2, d: 55.0 },
    randomize: (b) => { const vf = rnd(b.vf, 0.15, 1); return { m: Math.round(rnd(b.m, 0.2, 0)), v0: Number((vf + rnd(b.v0 - b.vf, 0.2, 1)).toFixed(1)), vf, d: rnd(b.d, 0.2, 1) }; },
    renderPrompt: (v) => `A <strong>${v.m.toLocaleString()}-kg</strong> car slows from <strong>${v.v0} m/s</strong> to <strong>${v.vf} m/s</strong> over <strong>${v.d} m</strong>. What braking force is required?`,
    parts: [{ label: "Braking force (<em>F</em>)", unit: "N", acceptNegative: true, solve: (v) => v.m * ((v.v0 * v.v0 - v.vf * v.vf) / (2 * v.d)), steps: (v, ans) => {
          const a = (v.v0 * v.v0 - v.vf * v.vf) / (2 * v.d);
          return guidedSteps(
            `Find the deceleration with the kinematic equation that has no time: <em>v</em><sub>f</sub>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>a</em><em>d</em>, where <em>a</em> is the size of the deceleration.`,
            `<em>a</em> = (<em>v</em><sub>0</sub>&sup2; &minus; <em>v</em><sub>f</sub>&sup2;) / (2<em>d</em>) = (${v.v0}&sup2; &minus; ${v.vf}&sup2;) / (2 &times; ${v.d}) = ${a.toFixed(3)} m/s².`,
            `Newton's second law: <em>F</em> = <em>m</em><em>a</em> = (${v.m} kg)(${a.toFixed(3)} m/s²) = <strong>${ans.toFixed(0)} N</strong>, directed opposite to the car's motion.`
          );
        }}]
  },
  {
    id: "DYN-15", docNum: "Set 2 #15", title: "Baseball Striking Catcher's Mitt",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "baseballGlove",
    baseVars: { m: 0.14, v0: 45, dCm: 11 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 3), v0: rnd(b.v0, 0.2, 1), dCm: rnd(b.dCm, 0.2, 1) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> baseball moving at <strong>${v.v0} m/s</strong> pushes a baseball glove back <strong>${v.dCm} cm</strong> as it comes to rest. Find the magnitude of the average net force acting on the ball.`,
    parts: [{ label: "Average net force (<em>F</em><sub>avg</sub>)", unit: "N", solve: (v) => (v.m * v.v0 * v.v0) / (2 * (v.dCm / 100)), steps: (v, ans) => {
          const d = v.dCm / 100, a = (v.v0 * v.v0) / (2 * d);
          return guidedSteps(
            `The ball stops (final speed 0) while moving ${v.dCm} cm = ${d.toFixed(2)} m, so first find its average deceleration. No time is given.`,
            `<em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>a</em><em>d</em> with <em>v</em> = 0 gives <em>a</em> = <em>v</em><sub>0</sub>&sup2; / (2<em>d</em>) = ${v.v0}&sup2; / (2 &times; ${d.toFixed(2)}) = ${a.toFixed(0)} m/s².`,
            `Newton's second law: <em>F</em><sub>avg</sub> = <em>m</em><em>a</em> = (${v.m} kg)(${a.toFixed(0)} m/s²) = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }}]
  },
  {
    id: "DYN-36", docNum: "Set 2 #36", title: "Finding Mass from Net Force and Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "dragBlockForces",
    baseVars: { F1: 18.3, F2: 6.70, a: 2.32 },
    randomize: (b) => { const F2 = rnd(b.F2, 0.2, 2); return { F1: Number((F2 + rnd(b.F1 - b.F2, 0.2, 1)).toFixed(1)), F2, a: rnd(b.a, 0.2, 2) }; },
    renderPrompt: (v) => `A mass has forward force <strong>+${v.F1} N</strong> and resistance <strong>&minus;${v.F2} N</strong>, accelerating at <strong>${v.a} m/s&sup2;</strong>. Find its mass.`,
    parts: [{ label: "Mass (<em>m</em>)", unit: "kg", solve: (v) => (v.F1 - v.F2) / v.a, steps: (v, ans) => guidedSteps(
          `The forward force is +${v.F1} N and the resistance is &minus;${v.F2} N, so the net force is <em>F</em><sub>net</sub> = ${v.F1} &minus; ${v.F2} = ${(v.F1 - v.F2).toFixed(2)} N.`,
          `Newton's second law: <em>F</em><sub>net</sub> = <em>m</em><em>a</em>, so <em>m</em> = <em>F</em><sub>net</sub> / <em>a</em>.`,
          `Substitute: <em>m</em> = ${(v.F1 - v.F2).toFixed(2)} N / ${v.a} m/s² = <strong>${ans.toFixed(2)} kg</strong>.`
        )}]
  },
  {
    id: "DYN-37", docNum: "Set 2 #37", title: "Air Resistance on an Accelerating Skydiver",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "airDragSkydiver",
    baseVars: { W: 793.8, a: 8.40 },
    randomize: (b) => ({ W: rnd(b.W, 0.2, 1), a: rnd(b.a, 0.1, 2) }),
    renderPrompt: (v) => `A skydiver weighing <strong>${v.W} N</strong> accelerates downward at <strong>${v.a} m/s&sup2;</strong>. Find the air resistance force.`,
    parts: [{ label: "Force of air resistance (<em>F</em><sub>air</sub>)", unit: "N", solve: (v) => v.W - (v.W / G_ACCEL) * v.a, steps: (v, ans) => {
          const m = v.W / G_ACCEL;
          return guidedSteps(
            `Take down as positive. The skydiver's weight <em>W</em> = ${v.W} N acts down and air resistance <em>F</em><sub>air</sub> acts up. The mass is <em>m</em> = <em>W</em> / <em>g</em> = ${v.W} / 9.80 = ${m.toFixed(1)} kg.`,
            `Newton's second law: <em>W</em> &minus; <em>F</em><sub>air</sub> = <em>m</em><em>a</em>, so <em>F</em><sub>air</sub> = <em>W</em> &minus; <em>m</em><em>a</em>.`,
            `Substitute: <em>F</em><sub>air</sub> = ${v.W} &minus; (${m.toFixed(1)})(${v.a}) = <strong>${ans.toFixed(1)} N</strong>, directed upward. It is small because the skydiver is only just beginning to feel the drag.`
          );
        }}]
  },
  {
    id: "DYN-41", docNum: "Doc 1 #1", title: "Car Braking to Rest: Acceleration and Net Force",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "slideCarStop",
    baseVars: { m: 1489, v0: 22.7, d: 68.3 },
    randomize: (b) => ({ m: Math.round(rnd(b.m, 0.18, 0)), v0: rnd(b.v0, 0.18, 1), d: rnd(b.d, 0.18, 1) }),
    renderPrompt: (v) => `A <strong>${v.m.toLocaleString()}-kg</strong> car is traveling at a velocity of <strong>${v.v0} m/s</strong>. The car slows down and comes to rest over a distance of <strong>${v.d} meters</strong>.<br/><strong>a.</strong> What is the acceleration of the car?<br/><strong>b.</strong> What is the net force required to bring the car to a rest?`,
    parts: [
      { label: "a. Acceleration of the car (<em>a</em>)", unit: "m/s²", acceptNegative: true, solve: (v) => -(v.v0 * v.v0) / (2 * v.d), steps: (v, ans) => guidedSteps(
          `Known: initial velocity <em>v</em><sub>0</sub> = ${v.v0} m/s, final velocity 0, distance <em>d</em> = ${v.d} m. No time is given, so use the equation without time. Take the car's direction of motion as positive.`,
          `<em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>a</em><em>d</em> with <em>v</em> = 0 gives <em>a</em> = &minus;<em>v</em><sub>0</sub>&sup2; / (2<em>d</em>).`,
          `Substitute: <em>a</em> = &minus;(${v.v0})&sup2; / (2 &times; ${v.d}) = <strong>${ans.toFixed(2)} m/s²</strong>. The negative sign means the acceleration points opposite to the car's motion.`
        )},
      { label: "b. Net braking force (<em>F</em><sub>net</sub>)", unit: "N", acceptNegative: true, solve: (v) => -v.m * ((v.v0 * v.v0) / (2 * v.d)), steps: (v, ans) => {
          const a = -(v.v0 * v.v0) / (2 * v.d);
          return guidedSteps(
            `The net force on the car is found with Newton's second law, using the acceleration from part a: <em>a</em> = ${a.toFixed(2)} m/s². The mass is ${v.m} kg.`,
            `<em>F</em><sub>net</sub> = <em>m</em><em>a</em>.`,
            `Substitute: <em>F</em><sub>net</sub> = (${v.m} kg)(${a.toFixed(2)} m/s²) = <strong>${ans.toFixed(1)} N</strong>. The negative sign means the force points opposite to the car's motion.`
          );
        }}
    ]
  },
  {
    id: "DYN-44", docNum: "Doc 1 #4", title: "Served Tennis Ball Net Force",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "tennisServe",
    baseVars: { mG: 56.8, vf: 41.0, dCm: 46.2 },
    randomize: (b) => ({ mG: rnd(b.mG, 0.15, 1), vf: rnd(b.vf, 0.18, 1), dCm: rnd(b.dCm, 0.18, 1) }),
    renderPrompt: (v) => `When a <strong>${v.mG}-gram</strong> tennis ball is served, it accelerates from rest to a speed of <strong>${v.vf} m/s</strong>. The impact with the racket gives the ball a constant acceleration over a distance of <strong>${v.dCm} cm</strong>. What is the magnitude of the net force acting on the ball?`,
    parts: [
      { label: "Magnitude of net force (<em>F</em><sub>net</sub>)", unit: "N", solve: (v) => ((v.mG / 1000) * v.vf * v.vf) / (2 * (v.dCm / 100)), steps: (v, ans) => {
          const m = v.mG / 1000, d = v.dCm / 100, a = (v.vf * v.vf) / (2 * d);
          return guidedSteps(
            `Convert to SI units first: <em>m</em> = ${v.mG} g = ${m.toFixed(4)} kg and <em>d</em> = ${v.dCm} cm = ${d.toFixed(3)} m.`,
            `Find the acceleration from <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>a</em><em>d</em> with <em>v</em><sub>0</sub> = 0: <em>a</em> = <em>v</em><sup>2</sup> / (2<em>d</em>) = ${v.vf}&sup2; / (2 &times; ${d.toFixed(3)}) = ${a.toFixed(0)} m/s².`,
            `Newton's second law: <em>F</em><sub>net</sub> = <em>m</em><em>a</em> = (${m.toFixed(4)} kg)(${a.toFixed(0)} m/s²) = <strong>${ans.toFixed(2)} N</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-48", docNum: "Doc 1 #8", title: "Fireman Sliding Down Fire Station Pole",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "firePole",
    baseVars: { m: 91.7, h: 4.92, vf: 1.48 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), h: rnd(b.h, 0.15, 2), vf: rnd(b.vf, 0.15, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> fireman slides down a pole <strong>${v.h} m</strong>, beginning from rest, and he lands with a speed of <strong>${v.vf} m/s</strong>. Find the friction force acting on the fireman.`,
    parts: [{ label: "Friction force (<em>f</em>)", unit: "N", solve: (v) => v.m * (G_ACCEL - (v.vf * v.vf) / (2 * v.h)), steps: (v, ans) => {
          const a = (v.vf * v.vf) / (2 * v.h);
          return guidedSteps(
            `First find the fireman's acceleration down the pole. He starts at rest, slides <em>h</em> = ${v.h} m, and lands at ${v.vf} m/s: <em>a</em> = <em>v</em><sub>f</sub>&sup2; / (2<em>h</em>) = ${v.vf}&sup2; / (2 &times; ${v.h}) = ${a.toFixed(3)} m/s². This is far less than <em>g</em>, so friction must be large.`,
            `Take down as positive. Forces: weight <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(1)} N (down) and friction <em>f</em> (up). Newton's second law: <em>m</em><em>g</em> &minus; <em>f</em> = <em>m</em><em>a</em>.`,
            `Solve: <em>f</em> = <em>m</em>(<em>g</em> &minus; <em>a</em>) = ${v.m}(9.80 &minus; ${a.toFixed(3)}) = <strong>${ans.toFixed(1)} N</strong>, directed upward along the pole.`
          );
        }}]
  },
  {
    id: "DYN-52", docNum: "Doc 2 #8", title: "Motorboat Acceleration with Wind and Water Resistance",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "boatForces",
    baseVars: { m: 3592, Fdrive: 2853, Fwind: 765, Fwater: 1345 },
    randomize: (b) => {
      const Fwind = Math.round(rnd(b.Fwind, 0.15, 0));
      const Fwater = Math.round(rnd(b.Fwater, 0.15, 0));
      const Fdrive = Fwind + Fwater + Math.round(rnd(743, 0.25, 0));
      return { m: Math.round(rnd(b.m, 0.15, 0)), Fdrive, Fwind, Fwater };
    },
    renderPrompt: (v) => `A boat has a mass of <strong>${v.m.toLocaleString()} kg</strong>. Its engines generate a drive force of <strong>${v.Fdrive.toLocaleString()} N due west</strong>, while the wind exerts a force of <strong>${v.Fwind} N due east</strong> and the water exerts a resistive force of <strong>${v.Fwater.toLocaleString()} N due east</strong>. Take west to be the negative direction. What is the boat’s acceleration, with the correct sign?`,
    parts: [
      { label: "Boat acceleration (<em>a</em>)", unit: "m/s²", acceptNegative: true, solve: (v) => (-v.Fdrive + v.Fwind + v.Fwater) / v.m, steps: (v, ans) => {
          const Fnet = -v.Fdrive + v.Fwind + v.Fwater;
          return guidedSteps(
            `Take west as negative, so east is positive. The drive force points west: &minus;${v.Fdrive} N. The wind and the water both push east: +${v.Fwind} N and +${v.Fwater} N.`,
            `Add them: <em>F</em><sub>net</sub> = &minus;${v.Fdrive} + ${v.Fwind} + ${v.Fwater} = ${Fnet} N.`,
            `Newton's second law: <em>a</em> = <em>F</em><sub>net</sub> / <em>m</em> = ${Fnet} / ${v.m} = <strong>${ans.toFixed(3)} m/s²</strong>. The sign is ${ans < 0 ? 'negative, so the boat accelerates toward the west (the engines win)' : 'positive, so the boat accelerates toward the east'}.`
          );
        }}
    ]
  },
  {
    id: "DYN-54", docNum: "Doc 2 #10", title: "Amusement Park Roller Coaster Net Force",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "rollerCoaster",
    baseVars: { m: 6513, vf: 34.6, t: 9.25 },
    randomize: (b) => ({ m: Math.round(rnd(b.m, 0.15, 0)), vf: rnd(b.vf, 0.15, 1), t: rnd(b.t, 0.15, 2) }),
    renderPrompt: (v) => `An amusement park roller coaster accelerates its riders from rest to <strong>${v.vf} m/s</strong> in a time of <strong>${v.t} seconds</strong>. The mass of the car and all of its riders is <strong>${v.m.toLocaleString()} kg</strong>. Find the magnitude of the net force exerted on the car and the riders.`,
    parts: [
      { label: "Magnitude of net force (<em>F</em><sub>net</sub>)", unit: "N", altUnitSolutions: [{ unit: "kN", solve: (v) => (v.m * (v.vf / v.t)) / 1000 }], solve: (v) => v.m * (v.vf / v.t), steps: (v, ans) => {
          const a = v.vf / v.t, F = v.m * a;
          return guidedSteps(
            `The coaster starts from rest and reaches ${v.vf} m/s in ${v.t} s, so its average acceleration is <em>a</em> = &Delta;<em>v</em> / &Delta;<em>t</em> = ${v.vf} / ${v.t} = ${a.toFixed(3)} m/s².`,
            `The net force on the car and riders comes from Newton's second law, using the total mass ${v.m} kg: <em>F</em><sub>net</sub> = <em>m</em><em>a</em>.`,
            `Substitute: <em>F</em><sub>net</sub> = (${v.m})(${a.toFixed(3)}) = <strong>${F.toFixed(0)} N</strong> (that is ${(F / 1000).toFixed(2)} kN).`
          );
        }}
    ]
  },
  {
    id: "DYN-58", docNum: "Set 3 #4", title: "Skydiver Acceleration and Parachute Terminal Descent",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "airDragSkydiverFrac",
    baseVars: { m: 62, den: 4 },
    randomize: (b) => ({ m: rnd(b.m, 0.20, 1), den: randInt(2, 5) }),
    renderPrompt: (v) => `<strong>a.</strong> What is the acceleration of a <strong>${v.m}-kg</strong> skydiver, when the force of air resistance acting on her is ${({2:"one-half",3:"one-third",4:"one-fourth",5:"one-fifth"})[v.den]} of her weight?<br/><strong>b.</strong> After opening the parachute, she descends to the ground at a constant speed. What is the force of air resistance now?`,
    parts: [
      { label: "a. Acceleration of skydiver (<em>a</em>)", unit: "m/s²", acceptNegative: true, solve: (v) => (1 - 1 / v.den) * G_ACCEL, steps: (v, ans) => guidedSteps(
          `Take down as positive. Two forces act on the skydiver: her weight <em>m</em><em>g</em> (down) and air resistance, which is ${({2:"one-half",3:"one-third",4:"one-fourth",5:"one-fifth"})[v.den]} of her weight, <em>m</em><em>g</em>/${v.den} = ${(1 / v.den).toFixed(3)}<em>m</em><em>g</em> (up).`,
          `Net force: <em>F</em><sub>net</sub> = <em>m</em><em>g</em> &minus; ${(1 / v.den).toFixed(3)}<em>m</em><em>g</em> = ${(1 - 1 / v.den).toFixed(3)}<em>m</em><em>g</em>. Newton's second law: <em>a</em> = <em>F</em><sub>net</sub> / <em>m</em> = ${(1 - 1 / v.den).toFixed(3)}<em>g</em>. The mass (${v.m} kg) cancels.`,
          `Substitute: <em>a</em> = ${(1 - 1 / v.den).toFixed(3)} &times; 9.80 = <strong>${ans.toFixed(2)} m/s²</strong>, directed downward.`
        )},
      { label: "b. Force of air resistance at constant speed (<em>F</em><sub>air</sub>)", unit: "N", solve: (v) => v.m * G_ACCEL, steps: (v, ans) => guidedSteps(
          `A constant speed means zero acceleration, so the net force is zero. Only two vertical forces act: her weight (down) and air resistance (up).`,
          `So the air resistance must equal the weight: <em>F</em><sub>air</sub> = <em>m</em><em>g</em>.`,
          `Substitute: <em>F</em><sub>air</sub> = ${v.m} &times; 9.80 = <strong>${ans.toFixed(1)} N</strong>, directed upward. (This is the idea of terminal velocity.)`
        )}
    ]
  },
  {
    id: "DYN-59", docNum: "Set 3 #5", title: "Purse Dropped from the Leaning Tower of Pisa",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "towerDrop",
    baseVars: { m: 1.6, h: 53, vf: 26 },
    randomize: (b) => {
      const m = rnd(b.m, 0.20, 2);
      const h = Math.round(rnd(b.h, 0.18, 0));
      const a = rnd(6.38, 0.15, 2);
      const vf = Number(Math.sqrt(2 * a * h).toFixed(1));
      return { m, h, vf };
    },
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> purse is dropped from the top of the Leaning Tower of Pisa, and it falls <strong>${v.h} m</strong> before reaching the ground with a speed of <strong>${v.vf} m/s</strong>. What was the average force of air resistance on the purse?`,
    parts: [
      { label: "Average force of air resistance (<em>F</em><sub>air</sub>)", unit: "N", acceptNegative: true, solve: (v) => v.m * (G_ACCEL - (v.vf * v.vf) / (2 * v.h)), steps: (v, ans) => {
          const a = (v.vf * v.vf) / (2 * v.h);
          return guidedSteps(
            `The purse falls slower than free fall would allow, so air resistance acts upward. First find its real acceleration from kinematics: it starts from rest, falls <em>h</em> = ${v.h} m, and hits at ${v.vf} m/s. <em>a</em> = <em>v</em><sub>f</sub>&sup2; / (2<em>h</em>) = ${v.vf}&sup2; / (2 &times; ${v.h}) = ${a.toFixed(2)} m/s².`,
            `Take down as positive. Newton's second law: <em>m</em><em>g</em> &minus; <em>F</em><sub>air</sub> = <em>m</em><em>a</em>, so <em>F</em><sub>air</sub> = <em>m</em>(<em>g</em> &minus; <em>a</em>).`,
            `Substitute: <em>F</em><sub>air</sub> = ${v.m}(9.80 &minus; ${a.toFixed(2)}) = <strong>${ans.toFixed(2)} N</strong>, directed upward.`
          );
        }}
    ]
  },
  {
    id: "DYN-60", docNum: "Set 3 #6", title: "Child-Restraint Chair Force During Car Collision",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "carCrashTree",
    baseVars: { m: 18, vKmh: 52, t: 0.23 },
    randomize: (b) => ({ m: Math.round(rnd(b.m, 0.20, 0)), vKmh: Math.round(rnd(b.vKmh, 0.20, 0)), t: rnd(b.t, 0.20, 2) }),
    renderPrompt: (v) => `An <strong>${v.m}-kg</strong> child is riding in a child-restraint chair, securely fastened to the seat of a car. Assume the car has a speed of <strong>${v.vKmh} km/hr</strong> when it hits a tree and is brought to rest in <strong>${v.t} s</strong>. Assuming constant deceleration during the collision, estimate the net horizontal force that the straps of the restraint chair exert on the child to hold her in the chair.`,
    parts: [
      { label: "Net horizontal restraining force (<em>F</em><sub>net</sub>)", unit: "N", acceptNegative: true, altUnitSolutions: [{ unit: "kN", solve: (v) => (v.m * ((v.vKmh / 3.6) / v.t)) / 1000 }], solve: (v) => v.m * ((v.vKmh / 3.6) / v.t), steps: (v, ans) => {
          const v0 = v.vKmh / 3.6, a = v0 / v.t, F = v.m * a;
          return guidedSteps(
            `Convert the speed to m/s: <em>v</em><sub>0</sub> = ${v.vKmh} km/h &divide; 3.6 = ${v0.toFixed(2)} m/s. The child, fastened to the car, also goes from this speed to rest in ${v.t} s.`,
            `Constant deceleration: |<em>a</em>| = <em>v</em><sub>0</sub> / <em>t</em> = ${v0.toFixed(2)} / ${v.t} = ${a.toFixed(2)} m/s².`,
            `The straps provide the net horizontal force on the child: <em>F</em> = <em>m</em>|<em>a</em>| = (${v.m} kg)(${a.toFixed(2)} m/s²) = <strong>${F.toFixed(0)} N</strong> (about ${(F / 1000).toFixed(2)} kN), directed backward, opposite the car's original motion.`
          );
        }}
    ]
  },
  {
    id: "DYN-61", docNum: "Set 3 #7", title: "Rock Dropped on a New Planet: Gravity and Weight",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "dropRockPlanet",
    baseVars: { m: 2.00, h: 1.00, t: 0.64 },
    randomize: (b) => ({ m: rnd(b.m, 0.20, 2), h: rnd(b.h, 0.20, 2), t: rnd(b.t, 0.18, 2) }),
    renderPrompt: (v) => `An astronaut drops a <strong>${v.m.toFixed(2)} kg</strong> rock from a height of <strong>${v.h.toFixed(2)} meter</strong> above the surface of a new planet. It takes the rock <strong>${v.t} seconds</strong> to hit the ground.<br/><strong>a.</strong> What is the acceleration due to gravity on the planet?<br/><strong>b.</strong> What is the rock’s weight on the planet?`,
    parts: [
      { label: "a. Acceleration due to gravity (<em>g</em><sub>planet</sub>)", unit: "m/s²", acceptedUnits: ["m/s²", "N/kg"], solve: (v) => (2 * v.h) / (v.t * v.t), steps: (v, ans) => guidedSteps(
          `The rock is dropped, so it starts from rest and falls <em>h</em> = ${v.h.toFixed(2)} m in <em>t</em> = ${v.t} s with a constant acceleration, which is the planet's gravity <em>g</em><sub>planet</sub>.`,
          `Use <em>h</em> = &frac12;<em>g</em><em>t</em>&sup2; and solve for <em>g</em>: <em>g</em> = 2<em>h</em> / <em>t</em>&sup2;.`,
          `Substitute: <em>g</em><sub>planet</sub> = 2(${v.h.toFixed(2)}) / (${v.t})&sup2; = <strong>${ans.toFixed(2)} m/s²</strong>.`
        )},
      { label: "b. Rock's weight on the planet (<em>W</em>)", unit: "N", solve: (v) => v.m * ((2 * v.h) / (v.t * v.t)), steps: (v, ans) => {
          const g = (2 * v.h) / (v.t * v.t);
          return guidedSteps(
            `Weight depends on the local gravity. Use the planet's value from part a, <em>g</em><sub>planet</sub> = ${g.toFixed(2)} m/s², and the rock's mass ${v.m.toFixed(2)} kg.`,
            `<em>W</em> = <em>m</em><em>g</em><sub>planet</sub>.`,
            `Substitute: <em>W</em> = (${v.m.toFixed(2)})(${g.toFixed(2)}) = <strong>${ans.toFixed(2)} N</strong>.`
          );
        }}
    ]
  },

  // --- NEW: "Gemini Physics Library Questions" Google Doc (Doc 3) ---
  {
    id: "DYN-77", docNum: "Doc 3 #1", title: "Weight and Mass on Another Planet",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "planetWeight",
    baseVars: { mRock: 6.3, gPlanet: 14.4, wBoulderKN: 2.3 },
    randomize: (b) => ({
      mRock: rnd(b.mRock, 0.20, 1),
      gPlanet: rnd(b.gPlanet, 0.20, 1),
      wBoulderKN: rnd(b.wBoulderKN, 0.20, 1)
    }),
    renderPrompt: (v) => '<strong>a.</strong> What is the weight of a <strong>' + v.mRock + '-kg</strong> rock on a planet in which the acceleration due to gravity is <strong>' + v.gPlanet + ' m/s²</strong>?<br/><strong>b.</strong> What is the mass of a boulder on the same planet that has a weight of <strong>' + v.wBoulderKN + ' kN</strong>?',
    parts: [
      {
        label: "a. Weight of rock",
        getLabel: (v) => 'a. Weight of ' + v.mRock + '-kg rock',
        unit: "N",
        solve: (v) => v.mRock * v.gPlanet,
        steps: (v, ans) => guidedSteps(
          `Weight is the gravitational force on an object, and it depends on the local gravity: <em>F</em><sub>g</sub> = <em>m</em><em>g</em>. Use this planet's value, <em>g</em> = ${v.gPlanet} m/s², not 9.80. The rock's mass is ${v.mRock} kg.`,
          `Substitute: <em>F</em><sub>g</sub> = (${v.mRock} kg)(${v.gPlanet} m/s²) = <strong>${ans.toFixed(1)} N</strong>.`
        )},
      {
        label: "b. Mass of boulder",
        getLabel: (v) => 'b. Mass of ' + v.wBoulderKN + '-kN boulder',
        unit: "kg",
        solve: (v) => (v.wBoulderKN * 1000) / v.gPlanet,
        steps: (v, ans) => guidedSteps(
          `The boulder's weight is given in kilonewtons. Convert to newtons first: ${v.wBoulderKN} kN = ${v.wBoulderKN} &times; 1000 = ${v.wBoulderKN * 1000} N.`,
          `Rearrange <em>F</em><sub>g</sub> = <em>m</em><em>g</em> to get the mass: <em>m</em> = <em>F</em><sub>g</sub> / <em>g</em>, using the same planet's <em>g</em> = ${v.gPlanet} m/s².`,
          `Substitute: <em>m</em> = ${v.wBoulderKN * 1000} N / ${v.gPlanet} m/s² = <strong>${ans.toFixed(1)} kg</strong>. (Mass is the same everywhere; only the weight depends on the planet.)`
        )}
    ]
  },
  {
    id: "DYN-78", docNum: "Doc 3 #2", title: "Superman Stopping a Train",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "slideTrain",
    baseVars: { d: 135, mExp5: 3.8, v0Kmh: 90 }, // NOTE: the Google Doc does not give the train's speed; 90 km/h (25 m/s) is assumed
    randomize: (b) => ({
      d: Math.round(rnd(b.d, 0.20, 0)),
      mExp5: rnd(b.mExp5, 0.20, 1),
      v0Kmh: Math.round(rnd(b.v0Kmh, 0.15, 0))
    }),
    renderPrompt: (v) => 'Superman must stop a train moving at <strong>' + v.v0Kmh + ' km/h</strong> in <strong>' + v.d + ' m</strong> to keep it from hitting a stalled car on the tracks. If the train’s mass is <strong>' + v.mExp5 + ' × 10⁵ kg</strong>, how much force must Superman exert?',
    parts: [
      {
        label: "Stopping force magnitude",
        unit: "N",
        solve: (v) => {
          const v0 = (v.v0Kmh * 1000) / 3600;
          const a = (v0 * v0) / (2 * v.d);
          return (v.mExp5 * 1e5) * a;
        },
        steps: (v, ans) => {
          const v0 = (v.v0Kmh * 1000) / 3600, a = (v0 * v0) / (2 * v.d), M = v.mExp5 * 1e5;
          return guidedSteps(
            `Convert the speed to m/s: <em>v</em><sub>0</sub> = ${v.v0Kmh} km/h &times; 1000 m/km &divide; 3600 s/h = ${v0.toFixed(2)} m/s. The train must stop (final speed 0) within <em>d</em> = ${v.d} m.`,
            `Find the deceleration with the equation without time: 0 = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>a</em><em>d</em>, so |<em>a</em>| = <em>v</em><sub>0</sub>&sup2; / (2<em>d</em>) = (${v0.toFixed(2)})&sup2; / (2 &times; ${v.d}) = ${a.toFixed(3)} m/s².`,
            `Newton's second law with the train's mass <em>M</em> = ${v.mExp5} &times; 10<sup>5</sup> kg: <em>F</em> = <em>M</em>|<em>a</em>| = (${M.toExponential(2)} kg)(${a.toFixed(3)} m/s²) = <strong>${ans.toExponential(3)} N</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-79", docNum: "Doc 3 #3", title: "Automobile Crash Survivability",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "crashDecel",
    baseVars: { gLimit: 30, m: 58, v0Kmh: 86 },
    randomize: (b) => ({
      gLimit: Math.round(rnd(b.gLimit, 0.15, 0)),
      m: Math.round(rnd(b.m, 0.20, 0)),
      v0Kmh: Math.round(rnd(b.v0Kmh, 0.15, 0))
    }),
    renderPrompt: (v) => 'A person has a reasonable chance of surviving an automobile crash if the deceleration is no more than <strong>' + v.gLimit + ' g’s</strong>.<br/><strong>a.</strong> Calculate the net force on a <strong>' + v.m + '-kg</strong> person accelerating at this rate.<br/><strong>b.</strong> What is that force in pounds? (Use 1 lb. = 4.45 N)<br/><strong>c.</strong> What distance does this person travel if brought to rest at this rate of acceleration from <strong>' + v.v0Kmh + ' km/h</strong>?',
    parts: [
      {
        label: "a. Net force",
        getLabel: (v) => 'a. Net force on ' + v.m + '-kg person',
        unit: "N",
        solve: (v) => v.m * (v.gLimit * G_ACCEL),
        steps: (v, ans) => guidedSteps(
          `The deceleration limit is ${v.gLimit} "g's", meaning ${v.gLimit} times the free-fall acceleration: <em>a</em> = ${v.gLimit} &times; 9.80 = ${(v.gLimit * G_ACCEL).toFixed(1)} m/s².`,
          `Newton's second law: <em>F</em><sub>net</sub> = <em>m</em><em>a</em> = (${v.m} kg)(${(v.gLimit * G_ACCEL).toFixed(1)} m/s²).`,
          `<em>F</em><sub>net</sub> = <strong>${ans.toFixed(0)} N</strong>, which is ${v.gLimit} times the person's weight.`
        )},
      {
        label: "b. Net force in pounds",
        getLabel: () => 'b. Force in pounds',
        unit: "lb",
        solve: (v) => (v.m * (v.gLimit * G_ACCEL)) / 4.45,
        steps: (v, ans) => {
          const F = v.m * v.gLimit * G_ACCEL;
          return guidedSteps(
            `Convert the force from part a (${F.toFixed(0)} N) to pounds using 1 lb = 4.45 N.`,
            `Divide by 4.45 N per pound: <em>F</em> = ${F.toFixed(0)} N / 4.45 N/lb.`,
            `<em>F</em> = <strong>${ans.toFixed(0)} lb</strong>.`
          );
        }},
      {
        label: "c. Stopping distance",
        getLabel: (v) => 'c. Distance to stop from ' + v.v0Kmh + ' km/h',
        unit: "m",
        solve: (v) => {
          const v0 = (v.v0Kmh * 1000) / 3600;
          return (v0 * v0) / (2 * (v.gLimit * G_ACCEL));
        },
        steps: (v, ans) => {
          const v0 = (v.v0Kmh * 1000) / 3600, a = v.gLimit * G_ACCEL;
          return guidedSteps(
            `Convert the speed: <em>v</em><sub>0</sub> = ${v.v0Kmh} km/h &divide; 3.6 = ${v0.toFixed(2)} m/s. The person decelerates at ${a.toFixed(1)} m/s² (${v.gLimit} g's) until stopping.`,
            `Use the equation without time: 0 = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>a</em><em>d</em>, so <em>d</em> = <em>v</em><sub>0</sub>&sup2; / (2<em>a</em>).`,
            `Substitute: <em>d</em> = (${v0.toFixed(2)})&sup2; / (2 &times; ${a.toFixed(1)}) = <strong>${ans.toFixed(2)} m</strong>. This is the distance over which a car's front end would need to crumple to keep the deceleration this low.`
          );
        }}
    ]
  },
  {
    id: "DYN-80", docNum: "Doc 3 #4", title: "Stacked Blocks Normal Forces",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "stackedBlocks",
    baseVars: { m1: 12.8, m2: 15.4, m3: 18.3 },
    randomize: (b) => ({
      m1: rnd(b.m1, 0.20, 1),
      m2: rnd(b.m2, 0.20, 1),
      m3: rnd(b.m3, 0.20, 1)
    }),
    renderPrompt: (v) => 'Blocks one, two, and three are stacked on top of each other (block 1 on top, block 2 in the middle, block 3 at the bottom), and their masses are <strong>' + v.m1 + ' kg</strong>, <strong>' + v.m2 + ' kg</strong>, and <strong>' + v.m3 + ' kg</strong>, respectively.<br/><strong>a.</strong> What is the size of the force blocks one and two exert on each other?<br/><strong>b.</strong> What is the size of the force blocks two and three exert on each other?<br/><strong>c.</strong> What is the size of the force block three and the ground exert on each other?',
    parts: [
      {
        label: "a. Force between block 1 and 2",
        unit: "N",
        solve: (v) => v.m1 * G_ACCEL,
        steps: (v, ans) => guidedSteps(
          `Block 1 sits on top and rests on block 2, so block 1 is in equilibrium. Only two vertical forces act on it: its weight <em>m</em><sub>1</sub><em>g</em> (down) and the normal force from block 2 (up).`,
          `Equilibrium: <em>N</em><sub>12</sub> = <em>m</em><sub>1</sub><em>g</em> = (${v.m1} kg)(9.80 m/s²) = <strong>${ans.toFixed(1)} N</strong>.`,
          `By Newton's third law, block 1 pushes down on block 2 with this same force.`
        )},
      {
        label: "b. Force between block 2 and 3",
        unit: "N",
        solve: (v) => (v.m1 + v.m2) * G_ACCEL,
        steps: (v, ans) => guidedSteps(
          `Consider blocks 1 and 2 together as a system in equilibrium. The only upward force on this system is the normal force from block 3, and the downward force is the combined weight (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)<em>g</em>.`,
          `Combined mass: ${v.m1} + ${v.m2} = ${(v.m1 + v.m2).toFixed(1)} kg.`,
          `<em>N</em><sub>23</sub> = (${(v.m1 + v.m2).toFixed(1)} kg)(9.80 m/s²) = <strong>${ans.toFixed(1)} N</strong>.`,
          `Check using block 2 alone: block 3 pushes up with <em>N</em><sub>23</sub>, while block 2's weight and block 1's push (${(v.m1 * G_ACCEL).toFixed(1)} N) push down: ${(v.m2 * G_ACCEL).toFixed(1)} + ${(v.m1 * G_ACCEL).toFixed(1)} = ${ans.toFixed(1)} N.`
        )},
      {
        label: "c. Force between block 3 and ground",
        unit: "N",
        solve: (v) => (v.m1 + v.m2 + v.m3) * G_ACCEL,
        steps: (v, ans) => guidedSteps(
          `The ground supports the entire stack. Treat all three blocks as one system in equilibrium: the normal force from the ground balances the total weight.`,
          `Total mass: ${v.m1} + ${v.m2} + ${v.m3} = ${(v.m1 + v.m2 + v.m3).toFixed(1)} kg.`,
          `<em>N</em><sub>3G</sub> = (${(v.m1 + v.m2 + v.m3).toFixed(1)} kg)(9.80 m/s²) = <strong>${ans.toFixed(1)} N</strong>. The ground pushes up on block 3 with this force, and block 3 pushes down on the ground with an equal force (Newton's third law).`
        )}
    ]
  },
  {
    id: "DYN-81", docNum: "Doc 3 #5", title: "Tension in an Accelerated Bucket",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Elevators and Apparent Weight", diagram: "bucketRope",
    baseVars: { m: 14.6, aUp: 0.92, aDown: 1.06 },
    randomize: (b) => ({
      m: rnd(b.m, 0.20, 1),
      aUp: rnd(b.aUp, 0.20, 2),
      aDown: rnd(b.aDown, 0.20, 2)
    }),
    renderPrompt: (v) => 'A bucket with water has a mass of <strong>' + v.m + ' kg</strong>.<br/><strong>a.</strong> Find the size of the tension in the rope supporting the bucket if it is accelerated upwards at <strong>' + v.aUp + ' m/s²</strong>.<br/><strong>b.</strong> Find the size of the tension in the rope supporting the bucket if it is accelerated downwards at <strong>' + v.aDown + ' m/s²</strong>.',
    parts: [
      {
        label: "a. Tension accelerating upwards",
        unit: "N",
        solve: (v) => v.m * (G_ACCEL + v.aUp),
        steps: (v, ans) => guidedSteps(
          `Take up as positive. Two forces act on the bucket: the rope tension <em>T</em> (up) and its weight <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(1)} N (down). It accelerates upward at ${v.aUp} m/s², so the net force is upward.`,
          `Newton's second law: <em>T</em> &minus; <em>m</em><em>g</em> = <em>m</em><em>a</em>, so <em>T</em> = <em>m</em>(<em>g</em> + <em>a</em>).`,
          `Substitute: <em>T</em> = (${v.m} kg)(9.80 + ${v.aUp}) = <strong>${ans.toFixed(1)} N</strong>, which is greater than the weight.`
        )},
      {
        label: "b. Tension accelerating downwards",
        unit: "N",
        solve: (v) => v.m * (G_ACCEL - v.aDown),
        steps: (v, ans) => guidedSteps(
          `Take down as positive. The bucket accelerates downward at ${v.aDown} m/s², so the net force is downward: the weight <em>m</em><em>g</em> = ${(v.m * G_ACCEL).toFixed(1)} N must exceed the tension.`,
          `Newton's second law: <em>m</em><em>g</em> &minus; <em>T</em> = <em>m</em><em>a</em>, so <em>T</em> = <em>m</em>(<em>g</em> &minus; <em>a</em>).`,
          `Substitute: <em>T</em> = (${v.m} kg)(9.80 &minus; ${v.aDown}) = <strong>${ans.toFixed(1)} N</strong>, which is less than the weight.`
        )}
    ]
  },
  {
    id: "DYN-82", docNum: "Doc 3 #6", title: "Asteroid Deflection by Space Tug",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "asteroidTug",
    baseVars: { mExp9: 1.0, dvCmS: 0.3, fN: 2.8 },
    randomize: (b) => ({
      mExp9: rnd(b.mExp9, 0.20, 1),
      dvCmS: rnd(b.dvCmS, 0.20, 2),
      fN: rnd(b.fN, 0.20, 1)
    }),
    renderPrompt: (v) => 'A “doomsday” asteroid with a mass of <strong>' + v.mExp9 + ' × 10⁹ kg</strong> is hurtling through space. Unless the asteroid’s speed is changed by <strong>' + v.dvCmS + ' cm/s</strong>, it will collide with Earth and cause tremendous damage. Researchers suggest that a small “space tug” applied to the asteroid’s surface could exert a gentle constant force of <strong>' + v.fN + ' N</strong>. For how long must this force act to achieve this change in speed?',
    parts: [
      {
        label: "Time required (Δt)",
        unit: "s",
        placeholder: "e.g. 1.07e6",
        solve: (v) => ((v.mExp9 * 1e9) * (v.dvCmS / 100)) / v.fN,
        steps: (v, ans) => {
          const M = v.mExp9 * 1e9, dv = v.dvCmS / 100;
          return guidedSteps(
            `Convert the speed change to m/s: &Delta;<em>v</em> = ${v.dvCmS} cm/s &divide; 100 = ${dv} m/s. The asteroid's mass is <em>M</em> = ${v.mExp9} &times; 10<sup>9</sup> kg = ${M.toExponential(2)} kg.`,
            `A constant force gives a constant acceleration, so <em>a</em> = <em>F</em> / <em>M</em> = ${v.fN} / ${M.toExponential(2)} = ${(v.fN / M).toExponential(2)} m/s². (Equivalently, use impulse: <em>F</em>&Delta;<em>t</em> = <em>M</em>&Delta;<em>v</em>.)`,
            `Solve for the time: &Delta;<em>t</em> = <em>M</em>&Delta;<em>v</em> / <em>F</em> = (${M.toExponential(2)})(${dv}) / ${v.fN} = <strong>${ans.toExponential(3)} s</strong>, which is about ${(ans / 86400 / 365.25).toFixed(1)} years.`
          );
        }}
    ]
  },
  {
    id: "DYN-83", docNum: "Doc 3 #7", title: "Net Force on a Kayak and Paddler",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "kayak",
    baseVars: { mPerson: 61, mKayak: 13, vf: 0.80, dCm: 52 },
    randomize: (b) => ({
      mPerson: Math.round(rnd(b.mPerson, 0.20, 0)),
      mKayak: Math.round(rnd(b.mKayak, 0.20, 0)),
      vf: rnd(b.vf, 0.20, 2),
      dCm: Math.round(rnd(b.dCm, 0.20, 0))
    }),
    renderPrompt: (v) => 'A <strong>' + v.mPerson + '-kg</strong> person in a <strong>' + v.mKayak + '-kg</strong> kayak starts paddling, and she accelerates from 0 to <strong>' + v.vf + ' m/s</strong> over a distance of <strong>' + v.dCm + ' cm</strong>. What is the magnitude of the net force acting on the kayak?',
    parts: [
      {
        label: "Net force magnitude",
        unit: "N",
        solve: (v) => {
          const a = (v.vf * v.vf) / (2 * (v.dCm / 100));
          return (v.mPerson + v.mKayak) * a;
        },
        steps: (v, ans) => {
          const d = v.dCm / 100, a = (v.vf * v.vf) / (2 * d), M = v.mPerson + v.mKayak;
          return guidedSteps(
            `Find the acceleration first. Convert the distance: <em>d</em> = ${v.dCm} cm = ${d.toFixed(2)} m. She starts at rest and reaches ${v.vf} m/s.`,
            `Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>a</em><em>d</em> with <em>v</em><sub>0</sub> = 0: <em>a</em> = <em>v</em>&sup2; / (2<em>d</em>) = (${v.vf})&sup2; / (2 &times; ${d.toFixed(2)}) = ${a.toFixed(3)} m/s².`,
            `The person and kayak accelerate together, so treat them as one object: <em>M</em> = ${v.mPerson} + ${v.mKayak} = ${M} kg.`,
            `Newton's second law: <em>F</em><sub>net</sub> = <em>M</em><em>a</em> = (${M} kg)(${a.toFixed(3)} m/s²) = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-84", docNum: "Doc 4 #1", title: "Two Hanging Buckets Connected by a Rope",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Multi-Body Systems and Pulleys", diagram: "hangingBuckets",
    baseVars: { m1: 8.3, m2: 6.5, aUp: 1.6, aDown: 0.94 },
    randomize: (b) => ({
      m1: rnd(b.m1, 0.20, 1),
      m2: rnd(b.m2, 0.20, 1),
      aUp: rnd(b.aUp, 0.20, 2),
      aDown: rnd(b.aDown, 0.20, 2)
    }),
    renderPrompt: (v) => 'Two hanging buckets are connected by a rope. The top bucket has a mass of <strong>' + v.m1 + ' kg</strong>, the bottom one has a mass of <strong>' + v.m2 + ' kg</strong>, and a force of tension accelerates them upwards at <strong>' + v.aUp + ' m/s²</strong>.<br/><strong>a.</strong> Find the tension in the top rope.<br/><strong>b.</strong> Find the tension in the bottom rope.<br/><strong>c.</strong> Find the tension in the top rope if the buckets are accelerating downwards at <strong>' + v.aDown + ' m/s²</strong>.<br/><strong>d.</strong> Find the tension in the bottom rope if the buckets are accelerating downwards at <strong>' + v.aDown + ' m/s²</strong>.',
    parts: [
      {
        label: "a. Tension in the top rope (accelerating upwards)",
        unit: "N",
        solve: (v) => (v.m1 + v.m2) * (G_ACCEL + v.aUp),
        steps: (v, ans) => guidedSteps(
          `The top rope supports <em>both</em> buckets, so treat them as one system with mass <em>m</em><sub>1</sub> + <em>m</em><sub>2</sub> = ${v.m1} + ${v.m2} = ${(v.m1 + v.m2).toFixed(1)} kg. The forces on the system are the top tension (up) and the total weight (down). Take up as positive.`,
          `Newton's second law: <em>T</em><sub>top</sub> &minus; (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)<em>g</em> = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)<em>a</em>, so <em>T</em><sub>top</sub> = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)(<em>g</em> + <em>a</em>).`,
          `Substitute: <em>T</em><sub>top</sub> = (${(v.m1 + v.m2).toFixed(1)} kg)(9.80 + ${v.aUp}) = <strong>${ans.toFixed(1)} N</strong>.`
        )},
      {
        label: "b. Tension in the bottom rope (accelerating upwards)",
        unit: "N",
        solve: (v) => v.m2 * (G_ACCEL + v.aUp),
        steps: (v, ans) => guidedSteps(
          `The bottom rope supports only the <em>bottom</em> bucket (mass <em>m</em><sub>2</sub> = ${v.m2} kg). Choose just that bucket as the system. Forces: <em>T</em><sub>bottom</sub> up, weight <em>m</em><sub>2</sub><em>g</em> down. Take up as positive.`,
          `Newton's second law: <em>T</em><sub>bottom</sub> &minus; <em>m</em><sub>2</sub><em>g</em> = <em>m</em><sub>2</sub><em>a</em>, so <em>T</em><sub>bottom</sub> = <em>m</em><sub>2</sub>(<em>g</em> + <em>a</em>).`,
          `Substitute: <em>T</em><sub>bottom</sub> = (${v.m2} kg)(9.80 + ${v.aUp}) = <strong>${ans.toFixed(1)} N</strong>. This is smaller than the top tension because it carries less mass.`
        )},
      {
        label: "c. Tension in the top rope (accelerating downwards)",
        unit: "N",
        solve: (v) => (v.m1 + v.m2) * (G_ACCEL - v.aDown),
        steps: (v, ans) => guidedSteps(
          `Same system as part a (both buckets, total mass ${(v.m1 + v.m2).toFixed(1)} kg), but now the acceleration points <em>down</em> at ${v.aDown} m/s². Take down as positive, so the weight is positive and the tension is negative.`,
          `Newton's second law: (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)<em>g</em> &minus; <em>T</em><sub>top</sub> = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)<em>a</em>, so <em>T</em><sub>top</sub> = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)(<em>g</em> &minus; <em>a</em>).`,
          `Substitute: <em>T</em><sub>top</sub> = (${(v.m1 + v.m2).toFixed(1)} kg)(9.80 &minus; ${v.aDown}) = <strong>${ans.toFixed(1)} N</strong>.`
        )},
      {
        label: "d. Tension in the bottom rope (accelerating downwards)",
        unit: "N",
        solve: (v) => v.m2 * (G_ACCEL - v.aDown),
        steps: (v, ans) => guidedSteps(
          `Choose just the bottom bucket (mass ${v.m2} kg) as the system, accelerating downward at ${v.aDown} m/s². Take down as positive: weight is positive, <em>T</em><sub>bottom</sub> acts up.`,
          `Newton's second law: <em>m</em><sub>2</sub><em>g</em> &minus; <em>T</em><sub>bottom</sub> = <em>m</em><sub>2</sub><em>a</em>, so <em>T</em><sub>bottom</sub> = <em>m</em><sub>2</sub>(<em>g</em> &minus; <em>a</em>).`,
          `Substitute: <em>T</em><sub>bottom</sub> = (${v.m2} kg)(9.80 &minus; ${v.aDown}) = <strong>${ans.toFixed(1)} N</strong>.`
        )}
    ]
  },
  {
    id: "DYN-85", docNum: "Set 4 #1", title: "Man Pulling a Crate Up a Rough Incline (Finding Friction Coefficient)",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "inclinePull",
    baseVars: { m: 35.0, theta: 24.0, F: 210, a: 1.6 },
    randomize: (b) => {
      const m = rnd(b.m, 0.10, 1), theta = rnd(b.theta, 0.10, 1), a = rnd(b.a, 0.10, 1);
      const mu0 = (b.F - b.m * b.a - b.m * G_ACCEL * Math.sin(b.theta * DEG2RAD)) / (b.m * G_ACCEL * Math.cos(b.theta * DEG2RAD));
      const muT = rnd(mu0, 0.25, 3);
      const F = Math.round(m * (a + G_ACCEL * Math.sin(theta * DEG2RAD) + muT * G_ACCEL * Math.cos(theta * DEG2RAD)));
      return { m, theta, F, a };
    },
    renderPrompt: (v) => `A man pulls a <strong>${v.m}-kg</strong> crate up a <strong>${v.theta}&deg;</strong> incline with a rope that is parallel to the incline. He pulls with a force of <strong>${v.F} N</strong>, and the crate accelerates up the incline at <strong>${v.a} m/s&sup2;</strong>. Find the coefficient of kinetic friction between the crate and the incline.`,
    parts: [{
      label: "Coefficient of kinetic friction (&mu;<sub>k</sub>)", unit: "No units",
      solve: (v) => (v.F - v.m * v.a - v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD)) / (v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD)),
      steps: (v, ans) => guidedSteps(
        `Choose axes along and perpendicular to the incline. Along the incline, up the slope: the pull <em>F</em>. Down the slope: the weight component <em>m</em><em>g</em> sin &theta; and kinetic friction <em>f</em><sub>k</sub> (the crate moves up, so friction points down the slope).`,
        `Perpendicular to the incline there is no acceleration, so <em>F</em><sub>N</sub> = <em>m</em><em>g</em> cos &theta; = (${v.m})(9.80) cos ${v.theta}&deg; = ${(v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD)).toFixed(1)} N.`,
        `Along the incline: <em>F</em> &minus; <em>m</em><em>g</em> sin &theta; &minus; <em>f</em><sub>k</sub> = <em>m</em><em>a</em>. Solve for friction: <em>f</em><sub>k</sub> = ${v.F} &minus; (${v.m})(9.80) sin ${v.theta}&deg; &minus; (${v.m})(${v.a}) = ${(v.F - v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD) - v.m * v.a).toFixed(1)} N.`,
        `Use <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em><sub>N</sub>: &mu;<sub>k</sub> = ${(v.F - v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD) - v.m * v.a).toFixed(1)} / ${(v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD)).toFixed(1)} = <strong>${ans.toFixed(3)}</strong>.`
      )
    }]
  },
  {
    id: "DYN-86", docNum: "Set 4 #3", title: "Box Pulled at an Angle Above the Horizontal on a Rough Floor",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "boxPullUp",
    baseVars: { W: 105, F: 153, theta: 19.0, mu: 0.22 },
    randomize: (b) => ({ W: Math.round(rnd(b.W, 0.10, 0)), F: Math.round(rnd(b.F, 0.10, 0)), theta: rnd(b.theta, 0.12, 1), mu: rnd(b.mu, 0.15, 2) }),
    renderPrompt: (v) => `A box weighing <strong>${v.W} N</strong> is pulled across a horizontal floor by a <strong>${v.F}-N</strong> force directed <strong>${v.theta}&deg;</strong> above the horizontal. The coefficient of kinetic friction between the box and the floor is <strong>${v.mu}</strong>. Find the acceleration of the box.`,
    parts: [{
      label: "Acceleration of the box (a)", unit: "m/s²",
      solve: (v) => {
        const N = v.W - v.F * Math.sin(v.theta * DEG2RAD);
        return (v.F * Math.cos(v.theta * DEG2RAD) - v.mu * N) / (v.W / G_ACCEL);
      },
      steps: (v, ans) => {
        const t = v.theta * DEG2RAD, N = v.W - v.F * Math.sin(t), m = v.W / G_ACCEL;
        return guidedSteps(
          `Resolve the pull into components: horizontal <em>F</em> cos &theta; = ${(v.F * Math.cos(t)).toFixed(1)} N, vertical <em>F</em> sin &theta; = ${(v.F * Math.sin(t)).toFixed(1)} N (upward). The weight is given directly as ${v.W} N, so the mass is <em>m</em> = <em>W</em>/<em>g</em> = ${v.W}/9.80 = ${m.toFixed(2)} kg.`,
          `Vertical (no acceleration): <em>F</em><sub>N</sub> + <em>F</em> sin &theta; = <em>W</em>, so <em>F</em><sub>N</sub> = ${v.W} &minus; ${(v.F * Math.sin(t)).toFixed(1)} = ${N.toFixed(1)} N. Because the pull lifts partly on the box, the normal force is less than the weight.`,
          `Kinetic friction: <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em><sub>N</sub> = (${v.mu})(${N.toFixed(1)}) = ${(v.mu * N).toFixed(1)} N.`,
          `Horizontal: <em>F</em> cos &theta; &minus; <em>f</em><sub>k</sub> = <em>m</em><em>a</em>, so <em>a</em> = (${(v.F * Math.cos(t)).toFixed(1)} &minus; ${(v.mu * N).toFixed(1)}) / ${m.toFixed(2)} = <strong>${ans.toFixed(2)} m/s²</strong>.`
        );
      }
    }]
  },
  {
    id: "DYN-87", docNum: "Set 4 #4", title: "Block Pressed Against a Wall: Sliding Up and Holding at Rest",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "wallBlockH",
    baseVars: { m: 4.0, theta: 32.0, mus: 0.50, muk: 0.30 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), theta: rnd(b.theta, 0.10, 1), mus: rnd(b.mus, 0.10, 2), muk: rnd(b.muk, 0.10, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> block is pushed against a vertical wall by a force <em>F</em> that makes a <strong>${v.theta}&deg;</strong> angle above the horizontal (so it pushes the block into the wall and upward). The coefficients of friction between the block and the wall are &mu;<sub>s</sub> = <strong>${v.mus}</strong> and &mu;<sub>k</sub> = <strong>${v.muk}</strong>.`,
    parts: [
      {
        label: "a. Force needed to slide the block up the wall at constant velocity (<em>F</em>)", unit: "N",
        solve: (v) => v.m * G_ACCEL / (Math.sin(v.theta * DEG2RAD) - v.muk * Math.cos(v.theta * DEG2RAD)),
        steps: (v, ans) => guidedSteps(
          `Resolve <em>F</em>: the horizontal part <em>F</em> cos &theta; pushes the block into the wall; the vertical part <em>F</em> sin &theta; points up. The wall's normal force pushes back horizontally, and the block is sliding <em>up</em>, so kinetic friction points <em>down</em>. Weight points down.`,
          `Horizontal (no acceleration): <em>F</em><sub>N</sub> = <em>F</em> cos &theta;. So friction is <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em> cos &theta;.`,
          `Vertical (constant velocity, so net force is zero): <em>F</em> sin &theta; = <em>m</em><em>g</em> + &mu;<sub>k</sub><em>F</em> cos &theta;. Collect the <em>F</em> terms: <em>F</em>(sin &theta; &minus; &mu;<sub>k</sub> cos &theta;) = <em>m</em><em>g</em>.`,
          `<em>F</em> = (${v.m})(9.80) / (sin ${v.theta}&deg; &minus; ${v.muk} cos ${v.theta}&deg;) = ${(v.m * G_ACCEL).toFixed(1)} / ${(Math.sin(v.theta * DEG2RAD) - v.muk * Math.cos(v.theta * DEG2RAD)).toFixed(4)} = <strong>${ans.toFixed(1)} N</strong>.`
        )
      },
      {
        label: "b. Minimum force needed to hold the block at rest on the wall (<em>F</em>)", unit: "N",
        solve: (v) => v.m * G_ACCEL / (Math.sin(v.theta * DEG2RAD) + v.mus * Math.cos(v.theta * DEG2RAD)),
        steps: (v, ans) => guidedSteps(
          `Now the block is at rest and tends to slip <em>down</em>, so static friction points <em>up</em> and helps hold it. The <em>minimum</em> force corresponds to static friction at its maximum value, <em>f</em><sub>s,max</sub> = &mu;<sub>s</sub><em>F</em><sub>N</sub>.`,
          `Horizontal: <em>F</em><sub>N</sub> = <em>F</em> cos &theta;, so <em>f</em><sub>s,max</sub> = &mu;<sub>s</sub><em>F</em> cos &theta;.`,
          `Vertical (at rest): <em>F</em> sin &theta; + &mu;<sub>s</sub><em>F</em> cos &theta; = <em>m</em><em>g</em>, so <em>F</em>(sin &theta; + &mu;<sub>s</sub> cos &theta;) = <em>m</em><em>g</em>.`,
          `<em>F</em><sub>min</sub> = ${(v.m * G_ACCEL).toFixed(1)} / (sin ${v.theta}&deg; + ${v.mus} cos ${v.theta}&deg;) = ${(v.m * G_ACCEL).toFixed(1)} / ${(Math.sin(v.theta * DEG2RAD) + v.mus * Math.cos(v.theta * DEG2RAD)).toFixed(4)} = <strong>${ans.toFixed(1)} N</strong>.`
        )
      }
    ]
  },
  {
    id: "DYN-88", docNum: "Set 4 #6", title: "Hanging Block Pulling a Block Up a Frictionless Incline",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Multi-Body Systems and Pulleys", diagram: "inclineAtwoodKnown",
    baseVars: { m1: 10.0, m2: 18.0, theta: 26.0 },
    randomize: (b) => {
      const m2 = rnd(b.m2, 0.10, 1), theta = rnd(b.theta, 0.08, 1);
      let m1 = rnd(b.m1, 0.10, 1);
      m1 = Math.max(m1, Number((1.2 * m2 * Math.sin(theta * DEG2RAD)).toFixed(1)));
      return { m1, m2, theta };
    },
    renderPrompt: (v) => `Block two (<em>m</em><sub>2</sub> = <strong>${v.m2} kg</strong>) sits on a frictionless incline that makes a <strong>${v.theta}&deg;</strong> angle with the horizontal. It is connected by a light cable over a frictionless pulley to a hanging block one (<em>m</em><sub>1</sub> = <strong>${v.m1} kg</strong>). The system is released from rest.`,
    parts: [
      {
        label: "a. Acceleration of the blocks (a)", unit: "m/s²",
        solve: (v) => (v.m1 * G_ACCEL - v.m2 * G_ACCEL * Math.sin(v.theta * DEG2RAD)) / (v.m1 + v.m2),
        steps: (v, ans) => guidedSteps(
          `Compare the pulls along the rope: the hanging block pulls with <em>m</em><sub>1</sub><em>g</em> = ${(v.m1 * G_ACCEL).toFixed(1)} N, while block two is pulled back down the slope by <em>m</em><sub>2</sub><em>g</em> sin &theta; = ${(v.m2 * G_ACCEL * Math.sin(v.theta * DEG2RAD)).toFixed(1)} N. The hanging block wins, so block one moves down and block two moves up the slope.`,
          `Treat the two blocks as one system moving along the rope (the tension is internal and cancels): <em>m</em><sub>1</sub><em>g</em> &minus; <em>m</em><sub>2</sub><em>g</em> sin &theta; = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)<em>a</em>.`,
          `<em>a</em> = (${(v.m1 * G_ACCEL).toFixed(1)} &minus; ${(v.m2 * G_ACCEL * Math.sin(v.theta * DEG2RAD)).toFixed(1)}) / (${v.m1} + ${v.m2}) = <strong>${ans.toFixed(3)} m/s²</strong>.`
        )
      },
      {
        label: "b. Tension in the cable (<em>F</em><sub>T</sub>)", unit: "N",
        solve: (v) => {
          const a = (v.m1 * G_ACCEL - v.m2 * G_ACCEL * Math.sin(v.theta * DEG2RAD)) / (v.m1 + v.m2);
          return v.m1 * (G_ACCEL - a);
        },
        steps: (v, ans) => {
          const a = (v.m1 * G_ACCEL - v.m2 * G_ACCEL * Math.sin(v.theta * DEG2RAD)) / (v.m1 + v.m2);
          return guidedSteps(
            `Isolate the hanging block. Down is its direction of motion: weight <em>m</em><sub>1</sub><em>g</em> down, tension <em>F</em><sub>T</sub> up.`,
            `Newton's second law (down positive): <em>m</em><sub>1</sub><em>g</em> &minus; <em>F</em><sub>T</sub> = <em>m</em><sub>1</sub><em>a</em>, so <em>F</em><sub>T</sub> = <em>m</em><sub>1</sub>(<em>g</em> &minus; <em>a</em>).`,
            `<em>F</em><sub>T</sub> = (${v.m1})(9.80 &minus; ${a.toFixed(3)}) = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }
      }
    ]
  },
  {
    id: "DYN-89", docNum: "Set 4 #7", title: "Crate Pushed Downward at an Angle Across a Rough Floor",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "cratePushDown",
    baseVars: { m: 16.0, theta: 22.0, a: 1.3, mu: 0.40 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), theta: rnd(b.theta, 0.12, 1), a: rnd(b.a, 0.15, 1), mu: rnd(b.mu, 0.15, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> crate is pushed across a horizontal floor by a force directed <strong>${v.theta}&deg;</strong> <em>below</em> the horizontal. The coefficient of kinetic friction between the crate and the floor is <strong>${v.mu}</strong>, and the crate accelerates at <strong>${v.a} m/s&sup2;</strong>. What is the magnitude of the pushing force?`,
    parts: [{
      label: "Pushing force (<em>F</em>)", unit: "N",
      solve: (v) => v.m * (v.a + v.mu * G_ACCEL) / (Math.cos(v.theta * DEG2RAD) - v.mu * Math.sin(v.theta * DEG2RAD)),
      steps: (v, ans) => guidedSteps(
        `The push has a horizontal part <em>F</em> cos &theta; (forward) and a vertical part <em>F</em> sin &theta; pointing <em>down</em> into the floor. Forces: weight <em>m</em><em>g</em> down, normal force up, friction backward.`,
        `Vertical (no acceleration): <em>F</em><sub>N</sub> = <em>m</em><em>g</em> + <em>F</em> sin &theta;. The downward push increases the normal force, so friction is <em>f</em><sub>k</sub> = &mu;<sub>k</sub>(<em>m</em><em>g</em> + <em>F</em> sin &theta;).`,
        `Horizontal: <em>F</em> cos &theta; &minus; &mu;<sub>k</sub>(<em>m</em><em>g</em> + <em>F</em> sin &theta;) = <em>m</em><em>a</em>. Collect the <em>F</em> terms: <em>F</em>(cos &theta; &minus; &mu;<sub>k</sub> sin &theta;) = <em>m</em>(<em>a</em> + &mu;<sub>k</sub><em>g</em>).`,
        `<em>F</em> = (${v.m})(${v.a} + ${v.mu} &times; 9.80) / (cos ${v.theta}&deg; &minus; ${v.mu} sin ${v.theta}&deg;) = ${(v.m * (v.a + v.mu * G_ACCEL)).toFixed(2)} / ${(Math.cos(v.theta * DEG2RAD) - v.mu * Math.sin(v.theta * DEG2RAD)).toFixed(4)} = <strong>${ans.toFixed(1)} N</strong>.`
      )
    }]
  },
  {
    id: "DYN-90", docNum: "Set 4 #8", title: "Block Sliding Down a Wall at Constant Velocity (Force Angled from Vertical)",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "wallBlockV",
    baseVars: { m: 6.50, theta: 36.0, mus: 0.55, muk: 0.44 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 2), theta: rnd(b.theta, 0.10, 1), mus: rnd(b.mus, 0.10, 2), muk: rnd(b.muk, 0.10, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> block is pressed against a vertical wall by a force <em>F</em> that is directed upward and into the wall, <strong>${v.theta}&deg;</strong> from the vertical. The coefficients of friction between the block and the wall are &mu;<sub>s</sub> = <strong>${v.mus}</strong> and &mu;<sub>k</sub> = <strong>${v.muk}</strong>. What magnitude of <em>F</em> makes the block slide <em>down</em> the wall at constant velocity?`,
    parts: [{
      label: "Force (<em>F</em>)", unit: "N",
      solve: (v) => v.m * G_ACCEL / (Math.cos(v.theta * DEG2RAD) + v.muk * Math.sin(v.theta * DEG2RAD)),
      steps: (v, ans) => guidedSteps(
        `Because the angle is measured from the <em>vertical</em>, the vertical part of the force is <em>F</em> cos &theta; (up) and the horizontal part, pushing into the wall, is <em>F</em> sin &theta;. The block slides <em>down</em>, so kinetic friction points <em>up</em>.`,
        `Horizontal (no acceleration): <em>F</em><sub>N</sub> = <em>F</em> sin &theta;, so <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em> sin &theta;.`,
        `Vertical (constant velocity, net force zero): <em>F</em> cos &theta; + &mu;<sub>k</sub><em>F</em> sin &theta; = <em>m</em><em>g</em>, so <em>F</em>(cos &theta; + &mu;<sub>k</sub> sin &theta;) = <em>m</em><em>g</em>. (The static coefficient is not needed because the block is already sliding.)`,
        `<em>F</em> = (${v.m})(9.80) / (cos ${v.theta}&deg; + ${v.muk} sin ${v.theta}&deg;) = ${(v.m * G_ACCEL).toFixed(1)} / ${(Math.cos(v.theta * DEG2RAD) + v.muk * Math.sin(v.theta * DEG2RAD)).toFixed(4)} = <strong>${ans.toFixed(1)} N</strong>.`
      )
    }]
  },
  {
    id: "DYN-91", docNum: "Set 4 #9", title: "Sphere Suspended by Two Cables (Horizontal and Angled)",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors", diagram: "sphereTwoCables",
    baseVars: { W: 238, theta: 41.0 },
    randomize: (b) => ({ W: Math.round(rnd(b.W, 0.15, 0)), theta: rnd(b.theta, 0.15, 1) }),
    renderPrompt: (v) => `A sphere weighing <strong>${v.W} N</strong> hangs at rest from two cables. The left cable is horizontal, and the right cable makes a <strong>${v.theta}&deg;</strong> angle with the horizontal. Find the tension <em>T</em><sub>1</sub> in the left cable and the tension <em>T</em><sub>2</sub> in the right cable.`,
    parts: [
      {
        label: "a. Tension in the left (horizontal) cable (<em>T</em><sub>1</sub>)", unit: "N",
        solve: (v) => v.W / Math.tan(v.theta * DEG2RAD),
        steps: (v, ans) => guidedSteps(
          `The sphere is at rest, so the net force is zero in both directions. Three forces act: weight ${v.W} N down, <em>T</em><sub>1</sub> pulling horizontally to the left, and <em>T</em><sub>2</sub> pulling up and to the right at ${v.theta}&deg; above the horizontal.`,
          `Vertical: only the right cable has a vertical part, so <em>T</em><sub>2</sub> sin &theta; = <em>W</em>. Horizontal: <em>T</em><sub>2</sub> cos &theta; = <em>T</em><sub>1</sub>.`,
          `Substitute <em>T</em><sub>2</sub> = <em>W</em>/sin &theta; into the horizontal equation: <em>T</em><sub>1</sub> = <em>W</em> cos &theta; / sin &theta; = <em>W</em>/tan &theta; = ${v.W}/tan ${v.theta}&deg; = <strong>${ans.toFixed(1)} N</strong>.`
        )
      },
      {
        label: "b. Tension in the right (angled) cable (<em>T</em><sub>2</sub>)", unit: "N",
        solve: (v) => v.W / Math.sin(v.theta * DEG2RAD),
        steps: (v, ans) => guidedSteps(
          `Use the vertical balance from part a: the only upward force is the vertical part of the right cable's tension.`,
          `<em>T</em><sub>2</sub> sin &theta; = <em>W</em>, so <em>T</em><sub>2</sub> = <em>W</em> / sin &theta;.`,
          `<em>T</em><sub>2</sub> = ${v.W} / sin ${v.theta}&deg; = <strong>${ans.toFixed(1)} N</strong>. (Check: this is larger than the weight, as expected, since the cable must also supply the horizontal pull.)`
        )
      }
    ]
  },
  {
    id: "DYN-92", docNum: "Set 4 #13", title: "Pushing a Lawn Mower: Friction, Normal Force, and Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "lawnMower",
    baseVars: { m: 14.0, F: 93, theta: 45.0, v: 1.8, t: 2.0 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), F: Math.round(rnd(b.F, 0.12, 0)), theta: rnd(b.theta, 0.10, 1), v: rnd(b.v, 0.15, 1), t: rnd(b.t, 0.15, 1) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> lawn mower is pushed across level grass at constant speed with a <strong>${v.F}-N</strong> force directed along the handle, which makes a <strong>${v.theta}&deg;</strong> angle below the horizontal. In part (c), the mower is instead to accelerate from rest to <strong>${v.v} m/s</strong> in <strong>${v.t} s</strong>, with the same friction force as in part (a).`,
    parts: [
      {
        label: "a. Horizontal friction force on the mower (<em>f</em>)", unit: "N",
        solve: (v) => v.F * Math.cos(v.theta * DEG2RAD),
        steps: (v, ans) => guidedSteps(
          `Constant speed means zero acceleration. Horizontally, only the push component <em>F</em> cos &theta; (forward) and friction (backward) act.`,
          `Set them equal: <em>f</em> = <em>F</em> cos &theta; = ${v.F} cos ${v.theta}&deg; = <strong>${ans.toFixed(1)} N</strong>.`
        )
      },
      {
        label: "b. Normal force from the ground (<em>F</em><sub>N</sub>)", unit: "N",
        solve: (v) => v.m * G_ACCEL + v.F * Math.sin(v.theta * DEG2RAD),
        steps: (v, ans) => guidedSteps(
          `Vertically there is no acceleration. The push is directed <em>downward</em> at ${v.theta}&deg;, so its vertical component <em>F</em> sin &theta; adds to the weight, both pointing down; the ground pushes up with <em>F</em><sub>N</sub>.`,
          `<em>F</em><sub>N</sub> = <em>m</em><em>g</em> + <em>F</em> sin &theta; = (${v.m})(9.80) + ${v.F} sin ${v.theta}&deg; = ${(v.m * G_ACCEL).toFixed(1)} + ${(v.F * Math.sin(v.theta * DEG2RAD)).toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>.`
        )
      },
      {
        label: "c. Pushing force needed to accelerate the mower from rest to the speed and time given below (<em>F</em>)", unit: "N",
        solve: (v) => (v.m * (v.v / v.t) + v.F * Math.cos(v.theta * DEG2RAD)) / Math.cos(v.theta * DEG2RAD),
        steps: (v, ans) => {
          const a = v.v / v.t, f = v.F * Math.cos(v.theta * DEG2RAD);
          return guidedSteps(
            `First find the acceleration needed: starting from rest, <em>a</em> = &Delta;<em>v</em>/&Delta;<em>t</em> = ${v.v} / ${v.t} = ${a.toFixed(2)} m/s².`,
            `Keep the same friction force found in part a (<em>f</em> = ${f.toFixed(1)} N), as the problem instructs. Horizontally: <em>F</em> cos &theta; &minus; <em>f</em> = <em>m</em><em>a</em>.`,
            `<em>F</em> = (<em>m</em><em>a</em> + <em>f</em>) / cos &theta; = ((${v.m})(${a.toFixed(2)}) + ${f.toFixed(1)}) / cos ${v.theta}&deg; = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }
      }
    ]
  },
  {
    id: "DYN-93", docNum: "Set 4 #15", title: "Pushing a Bobsled Down an Incline to a Target Speed",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "inclineBobsled",
    baseVars: { m: 22.0, mu: 0.12, theta: 7.0, v: 18.0, d: 83.0 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), mu: rnd(b.mu, 0.15, 2), theta: rnd(b.theta, 0.15, 1), v: rnd(b.v, 0.10, 1), d: Math.round(rnd(b.d, 0.10, 0)) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> bobsled starts from rest at the top of a <strong>${v.theta}&deg;</strong> incline. The coefficient of kinetic friction between the runners and the ice is <strong>${v.mu}</strong>. A pusher applies a constant force parallel to the incline, down the slope, so that the sled reaches <strong>${v.v} m/s</strong> at the end of a <strong>${v.d}-m</strong> run. How large is the pushing force?`,
    parts: [{
      label: "Pushing force (<em>F</em>)", unit: "N",
      solve: (v) => v.m * (v.v * v.v / (2 * v.d) - G_ACCEL * Math.sin(v.theta * DEG2RAD) + v.mu * G_ACCEL * Math.cos(v.theta * DEG2RAD)),
      steps: (v, ans) => {
        const a = v.v * v.v / (2 * v.d);
        return guidedSteps(
          `Find the acceleration from kinematics (starting from rest): <em>v</em>² = 2<em>a</em><em>d</em>, so <em>a</em> = ${v.v}² / (2 &times; ${v.d}) = ${a.toFixed(3)} m/s².`,
          `Forces along the slope: the push <em>F</em> (down), the weight component <em>m</em><em>g</em> sin &theta; (down) and kinetic friction <em>f</em><sub>k</sub> (up the slope, opposing motion). Perpendicular: <em>F</em><sub>N</sub> = <em>m</em><em>g</em> cos &theta; = ${(v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD)).toFixed(1)} N, so <em>f</em><sub>k</sub> = ${(v.mu * v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD)).toFixed(1)} N.`,
          `Down-slope Newton's second law: <em>F</em> + <em>m</em><em>g</em> sin &theta; &minus; <em>f</em><sub>k</sub> = <em>m</em><em>a</em>, so <em>F</em> = <em>m</em><em>a</em> &minus; <em>m</em><em>g</em> sin &theta; + <em>f</em><sub>k</sub>.`,
          `<em>F</em> = ${(v.m * a).toFixed(1)} &minus; ${(v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD)).toFixed(1)} + ${(v.mu * v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD)).toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>.`
        );
      }
    }]
  },
  {
    id: "DYN-94", docNum: "Set 4 #18", title: "Sprinter Pushing Off the Starting Block",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces", diagram: "sprinter",
    baseVars: { m: 60.0, F: 580, theta: 23.0, t: 0.35 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), F: Math.round(rnd(b.F, 0.12, 0)), theta: rnd(b.theta, 0.15, 1), t: rnd(b.t, 0.15, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> sprinter, starting from rest, pushes off the starting block with a force of <strong>${v.F} N</strong> directed <strong>${v.theta}&deg;</strong> above the horizontal. Assume the horizontal component of this force is the only net horizontal force on the sprinter.`,
    parts: [
      {
        label: "a. Horizontal acceleration of the sprinter (a)", unit: "m/s²",
        solve: (v) => v.F * Math.cos(v.theta * DEG2RAD) / v.m,
        steps: (v, ans) => guidedSteps(
          `Only the horizontal component of the push accelerates the sprinter forward: <em>F</em><sub>x</sub> = <em>F</em> cos &theta; = ${v.F} cos ${v.theta}&deg; = ${(v.F * Math.cos(v.theta * DEG2RAD)).toFixed(1)} N. (The vertical component is balanced by weight and the normal force.)`,
          `<em>a</em> = <em>F</em><sub>x</sub>/<em>m</em> = ${(v.F * Math.cos(v.theta * DEG2RAD)).toFixed(1)} / ${v.m} = <strong>${ans.toFixed(2)} m/s²</strong>.`
        )
      },
      {
        label: "b. Speed of the sprinter after pushing for the given time (v)", unit: "m/s",
        solve: (v) => (v.F * Math.cos(v.theta * DEG2RAD) / v.m) * v.t,
        steps: (v, ans) => {
          const a = v.F * Math.cos(v.theta * DEG2RAD) / v.m;
          return guidedSteps(
            `The sprinter starts from rest and the acceleration is constant at ${a.toFixed(2)} m/s² (from part a) for <em>t</em> = ${v.t} s.`,
            `<em>v</em> = <em>v</em><sub>0</sub> + <em>a</em><em>t</em> = 0 + (${a.toFixed(2)})(${v.t}) = <strong>${ans.toFixed(2)} m/s</strong>.`
          );
        }
      }
    ]
  },
  {
    id: "DYN-95", docNum: "Set 4 #19", title: "Water Skier Pulled by a Rope (Horizontal and Angled Pull)",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "waterSkier",
    baseVars: { m: 74.0, mu: 0.22, T: 250, theta: 11.0 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), mu: rnd(b.mu, 0.15, 2), T: Math.round(rnd(b.T, 0.10, 0)), theta: rnd(b.theta, 0.20, 1) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> water skier is pulled across the water by a rope. The coefficient of kinetic friction between the skis and the water is <strong>${v.mu}</strong> (treat this as an ordinary friction force from the water on the skis). The rope tension is <strong>${v.T} N</strong>.`,
    parts: [
      {
        label: "a. Acceleration if the rope tension pulls horizontally (a)", unit: "m/s²",
        solve: (v) => (v.T - v.mu * v.m * G_ACCEL) / v.m,
        steps: (v, ans) => guidedSteps(
          `With a horizontal rope, the vertical forces are just weight and the normal force from the water, so <em>F</em><sub>N</sub> = <em>m</em><em>g</em> = (${v.m})(9.80) = ${(v.m * G_ACCEL).toFixed(1)} N.`,
          `Friction: <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em><sub>N</sub> = (${v.mu})(${(v.m * G_ACCEL).toFixed(1)}) = ${(v.mu * v.m * G_ACCEL).toFixed(1)} N.`,
          `Horizontal: <em>T</em> &minus; <em>f</em><sub>k</sub> = <em>m</em><em>a</em>, so <em>a</em> = (${v.T} &minus; ${(v.mu * v.m * G_ACCEL).toFixed(1)}) / ${v.m} = <strong>${ans.toFixed(2)} m/s²</strong>.`
        )
      },
      {
        label: "b. Acceleration if the same tension is directed upward at the given angle (a)", unit: "m/s²",
        solve: (v) => (v.T * Math.cos(v.theta * DEG2RAD) - v.mu * (v.m * G_ACCEL - v.T * Math.sin(v.theta * DEG2RAD))) / v.m,
        steps: (v, ans) => {
          const t = v.theta * DEG2RAD, N = v.m * G_ACCEL - v.T * Math.sin(t);
          return guidedSteps(
            `Now the rope pulls upward at ${v.theta}&deg;: horizontal component <em>T</em> cos &theta; = ${(v.T * Math.cos(t)).toFixed(1)} N, vertical component <em>T</em> sin &theta; = ${(v.T * Math.sin(t)).toFixed(1)} N (up).`,
            `Vertical (no acceleration): <em>F</em><sub>N</sub> + <em>T</em> sin &theta; = <em>m</em><em>g</em>, so <em>F</em><sub>N</sub> = ${(v.m * G_ACCEL).toFixed(1)} &minus; ${(v.T * Math.sin(t)).toFixed(1)} = ${N.toFixed(1)} N. The normal force is smaller than in part a, so friction is smaller too: <em>f</em><sub>k</sub> = (${v.mu})(${N.toFixed(1)}) = ${(v.mu * N).toFixed(1)} N.`,
            `Horizontal: <em>T</em> cos &theta; &minus; <em>f</em><sub>k</sub> = <em>m</em><em>a</em>, so <em>a</em> = (${(v.T * Math.cos(t)).toFixed(1)} &minus; ${(v.mu * N).toFixed(1)}) / ${v.m} = <strong>${ans.toFixed(2)} m/s²</strong>.`
          );
        }
      }
    ]
  },
  {
    id: "DYN-96", docNum: "Set 4 #20", title: "Snowboarder Down a Rough Slope and Across a Flat Section",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "inclineSnowboarderFlat",
    baseVars: { m: 75.0, v0: 3.0, theta: 28.0, d: 45.0, mu1: 0.20, mu2: 0.15 },
    randomize: (b) => ({ m: rnd(b.m, 0.12, 1), v0: rnd(b.v0, 0.20, 1), theta: rnd(b.theta, 0.12, 1), d: Math.round(rnd(b.d, 0.12, 0)), mu1: rnd(b.mu1, 0.15, 2), mu2: rnd(b.mu2, 0.15, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> snowboarder starts down a <strong>${v.theta}&deg;</strong> slope with an initial speed of <strong>${v.v0} m/s</strong>. The slope is <strong>${v.d} m</strong> long and the coefficient of kinetic friction on it is <strong>${v.mu1}</strong>. At the bottom she continues onto a horizontal section where the coefficient of kinetic friction is <strong>${v.mu2}</strong>. (Ignore the small transition between the two.)`,
    parts: [
      {
        label: "a. Speed at the bottom of the slope (v)", unit: "m/s",
        solve: (v) => Math.sqrt(v.v0 * v.v0 + 2 * G_ACCEL * (Math.sin(v.theta * DEG2RAD) - v.mu1 * Math.cos(v.theta * DEG2RAD)) * v.d),
        steps: (v, ans) => {
          const a = G_ACCEL * (Math.sin(v.theta * DEG2RAD) - v.mu1 * Math.cos(v.theta * DEG2RAD));
          return guidedSteps(
            `Along the slope (down positive): the weight component <em>m</em><em>g</em> sin &theta; speeds her up and kinetic friction &mu;<sub>k</sub><em>m</em><em>g</em> cos &theta; slows her down. Perpendicular to the slope, <em>F</em><sub>N</sub> = <em>m</em><em>g</em> cos &theta;.`,
            `Newton's second law: <em>m</em><em>a</em> = <em>m</em><em>g</em> sin &theta; &minus; &mu;<sub>k</sub><em>m</em><em>g</em> cos &theta;. The mass cancels: <em>a</em> = <em>g</em>(sin &theta; &minus; &mu;<sub>k</sub> cos &theta;) = 9.80(sin ${v.theta}&deg; &minus; ${v.mu1} cos ${v.theta}&deg;) = ${a.toFixed(3)} m/s².`,
            `Kinematics: <em>v</em>² = <em>v</em><sub>0</sub>² + 2<em>a</em><em>d</em> = ${v.v0}² + 2(${a.toFixed(3)})(${v.d}) = ${(ans * ans).toFixed(1)}, so <em>v</em> = <strong>${ans.toFixed(2)} m/s</strong>.`
          );
        }
      },
      {
        label: "b. Distance she travels on the horizontal section before stopping (x)", unit: "m",
        solve: (v) => {
          const v2 = v.v0 * v.v0 + 2 * G_ACCEL * (Math.sin(v.theta * DEG2RAD) - v.mu1 * Math.cos(v.theta * DEG2RAD)) * v.d;
          return v2 / (2 * v.mu2 * G_ACCEL);
        },
        steps: (v, ans) => {
          const v2 = v.v0 * v.v0 + 2 * G_ACCEL * (Math.sin(v.theta * DEG2RAD) - v.mu1 * Math.cos(v.theta * DEG2RAD)) * v.d;
          return guidedSteps(
            `On the flat section the only horizontal force is kinetic friction, so her acceleration is <em>a</em> = &minus;&mu;<sub>k</sub><em>g</em> = &minus;(${v.mu2})(9.80) = &minus;${(v.mu2 * G_ACCEL).toFixed(3)} m/s².`,
            `She starts this section at the speed from part a, so <em>v</em>² = ${v2.toFixed(1)} (m/s)². She stops when her final speed is zero.`,
            `<em>v</em><sub>f</sub>² = <em>v</em>² + 2<em>a</em><em>x</em> = 0, so <em>x</em> = <em>v</em>² / (2&mu;<sub>k</sub><em>g</em>) = ${v2.toFixed(1)} / ${(2 * v.mu2 * G_ACCEL).toFixed(3)} = <strong>${ans.toFixed(1)} m</strong>.`
          );
        }
      }
    ]
  },
  {
    id: "DYN-97", docNum: "Set 4 #5", title: "Mass Hanging from a Car Mirror: Tension, Acceleration, and Doubled Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors", diagram: "carMirror",
    baseVars: { m: 1.80, theta: 12.0 },
    randomize: (b) => ({ m: rnd(b.m, 0.20, 2), theta: rnd(b.theta, 0.20, 1) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> mass hangs from the rear-view mirror of an accelerating car on a string. The mass is at rest relative to the car, and the string makes an angle of <strong>${v.theta}&deg;</strong> with the vertical.`,
    parts: [
      {
        label: "a. Determine the tension in the string.", unit: "N",
        solve: (v) => v.m * G_ACCEL / Math.cos(v.theta * DEG2RAD),
        steps: (v, ans) => guidedSteps(
          `Two forces act on the mass: its weight <em>m</em><em>g</em> (down) and the string tension <em>T</em> (along the string, ${v.theta}&deg; from vertical). The mass has no vertical acceleration.`,
          `Vertical: <em>T</em> cos &theta; = <em>m</em><em>g</em>, so <em>T</em> = <em>m</em><em>g</em> / cos &theta; = (${v.m})(9.80) / cos ${v.theta}&deg; = <strong>${ans.toFixed(1)} N</strong>.`
        )
      },
      {
        label: "b. Determine the acceleration of the car.", unit: "m/s²",
        solve: (v) => G_ACCEL * Math.tan(v.theta * DEG2RAD),
        steps: (v, ans) => guidedSteps(
          `The horizontal part of the tension is the only horizontal force on the mass, so it supplies the net force: <em>T</em> sin &theta; = <em>m</em><em>a</em>.`,
          `Divide by the vertical equation <em>T</em> cos &theta; = <em>m</em><em>g</em>: tan &theta; = <em>a</em>/<em>g</em>, so <em>a</em> = <em>g</em> tan &theta;.`,
          `<em>a</em> = 9.80 tan ${v.theta}&deg; = <strong>${ans.toFixed(2)} m/s²</strong>.`
        )
      },
      {
        label: "c. Determine the new angle with the vertical if the car's acceleration doubles.", unit: "°",
        solve: (v) => Math.atan(2 * Math.tan(v.theta * DEG2RAD)) * RAD2DEG,
        steps: (v, ans) => guidedSteps(
          `The relationship tan &theta; = <em>a</em>/<em>g</em> holds for any acceleration. Doubling <em>a</em> doubles tan &theta;: tan &theta;&prime; = 2 tan &theta;.`,
          `tan &theta;&prime; = 2 tan ${v.theta}&deg; = ${(2 * Math.tan(v.theta * DEG2RAD)).toFixed(4)}.`,
          `&theta;&prime; = tan<sup>&minus;1</sup>(${(2 * Math.tan(v.theta * DEG2RAD)).toFixed(4)}) = <strong>${ans.toFixed(1)}&deg;</strong>. (Doubling the acceleration does <em>not</em> double the angle.)`
        )
      }
    ]
  },
  {
    id: "DYN-98", docNum: "Set 4 #11", title: "Block on a Smooth Table Connected to a Hanging Block (Including Mass Replacement)",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Multi-Body Systems and Pulleys", diagram: "tableAndHanging",
    baseVars: { m1: 44.0, m2: 26.0 },
    randomize: (b) => ({ m1: rnd(b.m1, 0.15, 0), m2: rnd(b.m2, 0.15, 0) }),
    renderPrompt: (v) => `Block one (<em>m</em><sub>1</sub> = <strong>${v.m1} kg</strong>) rests on a smooth (frictionless) horizontal table and is connected by a light cord over a frictionless pulley to a hanging block two (<em>m</em><sub>2</sub> = <strong>${v.m2} kg</strong>). The system is released from rest.`,
    parts: [
      {
        label: "a. Acceleration of the blocks (a)", unit: "m/s²",
        solve: (v) => v.m2 * G_ACCEL / (v.m1 + v.m2),
        steps: (v, ans) => guidedSteps(
          `Only the weight of the hanging block drives the motion. The table is frictionless and block one's weight is cancelled by the normal force, so the net external force along the cord is <em>m</em><sub>2</sub><em>g</em>.`,
          `The total mass being accelerated is <em>m</em><sub>1</sub> + <em>m</em><sub>2</sub> = ${v.m1 + v.m2} kg, so <em>m</em><sub>2</sub><em>g</em> = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)<em>a</em>.`,
          `<em>a</em> = (${v.m2})(9.80) / ${v.m1 + v.m2} = <strong>${ans.toFixed(2)} m/s²</strong>.`
        )
      },
      {
        label: "b. Tension in the cord (<em>T</em>)", unit: "N",
        solve: (v) => v.m1 * v.m2 * G_ACCEL / (v.m1 + v.m2),
        steps: (v, ans) => {
          const a = v.m2 * G_ACCEL / (v.m1 + v.m2);
          return guidedSteps(
            `Isolate block one on the table. The only horizontal force on it is the cord tension <em>T</em>, which pulls it toward the pulley.`,
            `<em>T</em> = <em>m</em><sub>1</sub><em>a</em> = (${v.m1})(${a.toFixed(3)}) = <strong>${ans.toFixed(1)} N</strong>. (Check with block two: <em>m</em><sub>2</sub>(<em>g</em> &minus; <em>a</em>) gives the same value.)`
          );
        }
      },
      {
        label: "c. Mass of a new block that, replacing block one, makes the acceleration a = 0.100<em>g</em> (<em>M</em>)", unit: "kg",
        solve: (v) => 9 * v.m2,
        steps: (v, ans) => guidedSteps(
          `The same equation applies with the new mass <em>M</em> in place of <em>m</em><sub>1</sub>: <em>a</em> = <em>m</em><sub>2</sub><em>g</em> / (<em>M</em> + <em>m</em><sub>2</sub>). Set <em>a</em> = 0.100<em>g</em>.`,
          `<em>m</em><sub>2</sub><em>g</em> / (<em>M</em> + <em>m</em><sub>2</sub>) = 0.100<em>g</em>. The <em>g</em> cancels, so <em>M</em> + <em>m</em><sub>2</sub> = <em>m</em><sub>2</sub> / 0.100 = 10<em>m</em><sub>2</sub>.`,
          `<em>M</em> = 9<em>m</em><sub>2</sub> = 9(${v.m2}) = <strong>${ans.toFixed(0)} kg</strong>.`
        )
      }
    ]
  }
,
  {
    id: "DYN-99", docNum: "Set 4 #10", title: "Two Men Holding a Suspended Rock at Rest (Right Rope Known)",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors", diagram: "twoMenRopesRockRightKnown",
    baseVars: { m: 65.0, theta2: 33.0, T2: 698 },
    randomize: (b) => ({ m: rnd(b.m, 0.12, 1), theta2: rnd(b.theta2, 0.12, 1), T2: Math.round(rnd(b.T2, 0.10, 0)) }),
    renderPrompt: (v) => `The men pictured hold the <strong>${v.m}-kg</strong> rock at rest. The right rope forms a <strong>${v.theta2}&deg;</strong> angle with the horizontal and applies a <strong>${v.T2}-N</strong> tension force. Find the size of the tension in the rope held by the man on the <em>left</em>, and the angle his rope makes with the horizontal.`,
    parts: [
      {
        label: "a. Tension in the left rope (<em>T</em><sub>1</sub>)", unit: "N",
        solve: (v) => Math.hypot(v.T2 * Math.cos(v.theta2 * DEG2RAD), v.m * G_ACCEL - v.T2 * Math.sin(v.theta2 * DEG2RAD)),
        steps: (v, ans) => {
          const T1x = v.T2 * Math.cos(v.theta2 * DEG2RAD), T1y = v.m * G_ACCEL - v.T2 * Math.sin(v.theta2 * DEG2RAD);
          return guidedSteps(
            `The rock is at rest, so the net force is zero in both directions. Three forces act at the knot: the right rope pulls up and to the right with ${v.T2} N at ${v.theta2}&deg;, the left rope pulls up and to the left with <em>T</em><sub>1</sub>, and the weight <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(1)} N pulls down.`,
            `Horizontal: the left rope must cancel the right rope's horizontal pull, so <em>T</em><sub>1x</sub> = <em>T</em><sub>2</sub> cos &theta;<sub>2</sub> = ${v.T2} cos ${v.theta2}&deg; = ${T1x.toFixed(1)} N.`,
            `Vertical: <em>T</em><sub>1y</sub> + <em>T</em><sub>2y</sub> = <em>m</em><em>g</em>, so <em>T</em><sub>1y</sub> = <em>m</em><em>g</em> &minus; <em>T</em><sub>2</sub> sin &theta;<sub>2</sub> = ${(v.m * G_ACCEL).toFixed(1)} &minus; ${(v.T2 * Math.sin(v.theta2 * DEG2RAD)).toFixed(1)} = ${T1y.toFixed(1)} N.`,
            `Combine: <em>T</em><sub>1</sub> = &radic;(<em>T</em><sub>1x</sub>&sup2; + <em>T</em><sub>1y</sub>&sup2;) = &radic;(${T1x.toFixed(1)}&sup2; + ${T1y.toFixed(1)}&sup2;) = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }
      },
      {
        label: "b. Angle of the left rope with the horizontal (&theta;<sub>1</sub>)", unit: "°",
        solve: (v) => Math.atan2(v.m * G_ACCEL - v.T2 * Math.sin(v.theta2 * DEG2RAD), v.T2 * Math.cos(v.theta2 * DEG2RAD)) * RAD2DEG,
        steps: (v, ans) => {
          const T1x = v.T2 * Math.cos(v.theta2 * DEG2RAD), T1y = v.m * G_ACCEL - v.T2 * Math.sin(v.theta2 * DEG2RAD);
          return guidedSteps(
            `From part a, the left rope's components are <em>T</em><sub>1x</sub> = ${T1x.toFixed(1)} N (horizontal) and <em>T</em><sub>1y</sub> = ${T1y.toFixed(1)} N (vertical).`,
            `The angle with the horizontal comes from tan &theta;<sub>1</sub> = <em>T</em><sub>1y</sub> / <em>T</em><sub>1x</sub> = ${T1y.toFixed(1)} / ${T1x.toFixed(1)} = ${(T1y / T1x).toFixed(3)}.`,
            `&theta;<sub>1</sub> = arctan(${(T1y / T1x).toFixed(3)}) = <strong>${ans.toFixed(1)}&deg;</strong> above the horizontal.`
          );
        }
      }
    ]
  },
  {
    id: "DYN-100", docNum: "Set 4 #12", title: "How Far Does a Pushed Box Slide?",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction", diagram: "boxSlidingStop",
    baseVars: { mu: 0.17, v0: 11.8 },
    randomize: (b) => ({ mu: rnd(b.mu, 0.20, 2), v0: rnd(b.v0, 0.15, 1) }),
    renderPrompt: (v) => `A box is given a push so that it slides across the floor. How far will it go, given that the coefficient of kinetic friction is <strong>${v.mu}</strong> and the push imparts an initial speed of <strong>${v.v0} m/s</strong>?`,
    parts: [{
      label: "Sliding distance (x)", unit: "m",
      solve: (v) => (v.v0 * v.v0) / (2 * v.mu * G_ACCEL),
      steps: (v, ans) => guidedSteps(
        `After the push, kinetic friction is the only horizontal force on the box, so it decelerates at <em>a</em> = &mu;<sub>k</sub><em>g</em> = ${v.mu} &times; 9.80 = ${(v.mu * G_ACCEL).toFixed(3)} m/s². (The mass cancels out.)`,
        `The box slides until it stops: 0 = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>a</em><em>x</em>, so <em>x</em> = <em>v</em><sub>0</sub>&sup2; / (2<em>a</em>) = <em>v</em><sub>0</sub>&sup2; / (2&mu;<sub>k</sub><em>g</em>).`,
        `Substitute: <em>x</em> = ${v.v0}&sup2; / (2 &times; ${v.mu} &times; 9.80) = <strong>${ans.toFixed(1)} m</strong>.`
      )
    }]
  },
  {
    id: "DYN-101", docNum: "Set 4 #16", title: "Crane Trolley Accelerating with a Hanging Load",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors", diagram: "craneTrolley",
    baseVars: { m: 645, theta: 6.0 },
    randomize: (b) => ({ m: Math.round(rnd(b.m, 0.15, 0)), theta: rnd(b.theta, 0.25, 1) }),
    renderPrompt: (v) => `A crane's trolley at point P moves for a few seconds to the right with constant acceleration, and the <strong>${v.m}-kg</strong> load hangs on a light cable at a <strong>${v.theta}&deg;</strong> angle to the vertical as shown. What is the acceleration of the load?`,
    parts: [{
      label: "Acceleration of the load (a)", unit: "m/s²",
      solve: (v) => G_ACCEL * Math.tan(v.theta * DEG2RAD),
      steps: (v, ans) => guidedSteps(
        `Only two forces act on the load: its weight <em>m</em><em>g</em> (down) and the cable tension <em>T</em> (along the cable, ${v.theta}&deg; from the vertical). The load accelerates horizontally with the trolley.`,
        `Vertical (no vertical acceleration): <em>T</em> cos &theta; = <em>m</em><em>g</em>. Horizontal: the horizontal part of the tension is the net force, so <em>T</em> sin &theta; = <em>m</em><em>a</em>.`,
        `Divide the horizontal equation by the vertical one: tan &theta; = <em>a</em>/<em>g</em>. The mass cancels (the ${v.m} kg is not needed).`,
        `<em>a</em> = <em>g</em> tan &theta; = 9.80 tan ${v.theta}&deg; = <strong>${ans.toFixed(2)} m/s²</strong>, to the right. (The load swings back, so the cable tilts opposite to the acceleration.)`
      )
    }]
  },
  {
    id: "DYN-102", docNum: "Set 4 #17", title: "Tension in a High Wire With a Person at the Midpoint",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors", diagram: "highWire",
    baseVars: { m: 56.0, theta: 12.0 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), theta: rnd(b.theta, 0.20, 1) }),
    renderPrompt: (v) => `Karissa walks across a "high wire" strung horizontally between two buildings. When she is at rest at the midpoint of the wire, the angle of the rope is &theta; = <strong>${v.theta}&deg;</strong>. If her mass is <strong>${v.m} kg</strong>, what is the tension in the wire?`,
    parts: [{
      label: "Tension in the wire (<em>T</em>)", unit: "N",
      solve: (v) => v.m * G_ACCEL / (2 * Math.sin(v.theta * DEG2RAD)),
      steps: (v, ans) => guidedSteps(
        `Karissa is at rest at the midpoint, so the forces balance. Her weight is <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(1)} N, pulling down. Each half of the wire pulls on her with the same tension <em>T</em>, at ${v.theta}&deg; above the horizontal.`,
        `Horizontally, the two horizontal components cancel by symmetry. Vertically, the two upward components carry her weight: 2<em>T</em> sin &theta; = <em>m</em><em>g</em>.`,
        `<em>T</em> = <em>m</em><em>g</em> / (2 sin &theta;) = ${(v.m * G_ACCEL).toFixed(1)} / (2 sin ${v.theta}&deg;) = <strong>${ans.toFixed(0)} N</strong>. This is much larger than her weight because the wire is nearly horizontal, so only a small part of each tension points up.`
      )
    }]
  }
];
