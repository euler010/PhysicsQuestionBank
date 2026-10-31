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

const INITIAL_QUESTION_LIBRARY = [
  // --- UNIT 1: KINEMATICS (CED 1.1 - 1.4) ---
  {
    id: "KIN-01", docNum: "Kin #1", title: "Position vs. Time Graph",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics", diagram: "splinePosGraph",
    baseVars: { knotsY: [0, 4, -1, 3], tAvg1: 0, tAvg2: 6, tInst1: 1.75, tDisp1: 3, tDisp2: 9, tInst2: 4.5 },
    randomize: () => generateSplineProblemVars(1),
    renderPrompt: (v) => 'An object moves along a straight horizontal track. Its 10-second motion is recorded in the <strong>position vs. time</strong> graph shown below. Use the graph to answer each question part:<br/><strong>a.</strong> Average Velocity from <em>t</em> = <strong>' + v.tAvg1 + ' s</strong> to <em>t</em> = <strong>' + v.tAvg2 + ' s</strong><br/><strong>b.</strong> Instantaneous Velocity at <em>t</em> = <strong>' + v.tInst1 + ' s</strong><br/><strong>c.</strong> Time when object is at rest (separate multiple times with a comma, e.g. 1.5, 5.0)<br/><strong>d.</strong> Displacement from <em>t</em> = <strong>' + v.tDisp1 + ' s</strong> to <em>t</em> = <strong>' + v.tDisp2 + ' s</strong><br/><strong>e.</strong> Instantaneous Velocity at <em>t</em> = <strong>' + v.tInst2 + ' s</strong>',
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
      return 'An object moves along a straight horizontal track. Its 10-second motion is recorded in the <strong>velocity vs. time</strong> graph shown below. Use the graph to answer each question part:<br/><strong>a.</strong> What is the object’s velocity at <em>t</em> = <strong>' + v.ta + ' s</strong>?<br/><strong>b.</strong> At what point(s) in time is the object’s velocity <strong>' + vbSign + ' m/s</strong>? (separate multiple times with a comma, e.g. 1.5, 5.0)<br/><strong>c.</strong> What is the average acceleration of the object from <em>t</em> = <strong>' + v.tc1 + ' s</strong> to <em>t</em> = <strong>' + v.tc2 + ' s</strong>?<br/><strong>d.</strong> What is the acceleration of the object at <em>t</em> = <strong>' + v.td + ' s</strong>?';
    },
    parts: [
      {
        label: "a. Velocity at specified time",
        getLabel: (v) => 'a. What is the object\'s velocity at <em>t</em> = ' + v.ta + ' s?',
        unit: "m/s",
        placeholder: "e.g. 14.2 or 1.42E1",
        customTol: () => 0.20,
        solve: (v) => buildSplineModel(v.knotsY).evalValue(v.ta),
        steps: (v, ans) => 'Read the vertical axis coordinate directly from the velocity-time graph at <em>t</em> = ' + v.ta + ' s: <em>v</em>(' + v.ta + ' s) = <strong>' + ans.toFixed(2) + ' m/s</strong>.'
      },
      {
        label: "b. Time(s) for specified velocity",
        getLabel: (v) => 'b. At what point(s) in time is the object\'s velocity ' + (v.vb > 0 ? '+' + v.vb : v.vb) + ' m/s?',
        unit: "s",
        placeholder: "e.g. 1.5, 5.0",
        customAbsTol: 0.22,
        solveMulti: (v) => buildSplineModel(v.knotsY).findTimesForValue(v.vb),
        solve: (v) => buildSplineModel(v.knotsY).findTimesForValue(v.vb)[0] || 0,
        steps: (v) => {
          const times = buildSplineModel(v.knotsY).findTimesForValue(v.vb);
          const vbSign = v.vb > 0 ? '+' + v.vb : '' + v.vb;
          return 'Locate all points where the curve crosses the horizontal reference line <em>v</em> = ' + vbSign + ' m/s: <em>t</em> ≈ <strong>' + times.map(r => r.toFixed(2)).join(", ") + ' s</strong>.';
        }
      },
      {
        label: "c. Average acceleration",
        getLabel: (v) => 'c. What is the average acceleration of the object from <em>t</em> = ' + v.tc1 + ' s to <em>t</em> = ' + v.tc2 + ' s?',
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
          return 'Average acceleration is the slope of the secant line on the <em>v</em>-<em>t</em> graph from <em>t</em><sub>1</sub> = ' + v.tc1 + ' s to <em>t</em><sub>2</sub> = ' + v.tc2 + ' s: <em>a</em><sub>avg</sub> = Δ<em>v</em> / Δ<em>t</em> = (' + v2.toFixed(2) + ' m/s − (' + v1.toFixed(2) + ' m/s)) / (' + v.tc2 + ' s − ' + v.tc1 + ' s) = <strong>' + ans.toFixed(2) + ' m/s²</strong>.';
        }
      },
      {
        label: "d. Instantaneous acceleration",
        getLabel: (v) => 'd. What is the acceleration of the object at <em>t</em> = ' + v.td + ' s?',
        unit: "m/s²",
        placeholder: "e.g. 14.2 or 1.42E1",
        customTol: (ans) => Math.max(0.01, Math.abs(ans) * 0.05),
        solve: (v) => buildSplineModel(v.knotsY).evalSlope(v.td),
        steps: (v, ans) => {
          const m = buildSplineModel(v.knotsY);
          return 'Instantaneous acceleration is the slope of the tangent line to the <em>v</em>-<em>t</em> graph at <em>t</em> = ' + v.td + ' s (where <em>v</em> = ' + m.evalValue(v.td).toFixed(2) + ' m/s). Check <strong>Draw Tangent</strong>, position the point at <em>t</em> = ' + v.td + ' s, and calculate Δ<em>v</em> / Δ<em>t</em> ≈ <strong>' + ans.toFixed(2) + ' m/s²</strong>.';
        }
      }
    ]
  },
  {
    id: "KIN-03", docNum: "Kin #3", title: "Astronaut Vertical Jump on Exoplanet",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { hMax: 26.0, v0: 5.8 },
    randomize: (b) => ({ hMax: rnd(b.hMax, 0.20, 1), v0: rnd(b.v0, 0.20, 2) }),
    renderPrompt: (v) => 'An astronaut on a newly explored exoplanet finds that she can jump vertically to a maximum height of <strong>' + v.hMax + ' meters</strong> when her initial takeoff speed is <strong>' + v.v0 + ' m/s</strong>. What is the magnitude of the acceleration due to gravity on the planet?',
    parts: [
      { label: "Gravity magnitude (<em>g</em>)", unit: "m/s²", acceptedUnits: ["m/s²", "N/kg"], solve: (v) => (v.v0 * v.v0) / (2 * v.hMax), steps: (v, ans) => 'At maximum height <em>v</em> = 0: <em>v</em>² = <em>v</em><sub>0</sub>² − 2 <em>g h</em><sub>max</sub> ⇒ <em>g</em> = <em>v</em><sub>0</sub>² / (2 <em>h</em><sub>max</sub>) = ' + ans.toFixed(3) + ' m/s².' }
    ]
  },
  {
    id: "KIN-04", docNum: "Kin #4", title: "Automobile Constant Acceleration: Speed and Time",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { v0: 5.60, accel: 0.45, dist: 615 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 2), accel: rnd(b.accel, 0.20, 2), dist: Math.round(rnd(b.dist, 0.20, 0)) }),
    renderPrompt: (v) => 'An automobile accelerates from an initial velocity of <strong>' + v.v0 + ' m/s</strong> at a constant rate of <strong>' + v.accel + ' m/s²</strong>. It travels a straight-line displacement of <strong>' + v.dist + ' m</strong> while accelerating.<br/><strong>a.</strong> What is the car’s final speed at the end of that displacement?<br/><strong>b.</strong> How long did it take to travel <strong>' + v.dist + ' m</strong>?',
    parts: [
      { label: "a. Final speed (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(v.v0 * v.v0 + 2 * v.accel * v.dist), steps: (v, ans) => '<em>v</em> = √(<em>v</em><sub>0</sub>² + 2 <em>a</em> Δ<em>x</em>) = ' + ans.toFixed(2) + ' m/s.' },
      { label: "b. Travel time (<em>t</em>)", unit: "s", solve: (v) => (Math.sqrt(v.v0 * v.v0 + 2 * v.accel * v.dist) - v.v0) / v.accel, steps: (v, ans) => '<em>t</em> = (<em>v</em> − <em>v</em><sub>0</sub>) / <em>a</em> = ' + ans.toFixed(2) + ' s.' }
    ]
  },
  {
    id: "KIN-05", docNum: "Kin #5", title: "Baseball Pitcher Fastball Acceleration",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { v0: 42.0, dist: 3.5 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), dist: rnd(b.dist, 0.20, 2) }),
    renderPrompt: (v) => 'A baseball pitcher throws a fastball with a release speed of <strong>' + v.v0 + ' m/s</strong>. Estimate the magnitude of the average acceleration of the ball during the throwing motion if the ball accelerates from rest over a distance of <strong>' + v.dist + ' m</strong> from the wind-up to release.',
    parts: [
      { label: "Average acceleration magnitude (<em>a</em>)", unit: "m/s²", solve: (v) => (v.v0 * v.v0) / (2 * v.dist), steps: (v, ans) => '<em>a</em> = <em>v</em>² / (2 Δ<em>x</em>) = (' + v.v0 + ')² / (2 × ' + v.dist + ') = ' + ans.toFixed(1) + ' m/s².' }
    ]
  },
  {
    id: "KIN-06", docNum: "Kin #6", title: "Two-Stage Model Rocket Flight (4 Parts)",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { aEngine: 38.0, tEngine: 1.40 },
    randomize: (b) => ({ aEngine: rnd(b.aEngine, 0.20, 1), tEngine: rnd(b.tEngine, 0.20, 2) }),
    renderPrompt: (v) => 'A model rocket launches vertically from rest on the ground. Its engine produces a constant upward acceleration of <strong>' + v.aEngine + ' m/s²</strong> for <strong>' + v.tEngine + ' s</strong>. When fuel runs out, the rocket continues upward in unpowered free-fall under gravity.<br/><strong>a.</strong> What maximum altitude does the rocket reach?<br/><strong>b.</strong> What is the rocket’s velocity immediately before striking the ground?<br/><strong>c.</strong> What total distance does the rocket travel from launch to impact?<br/><strong>d.</strong> How long is the rocket in the air in total?',
    parts: [
      { label: "a. Maximum altitude (<em>h</em><sub>max</sub>)", unit: "m", solve: (v) => (0.5 * v.aEngine * v.tEngine * v.tEngine) + (Math.pow(v.aEngine * v.tEngine, 2) / (2 * G_ACCEL)), steps: (v, ans) => 'Boost height <em>y</em><sub>1</sub> = ½ <em>a</em><sub>1</sub> <em>t</em><sub>1</sub>² = ' + (0.5 * v.aEngine * v.tEngine * v.tEngine).toFixed(2) + ' m; burnout speed <em>v</em><sub>1</sub> = <em>a</em><sub>1</sub> <em>t</em><sub>1</sub> = ' + (v.aEngine * v.tEngine).toFixed(2) + ' m/s. Coasting climb <em>y</em><sub>2</sub> = <em>v</em><sub>1</sub>² / (2<em>g</em>) = ' + (Math.pow(v.aEngine * v.tEngine, 2) / (2 * G_ACCEL)).toFixed(2) + ' m. Total <em>h</em><sub>max</sub> = ' + ans.toFixed(2) + ' m.' },
      { label: "b. Landing velocity (<em>v</em><sub>land</sub>)", unit: "m/s", solve: (v) => -Math.sqrt(2 * G_ACCEL * ((0.5 * v.aEngine * v.tEngine * v.tEngine) + (Math.pow(v.aEngine * v.tEngine, 2) / (2 * G_ACCEL)))), steps: (v, ans) => 'Falling from rest from <em>h</em><sub>max</sub>: <em>v</em><sub>land</sub> = −√(2 <em>g h</em><sub>max</sub>) = ' + ans.toFixed(2) + ' m/s.' },
      { label: "c. Total distance traveled (<em>d</em><sub>total</sub>)", unit: "m", solve: (v) => 2 * ((0.5 * v.aEngine * v.tEngine * v.tEngine) + (Math.pow(v.aEngine * v.tEngine, 2) / (2 * G_ACCEL))), steps: (v, ans) => 'Total distance is 2 × <em>h</em><sub>max</sub> = ' + ans.toFixed(2) + ' m.' },
      { label: "d. Total flight time (<em>t</em><sub>total</sub>)", unit: "s", solve: (v) => { const hMax = (0.5 * v.aEngine * v.tEngine * v.tEngine) + (Math.pow(v.aEngine * v.tEngine, 2) / (2 * G_ACCEL)); return v.tEngine + ((v.aEngine * v.tEngine) / G_ACCEL) + Math.sqrt((2 * hMax) / G_ACCEL); }, steps: (v, ans) => '<em>t</em><sub>total</sub> = <em>t</em><sub>boost</sub> + <em>t</em><sub>coast</sub> + <em>t</em><sub>fall</sub> = ' + ans.toFixed(2) + ' s.' }
    ]
  },
  {
    id: "KIN-07", docNum: "Kin #7", title: "Driver Reaction Time and Total Stopping Distance",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { v0: 22.0, decel: 4.10, tRxn: 0.350 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), decel: rnd(b.decel, 0.20, 2), tRxn: rnd(b.tRxn, 0.20, 3) }),
    renderPrompt: (v) => 'A driver is traveling at <strong>' + v.v0 + ' m/s</strong> when an obstacle appears in the roadway. The vehicle decelerates at a maximum rate of <strong>' + v.decel + ' m/s²</strong>. If human reaction time is <strong>' + v.tRxn + ' s</strong> before braking begins, what total distance does the car travel before stopping?',
    parts: [
      { label: "Total stopping distance (<em>d</em><sub>total</sub>)", unit: "m", solve: (v) => (v.v0 * v.tRxn) + (v.v0 * v.v0) / (2 * v.decel), steps: (v, ans) => 'Reaction distance <em>d</em><sub>rxn</sub> = <em>v</em><sub>0</sub> <em>t</em><sub>rxn</sub> = ' + (v.v0 * v.tRxn).toFixed(2) + ' m. Braking distance <em>d</em><sub>brake</sub> = <em>v</em><sub>0</sub>² / (2<em>a</em>) = ' + ((v.v0 * v.v0) / (2 * v.decel)).toFixed(2) + ' m. Total distance = ' + ans.toFixed(2) + ' m.' }
    ]
  },
  {
    id: "KIN-08", docNum: "Kin #8", title: "Aircraft Carrier Steam Catapult Launch Length",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { vFinal: 42.0, tLaunch: 2.00 },
    randomize: (b) => ({ vFinal: rnd(b.vFinal, 0.20, 1), tLaunch: rnd(b.tLaunch, 0.20, 2) }),
    renderPrompt: (v) => 'A supersonic aircraft is launched from rest via a steam catapult on an aircraft carrier flight deck. It achieves a takeoff speed of <strong>' + v.vFinal + ' m/s</strong> in <strong>' + v.tLaunch + ' s</strong>. Assuming constant acceleration, what is the length of the catapult runway?',
    parts: [
      { label: "Catapult length (Δ<em>x</em>)", unit: "m", solve: (v) => 0.5 * v.vFinal * v.tLaunch, steps: (v, ans) => 'Δ<em>x</em> = ½(<em>v</em><sub>0</sub> + <em>v</em>) <em>t</em> = ½(' + v.vFinal + ')(' + v.tLaunch + ') = ' + ans.toFixed(2) + ' m.' }
    ]
  },
  {
    id: "KIN-09", docNum: "Kin #9", title: "Vehicle Uniform Braking Distance from Time",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { v0: 27.0, timeSec: 8.00 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), timeSec: rnd(b.timeSec, 0.20, 2) }),
    renderPrompt: (v) => 'A vehicle slows down uniformly from an initial velocity of <strong>' + v.v0 + ' m/s</strong> to a full stop in <strong>' + v.timeSec + ' seconds</strong>. What total distance does it cover during this stopping period?',
    parts: [
      { label: "Distance traveled (Δ<em>x</em>)", unit: "m", solve: (v) => 0.5 * v.v0 * v.timeSec, steps: (v, ans) => 'Δ<em>x</em> = ½(<em>v</em><sub>0</sub> + <em>v</em>) <em>t</em> = ½(' + v.v0 + ' + 0)(' + v.timeSec + ') = ' + ans.toFixed(2) + ' m.' }
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
      return { vMax: vMax, t1: t1, t2: t2, t3: t3 };
    },
    renderPrompt: (v) => 'The velocity-time graph shown illustrates the motion of a vertical test freight elevator. The elevator accelerates uniformly from rest to a peak velocity of <strong>' + v.vMax + ' m/s</strong> at <em>t</em><sub>1</sub> = <strong>' + v.t1 + ' s</strong>, cruises at constant velocity until <em>t</em><sub>2</sub> = <strong>' + v.t2 + ' s</strong>, then brakes uniformly to rest at <em>t</em><sub>3</sub> = <strong>' + v.t3 + ' s</strong>.<br/><strong>a.</strong> What is the magnitude of the elevator’s maximum acceleration?<br/><strong>b.</strong> What is the total vertical displacement of the elevator?',
    parts: [
      { label: "a. Maximum acceleration magnitude (|<em>a</em>|<sub>max</sub>)", unit: "m/s²", solve: (v) => Math.max(v.vMax / v.t1, v.vMax / (v.t3 - v.t2)), steps: (v, ans) => '|<em>a</em><sub>1</sub>| = ' + v.vMax + ' / ' + v.t1 + ' = ' + (v.vMax / v.t1).toFixed(2) + ' m/s² and |<em>a</em><sub>3</sub>| = ' + v.vMax + ' / (' + v.t3 + ' − ' + v.t2 + ') = ' + (v.vMax / (v.t3 - v.t2)).toFixed(2) + ' m/s². Maximum magnitude = ' + ans.toFixed(2) + ' m/s².' },
      { label: "b. Total vertical displacement (Δ<em>y</em>)", unit: "m", solve: (v) => 0.5 * (v.t3 + (v.t2 - v.t1)) * v.vMax, steps: (v, ans) => 'Trapezoid area under <em>v</em>-<em>t</em> graph: Δ<em>y</em> = ½ [<em>t</em><sub>3</sub> + (<em>t</em><sub>2</sub> − <em>t</em><sub>1</sub>)] <em>v</em><sub>max</sub> = ½ [' + v.t3 + ' + ' + (v.t2 - v.t1) + '] (' + v.vMax + ') = ' + ans.toFixed(1) + ' m.' }
    ]
  },
  {
    id: "KIN-11", docNum: "Kin #11", title: "Tennis Ball Rebound Average Acceleration",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { vIn: 45.0, vOut: 39.0, tDur: 0.062 },
    randomize: (b) => ({ vIn: rnd(b.vIn, 0.20, 1), vOut: rnd(b.vOut, 0.20, 1), tDur: rnd(b.tDur, 0.20, 3) }),
    renderPrompt: (v) => 'A tennis ball travels horizontally toward a player at a speed of <strong>' + v.vIn + ' m/s</strong>. The player strikes the ball directly back in the opposite direction, and <strong>' + v.tDur + ' seconds</strong> later the ball departs the strings at <strong>' + v.vOut + ' m/s</strong>. What is the magnitude of the average acceleration experienced by the ball during contact?',
    parts: [
      { label: "Average acceleration magnitude (|<em>a</em><sub>avg</sub>|)", unit: "m/s²", solve: (v) => (v.vOut + v.vIn) / v.tDur, steps: (v, ans) => 'Taking outgoing direction as positive: |<em>a</em><sub>avg</sub>| = [<em>v</em><sub>out</sub> − (−<em>v</em><sub>in</sub>)] / Δ<em>t</em> = (' + v.vOut + ' + ' + v.vIn + ') / ' + v.tDur + ' = ' + ans.toFixed(1) + ' m/s².' }
    ]
  },
  {
    id: "KIN-12", docNum: "Kin #12", title: "Crash Test Vehicle Crumple Zone Deceleration and g's",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { v0: 26.0, dist: 0.77 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), dist: rnd(b.dist, 0.20, 2) }),
    renderPrompt: (v) => 'A test vehicle traveling at <strong>+' + v.v0 + ' m/s</strong> crashes into a rigid barrier. The crumple zone compresses and the cabin stops in <strong>' + v.dist + ' m</strong>.<br/><strong>a.</strong> What is the magnitude of the average acceleration during impact?<br/><strong>b.</strong> How many <em>g</em>’s of acceleration does the vehicle experience?',
    parts: [
      { label: "a. Average acceleration magnitude (|<em>a</em>|)", unit: "m/s²", solve: (v) => (v.v0 * v.v0) / (2 * v.dist), steps: (v, ans) => '|<em>a</em>| = <em>v</em><sub>0</sub>² / (2 Δ<em>x</em>) = (' + v.v0 + ')² / (2 × ' + v.dist + ') = ' + ans.toFixed(1) + ' m/s².' },
      { label: "b. Acceleration in <em>g</em>'s", unit: "g's", acceptedUnits: ["g's", "No units"], solve: (v) => ((v.v0 * v.v0) / (2 * v.dist)) / G_ACCEL, steps: (v, ans) => 'Acceleration in <em>g</em>’s = |<em>a</em>| / 9.80 = ' + ans.toFixed(2) + ' g\'s.' }
    ]
  },
  {
    id: "KIN-13", docNum: "Kin #13", title: "Highway Passing Time with Unit Conversion (km/h to m/s)",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { vInitKmh: 60, accel: 4.0, vFinalKmh: 90 },
    randomize: (b) => {
      const vInitKmh = Math.round(rnd(b.vInitKmh, 0.20, 0));
      const vFinalKmh = vInitKmh + Math.round(rnd(30, 0.20, 0));
      return { vInitKmh: vInitKmh, accel: rnd(b.accel, 0.20, 2), vFinalKmh: vFinalKmh };
    },
    renderPrompt: (v) => 'A car traveling at <strong>' + v.vInitKmh + ' km/h</strong> accelerates at a constant rate of <strong>' + v.accel + ' m/s²</strong>. How much time is required to increase its speed to <strong>' + v.vFinalKmh + ' km/h</strong>?',
    parts: [
      { label: "Required time (<em>t</em>)", unit: "s", solve: (v) => ((v.vFinalKmh / 3.6) - (v.vInitKmh / 3.6)) / v.accel, steps: (v, ans) => 'Convert speeds: <em>v</em><sub>0</sub> = ' + v.vInitKmh + ' / 3.6 = ' + (v.vInitKmh / 3.6).toFixed(2) + ' m/s, <em>v</em><sub>f</sub> = ' + v.vFinalKmh + ' / 3.6 = ' + (v.vFinalKmh / 3.6).toFixed(2) + ' m/s. Then <em>t</em> = (<em>v</em><sub>f</sub> − <em>v</em><sub>0</sub>) / <em>a</em> = ' + ans.toFixed(2) + ' s.' }
    ]
  },
  {
    id: "KIN-14", docNum: "Kin #14", title: "Final Velocity from Average Velocity and Displacement",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { v0: 4.00, timeSec: 15.0, dist: 235 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 2), timeSec: rnd(b.timeSec, 0.20, 1), dist: Math.round(rnd(b.dist, 0.20, 0)) }),
    renderPrompt: (v) => 'A car with an initial velocity of <strong>' + v.v0 + ' m/s</strong> accelerates uniformly over <strong>' + v.timeSec + ' s</strong>, traveling a displacement of <strong>' + v.dist + ' m</strong>. What is the car’s velocity at the end of the <strong>' + v.timeSec + ' s</strong> interval?',
    parts: [
      { label: "Final velocity (<em>v</em>)", unit: "m/s", solve: (v) => (2 * v.dist / v.timeSec) - v.v0, steps: (v, ans) => 'From Δ<em>x</em> = ½(<em>v</em><sub>0</sub> + <em>v</em>) <em>t</em>: <em>v</em> = (2 Δ<em>x</em> / <em>t</em>) − <em>v</em><sub>0</sub> = (2 × ' + v.dist + ' / ' + v.timeSec + ') − ' + v.v0 + ' = ' + ans.toFixed(2) + ' m/s.' }
    ]
  },
  {
    id: "KIN-15", docNum: "Kin #15", title: "Weather Balloon Instrument Package Free-Fall",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { vImpact: -73.5 },
    randomize: (b) => ({ vImpact: -rnd(Math.abs(b.vImpact), 0.20, 1) }),
    renderPrompt: (v) => 'A high-altitude weather balloon releases an instrument package from rest. The package strikes the ground below at a velocity of <strong>' + v.vImpact + ' m/s</strong> (downward).<br/><strong>a.</strong> How far did the package fall (positive distance)?<br/><strong>b.</strong> How long was the package falling?',
    parts: [
      { label: "a. Fall distance (<em>h</em>)", unit: "m", solve: (v) => (v.vImpact * v.vImpact) / (2 * G_ACCEL), steps: (v, ans) => '<em>h</em> = <em>v</em>² / (2<em>g</em>) = (' + v.vImpact + ')² / 19.6 = ' + ans.toFixed(1) + ' m.' },
      { label: "b. Fall time (<em>t</em>)", unit: "s", solve: (v) => Math.abs(v.vImpact) / G_ACCEL, steps: (v, ans) => '<em>t</em> = |<em>v</em>| / <em>g</em> = ' + Math.abs(v.vImpact) + ' / 9.80 = ' + ans.toFixed(2) + ' s.' }
    ]
  },
  {
    id: "KIN-16", docNum: "Kin #16", title: "Vertical Projectile Launch Speed from Total Flight Time",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { tTotal: 8.30 },
    randomize: (b) => ({ tTotal: rnd(b.tTotal, 0.20, 2) }),
    renderPrompt: (v) => 'A projectile launched vertically upward returns to its launch elevation after <strong>' + v.tTotal + ' seconds</strong> in the air. Neglecting air drag, what was its initial launch speed?',
    parts: [
      { label: "Initial launch speed (<em>v</em><sub>0</sub>)", unit: "m/s", solve: (v) => G_ACCEL * (v.tTotal / 2), steps: (v, ans) => 'Time to apex <em>t</em><sub>up</sub> = <em>t</em><sub>total</sub> / 2 = ' + (v.tTotal / 2).toFixed(2) + ' s. <em>v</em><sub>0</sub> = <em>g t</em><sub>up</sub> = 9.80 × ' + (v.tTotal / 2).toFixed(2) + ' = ' + ans.toFixed(2) + ' m/s.' }
    ]
  },
  {
    id: "KIN-17", docNum: "Kin #17", title: "Pop-Up Baseball Landing Below Bat Height",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { tTotal: 5.00, dropDist: 1.40 },
    randomize: (b) => ({ tTotal: rnd(b.tTotal, 0.20, 2), dropDist: rnd(b.dropDist, 0.20, 2) }),
    renderPrompt: (v) => 'During a baseball game, a batter pops a ball straight up into the air. The ball remains airborne for <strong>' + v.tTotal + ' s</strong> before landing on the turf <strong>' + v.dropDist + ' meters</strong> below the height where it made contact with the bat.<br/><strong>a.</strong> How high above the ground does the ball climb at its apex?<br/><strong>b.</strong> With what speed did the ball leave the bat?',
    parts: [
      { label: "a. Maximum height above ground (<em>H</em><sub>max</sub>)", unit: "m", solve: (v) => { const v0 = (0.5 * G_ACCEL * v.tTotal * v.tTotal - v.dropDist) / v.tTotal; return v.dropDist + (v0 * v0) / (2 * G_ACCEL); }, steps: (v, ans) => { const v0 = (0.5 * G_ACCEL * v.tTotal * v.tTotal - v.dropDist) / v.tTotal; return 'Using <em>v</em><sub>0</sub> = ' + v0.toFixed(2) + ' m/s, climb above bat = <em>v</em><sub>0</sub>² / (2<em>g</em>) = ' + ((v0 * v0) / (2 * G_ACCEL)).toFixed(2) + ' m. Adding bat height ' + v.dropDist + ' m gives <em>H</em><sub>max</sub> = ' + ans.toFixed(2) + ' m.'; } },
      { label: "b. Initial speed from bat (<em>v</em><sub>0</sub>)", unit: "m/s", solve: (v) => (0.5 * G_ACCEL * v.tTotal * v.tTotal - v.dropDist) / v.tTotal, steps: (v, ans) => 'From Δ<em>y</em> = −' + v.dropDist + ' = <em>v</em><sub>0</sub> <em>t</em> − ½ <em>g t</em>²: <em>v</em><sub>0</sub> = (½ <em>g t</em>² − ' + v.dropDist + ') / <em>t</em> = ' + ans.toFixed(2) + ' m/s.' }
    ]
  },
  {
    id: "KIN-18", docNum: "Kin #18", title: "Rebounding Tennis Ball Floor Impact Acceleration",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { hDrop: 1.20, hRebound: 1.00, tContact: 0.010 },
    randomize: (b) => ({ hDrop: rnd(b.hDrop, 0.20, 2), hRebound: rnd(b.hRebound, 0.20, 2), tContact: rnd(b.tContact, 0.20, 3) }),
    renderPrompt: (v) => 'A tennis ball is dropped from rest at an initial elevation of <strong>' + v.hDrop + ' m</strong>, strikes the floor, and rebounds to a height of <strong>' + v.hRebound + ' m</strong>.<br/><strong>a.</strong> What is its velocity as it strikes the floor?<br/><strong>b.</strong> What is its velocity as it leaves the floor?<br/><strong>c.</strong> If contact with the floor lasts <strong>' + v.tContact + ' s</strong>, find the average acceleration during the bounce.',
    parts: [
      { label: "a. Impact velocity (<em>v</em><sub>1</sub>)", unit: "m/s", solve: (v) => -Math.sqrt(2 * G_ACCEL * v.hDrop), steps: (v, ans) => '<em>v</em><sub>1</sub> = −√(2 <em>g h</em><sub>drop</sub>) = ' + ans.toFixed(2) + ' m/s (downward).' },
      { label: "b. Rebound velocity (<em>v</em><sub>2</sub>)", unit: "m/s", solve: (v) => Math.sqrt(2 * G_ACCEL * v.hRebound), steps: (v, ans) => '<em>v</em><sub>2</sub> = +√(2 <em>g h</em><sub>rebound</sub>) = ' + ans.toFixed(2) + ' m/s (upward).' },
      { label: "c. Floor contact average acceleration (<em>a</em><sub>avg</sub>)", unit: "m/s²", solve: (v) => (Math.sqrt(2 * G_ACCEL * v.hRebound) - (-Math.sqrt(2 * G_ACCEL * v.hDrop))) / v.tContact, steps: (v, ans) => '<em>a</em><sub>avg</sub> = (<em>v</em><sub>2</sub> − <em>v</em><sub>1</sub>) / Δ<em>t</em> = ' + ans.toFixed(1) + ' m/s².' }
    ]
  },
  {
    id: "KIN-19", docNum: "Kin #19", title: "High-Performance Vehicle Braking Time and Distance",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { decel: 7.70, speedKmh: 89.0 },
    randomize: (b) => ({ decel: rnd(b.decel, 0.20, 2), speedKmh: rnd(b.speedKmh, 0.20, 1) }),
    renderPrompt: (v) => 'A high-performance vehicle brakes at <strong>' + v.decel + ' m/s²</strong>. If its initial cruising speed is <strong>' + v.speedKmh + ' km/h</strong>:<br/><strong>a.</strong> How long does it take to stop?<br/><strong>b.</strong> How far does it travel during braking?',
    parts: [
      { label: "a. Stopping time (<em>t</em>)", unit: "s", solve: (v) => (v.speedKmh / 3.6) / v.decel, steps: (v, ans) => 'Convert speed: <em>v</em><sub>0</sub> = ' + v.speedKmh + ' / 3.6 = ' + (v.speedKmh / 3.6).toFixed(2) + ' m/s. <em>t</em> = <em>v</em><sub>0</sub> / <em>a</em> = ' + ans.toFixed(2) + ' s.' },
      { label: "b. Stopping distance (Δ<em>x</em>)", unit: "m", solve: (v) => Math.pow(v.speedKmh / 3.6, 2) / (2 * v.decel), steps: (v, ans) => 'Δ<em>x</em> = <em>v</em><sub>0</sub>² / (2<em>a</em>) = ' + ans.toFixed(2) + ' m.' }
    ]
  },
  {
    id: "KIN-20", docNum: "Kin #20", title: "Jumping Flea Takeoff Speed and Acceleration Duration",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { aFlea: 1500, hMm: 20.0 },
    randomize: (b) => ({ aFlea: Math.round(rnd(b.aFlea, 0.20, 0)), hMm: rnd(b.hMm, 0.20, 1) }),
    renderPrompt: (v) => 'A flea generates an explosive leg acceleration of <strong>' + v.aFlea + ' m/s²</strong> during takeoff, allowing it to jump vertically to an apex of <strong>' + v.hMm + ' mm</strong>.<br/><strong>a.</strong> What is the flea’s speed when leaving the ground?<br/><strong>b.</strong> How long did the takeoff acceleration phase last?',
    parts: [
      { label: "a. Takeoff speed (<em>v</em><sub>takeoff</sub>)", unit: "m/s", solve: (v) => Math.sqrt(2 * G_ACCEL * (v.hMm / 1000)), steps: (v, ans) => 'Convert height: <em>h</em> = ' + (v.hMm / 1000) + ' m. <em>v</em><sub>takeoff</sub> = √(2 <em>g h</em>) = ' + ans.toFixed(3) + ' m/s.' },
      { label: "b. Takeoff acceleration duration (<em>t</em>)", unit: "s", solve: (v) => Math.sqrt(2 * G_ACCEL * (v.hMm / 1000)) / v.aFlea, steps: (v, ans) => '<em>t</em> = <em>v</em><sub>takeoff</sub> / <em>a</em> = ' + ans.toExponential(3) + ' s.' }
    ]
  },
  {
    id: "KIN-21", docNum: "Kin #21", title: "Crate Released from Descending Helicopter",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { vDescend: 5.80, hStart: 153 },
    randomize: (b) => ({ vDescend: rnd(b.vDescend, 0.20, 2), hStart: Math.round(rnd(b.hStart, 0.20, 0)) }),
    renderPrompt: (v) => 'A helicopter is descending vertically at a constant speed of <strong>' + v.vDescend + ' m/s</strong>. When it is <strong>' + v.hStart + ' m</strong> above ground level, a crate is released.<br/><strong>a.</strong> How long does it take for the crate to reach the ground?<br/><strong>b.</strong> What is the crate’s velocity immediately before touchdown?',
    parts: [
      { label: "a. Fall time (<em>t</em>)", unit: "s", solve: (v) => (-v.vDescend + Math.sqrt(v.vDescend * v.vDescend + 2 * G_ACCEL * v.hStart)) / G_ACCEL, steps: (v, ans) => 'With initial downward velocity <em>v</em><sub>0</sub> = −' + v.vDescend + ' m/s and Δ<em>y</em> = −' + v.hStart + ' m: 4.90 <em>t</em>² + ' + v.vDescend + ' <em>t</em> − ' + v.hStart + ' = 0 ⇒ <em>t</em> = ' + ans.toFixed(2) + ' s.' },
      { label: "b. Landing velocity (<em>v</em>)", unit: "m/s", solve: (v) => -Math.sqrt(v.vDescend * v.vDescend + 2 * G_ACCEL * v.hStart), steps: (v, ans) => '<em>v</em> = −√(<em>v</em><sub>0</sub>² + 2 <em>g h</em>) = ' + ans.toFixed(2) + ' m/s.' }
    ]
  },
  {
    id: "KIN-22", docNum: "Kin #22", title: "Stone Dropped off Ocean Cliff with Speed of Sound Splash",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { tTotal: 4.10 },
    randomize: (b) => ({ tTotal: rnd(b.tTotal, 0.20, 2) }),
    renderPrompt: (v) => 'A stone is dropped from rest off an ocean cliff. The audible splash from striking the water is heard <strong>' + v.tTotal + ' seconds</strong> later. Given that the speed of sound in air is <strong>343 m/s</strong>, determine the height of the cliff.',
    parts: [
      { label: "Cliff height (<em>h</em>)", unit: "m", solve: (v) => { const A = 1 / (343 * 343); const B = -((2 * v.tTotal / 343) + (2 / G_ACCEL)); const C = v.tTotal * v.tTotal; return (-B - Math.sqrt(B * B - 4 * A * C)) / (2 * A); }, steps: (v, ans) => 'Total time <em>t</em><sub>total</sub> = √(2<em>h</em> / 9.80) + <em>h</em> / 343 = ' + v.tTotal + ' s. Solving the quadratic for <em>h</em> gives ' + ans.toFixed(2) + ' m.' }
    ]
  },
  {
    id: "KIN-23", docNum: "Kin #23", title: "Red Kangaroo Vertical Leap Time and Takeoff Speed",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { hMax: 1.42 },
    randomize: (b) => ({ hMax: rnd(b.hMax, 0.20, 2) }),
    renderPrompt: (v) => 'A red kangaroo leaps vertically upward to a maximum clearance height of <strong>' + v.hMax + ' m</strong>.<br/><strong>a.</strong> How long was the kangaroo in the air before landing back down?<br/><strong>b.</strong> What was its takeoff speed?',
    parts: [
      { label: "a. Total airborne time (<em>t</em><sub>total</sub>)", unit: "s", solve: (v) => 2 * Math.sqrt((2 * v.hMax) / G_ACCEL), steps: (v, ans) => '<em>t</em><sub>total</sub> = 2 √(2 <em>h</em><sub>max</sub> / <em>g</em>) = ' + ans.toFixed(2) + ' s.' },
      { label: "b. Takeoff speed (<em>v</em><sub>0</sub>)", unit: "m/s", solve: (v) => Math.sqrt(2 * G_ACCEL * v.hMax), steps: (v, ans) => '<em>v</em><sub>0</sub> = √(2 <em>g h</em><sub>max</sub>) = ' + ans.toFixed(2) + ' m/s.' }
    ]
  },
  {
    id: "KIN-24", docNum: "Kin #24", title: "Vehicle Accelerating from Rest: Distance and Final Velocity",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { accel: 3.20, timeSec: 6.00 },
    randomize: (b) => ({ accel: rnd(b.accel, 0.20, 2), timeSec: rnd(b.timeSec, 0.20, 2) }),
    renderPrompt: (v) => 'A vehicle accelerates from rest with a constant acceleration of <strong>' + v.accel + ' m/s²</strong> for <strong>' + v.timeSec + ' seconds</strong>.<br/><strong>a.</strong> What distance does it cover during this period?<br/><strong>b.</strong> What is its final velocity?',
    parts: [
      { label: "a. Distance covered (Δ<em>x</em>)", unit: "m", solve: (v) => 0.5 * v.accel * v.timeSec * v.timeSec, steps: (v, ans) => 'Δ<em>x</em> = ½ <em>a t</em>² = ½(' + v.accel + ')(' + v.timeSec + ')² = ' + ans.toFixed(2) + ' m.' },
      { label: "b. Final velocity (<em>v</em>)", unit: "m/s", solve: (v) => v.accel * v.timeSec, steps: (v, ans) => '<em>v</em> = <em>a t</em> = (' + v.accel + ')(' + v.timeSec + ') = ' + ans.toFixed(2) + ' m/s.' }
    ]
  },
  {
    id: "KIN-25", docNum: "Kin #25", title: "Steel Sphere Dropped from Skyscraper Observation Deck",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { timeSec: 4.50 },
    randomize: (b) => ({ timeSec: rnd(b.timeSec, 0.20, 2) }),
    renderPrompt: (v) => 'A steel sphere is dropped from rest from the observation deck of a skyscraper and strikes the ground <strong>' + v.timeSec + ' s</strong> later.<br/><strong>a.</strong> How tall is the observation deck?<br/><strong>b.</strong> With what speed does the sphere hit the pavement?',
    parts: [
      { label: "a. Deck height (<em>y</em>)", unit: "m", solve: (v) => 0.5 * G_ACCEL * v.timeSec * v.timeSec, steps: (v, ans) => '<em>y</em> = ½ <em>g t</em>² = ½(9.80)(' + v.timeSec + ')² = ' + ans.toFixed(2) + ' m.' },
      { label: "b. Impact speed (<em>v</em>)", unit: "m/s", solve: (v) => G_ACCEL * v.timeSec, steps: (v, ans) => '<em>v</em> = <em>g t</em> = 9.80 × ' + v.timeSec + ' = ' + ans.toFixed(2) + ' m/s.' }
    ]
  },
  {
    id: "KIN-26", docNum: "Kin #26", title: "Commuter Train Service Braking Distance",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { vInit: 30.0, decel: 1.50 },
    randomize: (b) => ({ vInit: rnd(b.vInit, 0.20, 1), decel: rnd(b.decel, 0.20, 2) }),
    renderPrompt: (v) => 'A commuter train cruising at an initial speed of <strong>' + v.vInit + ' m/s</strong> applies service brakes, producing a constant deceleration of <strong>' + v.decel + ' m/s²</strong>. How far does the train travel before coming to a stop?',
    parts: [
      { label: "Stopping distance (Δ<em>x</em>)", unit: "m", solve: (v) => (v.vInit * v.vInit) / (2 * v.decel), steps: (v, ans) => 'Δ<em>x</em> = <em>v</em><sub>0</sub>² / (2<em>a</em>) = (' + v.vInit + ')² / (2 × ' + v.decel + ') = ' + ans.toFixed(1) + ' m.' }
    ]
  },
  {
    id: "KIN-27", docNum: "Kin #27", title: "Stone Thrown Upward from Edge of Sheer Cliff",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { v0: 18.0, hCliff: 25.0 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), hCliff: rnd(b.hCliff, 0.20, 1) }),
    renderPrompt: (v) => 'A stone is thrown vertically upward with an initial velocity of <strong>' + v.v0 + ' m/s</strong> from the edge of a sheer cliff <strong>' + v.hCliff + ' m</strong> high.<br/><strong>a.</strong> What is the maximum height reached by the stone above the base of the cliff?<br/><strong>b.</strong> How long does it take for the stone to hit the canyon floor below?',
    parts: [
      { label: "a. Max height above cliff base (<em>H</em><sub>max</sub>)", unit: "m", solve: (v) => v.hCliff + (v.v0 * v.v0) / (2 * G_ACCEL), steps: (v, ans) => '<em>H</em><sub>max</sub> = <em>h</em><sub>cliff</sub> + <em>v</em><sub>0</sub>² / (2<em>g</em>) = ' + v.hCliff + ' + (' + v.v0 + ')² / 19.6 = ' + ans.toFixed(2) + ' m.' },
      { label: "b. Total flight time (<em>t</em>)", unit: "s", solve: (v) => (v.v0 + Math.sqrt(v.v0 * v.v0 + 2 * G_ACCEL * v.hCliff)) / G_ACCEL, steps: (v, ans) => 'From Δ<em>y</em> = −' + v.hCliff + ' = <em>v</em><sub>0</sub> <em>t</em> − 4.90 <em>t</em>²: <em>t</em> = [' + v.v0 + ' + √((' + v.v0 + ')² + 19.6 × ' + v.hCliff + ')] / 9.80 = ' + ans.toFixed(2) + ' s.' }
    ]
  },

  // --- UNIT 1: 2D KINEMATICS AND PROJECTILE MOTION (CED 1.5) ---
  {
    id: "PROJ-01", docNum: "Proj #1", title: "Rock Thrown Horizontally from a Bridge (4 Parts)",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion",
    baseVars: { v0: 12.0, tFall: 2.28 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), tFall: rnd(b.tFall, 0.20, 2) }),
    renderPrompt: (v) => 'Paula throws a rock horizontally with a speed of <strong>' + v.v0 + ' m/s</strong> from a bridge, and it falls for <strong>' + v.tFall + ' seconds</strong> before reaching the water below.<br/><strong>a.</strong> How high is the bridge from the water below?<br/><strong>b.</strong> How far horizontally does the rock travel before striking the water?<br/><strong>c.</strong> What is the rock’s speed as it reaches the water?<br/><strong>d.</strong> What is the rock’s direction just before hitting the water?',
    parts: [
      { label: "a. Bridge height (<em>h</em>)", unit: "m", solve: (v) => 0.5 * G_ACCEL * v.tFall * v.tFall, steps: (v, ans) => '<em>h</em> = ½ <em>g t</em>² = ½(9.80)(' + v.tFall + ')² = ' + ans.toFixed(2) + ' m.' },
      { label: "b. Horizontal distance (Δ<em>x</em>)", unit: "m", solve: (v) => v.v0 * v.tFall, steps: (v, ans) => 'Δ<em>x</em> = <em>v</em><sub>0</sub> <em>t</em> = (' + v.v0 + ')(' + v.tFall + ') = ' + ans.toFixed(2) + ' m.' },
      { label: "c. Impact speed (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(v.v0 * v.v0 + Math.pow(G_ACCEL * v.tFall, 2)), steps: (v, ans) => '<em>v</em><sub>y</sub> = −<em>g t</em> = −' + (G_ACCEL * v.tFall).toFixed(2) + ' m/s. <em>v</em> = √(<em>v</em><sub>x</sub>² + <em>v</em><sub>y</sub>²) = ' + ans.toFixed(2) + ' m/s.' },
      { label: "d. Impact direction (θ)", unit: "°", directionOptions: ["above the horizontal", "below the horizontal"], expectedDirection: "below the horizontal", solve: (v) => Math.atan((G_ACCEL * v.tFall) / v.v0) * RAD2DEG, steps: (v, ans) => 'θ = arctan(|<em>v</em><sub>y</sub>| / <em>v</em><sub>x</sub>) = ' + ans.toFixed(1) + '° below the horizontal.' }
    ]
  },
  {
    id: "PROJ-02", docNum: "Proj #2", title: "Marble Rolling Off Tabletop Speed",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion",
    baseVars: { v0: 2.0, tFall: 0.30 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 2), tFall: rnd(b.tFall, 0.20, 2) }),
    renderPrompt: (v) => 'A marble rolls off the edge of a tabletop with a horizontal speed of <strong>' + v.v0 + ' m/s</strong>. What is its speed <strong>' + v.tFall + ' s</strong> later?',
    parts: [
      { label: "Speed after elapsed time (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(v.v0 * v.v0 + Math.pow(G_ACCEL * v.tFall, 2)), steps: (v, ans) => '<em>v</em><sub>x</sub> = ' + v.v0 + ' m/s, <em>v</em><sub>y</sub> = −9.80(' + v.tFall + ') = −' + (G_ACCEL * v.tFall).toFixed(2) + ' m/s. <em>v</em> = √(<em>v</em><sub>x</sub>² + <em>v</em><sub>y</sub>²) = ' + ans.toFixed(2) + ' m/s.' }
    ]
  },
  {
    id: "PROJ-03", docNum: "Proj #3", title: "Baseball Home Run Hit at an Angle from Initial Height",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projBaseball",
    baseVars: { theta: 29.0, y0Cm: 96.0, v0: 48.0 },
    randomize: (b) => ({ theta: rnd(b.theta, 0.18, 1), y0Cm: rnd(b.y0Cm, 0.18, 1), v0: rnd(b.v0, 0.18, 1) }),
    renderPrompt: (v) => 'A baseball player hits a home run which leaves the bat at an angle of <strong>' + v.theta + '°</strong> above the horizontal, a height of <strong>' + v.y0Cm + ' cm</strong> above the ground, and an initial launch speed of <strong>' + v.v0 + ' m/s</strong>.<br/><strong>a.</strong> How high above the ground was the ball at its highest point?<br/><strong>b.</strong> How far did the ball land from where it was hit (horizontal distance along ground)?',
    parts: [
      { label: "a. Maximum height above ground (<em>H</em><sub>max</sub>)", unit: "m", solve: (v) => (v.y0Cm / 100) + Math.pow(v.v0 * Math.sin(v.theta * DEG2RAD), 2) / (2 * G_ACCEL), steps: (v, ans) => '<em>v</em><sub>0y</sub> = ' + v.v0 + ' sin(' + v.theta + '°) = ' + (v.v0 * Math.sin(v.theta * DEG2RAD)).toFixed(2) + ' m/s. <em>H</em><sub>max</sub> = <em>y</em><sub>0</sub> + <em>v</em><sub>0y</sub>² / (2<em>g</em>) = ' + ans.toFixed(2) + ' m.' },
      { label: "b. Horizontal distance landed (Δ<em>x</em>)", unit: "m", solve: (v) => { const rad = v.theta * DEG2RAD; const vx = v.v0 * Math.cos(rad); const vy0 = v.v0 * Math.sin(rad); const y0 = v.y0Cm / 100; const tFlight = (vy0 + Math.sqrt(vy0 * vy0 + 2 * G_ACCEL * y0)) / G_ACCEL; return vx * tFlight; }, steps: (v, ans) => 'Solve −<em>y</em><sub>0</sub> = <em>v</em><sub>0y</sub> <em>t</em> − 4.90 <em>t</em>² for flight time <em>t</em>, then Δ<em>x</em> = <em>v</em><sub>0x</sub> <em>t</em> = ' + ans.toFixed(2) + ' m.' }
    ]
  },
  {
    id: "PROJ-04", docNum: "Proj #4", title: "Rock Thrown Horizontally from Cliff: Time for Speed to Multiply",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion",
    baseVars: { v0: 12.6, multWord: "double", multFactor: 2 },
    randomize: (b) => {
      const opts = [{ word: "double", factor: 2 }, { word: "triple", factor: 3 }, { word: "quadruple", factor: 4 }];
      const pick = opts[Math.floor(Math.random() * opts.length)];
      return { v0: rnd(b.v0, 0.20, 1), multWord: pick.word, multFactor: pick.factor };
    },
    renderPrompt: (v) => 'A rock is thrown horizontally off of a cliff with a speed of <strong>' + v.v0 + ' m/s</strong>. How long would it take for the rock’s speed to <strong>' + v.multWord + '</strong>?',
    parts: [
      { label: "Time for speed to multiply (<em>t</em>)", unit: "s", solve: (v) => (v.v0 * Math.sqrt(v.multFactor * v.multFactor - 1)) / G_ACCEL, steps: (v, ans) => 'From <em>v</em>² = <em>v</em><sub>0</sub>² + (<em>g t</em>)² = (<em>n v</em><sub>0</sub>)², <em>g t</em> = <em>v</em><sub>0</sub> √(<em>n</em>² − 1) ⇒ <em>t</em> = ' + ans.toFixed(2) + ' s.' }
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
      return { v0: v0, theta: theta, hTarget: hTarget };
    },
    renderPrompt: (v) => 'A cannonball is fired from ground level with a velocity of <strong>' + v.v0 + ' m/s</strong> at an angle of <strong>' + v.theta + '°</strong> above the horizontal, and it hits its target as it descends at an elevation of <strong>' + v.hTarget + ' meters</strong> higher than the ground below.<br/><strong>a.</strong> How long does it take the cannonball to hit its target?<br/><strong>b.</strong> What is the cannonball’s speed when it hits its target?<br/><strong>c.</strong> What is the direction of the cannonball’s velocity when it hits its target?',
    parts: [
      { label: "a. Flight time to target (<em>t</em>)", unit: "s", solve: (v) => { const vy0 = v.v0 * Math.sin(v.theta * DEG2RAD); return (vy0 + Math.sqrt(vy0 * vy0 - 2 * G_ACCEL * v.hTarget)) / G_ACCEL; }, steps: (v, ans) => 'Using the larger root of Δ<em>y</em> = +' + v.hTarget + ' = <em>v</em><sub>0y</sub> <em>t</em> − 4.90 <em>t</em>²: <em>t</em> = ' + ans.toFixed(2) + ' s.' },
      { label: "b. Impact speed (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(v.v0 * v.v0 - 2 * G_ACCEL * v.hTarget), steps: (v, ans) => '<em>v</em> = √(<em>v</em><sub>0</sub>² − 2 <em>g h</em><sub>target</sub>) = ' + ans.toFixed(2) + ' m/s.' },
      { label: "c. Direction at impact (θ)", unit: "°", directionOptions: ["above the horizontal", "below the horizontal"], expectedDirection: "below the horizontal", solve: (v) => { const rad = v.theta * DEG2RAD; const vx = v.v0 * Math.cos(rad); const vy0 = v.v0 * Math.sin(rad); const vy = Math.sqrt(vy0 * vy0 - 2 * G_ACCEL * v.hTarget); return Math.atan(vy / vx) * RAD2DEG; }, steps: (v, ans) => 'θ = arctan(|<em>v</em><sub>y</sub>| / <em>v</em><sub>x</sub>) = ' + ans.toFixed(1) + '° below the horizontal.' }
    ]
  },
  {
    id: "PROJ-06", docNum: "Proj #6", title: "Table Height from Horizontal Roll Speed and Range",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion",
    baseVars: { v0: 5.9, distX: 2.2 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 2), distX: rnd(b.distX, 0.20, 2) }),
    renderPrompt: (v) => 'A ball rolls off the edge of a table with a horizontal speed of <strong>' + v.v0 + ' m/s</strong>, and the ball lands <strong>' + v.distX + ' meters</strong> from the bottom base of the table. How tall is the table?',
    parts: [
      { label: "Table height (<em>h</em>)", unit: "m", solve: (v) => 0.5 * G_ACCEL * Math.pow(v.distX / v.v0, 2), steps: (v, ans) => '<em>t</em> = Δ<em>x</em> / <em>v</em><sub>0</sub> = ' + (v.distX / v.v0).toFixed(3) + ' s. <em>h</em> = ½ <em>g t</em>² = ' + ans.toFixed(2) + ' m.' }
    ]
  },
  {
    id: "PROJ-07", docNum: "Proj #7", title: "Pelican Dropping Fish Horizontal Speed",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projPelican",
    baseVars: { hDrop: 8.40, distX: 9.10 },
    randomize: (b) => ({ hDrop: rnd(b.hDrop, 0.20, 2), distX: rnd(b.distX, 0.20, 2) }),
    renderPrompt: (v) => 'A pelican flying along a horizontal path drops a fish from a height of <strong>' + v.hDrop + ' meters</strong>. The fish travels <strong>' + v.distX + ' meters</strong> horizontally before it hits the water below. What is the pelican’s speed?',
    parts: [
      { label: "Pelican speed (<em>v</em><sub>0</sub>)", unit: "m/s", solve: (v) => v.distX / Math.sqrt((2 * v.hDrop) / G_ACCEL), steps: (v, ans) => 'Fall time <em>t</em> = √(2 <em>h</em> / <em>g</em>) = ' + Math.sqrt((2 * v.hDrop) / G_ACCEL).toFixed(2) + ' s. <em>v</em><sub>0</sub> = Δ<em>x</em> / <em>t</em> = ' + ans.toFixed(2) + ' m/s.' }
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
      return { v0: v0, theta: theta, tCheck: tCheck };
    },
    renderPrompt: (v) => 'A soccer ball is kicked from ground level with an initial speed of <strong>' + v.v0 + ' m/s</strong> at an angle of <strong>' + v.theta + '°</strong> above the ground.<br/><strong>a.</strong> How high is the soccer ball at its highest point?<br/><strong>b.</strong> For how long is the soccer ball in the air?<br/><strong>c.</strong> What is the soccer ball’s horizontal range?<br/><strong>d.</strong> What is the soccer ball’s speed after <strong>' + v.tCheck + ' seconds</strong>?',
    parts: [
      { label: "a. Maximum apex height (<em>h</em><sub>max</sub>)", unit: "m", solve: (v) => Math.pow(v.v0 * Math.sin(v.theta * DEG2RAD), 2) / (2 * G_ACCEL), steps: (v, ans) => '<em>h</em><sub>max</sub> = <em>v</em><sub>0y</sub>² / (2<em>g</em>) = ' + ans.toFixed(2) + ' m.' },
      { label: "b. Total airborne time (<em>t</em><sub>flight</sub>)", unit: "s", solve: (v) => (2 * v.v0 * Math.sin(v.theta * DEG2RAD)) / G_ACCEL, steps: (v, ans) => '<em>t</em><sub>flight</sub> = 2 <em>v</em><sub>0y</sub> / <em>g</em> = ' + ans.toFixed(2) + ' s.' },
      { label: "c. Horizontal range (<em>R</em>)", unit: "m", solve: (v) => (v.v0 * v.v0 * Math.sin(2 * v.theta * DEG2RAD)) / G_ACCEL, steps: (v, ans) => '<em>R</em> = <em>v</em><sub>0x</sub> <em>t</em><sub>flight</sub> = ' + ans.toFixed(2) + ' m.' },
      { label: "d. Speed at specified time (<em>v</em>)", unit: "m/s", solve: (v) => { const rad = v.theta * DEG2RAD; const vx = v.v0 * Math.cos(rad); const vy = v.v0 * Math.sin(rad) - G_ACCEL * v.tCheck; return Math.sqrt(vx * vx + vy * vy); }, steps: (v, ans) => '<em>v</em> = √[<em>v</em><sub>0x</sub>² + (<em>v</em><sub>0y</sub> − <em>g t</em>)²] = ' + ans.toFixed(2) + ' m/s.' }
    ]
  },
  {
    id: "PROJ-09", docNum: "Proj #9", title: "Marble Rolling Off a Table: Flight Time and Range",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion",
    baseVars: { v0: 1.48, hCm: 125 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 2), hCm: Math.round(rnd(b.hCm, 0.20, 0)) }),
    renderPrompt: (v) => 'A marble moving at <strong>' + v.v0 + ' m/s</strong> rolls horizontally off the top edge of a <strong>' + v.hCm + ' cm</strong> high table.<br/><strong>a.</strong> How long was the marble in flight?<br/><strong>b.</strong> How far from the base of the table did it strike the floor?',
    parts: [
      { label: "a. Flight time (<em>t</em>)", unit: "s", solve: (v) => Math.sqrt((2 * (v.hCm / 100)) / G_ACCEL), steps: (v, ans) => '<em>h</em> = ' + (v.hCm / 100) + ' m. <em>t</em> = √(2 <em>h</em> / <em>g</em>) = ' + ans.toFixed(2) + ' s.' },
      { label: "b. Horizontal distance (Δ<em>x</em>)", unit: "m", solve: (v) => v.v0 * Math.sqrt((2 * (v.hCm / 100)) / G_ACCEL), steps: (v, ans) => 'Δ<em>x</em> = <em>v</em><sub>0</sub> <em>t</em> = ' + ans.toFixed(2) + ' m.' }
    ]
  },
  {
    id: "PROJ-10", docNum: "Proj #10", title: "Cliff Diver Minimum Horizontal Speed to Clear Rocks",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projCliffDiver",
    baseVars: { hCliff: 13.2, distRocks: 6.4 },
    randomize: (b) => ({ hCliff: rnd(b.hCliff, 0.20, 1), distRocks: rnd(b.distRocks, 0.20, 1) }),
    renderPrompt: (v) => 'A cliff diver runs horizontally off a cliff with an initial height of <strong>' + v.hCliff + ' meters</strong> and wants to clear rocks below. If the rocks extend <strong>' + v.distRocks + ' meters</strong> past the cliff’s edge, what minimum initial horizontal speed must he have to safely clear the rocks below?',
    parts: [
      { label: "Minimum initial speed (<em>v</em><sub>x,min</sub>)", unit: "m/s", solve: (v) => v.distRocks / Math.sqrt((2 * v.hCliff) / G_ACCEL), steps: (v, ans) => '<em>t</em> = √(2 <em>h</em> / <em>g</em>) = ' + Math.sqrt((2 * v.hCliff) / G_ACCEL).toFixed(2) + ' s. <em>v</em><sub>x,min</sub> = Δ<em>x</em> / <em>t</em> = ' + ans.toFixed(2) + ' m/s.' }
    ]
  },
  {
    id: "PROJ-11", docNum: "Proj #11", title: "Mortar Shell Fired from a Cliff (5 Parts)",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion",
    baseVars: { v0: 123, theta: 29.0, hCliff: 50.0 },
    randomize: (b) => ({ v0: Math.round(rnd(b.v0, 0.18, 0)), theta: rnd(b.theta, 0.15, 1), hCliff: rnd(b.hCliff, 0.20, 1) }),
    renderPrompt: (v) => 'A mortar shell is launched with an initial velocity of <strong>' + v.v0 + ' m/s</strong> at an angle of <strong>' + v.theta + '°</strong> above the horizontal from a point on a cliff <strong>' + v.hCliff + ' m</strong> above a level plain below.<br/><strong>a.</strong> How long is the shell in the air before landing?<br/><strong>b.</strong> How far from the base of the cliff does the mortar shell strike the ground?<br/><strong>c.</strong> What is the shell’s speed just before it lands?<br/><strong>d.</strong> What is the direction of the shell’s velocity just before it lands?<br/><strong>e.</strong> How high is the shell above the level plain at its highest point?',
    parts: [
      { label: "a. Airborne flight time (<em>t</em>)", unit: "s", solve: (v) => { const vy0 = v.v0 * Math.sin(v.theta * DEG2RAD); return (vy0 + Math.sqrt(vy0 * vy0 + 2 * G_ACCEL * v.hCliff)) / G_ACCEL; }, steps: (v, ans) => 'From Δ<em>y</em> = −' + v.hCliff + ' = <em>v</em><sub>0y</sub> <em>t</em> − 4.90 <em>t</em>²: <em>t</em> = ' + ans.toFixed(2) + ' s.' },
      { label: "b. Horizontal impact distance (Δ<em>x</em>)", unit: "m", solve: (v) => { const rad = v.theta * DEG2RAD; const vx = v.v0 * Math.cos(rad); const vy0 = v.v0 * Math.sin(rad); const t = (vy0 + Math.sqrt(vy0 * vy0 + 2 * G_ACCEL * v.hCliff)) / G_ACCEL; return vx * t; }, steps: (v, ans) => 'Δ<em>x</em> = <em>v</em><sub>0x</sub> <em>t</em> = ' + ans.toFixed(1) + ' m.' },
      { label: "c. Landing speed (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(v.v0 * v.v0 + 2 * G_ACCEL * v.hCliff), steps: (v, ans) => '<em>v</em> = √(<em>v</em><sub>0</sub>² + 2 <em>g h</em><sub>cliff</sub>) = ' + ans.toFixed(2) + ' m/s.' },
      { label: "d. Landing direction (θ)", unit: "°", directionOptions: ["above the horizontal", "below the horizontal"], expectedDirection: "below the horizontal", solve: (v) => { const rad = v.theta * DEG2RAD; const vx = v.v0 * Math.cos(rad); const vy0 = v.v0 * Math.sin(rad); const vyLand = Math.sqrt(vy0 * vy0 + 2 * G_ACCEL * v.hCliff); return Math.atan(vyLand / vx) * RAD2DEG; }, steps: (v, ans) => 'θ = arctan(|<em>v</em><sub>y</sub>| / <em>v</em><sub>x</sub>) = ' + ans.toFixed(1) + '° below the horizontal.' },
      { label: "e. Maximum height above level plain (<em>H</em><sub>max</sub>)", unit: "m", solve: (v) => v.hCliff + Math.pow(v.v0 * Math.sin(v.theta * DEG2RAD), 2) / (2 * G_ACCEL), steps: (v, ans) => '<em>H</em><sub>max</sub> = <em>h</em><sub>cliff</sub> + <em>v</em><sub>0y</sub>² / (2<em>g</em>) = ' + ans.toFixed(1) + ' m.' }
    ]
  },
  {
    id: "PROJ-12", docNum: "Proj #12", title: "Airplane Dropping Emergency Supplies to an Island",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion", diagram: "projAirplane",
    baseVars: { v0: 174, hKm: 1.20 },
    randomize: (b) => ({ v0: Math.round(rnd(b.v0, 0.18, 0)), hKm: rnd(b.hKm, 0.20, 2) }),
    renderPrompt: (v) => 'An airplane is carrying emergency supplies which it is going to drop to people on an island below. The airplane is traveling horizontally at <strong>' + v.v0 + ' m/s</strong>, at an altitude of <strong>' + v.hKm + ' km</strong> above the ground. What horizontal distance before the island should the plane release the supplies?',
    parts: [
      { label: "Release distance before island (Δ<em>x</em>)", unit: "m", solve: (v) => v.v0 * Math.sqrt((2 * (v.hKm * 1000)) / G_ACCEL), steps: (v, ans) => '<em>t</em> = √[2(' + (v.hKm * 1000) + ') / 9.80] = ' + Math.sqrt((2 * v.hKm * 1000) / G_ACCEL).toFixed(2) + ' s. Δ<em>x</em> = <em>v</em><sub>0</sub> <em>t</em> = ' + ans.toFixed(1) + ' m.' }
    ]
  },

  // --- UNIT 2: CIRCULAR MOTION AND GRAVITATION (CED 2.6 & 2.9) ---
  {
    id: "CMG-01", docNum: "Set 1 #1", title: "Maximum Unbanked Curve Speed and Radius",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation",
    baseVars: { muS: 0.91, muK: 0.76, v: 32.8 },
    randomize: (b) => { const muK = rnd(b.muK, 0.15, 2); return { muS: Number((muK + rnd(0.15, 0.2, 2)).toFixed(2)), muK: muK, v: rnd(b.v, 0.20, 1) }; },
    renderPrompt: (v) => 'A car is driving along a flat road with coefficients of static and kinetic friction of <strong>' + v.muS + '</strong> and <strong>' + v.muK + '</strong>, respectively. The fastest the car can drive along a circular path without skidding is <strong>' + v.v + ' m/s</strong>. What is the radius of the car\'s path?',
    parts: [{ label: "Radius of circular path (<em>r</em>)", unit: "m", solve: (v) => (v.v * v.v) / (v.muS * G_ACCEL), steps: (v, ans) => 'Static friction provides centripetal force: <em>f</em><sub>s,max</sub> = μ<sub>s</sub> <em>m g</em> = <em>m v</em>² / <em>r</em> ⇒ <em>r</em> = <em>v</em>² / (μ<sub>s</sub> <em>g</em>) = ' + ans.toFixed(2) + ' m.' }]
  },
  {
    id: "CMG-02", docNum: "Set 1 #2", title: "Collinear 3-Mass Gravitational Net Force",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation", diagram: "collinearMasses",
    baseVars: { rABcm: 28.3, rACcm: 66.8, mA: 53.7, mB: 82.9, mC: 49.3 },
    randomize: (b) => { const rAB = rnd(b.rABcm, 0.18, 1); return { rABcm: rAB, rACcm: Number((rAB + rnd(b.rACcm - b.rABcm, 0.18, 1)).toFixed(1)), mA: rnd(b.mA, 0.20, 1), mB: rnd(b.mB, 0.20, 1), mC: rnd(b.mC, 0.20, 1) }; },
    renderPrompt: (v) => 'From center to center, the distance between mass A and B is <strong>' + v.rABcm + ' cm</strong> and from A to C is <strong>' + v.rACcm + ' cm</strong> (with A on the left, B in the middle, and C on the right). If <em>m</em><sub>A</sub> = <strong>' + v.mA + ' kg</strong>, <em>m</em><sub>B</sub> = <strong>' + v.mB + ' kg</strong>, and <em>m</em><sub>C</sub> = <strong>' + v.mC + ' kg</strong>, what is the gravitational net force on mass B? Let the positive direction be to the right.',
    parts: [{ label: "Net gravitational force on B (<em>F</em><sub>net,B</sub>)", unit: "N", solve: (v) => (G_CONST * v.mC * v.mB) / Math.pow((v.rACcm - v.rABcm)/100, 2) - (G_CONST * v.mA * v.mB) / Math.pow(v.rABcm/100, 2), steps: (v, ans) => '<em>F</em><sub>net,B</sub> = <em>G m</em><sub>B</sub> [ (<em>m</em><sub>C</sub> / <em>r</em><sub>BC</sub>²) − (<em>m</em><sub>A</sub> / <em>r</em><sub>AB</sub>²) ] = ' + ans.toExponential(3) + ' N.' }]
  },
  {
    id: "CMG-03", docNum: "Set 1 #3", title: "Satellite Orbital Speed Around a Planet",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation",
    baseVars: { hKm: 2089, MpExp26: 5.38, RpExp7: 8.33 },
    randomize: (b) => ({ hKm: Math.round(rnd(b.hKm, 0.20, 0)), MpExp26: rnd(b.MpExp26, 0.20, 2), RpExp7: rnd(b.RpExp7, 0.20, 2) }),
    renderPrompt: (v) => 'A satellite is placed in a circular orbit <strong>' + v.hKm.toLocaleString() + ' kilometers</strong> above the surface of a planet. The planet has a mass of <strong>' + v.MpExp26 + ' × 10<sup>26</sup> kg</strong> and a radius of <strong>' + v.RpExp7 + ' × 10<sup>7</sup> meters</strong>. Find the orbital speed of the satellite.',
    parts: [{ label: "Orbital speed (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt((G_CONST * v.MpExp26 * 1e26) / (v.RpExp7 * 1e7 + v.hKm * 1e3)), steps: (v, ans) => '<em>r</em> = <em>R</em><sub>p</sub> + <em>h</em>. <em>v</em> = √(<em>G M</em> / <em>r</em>) = ' + ans.toFixed(1) + ' m/s.' }]
  },
  {
    id: "CMG-04", docNum: "Set 1 #4", title: "Ratio of Speedboat Speeds at Equal Centripetal Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation",
    baseVars: { rA: 173, rB: 259 },
    randomize: (b) => ({ rA: Math.round(rnd(b.rA, 0.20, 0)), rB: Math.round(rnd(b.rB, 0.20, 0)) }),
    renderPrompt: (v) => 'Speedboat A negotiates a curve whose radius is <strong>' + v.rA + ' m</strong>; Speedboat B negotiates a curve of radius <strong>' + v.rB + ' m</strong> at identical centripetal acceleration. What is the ratio <em>v</em><sub>A</sub> / <em>v</em><sub>B</sub>?',
    parts: [{ label: "Speed ratio (<em>v</em><sub>A</sub> / <em>v</em><sub>B</sub>)", unit: "No units", solve: (v) => Math.sqrt(v.rA / v.rB), steps: (v, ans) => '<em>v</em><sub>A</sub> / <em>v</em><sub>B</sub> = √(<em>r</em><sub>A</sub> / <em>r</em><sub>B</sub>) = ' + ans.toFixed(3) + '.' }]
  },
  {
    id: "CMG-05", docNum: "Set 1 #5", title: "Normal Force on Motorcycle Cresting a Hill",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation",
    baseVars: { v: 19.3, r: 116, m: 291 },
    randomize: (b) => ({ v: rnd(b.v, 0.18, 1), r: Math.round(rnd(b.r, 0.18, 0)), m: Math.round(rnd(b.m, 0.20, 0)) }),
    renderPrompt: (v) => 'A motorcycle (total mass <strong>' + v.m + ' kg</strong>) travels at <strong>' + v.v + ' m/s</strong> over a hill of radius <strong>' + v.r + ' m</strong>. Find the normal force.',
    parts: [{ label: "Normal force (<em>F</em><sub>N</sub>)", unit: "N", solve: (v) => v.m * (G_ACCEL - (v.v * v.v) / v.r), steps: (v, ans) => '<em>F</em><sub>N</sub> = <em>m</em> (<em>g</em> − <em>v</em>²/<em>r</em>) = ' + ans.toFixed(1) + ' N.' }]
  },
  {
    id: "CMG-07", docNum: "Set 1 #7", title: "Planetary Weight from Speed-Time Graph",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation", diagram: "vtGraph",
    baseVars: { m: 17.4, t: 4.0, vf: 24.8 },
    randomize: (b) => { const m = rnd(b.m, 0.20, 1); const t = rnd(b.t, 0.20, 1); return { m: m, t: t, vf: Number((rnd(6.2, 0.25, 2) * t).toFixed(1)) }; },
    renderPrompt: (v) => 'An object of mass <strong>' + v.m + ' kg</strong> is released on a planet; its speed graph reaches <strong><em>v</em> = ' + v.vf + ' m/s</strong> at <strong><em>t</em> = ' + v.t + ' s</strong>. Find its weight on this planet.',
    parts: [{ label: "Weight on planet (<em>W</em>)", unit: "N", solve: (v) => v.m * (v.vf / v.t), steps: (v, ans) => '<em>g</em><sub>p</sub> = Δ<em>v</em> / Δ<em>t</em>. <em>W</em> = <em>m g</em><sub>p</sub> = ' + ans.toFixed(1) + ' N.' }]
  },
  {
    id: "CMG-08", docNum: "Set 1 #8", title: "Neutron Star Surface Gravity and Fall Speed",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation",
    baseVars: { MExp30: 3.47, RExp3: 6.30, dCm: 8.30 },
    randomize: (b) => ({ MExp30: rnd(b.MExp30, 0.20, 2), RExp3: rnd(b.RExp3, 0.20, 2), dCm: rnd(b.dCm, 0.20, 2) }),
    renderPrompt: (v) => 'A neutron star has mass <strong>' + v.MExp30 + ' × 10<sup>30</sup> kg</strong> and radius <strong>' + v.RExp3 + ' × 10<sup>3</sup> m</strong>.<br/><strong>a.</strong> What is the gravitational field strength <em>g</em> on the star?<br/><strong>b.</strong> How fast would an object be moving after falling from rest a distance of <strong>' + v.dCm + ' cm</strong>?',
    parts: [
      { label: "a. Gravitational field strength (<em>g</em>)", unit: "N/kg", acceptedUnits: ["N/kg", "m/s²"], solve: (v) => (G_CONST * v.MExp30 * 1e30) / Math.pow(v.RExp3 * 1e3, 2), steps: (v, ans) => '<em>g</em> = <em>G M</em> / <em>R</em>² = ' + ans.toExponential(3) + ' N/kg.' },
      { label: "b. Final speed after falling (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(2 * ((G_CONST * v.MExp30 * 1e30) / Math.pow(v.RExp3 * 1e3, 2)) * (v.dCm / 100)), steps: (v, ans) => '<em>v</em> = √(2 <em>g d</em>) = ' + ans.toExponential(3) + ' m/s.' }
    ]
  },
  {
    id: "DYN-12", docNum: "Set 2 #12", title: "Rock Dropped on Mars: Gravity and Weight",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation",
    baseVars: { m: 2.00, h: 1.00, t: 0.736 },
    randomize: (b) => { const m = rnd(b.m, 0.2, 2); const h = rnd(b.h, 0.2, 2); return { m: m, h: h, t: Number(Math.sqrt((2 * h) / 3.69).toFixed(3)) }; },
    renderPrompt: (v) => 'A <strong>' + v.m + ' kg</strong> rock falls <strong>' + v.h + ' m</strong> on Mars in <strong>' + v.t + ' s</strong>.<br/><strong>a.</strong> Mars gravity <em>g</em>?<br/><strong>b.</strong> Rock weight on Mars?',
    parts: [
      { label: "a. Acceleration due to gravity (<em>g</em><sub>Mars</sub>)", unit: "m/s²", acceptedUnits: ["m/s²", "N/kg"], solve: (v) => (2 * v.h) / (v.t * v.t), steps: (v, ans) => '<em>g</em><sub>Mars</sub> = 2 <em>h</em> / <em>t</em>² = ' + ans.toFixed(2) + ' m/s².' },
      { label: "b. Weight of rock (<em>W</em><sub>Mars</sub>)", unit: "N", solve: (v) => v.m * ((2 * v.h) / (v.t * v.t)), steps: (v, ans) => '<em>W</em><sub>Mars</sub> = <em>m g</em><sub>Mars</sub> = ' + ans.toFixed(2) + ' N.' }
    ]
  },

  // --- UNIT 2: FORCE AND TRANSLATIONAL DYNAMICS - FRICTION (CED 2.7) ---
  {
    id: "DYN-02", docNum: "Set 2 #2", title: "Static and Kinetic Friction of a Chair",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { m: 25, Fs: 165, Fk: 127 },
    randomize: (b) => { const m = rnd(b.m, 0.2, 1); const Fk = Math.round(rnd(b.Fk, 0.2, 0)); return { m: m, Fs: Math.round(Fk + rnd(b.Fs - b.Fk, 0.2, 0)), Fk: Fk }; },
    renderPrompt: (v) => 'A <strong>' + v.m + '-kg</strong> chair requires an applied force of <strong>' + v.Fs + ' N</strong> to start moving, and <strong>' + v.Fk + ' N</strong> of force to maintain a constant velocity.<br/><strong>a.</strong> Find μ<sub>s</sub>.<br/><strong>b.</strong> Find μ<sub>k</sub>.',
    parts: [
      { label: "a. Coefficient of static friction (μ<sub>s</sub>)", unit: "No units", solve: (v) => v.Fs / (v.m * G_ACCEL), steps: (v, ans) => 'μ<sub>s</sub> = <em>F</em><sub>s</sub> / (<em>m g</em>) = ' + ans.toFixed(3) + '.' },
      { label: "b. Coefficient of kinetic friction (μ<sub>k</sub>)", unit: "No units", solve: (v) => v.Fk / (v.m * G_ACCEL), steps: (v, ans) => 'μ<sub>k</sub> = <em>F</em><sub>k</sub> / (<em>m g</em>) = ' + ans.toFixed(3) + '.' }
    ]
  },
  {
    id: "DYN-03", docNum: "Set 2 #3", title: "Baseball Player Sliding into Home Plate",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { m: 65.0, v0: 4.10, d: 1.90 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 1), v0: rnd(b.v0, 0.2, 2), d: rnd(b.d, 0.2, 2) }),
    renderPrompt: (v) => 'A <strong>' + v.m + '-kg</strong> baseball player runs towards home plate at <strong>' + v.v0 + ' m/s</strong>. He slides into home plate and comes to rest after <strong>' + v.d + ' meters</strong>.<br/><strong>a.</strong> What is the magnitude of his acceleration?<br/><strong>b.</strong> What is the coefficient of kinetic friction between the player and the ground?',
    parts: [
      { label: "a. Magnitude of acceleration (|<em>a</em>|)", unit: "m/s²", solve: (v) => (v.v0 * v.v0) / (2 * v.d), steps: (v, ans) => '|<em>a</em>| = <em>v</em><sub>0</sub>² / (2 <em>d</em>) = ' + ans.toFixed(2) + ' m/s².' },
      { label: "b. Coefficient of kinetic friction (μ<sub>k</sub>)", unit: "No units", solve: (v) => ((v.v0 * v.v0) / (2 * v.d)) / G_ACCEL, steps: (v, ans) => 'μ<sub>k</sub> = |<em>a</em>| / <em>g</em> = ' + ans.toFixed(3) + '.' }
    ]
  },
  {
    id: "DYN-07", docNum: "Set 2 #7", title: "Sled Pulled at an Angle at Constant Velocity",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { m: 3, theta: 30, FT: 4 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 2), theta: rnd(b.theta, 0.15, 1), FT: rnd(b.FT, 0.2, 2) }),
    renderPrompt: (v) => 'A <strong>' + v.m + '-kg</strong> sled is pulled at a constant velocity with tension force of <strong>' + v.FT + ' N</strong> angled <strong>' + v.theta + '°</strong> above horizontal. What is μ<sub>k</sub>?',
    parts: [{ label: "Coefficient of kinetic friction (μ<sub>k</sub>)", unit: "No units", solve: (v) => (v.FT * Math.cos(v.theta * DEG2RAD)) / (v.m * G_ACCEL - v.FT * Math.sin(v.theta * DEG2RAD)), steps: (v, ans) => 'μ<sub>k</sub> = (<em>F</em><sub>T</sub> cos θ) / (<em>m g</em> − <em>F</em><sub>T</sub> sin θ) = ' + ans.toFixed(3) + '.' }]
  },
  {
    id: "DYN-09", docNum: "Set 2 #9", title: "Ice Skater Coasting to a Halt",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { v0: 10.0, d: 100.0 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.2, 1), d: rnd(b.d, 0.2, 1) }),
    renderPrompt: (v) => 'An ice skater moving at <strong>' + v.v0 + ' m/s</strong> coasts to rest over <strong>' + v.d + ' m</strong>. What is μ<sub>k</sub>?',
    parts: [{ label: "Coefficient of friction (μ<sub>k</sub>)", unit: "No units", solve: (v) => (v.v0 * v.v0) / (2 * G_ACCEL * v.d), steps: (v, ans) => 'μ<sub>k</sub> = <em>v</em><sub>0</sub>² / (2 <em>g d</em>) = ' + ans.toFixed(4) + '.' }]
  },
  {
    id: "DYN-24", docNum: "Set 2 #24", title: "Dragging an Accelerating Steel Beam with Friction",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { m: 76, a: 4, muS: 0.74, muK: 0.57 },
    randomize: (b) => { const muK = rnd(b.muK, 0.15, 2); return { m: rnd(b.m, 0.2, 1), a: rnd(b.a, 0.2, 2), muS: Number((muK + 0.17).toFixed(2)), muK: muK }; },
    renderPrompt: (v) => 'A rope accelerates a <strong>' + v.m + '-kg</strong> metal beam horizontally at <strong>' + v.a + ' m/s²</strong> with μ<sub>s</sub> = <strong>' + v.muS + '</strong>, μ<sub>k</sub> = <strong>' + v.muK + '</strong>. What is the magnitude of the tension in the rope?',
    parts: [{ label: "Rope tension (<em>F</em><sub>T</sub>)", unit: "N", solve: (v) => v.m * (v.a + v.muK * G_ACCEL), steps: (v, ans) => '<em>F</em><sub>T</sub> = <em>m</em>(<em>a</em> + μ<sub>k</sub> <em>g</em>) = ' + ans.toFixed(1) + ' N.' }]
  },
  {
    id: "DYN-26", docNum: "Set 2 #26", title: "Initial Car Speed from Police Skid Marks",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { d: 90, mu: 0.5 },
    randomize: (b) => ({ d: rnd(b.d, 0.2, 1), mu: rnd(b.mu, 0.2, 2) }),
    renderPrompt: (v) => 'Police measure a car’s skid marks to be <strong>' + v.d + ' m</strong> long, and the road’s coefficient of kinetic friction to be <strong>' + v.mu + '</strong>. What was the initial speed of the car?',
    parts: [{ label: "Initial speed (<em>v</em><sub>0</sub>)", unit: "m/s", solve: (v) => Math.sqrt(2 * v.mu * G_ACCEL * v.d), steps: (v, ans) => '<em>v</em><sub>0</sub> = √(2 μ <em>g d</em>) = ' + ans.toFixed(2) + ' m/s.' }]
  },
  {
    id: "DYN-27", docNum: "Set 2 #27", title: "Wooden Crate Static Threshold vs. Kinetic Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { m: 28, muS: 0.5, muK: 0.3, Fa: 105, Fb: 145, t: 3 },
    randomize: (b) => { const m = rnd(b.m, 0.15, 1); const fsMax = 0.50 * m * G_ACCEL; return { m: m, muS: 0.5, muK: 0.3, Fa: Math.round(fsMax * 0.77), Fb: Math.round(fsMax * 1.08), t: rnd(b.t, 0.15, 1) }; },
    renderPrompt: (v) => 'A <strong>' + v.m + '-kg</strong> crate has μ<sub>s</sub> = <strong>' + v.muS + '</strong>, μ<sub>k</sub> = <strong>' + v.muK + '</strong>.<br/><strong>a.</strong> What is the speed of the crate after <strong>' + v.t + ' s</strong> with a <strong>' + v.Fa + ' N</strong> push?<br/><strong>b.</strong> What is the speed of the crate after <strong>' + v.t + ' s</strong> with a <strong>' + v.Fb + ' N</strong> push?',
    parts: [
      { label: "a. Speed with <em>F</em><sub>a</sub>", unit: "m/s", solve: () => 0, steps: () => '<em>F</em><sub>a</sub> < <em>f</em><sub>s,max</sub> ⇒ crate stays at rest: <em>v</em> = 0 m/s.' },
      { label: "b. Speed with <em>F</em><sub>b</sub>", unit: "m/s", solve: (v) => ((v.Fb - v.muK * v.m * G_ACCEL) / v.m) * v.t, steps: (v, ans) => '<em>F</em><sub>b</sub> > <em>f</em><sub>s,max</sub> ⇒ <em>a</em> = (<em>F</em><sub>b</sub> − μ<sub>k</sub> <em>m g</em>) / <em>m</em>. <em>v</em> = <em>a t</em> = ' + ans.toFixed(2) + ' m/s.' }
    ]
  },
  {
    id: "DYN-28", docNum: "Set 2 #28", title: "Hockey Puck Sliding on Frozen Pond",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { v0: 20, d: 120 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.2, 1), d: rnd(b.d, 0.2, 1) }),
    renderPrompt: (v) => 'A puck sliding at <strong>' + v.v0 + ' m/s</strong> travels <strong>' + v.d + ' m</strong> as it slides to rest. Find μ<sub>k</sub>.',
    parts: [{ label: "Coefficient of kinetic friction (μ<sub>k</sub>)", unit: "No units", solve: (v) => (v.v0 * v.v0) / (2 * G_ACCEL * v.d), steps: (v, ans) => 'μ<sub>k</sub> = <em>v</em><sub>0</sub>² / (2 <em>g d</em>) = ' + ans.toFixed(3) + '.' }]
  },
  {
    id: "DYN-29", docNum: "Set 2 #29", title: "Stopping Distance of a Pushed Box",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { muK: 0.20, v0: 4.0 },
    randomize: (b) => ({ muK: rnd(b.muK, 0.2, 2), v0: rnd(b.v0, 0.2, 1) }),
    renderPrompt: (v) => 'A box is pushed to <strong>' + v.v0 + ' m/s</strong> across a floor where μ<sub>k</sub> = <strong>' + v.muK + '</strong>. How far does it slide?',
    parts: [{ label: "Sliding distance (<em>d</em>)", unit: "m", solve: (v) => (v.v0 * v.v0) / (2 * v.muK * G_ACCEL), steps: (v, ans) => '<em>d</em> = <em>v</em><sub>0</sub>² / (2 μ<sub>k</sub> <em>g</em>) = ' + ans.toFixed(2) + ' m.' }]
  },
  {
    id: "DYN-35", docNum: "Set 2 #35", title: "Static and Kinetic Friction on the Moon",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { gMoon: 1.62, m: 423, muS: 0.74, muK: 0.57 },
    randomize: (b) => { const muK = rnd(b.muK, 0.15, 2); return { gMoon: 1.62, m: Math.round(rnd(b.m, 0.2, 0)), muS: Number((muK + 0.17).toFixed(2)), muK: muK }; },
    renderPrompt: (v) => 'On the moon (<em>g</em> = <strong>' + v.gMoon + ' m/s²</strong>), a <strong>' + v.m + '-kg</strong> bin has coefficients of static and kinetic friction of <strong>' + v.muS + '</strong> and <strong>' + v.muK + '</strong>, respectively.<br/><strong>a.</strong> What force is required to start the bin in motion?<br/><strong>b.</strong> What force is required to slide it with a constant velocity?',
    parts: [
      { label: "a. Force to start moving (<em>f</em><sub>s,max</sub>)", unit: "N", solve: (v) => v.muS * v.m * v.gMoon, steps: (v, ans) => '<em>f</em><sub>s,max</sub> = μ<sub>s</sub> <em>m g</em><sub>moon</sub> = ' + ans.toFixed(1) + ' N.' },
      { label: "b. Force for constant velocity (<em>f</em><sub>k</sub>)", unit: "N", solve: (v) => v.muK * v.m * v.gMoon, steps: (v, ans) => '<em>f</em><sub>k</sub> = μ<sub>k</sub> <em>m g</em><sub>moon</sub> = ' + ans.toFixed(1) + ' N.' }
    ]
  },
  {
    id: "DYN-45", docNum: "Doc 1 #5", title: "Ice Skater Coasting to Rest with Friction",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { v0: 5.72, muS: 0.19, muK: 0.12 },
    randomize: (b) => { const muK = rnd(b.muK, 0.15, 2); return { v0: rnd(b.v0, 0.15, 2), muS: Number((muK + 0.07).toFixed(2)), muK: muK }; },
    renderPrompt: (v) => 'An ice skater moving at <strong>' + v.v0 + ' m/s</strong> coasts to rest, and μ<sub>s</sub> = <strong>' + v.muS + '</strong> and μ<sub>k</sub> = <strong>' + v.muK + '</strong>.<br/><strong>a.</strong> What is the magnitude of her acceleration?<br/><strong>b.</strong> How much time does it take her to stop?',
    parts: [
      { label: "a. Magnitude of acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => v.muK * G_ACCEL, steps: (v, ans) => '<em>a</em> = μ<sub>k</sub> <em>g</em> = ' + ans.toFixed(3) + ' m/s².' },
      { label: "b. Time to come to rest (<em>t</em>)", unit: "s", solve: (v) => v.v0 / (v.muK * G_ACCEL), steps: (v, ans) => '<em>t</em> = <em>v</em><sub>0</sub> / <em>a</em> = ' + ans.toFixed(3) + ' s.' }
    ]
  },
  {
    id: "DYN-49", docNum: "Doc 2 #1", title: "Refrigerator on Floor (Static vs. Kinetic Push)",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { m: 63, muS: 0.83, muK: 0.64, Fpush: 475, aTarget: 2.3 },
    randomize: (b) => { const m = rnd(b.m, 0.15, 1); return { m: m, muS: 0.83, muK: 0.64, Fpush: Math.round(0.83 * m * G_ACCEL * 0.93), aTarget: rnd(b.aTarget, 0.15, 2) }; },
    renderPrompt: (v) => 'A <strong>' + v.m + '-kg</strong> refrigerator has μ<sub>s</sub> = <strong>' + v.muS + '</strong> and μ<sub>k</sub> = <strong>' + v.muK + '</strong>.<br/><strong>a.</strong> What would the friction force be on the refrigerator if pushed with <strong>' + v.Fpush + ' N</strong> of force?<br/><strong>b.</strong> What force is needed to start moving the refrigerator?<br/><strong>c.</strong> What force is needed to accelerate the refrigerator at <strong>' + v.aTarget + ' m/s²</strong>?',
    parts: [
      { label: "a. Friction acting during push (<em>f</em><sub>s</sub>)", unit: "N", solve: (v) => v.Fpush, steps: (v, ans) => '<em>F</em><sub>push</sub> < <em>f</em><sub>s,max</sub> ⇒ static friction balances push: ' + ans.toFixed(1) + ' N.' },
      { label: "b. Force to start moving (<em>f</em><sub>s,max</sub>)", unit: "N", solve: (v) => v.muS * v.m * G_ACCEL, steps: (v, ans) => '<em>F</em><sub>start</sub> = μ<sub>s</sub> <em>m g</em> = ' + ans.toFixed(1) + ' N.' },
      { label: "c. Force to slide with target acceleration", unit: "N", solve: (v) => v.muK * v.m * G_ACCEL + v.m * v.aTarget, steps: (v, ans) => '<em>F</em> = μ<sub>k</sub> <em>m g</em> + <em>m a</em> = ' + ans.toFixed(1) + ' N.' }
    ]
  },
  {
    id: "DYN-50", docNum: "Doc 2 #6", title: "Block on Horizontal Table Static and Kinetic Friction",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { W: 53.2, muS: 0.685, muK: 0.433 },
    randomize: (b) => {
      const muK = rnd(b.muK, 0.15, 3);
      const muS = Number((muK + rnd(b.muS - b.muK, 0.15, 3)).toFixed(3));
      return { W: rnd(b.W, 0.20, 1), muS: muS, muK: muK };
    },
    renderPrompt: (v) => 'A block whose weight is <strong>' + v.W + ' N</strong> rests on a horizontal table. The coefficients of static and kinetic friction are <strong>' + v.muS + '</strong> and <strong>' + v.muK + '</strong>, respectively.<br/><strong>a.</strong> How much force is required to start the block moving?<br/><strong>b.</strong> How much force is required to push it across the table with a constant velocity?',
    parts: [
      { label: "a. Force required to start moving (<em>f</em><sub>s,max</sub>)", unit: "N", solve: (v) => v.muS * v.W, steps: (v, ans) => '<em>f</em><sub>s,max</sub> = μ<sub>s</sub> <em>W</em> = ' + v.muS + ' × ' + v.W + ' = ' + ans.toFixed(2) + ' N.' },
      { label: "b. Force required for constant velocity (<em>f</em><sub>k</sub>)", unit: "N", solve: (v) => v.muK * v.W, steps: (v, ans) => '<em>f</em><sub>k</sub> = μ<sub>k</sub> <em>W</em> = ' + v.muK + ' × ' + v.W + ' = ' + ans.toFixed(2) + ' N.' }
    ]
  },
  {
    id: "DYN-62", docNum: "Set 3 #8", title: "Box Pushed Across Floor with Downward-Angled Force",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { W: 78.4, F: 62.0, theta: 25.0, muK: 0.20 },
    randomize: (b) => ({ W: rnd(b.W, 0.18, 1), F: rnd(b.F, 0.18, 1), theta: rnd(b.theta, 0.15, 1), muK: rnd(b.muK, 0.15, 2) }),
    renderPrompt: (v) => 'A <strong>' + v.W + '-N</strong> box is pushed across the floor with a force of <strong>' + v.F + ' N</strong> in a direction <strong>' + v.theta + '°</strong> below the horizontal. If the coefficient of kinetic friction between the box and floor is <strong>' + v.muK + '</strong>, what is the magnitude of the acceleration of the box?',
    parts: [
      {
        label: "Magnitude of acceleration (<em>a</em>)", unit: "m/s²",
        solve: (v) => {
          const m = v.W / G_ACCEL;
          const FN = v.W + v.F * Math.sin(v.theta * DEG2RAD);
          const fk = v.muK * FN;
          return (v.F * Math.cos(v.theta * DEG2RAD) - fk) / m;
        },
        steps: (v, ans) => 'Mass <em>m</em> = <em>W</em> / <em>g</em> = ' + (v.W / G_ACCEL).toFixed(2) + ' kg. Normal force <em>F</em><sub>N</sub> = <em>W</em> + <em>F</em> sin θ = ' + (v.W + v.F * Math.sin(v.theta * DEG2RAD)).toFixed(2) + ' N. Then <em>a</em> = (<em>F</em> cos θ − μ<sub>k</sub> <em>F</em><sub>N</sub>) / <em>m</em> = ' + ans.toFixed(2) + ' m/s².'
      }
    ]
  },
  {
    id: "DYN-63", docNum: "Set 3 #9", title: "Block of Wood Pushed Up a Wall at Constant Velocity",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { m: 4.0, F: 63.0, theta: 55.0 },
    randomize: (b) => {
      const m = rnd(b.m, 0.15, 1);
      const theta = rnd(b.theta, 0.10, 1);
      const minF = (m * G_ACCEL) / Math.sin(theta * DEG2RAD);
      const F = Number(Math.max(rnd(b.F, 0.15, 1), minF * 1.25).toFixed(1));
      return { m: m, F: F, theta: theta };
    },
    renderPrompt: (v) => 'A block of wood of mass <strong>' + v.m + ' kg</strong> is pushed up a wall at a constant velocity with a force of <strong>' + v.F + ' N</strong> into a wall acting in a direction of <strong>' + v.theta + '°</strong> above the horizontal. What is the coefficient of kinetic friction?',
    parts: [
      {
        label: "Coefficient of kinetic friction (μ<sub>k</sub>)", unit: "No units",
        solve: (v) => (v.F * Math.sin(v.theta * DEG2RAD) - v.m * G_ACCEL) / (v.F * Math.cos(v.theta * DEG2RAD)),
        steps: (v, ans) => 'Normal force from the wall is <em>F</em><sub>N</sub> = <em>F</em> cos θ = ' + (v.F * Math.cos(v.theta * DEG2RAD)).toFixed(2) + ' N. Since the block moves upward at constant velocity, downward kinetic friction plus weight balances the upward push: <em>f</em><sub>k</sub> = <em>F</em> sin θ − <em>m g</em> = ' + (v.F * Math.sin(v.theta * DEG2RAD) - v.m * G_ACCEL).toFixed(2) + ' N. Thus μ<sub>k</sub> = <em>f</em><sub>k</sub> / <em>F</em><sub>N</sub> = ' + ans.toFixed(3) + '.'
      }
    ]
  },
  {
    id: "DYN-64", docNum: "Set 3 #10", title: "Crate in the Back of an Accelerating Pick-Up Truck",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { vf: 14.3, t: 6.2 },
    randomize: (b) => ({ vf: rnd(b.vf, 0.20, 1), t: rnd(b.t, 0.20, 1) }),
    renderPrompt: (v) => 'A crate is in the back of a parked pick-up truck. The truck accelerates from rest to <strong>' + v.vf + ' m/s</strong> in <strong>' + v.t + ' seconds</strong>. What minimum coefficient of static friction must there be between the crate and the truck so that the crate doesn’t slide within the truck?',
    parts: [
      {
        label: "Minimum coefficient of static friction (μ<sub>s,min</sub>)", unit: "No units",
        solve: (v) => (v.vf / v.t) / G_ACCEL,
        steps: (v, ans) => 'Truck acceleration <em>a</em> = <em>v</em> / <em>t</em> = ' + (v.vf / v.t).toFixed(2) + ' m/s². Static friction provides this acceleration: μ<sub>s</sub> <em>m g</em> = <em>m a</em> ⇒ μ<sub>s,min</sub> = <em>a</em> / <em>g</em> = ' + ans.toFixed(3) + '.'
      }
    ]
  },

  // --- UNIT 2: FORCE AND TRANSLATIONAL DYNAMICS - INCLINED PLANES ---
  {
    id: "DYN-18", docNum: "Set 2 #18", title: "Time to Slide Down a Rough Incline",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
    baseVars: { L: 5.30, theta: 27, muK: 0.39 },
    randomize: (b) => ({ L: rnd(b.L, 0.2, 2), theta: Math.round(rnd(29, 0.12, 0)), muK: rnd(0.32, 0.15, 2) }),
    renderPrompt: (v) => 'A mass is released from rest at the top of a <strong>' + v.L + '-m</strong> incline at <strong>' + v.theta + '°</strong> with μ<sub>k</sub> = <strong>' + v.muK + '</strong>. How long does it take to reach the bottom?',
    parts: [{ label: "Time to reach bottom (<em>t</em>)", unit: "s", solve: (v) => Math.sqrt((2 * v.L) / (G_ACCEL * (Math.sin(v.theta * DEG2RAD) - v.muK * Math.cos(v.theta * DEG2RAD)))), steps: (v, ans) => '<em>a</em> = <em>g</em>(sin θ − μ<sub>k</sub> cos θ). <em>t</em> = √(2 <em>L</em> / <em>a</em>) = ' + ans.toFixed(2) + ' s.' }]
  },
  {
    id: "DYN-22", docNum: "Set 2 #22", title: "Frictionless Inclined Plane Kinematics and Dynamics",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
    baseVars: { theta: 35, L: 7.4 },
    randomize: (b) => ({ theta: rnd(b.theta, 0.15, 1), L: rnd(b.L, 0.2, 2) }),
    renderPrompt: (v) => 'A block beginning at the top of a <strong>' + v.L + ' m</strong> long ramp that forms a <strong>' + v.theta + '°</strong> with the horizontal slides without friction to the bottom.<br/><strong>a.</strong> What is the acceleration of the block?<br/><strong>b.</strong> What is the speed of the block at the bottom?<br/><strong>c.</strong> What is the block’s travel time?',
    parts: [
      { label: "a. Acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => G_ACCEL * Math.sin(v.theta * DEG2RAD), steps: (v, ans) => '<em>a</em> = <em>g</em> sin θ = ' + ans.toFixed(2) + ' m/s².' },
      { label: "b. Speed at bottom (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(2 * G_ACCEL * Math.sin(v.theta * DEG2RAD) * v.L), steps: (v, ans) => '<em>v</em> = √(2 <em>a L</em>) = ' + ans.toFixed(2) + ' m/s.' },
      { label: "c. Time to bottom (<em>t</em>)", unit: "s", solve: (v) => Math.sqrt((2 * v.L) / (G_ACCEL * Math.sin(v.theta * DEG2RAD))), steps: (v, ans) => '<em>t</em> = √(2 <em>L</em> / <em>a</em>) = ' + ans.toFixed(2) + ' s.' }
    ]
  },
  {
    id: "DYN-30", docNum: "Set 2 #30", title: "Block Sliding Down Incline at Constant Velocity",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
    baseVars: { v: 6.0, theta: 25 },
    randomize: (b) => ({ v: rnd(b.v, 0.2, 1), theta: Math.round(rnd(b.theta, 0.2, 0)) }),
    renderPrompt: (v) => 'A block slides down a <strong>' + v.theta + '°</strong> ramp at constant speed <strong>' + v.v + ' m/s</strong>. Find μ<sub>k</sub>.',
    parts: [{ label: "Coefficient of kinetic friction (μ<sub>k</sub>)", unit: "No units", solve: (v) => Math.tan(v.theta * DEG2RAD), steps: (v, ans) => 'μ<sub>k</sub> = tan(' + v.theta + '°) = ' + ans.toFixed(3) + '.' }]
  },
  {
    id: "DYN-31", docNum: "Set 2 #31", title: "Snowboarder Accelerating Down a Hill",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
    baseVars: { m: 70, theta: 39, muK: 0.18, d: 5 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 1), theta: rnd(b.theta, 0.15, 1), muK: rnd(b.muK, 0.15, 2), d: rnd(b.d, 0.2, 1) }),
    renderPrompt: (v) => 'A <strong>' + v.m + '-kg</strong> snowboarder beginning at rest goes down a <strong>' + v.theta + '°</strong> slope, and μ<sub>k</sub> = <strong>' + v.muK + '</strong>.<br/><strong>a.</strong> Find the acceleration of the snowboarder.<br/><strong>b.</strong> Find his speed after traveling <strong>' + v.d + ' m</strong>.',
    parts: [
      { label: "a. Acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => G_ACCEL * (Math.sin(v.theta * DEG2RAD) - v.muK * Math.cos(v.theta * DEG2RAD)), steps: (v, ans) => '<em>a</em> = <em>g</em>(sin θ − μ<sub>k</sub> cos θ) = ' + ans.toFixed
{
    id: "DYN-68",
    tag: "Unit 2: Force and Translational Dynamics",
    topic: "Unit 2: Newton's Laws",
    baseVars: { mRock: 6.3, gPlanet: 14.4, wBoulder: 2300 },
    randomize: (b) => ({ mRock: rnd(b.mRock, 0.2, 1), gPlanet: rnd(b.gPlanet, 0.2, 1), wBoulder: rnd(b.wBoulder, 0.2, 0) }),
    renderPrompt: (v) => 'a. What is the weight of a <strong>' + v.mRock + '</strong>-kg rock on a planet in which the acceleration due to gravity is <strong>' + v.gPlanet + '</strong> m/s²?<br>b. What is the mass of a boulder on the same planet that has a weight of <strong>' + v.wBoulder + '</strong> N?',
    parts: [
        { label: "a. Weight of rock", unit: "N", solve: (v) => v.mRock * v.gPlanet, steps: (v, ans) => '<em>W</em> = <em>m</em>·<em>g</em> = (' + v.mRock + ')(' + v.gPlanet + ') = ' + (v.mRock * v.gPlanet).toFixed(1) + ' N' },
        { label: "b. Mass of boulder", unit: "kg", solve: (v) => v.wBoulder / v.gPlanet, steps: (v, ans) => '<em>m</em> = <em>W</em> / <em>g</em> = (' + v.wBoulder + ') / (' + v.gPlanet + ') = ' + (v.wBoulder / v.gPlanet).toFixed(1) + ' kg' }
    ]
},
{
    id: "DYN-69",
    tag: "Unit 2: Force and Translational Dynamics",
    topic: "Unit 2: Newton's Laws",
    baseVars: { m: 380000, d: 135, v0: 42 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 0), d: rnd(b.d, 0.2, 0), v0: rnd(b.v0, 0.2, 0) }),
    renderPrompt: (v) => 'Superman must stop a train in <strong>' + v.d + '</strong> m to keep it from hitting a stalled car on the tracks. If the train’s mass is <strong>' + v.m.toExponential(1) + '</strong> kg and its initial speed is <strong>' + v.v0 + '</strong> m/s, how much force must Superman exert?',
    parts: [
        { label: "Force", unit: "N", solve: (v) => (0.5 * v.m * v.v0 * v.v0) / v.d, steps: (v, ans) => '<em>F</em>·<em>d</em> = ½<em>m</em><em>v</em>² → <em>F</em> = (½(' + v.m + ')(' + v.v0 + ')²) / ' + v.d + ' = ' + ((0.5 * v.m * v.v0 * v.v0) / v.d).toExponential(2) + ' N' }
    ]
},
{
    id: "DYN-70",
    tag: "Unit 2: Force and Translational Dynamics",
    topic: "Unit 2: Newton's Laws",
    baseVars: { m: 58, aG: 30, vKmH: 86 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 0), aG: rnd(b.aG, 0.2, 0), vKmH: rnd(b.vKmH, 0.2, 0) }),
    renderPrompt: (v) => 'A person has a reasonable chance of surviving an automobile crash if the deceleration is no more than <strong>' + v.aG + '</strong> g’s.<br>a. Calculate the net force on a <strong>' + v.m + '</strong>-kg person accelerating at this rate.<br>b. What is that force in pounds? (Use 1 lb. = 4.45 N)<br>c. What distance does this person travel if brought to rest at this rate of acceleration from <strong>' + v.vKmH + '</strong> km/hr?',
    parts: [
        { label: "a. Net force", unit: "N", solve: (v) => v.m * v.aG * 9.8, steps: (v, ans) => '<em>F</em> = <em>m</em>(<em>n</em><em>g</em>) = (' + v.m + ')(' + v.aG + '·9.8) = ' + (v.m * v.aG * 9.8).toFixed(0) + ' N' },
        { label: "b. Force in pounds", unit: "lb", solve: (v) => (v.m * v.aG * 9.8) / 4.45, steps: (v, ans) => '<em>F</em><sub>lb</sub> = ' + (v.m * v.aG * 9.8).toFixed(0) + ' / 4.45 = ' + ((v.m * v.aG * 9.8) / 4.45).toFixed(0) + ' lb' },
        { label: "c. Stopping distance", unit: "m", solve: (v) => { let vMS = v.vKmH / 3.6; let a = v.aG * 9.8; return (vMS * vMS) / (2 * a); }, steps: (v, ans) => '<em>d</em> = <em>v</em>² / (2<em>a</em>)' }
    ]
},
{
    id: "DYN-71",
    tag: "Unit 2: Force and Translational Dynamics",
    topic: "Unit 2: Connected Objects",
    diagram: "stacked_blocks",
    baseVars: { m1: 12.8, m2: 15.4, m3: 18.3 },
    randomize: (b) => ({ m1: rnd(b.m1, 0.2, 1), m2: rnd(b.m2, 0.2, 1), m3: rnd(b.m3, 0.2, 1) }),
    renderPrompt: (v) => 'Blocks one, two, and three are stacked on top of each other, and their masses are <strong>' + v.m1 + '</strong> kg, <strong>' + v.m2 + '</strong> kg, and <strong>' + v.m3 + '</strong> kg, respectively.<br>a. What is the size of the force blocks one and two exert on each other?<br>b. What is the size of the force blocks two and three exert on each other?<br>c. What is the size of the force block three and the ground exert on each other?',
    parts: [
        { label: "a. Force between 1 & 2", unit: "N", solve: (v) => v.m1 * 9.8, steps: (v, ans) => '<em>F</em><sub>12</sub> = <em>m</em><sub>1</sub><em>g</em> = (' + v.m1 + ')(9.8) = ' + (v.m1 * 9.8).toFixed(1) + ' N' },
        { label: "b. Force between 2 & 3", unit: "N", solve: (v) => (v.m1 + v.m2) * 9.8, steps: (v, ans) => '<em>F</em><sub>23</sub> = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)<em>g</em> = ' + ((v.m1 + v.m2) * 9.8).toFixed(1) + ' N' },
        { label: "c. Force with ground", unit: "N", solve: (v) => (v.m1 + v.m2 + v.m3) * 9.8, steps: (v, ans) => '<em>F</em><sub>3g</sub> = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub> + <em>m</em><sub>3</sub>)<em>g</em> = ' + ((v.m1 + v.m2 + v.m3) * 9.8).toFixed(1) + ' N' }
    ]
},
{
    id: "DYN-72",
    tag: "Unit 2: Force and Translational Dynamics",
    topic: "Unit 2: Newton's Laws",
    baseVars: { m: 14.6, aUp: 0.92, aDown: 1.06 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 1), aUp: rnd(b.aUp, 0.2, 2), aDown: rnd(b.aDown, 0.2, 2) }),
    renderPrompt: (v) => 'A bucket with water has a mass of <strong>' + v.m + '</strong> kg.<br>a. Find the size of the tension in the rope supporting the bucket if it is accelerated upwards at <strong>' + v.aUp + '</strong> m/s².<br>b. Find the size of the tension in the rope supporting the bucket if it is accelerated downwards at <strong>' + v.aDown + '</strong> m/s².',
    parts: [
        { label: "a. Upward tension", unit: "N", solve: (v) => v.m * (9.8 + v.aUp), steps: (v, ans) => '<em>T</em> = <em>m</em>(<em>g</em> + <em>a</em>) = (' + v.m + ')(9.8 + ' + v.aUp + ') = ' + (v.m * (9.8 + v.aUp)).toFixed(1) + ' N' },
        { label: "b. Downward tension", unit: "N", solve: (v) => v.m * (9.8 - v.aDown), steps: (v, ans) => '<em>T</em> = <em>m</em>(<em>g</em> - <em>a</em>) = (' + v.m + ')(9.8 - ' + v.aDown + ') = ' + (v.m * (9.8 - v.aDown)).toFixed(1) + ' N' }
    ]
},
{
    id: "DYN-73",
    tag: "Unit 2: Force and Translational Dynamics",
    topic: "Unit 2: Newton's Laws",
    baseVars: { m: 1000000000, deltaV: 0.003, f: 2.8 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 0), deltaV: rnd(b.deltaV, 0.2, 3), f: rnd(b.f, 0.2, 1) }),
    renderPrompt: (v) => 'A “doomsday” asteroid with a mass of <strong>' + v.m.toExponential(1) + '</strong> kg is hurtling through space. Unless the asteroid’s speed is changed by <strong>' + (v.deltaV * 100) + '</strong> cm/s, it will collide with Earth. A space tug exerts a constant force of <strong>' + v.f + '</strong> N. For how long must this force act?',
    parts: [
        { label: "Time", unit: "s", solve: (v) => (v.m * v.deltaV) / v.f, steps: (v, ans) => '<em>t</em> = (<em>m</em>·Δ<em>v</em>) / <em>F</em> = (' + v.m + '·' + v.deltaV + ') / ' + v.f + ' = ' + ((v.m * v.deltaV) / v.f).toExponential(2) + ' s' }
    ]
},
{
    id: "DYN-74",
    tag: "Unit 2: Force and Translational Dynamics",
    topic: "Unit 2: Forces in 2D",
    baseVars: { m: 6300, fEngine: 4400, fWind: 950, fWater: 1600 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 0), fEngine: rnd(b.fEngine, 0.2, 0), fWind: rnd(b.fWind, 0.2, 0), fWater: rnd(b.fWater, 0.2, 0) }),
    renderPrompt: (v) => 'A boat has a mass of <strong>' + v.m + '</strong> kg. Its engines generate a drive force of <strong>' + v.fEngine + '</strong> N due west, while the wind exerts <strong>' + v.fWind + '</strong> N due east and the water exerts <strong>' + v.fWater + '</strong> N due east. What is the acceleration?',
    parts: [
        { label: "Acceleration magnitude", unit: "m/s²", solve: (v) => (v.fEngine - v.fWind - v.fWater) / v.m, steps: (v, ans) => '<em>a</em> = (<em>F</em><sub>net</sub>) / <em>m</em> = ' + ((v.fEngine - v.fWind - v.fWater) / v.m).toFixed(3) + ' m/s²' }
    ]
},
{
    id: "DYN-75",
    tag: "Unit 2: Force and Translational Dynamics",
    topic: "Unit 2: Newton's Laws",
    baseVars: { mP: 61, mK: 13, vFinal: 0.80, dist: 0.52 },
    randomize: (b) => ({ mP: rnd(b.mP, 0.2, 0), mK: rnd(b.mK, 0.2, 0), vFinal: rnd(b.vFinal, 0.2, 2), dist: rnd(b.dist, 0.2, 2) }),
    renderPrompt: (v) => 'A <strong>' + v.mP + '</strong>-kg person in a <strong>' + v.mK + '</strong>-kg kayak starts paddling, accelerating from 0 to <strong>' + v.vFinal + '</strong> m/s over <strong>' + v.dist + '</strong> m. What is the net force?',
    parts: [
        { label: "Net Force", unit: "N", solve: (v) => { let m = v.mP + v.mK; return (m * v.vFinal * v.vFinal) / (2 * v.dist); }, steps: (v, ans) => '<em>F</em> = (<em>m</em>·<em>v</em>²) / (2<em>d</em>)' }
    ]
},
{
    id: "DYN-76",
    tag: "Unit 2: Force and Translational Dynamics",
    topic: "Unit 2: Newton's Laws",
    baseVars: { mGrams: 57, vFinal: 46, dist: 0.43 },
    randomize: (b) => ({ mGrams: rnd(b.mGrams, 0.2, 0), vFinal: rnd(b.vFinal, 0.2, 0), dist: rnd(b.dist, 0.2, 2) }),
    renderPrompt: (v) => 'When a <strong>' + v.mGrams + '</strong>-g tennis ball is served, it accelerates from rest to <strong>' + v.vFinal + '</strong> m/s over <strong>' + v.dist + '</strong> m. What is the net force?',
    parts: [
        { label: "Net Force", unit: "N", solve: (v) => { let m = v.mGrams / 1000; return (m * v.vFinal * v.vFinal) / (2 * v.dist); }, steps: (v, ans) => '<em>F</em> = (<em>m</em>·<em>v</em>²) / (2<em>d</em>)' }
    ]
}
