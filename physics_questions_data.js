// ============================================================================
// PHYSICS QUESTION LIBRARY DATA (physics_questions_data.js)
// All template literals (${...}) have been converted to string concatenation
// to prevent LaTeX/MathJax/Markdown parsers from corrupting variables.
// ============================================================================

const G_ACCEL = 9.80;
const G_CONST = 6.67e-11;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function rnd(base, pct = 0.20, decimals = 2) {
  const factor = 1 + (Math.random() * 2 - 1) * pct;
  const val = base * factor;
  return Number(val.toFixed(decimals));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildSplineModel(knotsY) {
  const [y0, y1, y2, y3] = knotsY;
  const h = 3;
  const D1 = y2 - 2 * y1 + y0;
  const D2 = y3 - 2 * y2 + y1;

  const M0 = 0;
  const M1 = (2 / 45) * (4 * D1 - D2);
  const M2 = (2 / 45) * (4 * D2 - D1);
  const M3 = 0;

  const tKnots = [0, 3, 6, 9];
  const yKnots = [y0, y1, y2, y3];
  const M = [M0, M1, M2, M3];

  function getSegmentIndex(t) {
    if (t <= 3) return 0;
    if (t <= 6) return 1;
    return 2;
  }

  function evalValue(t) {
    const i = getSegmentIndex(t);
    const u = t - tKnots[i];
    const v = h - u;
    const term1 = (M[i] * Math.pow(v, 3) + M[i + 1] * Math.pow(u, 3)) / (6 * h);
    const term2 = (yKnots[i] / h - (M[i] * h) / 6) * v;
    const term3 = (yKnots[i + 1] / h - (M[i + 1] * h) / 6) * u;
    return term1 + term2 + term3;
  }

  function evalSlope(t) {
    const i = getSegmentIndex(t);
    const u = t - tKnots[i];
    const v = h - u;
    const term1 = (-M[i] * v * v + M[i + 1] * u * u) / (2 * h);
    const term2 = (yKnots[i + 1] - yKnots[i]) / h;
    const term3 = -((M[i + 1] - M[i]) * h) / 6;
    return term1 + term2 + term3;
  }

  function findZeroSlopeTimes() {
    const roots = [];
    const step = 0.02;
    for (let t = 0; t < 10; t += step) {
      const s1 = evalSlope(t);
      const s2 = evalSlope(t + step);
      if (Math.abs(s1) < 1e-7) {
        if (roots.length === 0 || Math.abs(t - roots[roots.length - 1]) > 0.2) {
          roots.push(t);
        }
      } else if (s1 * s2 < 0) {
        let a = t, b = t + step;
        for (let iter = 0; iter < 30; iter++) {
          const mid = 0.5 * (a + b);
          if (evalSlope(a) * evalSlope(mid) <= 0) b = mid;
          else a = mid;
        }
        const r = 0.5 * (a + b);
        if (r >= 0.05 && r <= 9.95) {
          if (roots.length === 0 || Math.abs(r - roots[roots.length - 1]) > 0.2) {
            roots.push(r);
          }
        }
      }
    }
    return roots;
  }

  function findTimesForValue(targetY) {
    const roots = [];
    const step = 0.02;
    for (let t = 0; t <= 10 - step + 1e-9; t += step) {
      const f1 = evalValue(t) - targetY;
      const f2 = evalValue(t + step) - targetY;
      if (Math.abs(f1) < 1e-6) {
        if (roots.length === 0 || Math.abs(t - roots[roots.length - 1]) > 0.2) {
          roots.push(t);
        }
      } else if (f1 * f2 <= 0) {
        let a = t, b = t + step;
        for (let iter = 0; iter < 30; iter++) {
          const mid = 0.5 * (a + b);
          if ((evalValue(a) - targetY) * (evalValue(mid) - targetY) <= 0) b = mid;
          else a = mid;
        }
        const r = 0.5 * (a + b);
        if (r >= 0 && r <= 10.001) {
          if (roots.length === 0 || Math.abs(r - roots[roots.length - 1]) > 0.2) {
            roots.push(Math.min(10, Math.max(0, r)));
          }
        }
      }
    }
    return roots;
  }

  return { knotsY, evalValue, evalSlope, findZeroSlopeTimes, findTimesForValue };
}

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
      tInst1: tInst1,
      tDisp1: pair2[0],
      tDisp2: pair2[1],
      tInst2: tInst2
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
      ta: ta,
      vb: chosenVb,
      tc1: pair1[0],
      tc2: pair1[1],
      td: td
    };
  }
}

const PHYSICS_QUESTIONS = [
  // --- UNIT 1: KINEMATICS (CED 1.1 - 1.4) ---
  {
    id: "KIN-01", docNum: "Kin #1", title: "Position vs. Time Graph",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "splinePosGraph",
    baseVars: { knotsY: [0, 4, -1, 3], tAvg1: 0, tAvg2: 6, tInst1: 1.75, tDisp1: 3, tDisp2: 9, tInst2: 4.5 },
    randomize: () => generateSplineProblemVars(1),
    renderPrompt: (v) => 'An object moves along a straight horizontal track. Its 10-second motion is recorded in the <strong>position vs. time</strong> graph shown below. Use the graph to answer each question part:<br/><strong>a.</strong> Average Velocity from <em>t</em> = <strong>' + v.tAvg1 + ' s</strong> to <em>t</em> = <strong>' + v.tAvg2 + ' s</strong><br/><strong>b.</strong> Instantaneous Velocity at <em>t</em> = <strong>' + v.tInst1 + ' s</strong><br/><strong>c.</strong> Time when object is at rest (separate multiple times with a comma, e.g. 1.5, 5.0)<br/><strong>d.</strong> Displacement from <em>t</em> = <strong>' + v.tDisp1 + ' s</strong> to <em>t</em> = <strong>' + v.tDisp2 + ' s</strong><br/><strong>e.</strong> Instantaneous Velocity at <em>t</em> = <strong>' + v.tInst2 + ' s</strong>',
    hasGraph: true,
    graphType: "position_time_tangent",
    parts: [
      {
        label: "a. Average Velocity",
        getLabel: (v) => 'a. Average Velocity from <em>t</em> = ' + v.tAvg1 + ' s to <em>t</em> = ' + v.tAvg2 + ' s',
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
          return 'Average velocity is the slope of the secant line connecting <em>t</em><sub>1</sub> = ' + v.tAvg1 + ' s and <em>t</em><sub>2</sub> = ' + v.tAvg2 + ' s: <em>v</em><sub>avg</sub> = Δ<em>x</em> / Δ<em>t</em> = (' + x2.toFixed(2) + ' m − (' + x1.toFixed(2) + ' m)) / (' + v.tAvg2 + ' s − ' + v.tAvg1 + ' s) = <strong>' + ans.toFixed(2) + ' m/s</strong>.';
        }
      },
      {
        label: "b. Instantaneous Velocity",
        getLabel: (v) => 'b. Instantaneous Velocity at <em>t</em> = ' + v.tInst1 + ' s',
        unit: "m/s",
        placeholder: "e.g. 14.2 or 1.42E1",
        customTol: (ans) => Math.max(0.01, Math.abs(ans) * 0.05),
        solve: (v) => buildSplineModel(v.knotsY).evalSlope(v.tInst1),
        steps: (v, ans) => {
          const m = buildSplineModel(v.knotsY);
          return 'Instantaneous velocity is the slope of the tangent line to the <em>x</em>-<em>t</em> curve at <em>t</em> = ' + v.tInst1 + ' s (where <em>x</em> = ' + m.evalValue(v.tInst1).toFixed(2) + ' m). Select <strong>Draw Tangent</strong>, drag the point to <em>t</em> = ' + v.tInst1 + ' s, and read Δ<em>x</em> / Δ<em>t</em> ≈ <strong>' + ans.toFixed(2) + ' m/s</strong>.';
        }
      },
      {
        label: "c. Time when object is at rest",
        getLabel: () => 'c. Time when object is at rest',
        unit: "s",
        placeholder: "e.g. 1.5, 5.0",
        customAbsTol: 0.22,
        solveMulti: (v) => buildSplineModel(v.knotsY).findZeroSlopeTimes(),
        solve: (v) => buildSplineModel(v.knotsY).findZeroSlopeTimes()[0] || 0,
        steps: (v) => {
          const restTimes = buildSplineModel(v.knotsY).findZeroSlopeTimes();
          return 'The object is at rest when the slope of the position-time curve is zero (horizontal tangent at local peaks and valleys): <em>t</em> ≈ <strong>' + restTimes.map(r => r.toFixed(2)).join(", ") + ' s</strong>.';
        }
      },
      {
        label: "d. Displacement",
        getLabel: (v) => 'd. Displacement from <em>t</em> = ' + v.tDisp1 + ' s to <em>t</em> = ' + v.tDisp2 + ' s',
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
          return 'Displacement is the change in position Δ<em>x</em> = <em>x</em>(' + v.tDisp2 + ' s) − <em>x</em>(' + v.tDisp1 + ' s) = ' + x2.toFixed(2) + ' m − (' + x1.toFixed(2) + ' m) = <strong>' + ans.toFixed(2) + ' m</strong>.';
        }
      },
      {
        label: "e. Instantaneous Velocity",
        getLabel: (v) => 'e. Instantaneous Velocity at <em>t</em> = ' + v.tInst2 + ' s',
        unit: "m/s",
        placeholder: "e.g. 14.2 or 1.42E1",
        customTol: (ans) => Math.max(0.01, Math.abs(ans) * 0.05),
        solve: (v) => buildSplineModel(v.knotsY).evalSlope(v.tInst2),
        steps: (v, ans) => {
          const m = buildSplineModel(v.knotsY);
          return 'Instantaneous velocity at <em>t</em> = ' + v.tInst2 + ' s is the slope of the tangent line at <em>t</em> = ' + v.tInst2 + ' s (where <em>x</em> = ' + m.evalValue(v.tInst2).toFixed(2) + ' m): <em>v</em>(' + v.tInst2 + ') = Δ<em>x</em> / Δ<em>t</em> ≈ <strong>' + ans.toFixed(2) + ' m/s</strong>.';
        }
      }
    ]
  },
  {
    id: "KIN-02", docNum: "Kin #2", title: "Velocity vs. Time Graph",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "splineVelGraph",
    baseVars: { knotsY: [1, 5, -1, 3], ta: 3, vb: 2, tc1: 0, tc2: 6, td: 4.5 },
    randomize: () => generateSplineProblemVars(2),
    renderPrompt: (v) => {
      const vbSign = v.vb > 0 ? '+' + v.vb : '' + v.vb;
      return 'An object moves along a straight horizontal track. Its 10
