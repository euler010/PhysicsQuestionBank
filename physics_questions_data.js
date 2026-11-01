// ============================================================================
// PHYSICS QUESTION LIBRARY DATA (physics_questions_data.js)
// 121 questions. Loaded by the Library App via <script src=".../physics_questions_data.js">
//
// NOTE: This file intentionally does NOT declare G_ACCEL, G_CONST, DEG2RAD,
// RAD2DEG, rnd, randInt or buildSplineModel. The Library App already defines
// them, and declaring them twice makes the browser stop with
// "Identifier 'G_ACCEL' has already been declared".
// ============================================================================

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

// Builds the text shown under "Guided Solution": a short numbered list of steps.
function guidedSteps() {
  const items = Array.prototype.slice.call(arguments).filter(function (s) { return s; });
  return items.map(function (s, i) { return '<strong>Step ' + (i + 1) + ':</strong> ' + s; }).join('<br/>');
}

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
      return `An object moves along a straight horizontal track. Its 10-second motion is recorded in the <strong>velocity vs. time</strong> graph shown below. Use the graph to answer each question part:<br/><strong>a.</strong> What is the object&rsquo;s velocity at <em>t</em> = <strong>${v.ta} s</strong>?<br/><strong>b.</strong> At what point(s) in time is the object&rsquo;s velocity <strong>${vbSign} m/s</strong>? (separate multiple times with a comma, e.g. 1.5, 5.0)<br/><strong>c.</strong> What is the average acceleration of the object from <em>t</em> = <strong>${v.tc1} s</strong> to <em>t</em> = <strong>${v.tc2} s</strong>?<br/><strong>d.</strong> What is the acceleration of the object at <em>t</em> = <strong>${v.td} s</strong>?`;
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { hMax: 26.0, v0: 5.8 },
    randomize: (b) => ({ hMax: rnd(b.hMax, 0.20, 1), v0: rnd(b.v0, 0.20, 2) }),
    renderPrompt: (v) => `An astronaut on a newly explored exoplanet finds that she can jump vertically to a maximum height of <strong>${v.hMax} meters</strong> when her initial takeoff speed is <strong>${v.v0} m/s</strong>. What is the magnitude of the acceleration due to gravity on the planet?`,
    parts: [
      { label: "Gravity magnitude (<em>g</em>)", unit: "m/s²", acceptedUnits: ["m/s²", "N/kg"], solve: (v) => (v.v0 * v.v0) / (2 * v.hMax), steps: (v, ans) => guidedSteps(
          `Known: takeoff speed <em>v</em><sub>0</sub> = ${v.v0} m/s and maximum height <em>h</em><sub>max</sub> = ${v.hMax} m. Unknown: the free-fall acceleration <em>g</em> on the planet. At the top of the jump the speed is momentarily zero (<em>v</em> = 0).`,
          `Use the constant-acceleration equation that has no time in it. Taking up as positive, gravity slows the jumper: <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>g h</em><sub>max</sub>. With <em>v</em> = 0, solve for <em>g</em>: <em>g</em> = <em>v</em><sub>0</sub>&sup2; / (2 <em>h</em><sub>max</sub>).`,
          `Substitute: <em>g</em> = (${v.v0} m/s)&sup2; / (2 &times; ${v.hMax} m) = <strong>${ans.toFixed(3)} m/s²</strong>.`,
          `For comparison, that is about ${(ans / G_ACCEL).toFixed(2)} times Earth&rsquo;s 9.80 m/s².`
        )}
    ]
  },
  {
    id: "KIN-04", docNum: "Kin #4", title: "Automobile Constant Acceleration: Speed and Time",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { v0: 5.60, accel: 0.45, dist: 615 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 2), accel: rnd(b.accel, 0.20, 2), dist: Math.round(rnd(b.dist, 0.20, 0)) }),
    renderPrompt: (v) => `An automobile accelerates from an initial velocity of <strong>${v.v0} m/s</strong> at a constant rate of <strong>${v.accel} m/s&sup2;</strong>. It travels a straight-line displacement of <strong>${v.dist} m</strong> while accelerating.<br/><strong>a.</strong> What is the car&rsquo;s final speed at the end of that displacement?<br/><strong>b.</strong> How long did it take to travel <strong>${v.dist} m</strong>?`,
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { aEngine: 38.0, tEngine: 1.40 },
    randomize: (b) => ({ aEngine: rnd(b.aEngine, 0.20, 1), tEngine: rnd(b.tEngine, 0.20, 2) }),
    renderPrompt: (v) => `A model rocket launches vertically from rest on the ground. Its engine produces a constant upward acceleration of <strong>${v.aEngine} m/s&sup2;</strong> for <strong>${v.tEngine} s</strong>. When fuel runs out, the rocket continues upward in unpowered free-fall under gravity.<br/><strong>a.</strong> What maximum altitude does the rocket reach?<br/><strong>b.</strong> What is the rocket&rsquo;s velocity immediately before striking the ground?<br/><strong>c.</strong> What total distance does the rocket travel from launch to impact?<br/><strong>d.</strong> How long is the rocket in the air in total?`,
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    renderPrompt: (v) => `The velocity-time graph shown illustrates the motion of a vertical test freight elevator. The elevator accelerates uniformly from rest to a peak velocity of <strong>${v.vMax} m/s</strong> at <em>t</em><sub>1</sub> = <strong>${v.t1} s</strong>, cruises at constant velocity until <em>t</em><sub>2</sub> = <strong>${v.t2} s</strong>, then brakes uniformly to rest at <em>t</em><sub>3</sub> = <strong>${v.t3} s</strong>.<br/><strong>a.</strong> What is the magnitude of the elevator&rsquo;s maximum acceleration?<br/><strong>b.</strong> What is the total vertical displacement of the elevator?`,
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { v0: 26.0, dist: 0.77 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), dist: rnd(b.dist, 0.20, 2) }),
    renderPrompt: (v) => `A test vehicle traveling at <strong>+${v.v0} m/s</strong> crashes into a rigid barrier. The crumple zone compresses and the cabin stops in <strong>${v.dist} m</strong>.<br/><strong>a.</strong> What is the magnitude of the average acceleration during impact?<br/><strong>b.</strong> How many <em>g</em>&rsquo;s of acceleration does the vehicle experience?`,
    parts: [
      { label: "a. Average acceleration magnitude (|<em>a</em>|)", unit: "m/s²", solve: (v) => (v.v0 * v.v0) / (2 * v.dist), steps: (v, ans) => guidedSteps(
          `Known: initial velocity <em>v</em><sub>0</sub> = ${v.v0} m/s, final velocity <em>v</em> = 0 (the car stops), and stopping distance &Delta;<em>x</em> = ${v.dist} m. No time is given, so use the equation without time.`,
          `<em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>a</em>&Delta;<em>x</em>. With <em>v</em> = 0 this gives |<em>a</em>| = <em>v</em><sub>0</sub>&sup2; / (2&Delta;<em>x</em>).`,
          `Substitute: |<em>a</em>| = (${v.v0} m/s)&sup2; / (2 &times; ${v.dist} m) = <strong>${ans.toFixed(1)} m/s²</strong>. The acceleration is negative (opposite to the motion), and the question asks for its magnitude.`
        )},
      { label: "b. Acceleration in <em>g</em>'s", unit: "g's", acceptedUnits: ["g's", "No units"], solve: (v) => ((v.v0 * v.v0) / (2 * v.dist)) / G_ACCEL, steps: (v, ans) => {
          const a = (v.v0 * v.v0) / (2 * v.dist);
          return guidedSteps(
            `A &ldquo;<em>g</em>&rdquo; is one unit of 9.80 m/s². To express an acceleration in <em>g</em>&rsquo;s, divide it by 9.80 m/s².`,
            `Use the magnitude from part a: |<em>a</em>| = ${a.toFixed(1)} m/s².`,
            `Number of <em>g</em>&rsquo;s = ${a.toFixed(1)} / 9.80 = <strong>${ans.toFixed(2)} g&rsquo;s</strong>.`
          );
        }}
    ]
  },
  {
    id: "KIN-13", docNum: "Kin #13", title: "Highway Passing Time with Unit Conversion (km/h to m/s)",
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { v0: 4.00, timeSec: 15.0, dist: 235 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 2), timeSec: rnd(b.timeSec, 0.20, 1), dist: Math.round(rnd(b.dist, 0.20, 0)) }),
    renderPrompt: (v) => `A car with an initial velocity of <strong>${v.v0} m/s</strong> accelerates uniformly over <strong>${v.timeSec} s</strong>, traveling a displacement of <strong>${v.dist} m</strong>. What is the car&rsquo;s velocity at the end of the <strong>${v.timeSec} s</strong> interval?`,
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { aFlea: 1500, hMm: 20.0 },
    randomize: (b) => ({ aFlea: Math.round(rnd(b.aFlea, 0.20, 0)), hMm: rnd(b.hMm, 0.20, 1) }),
    renderPrompt: (v) => `A flea generates an explosive leg acceleration of <strong>${v.aFlea} m/s&sup2;</strong> during takeoff, allowing it to jump vertically to an apex of <strong>${v.hMm} mm</strong>.<br/><strong>a.</strong> What is the flea&rsquo;s speed when leaving the ground?<br/><strong>b.</strong> How long did the takeoff acceleration phase last?`,
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
    baseVars: { vDescend: 5.80, hStart: 153 },
    randomize: (b) => ({ vDescend: rnd(b.vDescend, 0.20, 2), hStart: Math.round(rnd(b.hStart, 0.20, 0)) }),
    renderPrompt: (v) => `A helicopter is descending vertically at a constant speed of <strong>${v.vDescend} m/s</strong>. When it is <strong>${v.hStart} m</strong> above ground level, a crate is released.<br/><strong>a.</strong> How long does it take for the crate to reach the ground?<br/><strong>b.</strong> What is the crate&rsquo;s velocity immediately before touchdown?`,
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 1D Kinematics",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion",
    baseVars: { v0: 12.0, tFall: 2.28 },
    randomize: (b) => ({ v0: rnd(b.v0, 0.20, 1), tFall: rnd(b.tFall, 0.20, 2) }),
    renderPrompt: (v) => `Paula throws a rock horizontally with a speed of <strong>${v.v0} m/s</strong> from a bridge, and it falls for <strong>${v.tFall} seconds</strong> before reaching the water below.<br/><strong>a.</strong> How high is the bridge from the water below?<br/><strong>b.</strong> How far horizontally does the rock travel before striking the water?<br/><strong>c.</strong> What is the rock&rsquo;s speed as it reaches the water?<br/><strong>d.</strong> What is the rock&rsquo;s direction just before hitting the water?`,
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion",
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion",
    baseVars: { v0: 12.6, multWord: "double", multFactor: 2 },
    randomize: (b) => {
      const opts = [{ word: "double", factor: 2 }, { word: "triple", factor: 3 }, { word: "quadruple", factor: 4 }];
      const pick = opts[Math.floor(Math.random() * opts.length)];
      return { v0: rnd(b.v0, 0.20, 1), multWord: pick.word, multFactor: pick.factor };
    },
    renderPrompt: (v) => `A rock is thrown horizontally off of a cliff with a speed of <strong>${v.v0} m/s</strong>. How long would it take for the rock&rsquo;s speed to <strong>${v.multWord}</strong>?`,
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
    renderPrompt: (v) => `A cannonball is fired from ground level with a velocity of <strong>${v.v0} m/s</strong> at an angle of <strong>${v.theta}&deg;</strong> above the horizontal, and it hits its target as it descends at an elevation of <strong>${v.hTarget} meters</strong> higher than the ground below.<br/><strong>a.</strong> How long does it take the cannonball to hit its target?<br/><strong>b.</strong> What is the cannonball&rsquo;s speed when it hits its target?<br/><strong>c.</strong> What is the direction of the cannonball&rsquo;s velocity when it hits its target?`,
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion",
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
    renderPrompt: (v) => `A pelican flying along a horizontal path drops a fish from a height of <strong>${v.hDrop} meters</strong>. The fish travels <strong>${v.distX} meters</strong> horizontally before it hits the water below. What is the pelican&rsquo;s speed?`,
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
    renderPrompt: (v) => `A soccer ball is kicked from ground level with an initial speed of <strong>${v.v0} m/s</strong> at an angle of <strong>${v.theta}&deg;</strong> above the ground.<br/><strong>a.</strong> How high is the soccer ball at its highest point?<br/><strong>b.</strong> For how long is the soccer ball in the air?<br/><strong>c.</strong> What is the soccer ball&rsquo;s horizontal range?<br/><strong>d.</strong> What is the soccer ball&rsquo;s speed after <strong>${v.tCheck} seconds</strong>?`,
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion",
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
    renderPrompt: (v) => `A cliff diver runs horizontally off a cliff with an initial height of <strong>${v.hCliff} meters</strong> and wants to clear rocks below. If the rocks extend <strong>${v.distRocks} meters</strong> past the cliff&rsquo;s edge, what minimum initial horizontal speed must he have to safely clear the rocks below?`,
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
    unitTag: "Unit 1: Kinematics", topic: "Unit 1: 2D Kinematics and Projectile Motion",
    baseVars: { v0: 123, theta: 29.0, hCliff: 50.0 },
    randomize: (b) => ({ v0: Math.round(rnd(b.v0, 0.18, 0)), theta: rnd(b.theta, 0.15, 1), hCliff: rnd(b.hCliff, 0.20, 1) }),
    renderPrompt: (v) => `A mortar shell is launched with an initial velocity of <strong>${v.v0} m/s</strong> at an angle of <strong>${v.theta}&deg;</strong> above the horizontal from a point on a cliff <strong>${v.hCliff} m</strong> above a level plain below.<br/><strong>a.</strong> How long is the shell in the air before landing?<br/><strong>b.</strong> How far from the base of the cliff does the mortar shell strike the ground?<br/><strong>c.</strong> What is the shell&rsquo;s speed just before it lands?<br/><strong>d.</strong> What is the direction of the shell&rsquo;s velocity just before it lands?<br/><strong>e.</strong> How high is the shell above the level plain at its highest point?`,
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Circular Motion and Gravitation",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { d: 90, mu: 0.5 },
    randomize: (b) => ({ d: rnd(b.d, 0.2, 1), mu: rnd(b.mu, 0.2, 2) }),
    renderPrompt: (v) => `Police measure a car&rsquo;s skid marks to be <strong>${v.d} m</strong> long, and the road&rsquo;s coefficient of kinetic friction to be <strong>${v.mu}</strong>. What was the initial speed of the car?`,
    parts: [{ label: "Initial speed (<em>v</em><sub>0</sub>)", unit: "m/s", solve: (v) => Math.sqrt(2 * v.mu * G_ACCEL * v.d), steps: (v, ans) => guidedSteps(
          `While skidding, the only horizontal force is kinetic friction, so <em>f</em><sub>k</sub> = &mu;<em>m</em><em>g</em> and the deceleration is <em>a</em> = &mu;<em>g</em> = ${v.mu} &times; 9.80 = ${(v.mu * G_ACCEL).toFixed(2)} m/s². The mass cancels, so it isn't needed.`,
          `The car skids to a stop (final speed 0) over <em>d</em> = ${v.d} m. Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>a</em><em>d</em> = 0, so <em>v</em><sub>0</sub> = &radic;(2<em>a</em><em>d</em>) = &radic;(2&mu;<em>g</em><em>d</em>).`,
          `Substitute: <em>v</em><sub>0</sub> = &radic;(2 &times; ${v.mu} &times; 9.80 &times; ${v.d}) = <strong>${ans.toFixed(2)} m/s</strong> (about ${(ans * 3.6).toFixed(0)} km/h).`
        )}]
  },
  {
    id: "DYN-27", docNum: "Set 2 #27", title: "Wooden Crate Static Threshold vs. Kinetic Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    id: "DYN-29", docNum: "Set 2 #29", title: "Stopping Distance of a Pushed Box",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { muK: 0.20, v0: 4.0 },
    randomize: (b) => ({ muK: rnd(b.muK, 0.2, 2), v0: rnd(b.v0, 0.2, 1) }),
    renderPrompt: (v) => `A box is pushed to <strong>${v.v0} m/s</strong> across a floor where &mu;<sub>k</sub> = <strong>${v.muK}</strong>. How far does it slide?`,
    parts: [{ label: "Sliding distance (<em>d</em>)", unit: "m", solve: (v) => (v.v0 * v.v0) / (2 * v.muK * G_ACCEL), steps: (v, ans) => guidedSteps(
          `After the push ends, kinetic friction is the only horizontal force, so the box decelerates at <em>a</em> = &mu;<sub>k</sub><em>g</em> = ${v.muK} &times; 9.80 = ${(v.muK * G_ACCEL).toFixed(2)} m/s². (The mass cancels out.)`,
          `The box slides until it stops: <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; &minus; 2<em>a</em><em>d</em> = 0, so <em>d</em> = <em>v</em><sub>0</sub>&sup2; / (2<em>a</em>) = <em>v</em><sub>0</sub>&sup2; / (2&mu;<sub>k</sub><em>g</em>).`,
          `Substitute: <em>d</em> = ${v.v0}&sup2; / (2 &times; ${v.muK} &times; 9.80) = <strong>${ans.toFixed(2)} m</strong>.`
        )}]
  },
  {
    id: "DYN-35", docNum: "Set 2 #35", title: "Static and Kinetic Friction on the Moon",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Friction",
    baseVars: { vf: 14.3, t: 6.2 },
    randomize: (b) => ({ vf: rnd(b.vf, 0.20, 1), t: rnd(b.t, 0.20, 1) }),
    renderPrompt: (v) => `A crate is in the back of a parked pick-up truck. The truck accelerates from rest to <strong>${v.vf} m/s</strong> in <strong>${v.t} seconds</strong>. What minimum coefficient of static friction must there be between the crate and the truck so that the crate doesn&rsquo;t slide within the truck?`,
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
    renderPrompt: (v) => `A block beginning at the top of a <strong>${v.L} m</strong> long ramp that forms a <strong>${v.theta}&deg;</strong> with the horizontal slides without friction to the bottom.<br/><strong>a.</strong> What is the acceleration of the block?<br/><strong>b.</strong> What is the speed of the block at the bottom?<br/><strong>c.</strong> What is the block&rsquo;s travel time?`,
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
    id: "DYN-31", docNum: "Set 2 #31", title: "Snowboarder Accelerating Down a Hill",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
    baseVars: { m: 70, theta: 39, muK: 0.18, d: 5 },
    randomize: (b) => ({ m: rnd(b.m, 0.2, 1), theta: rnd(b.theta, 0.15, 1), muK: rnd(b.muK, 0.15, 2), d: rnd(b.d, 0.2, 1) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> snowboarder beginning at rest goes down a <strong>${v.theta}&deg;</strong> slope, and &mu;<sub>k</sub> = <strong>${v.muK}</strong>.<br/><strong>a.</strong> Find the acceleration of the snowboarder.<br/><strong>b.</strong> Find his speed after traveling <strong>${v.d} m</strong>.`,
    parts: [
      { label: "a. Acceleration (<em>a</em>)", unit: "m/s²", solve: (v) => G_ACCEL * (Math.sin(v.theta * DEG2RAD) - v.muK * Math.cos(v.theta * DEG2RAD)), steps: (v, ans) => guidedSteps(
          `Take down the slope as positive. Forces along the slope: the weight component <em>m</em><em>g</em> sin &theta; (down) and kinetic friction &mu;<sub>k</sub><em>F</em><sub>N</sub> (up). Perpendicular to the slope, <em>F</em><sub>N</sub> = <em>m</em><em>g</em> cos &theta;.`,
          `Newton's second law: <em>m</em><em>a</em> = <em>m</em><em>g</em> sin &theta; &minus; &mu;<sub>k</sub><em>m</em><em>g</em> cos &theta;, so <em>a</em> = <em>g</em>(sin &theta; &minus; &mu;<sub>k</sub> cos &theta;). The mass cancels.`,
          `Substitute: <em>a</em> = 9.80(sin ${v.theta}&deg; &minus; ${v.muK} cos ${v.theta}&deg;) = <strong>${ans.toFixed(2)} m/s²</strong>.`
        )},
      { label: "b. Speed after traveling <em>d</em> (<em>v</em>)", unit: "m/s", solve: (v) => Math.sqrt(2 * (G_ACCEL * (Math.sin(v.theta * DEG2RAD) - v.muK * Math.cos(v.theta * DEG2RAD))) * v.d), steps: (v, ans) => {
          const a = G_ACCEL * (Math.sin(v.theta * DEG2RAD) - v.muK * Math.cos(v.theta * DEG2RAD));
          return guidedSteps(
            `The snowboarder starts at rest and accelerates at <em>a</em> = ${a.toFixed(2)} m/s² (from part a) over <em>d</em> = ${v.d} m. No time is given.`,
            `Use <em>v</em>&sup2; = <em>v</em><sub>0</sub>&sup2; + 2<em>a</em><em>d</em> with <em>v</em><sub>0</sub> = 0, so <em>v</em> = &radic;(2<em>a</em><em>d</em>).`,
            `Substitute: <em>v</em> = &radic;(2 &times; ${a.toFixed(2)} &times; ${v.d}) = <strong>${ans.toFixed(2)} m/s</strong>.`
          );
        }}
    ]
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
    baseVars: { m: 51, theta: 23, Fwind: 82, muS: 0.25, muK: 0.16, L: 236 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), theta: rnd(b.theta, 0.12, 1), Fwind: rnd(b.Fwind, 0.18, 1), muS: 0.25, muK: rnd(b.muK, 0.15, 2), L: Math.round(rnd(b.L, 0.15, 0)) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> skier goes down a <strong>${v.theta}&deg;</strong> slope aided by a wind force of <strong>${v.Fwind} N</strong> parallel to the slope. The skier&rsquo;s motion is opposed by friction and &mu;<sub>k</sub> = <strong>${v.muK}</strong>.<br/><strong>a.</strong> Find the magnitude of the skier&rsquo;s acceleration down hill.<br/><strong>b.</strong> If she begins at rest, determine the time it will take her to reach the bottom <strong>${v.L} m</strong> away.`,
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
    baseVars: { m: 74, theta: 37, muS: 0.16, muK: 0.11 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), theta: rnd(b.theta, 0.12, 1), muS: 0.16, muK: rnd(b.muK, 0.15, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> skier descends a <strong>${v.theta}&deg;</strong> hill with &mu;<sub>s</sub> = <strong>${v.muS}</strong> and &mu;<sub>k</sub> = <strong>${v.muK}</strong>.<br/><strong>a.</strong> What is the gravity component down hill?<br/><strong>b.</strong> What is the magnitude of the kinetic friction?<br/><strong>c.</strong> What is the skier&rsquo;s acceleration?`,
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
    id: "DYN-53", docNum: "Doc 2 #9", title: "Crate Pulled Up Incline at Constant Velocity",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
    baseVars: { m: 92, theta: 24, muK: 0.35 },
    randomize: (b) => ({ m: rnd(b.m, 0.15, 1), theta: rnd(b.theta, 0.12, 1), muK: rnd(b.muK, 0.15, 2) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> crate is pulled up a <strong>${v.theta}&deg;</strong> ramp at a constant velocity (&mu;<sub>k</sub> = <strong>${v.muK}</strong>).<br/><strong>a.</strong> Determine the magnitude of the kinetic friction force.<br/><strong>b.</strong> Determine the magnitude of the tension force pulling the crate up the hill.`,
    parts: [
      { label: "a. Magnitude of kinetic friction force (<em>f</em><sub>k</sub>)", unit: "N", solve: (v) => v.muK * v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD), steps: (v, ans) => {
          const N = v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD);
          return guidedSteps(
            `Friction depends on the normal force. Perpendicular to the ramp the crate does not accelerate, so <em>F</em><sub>N</sub> = <em>m</em><em>g</em> cos &theta; = ${v.m} &times; 9.80 &times; cos ${v.theta}&deg; = ${N.toFixed(1)} N.`,
            `Kinetic friction: <em>f</em><sub>k</sub> = &mu;<sub>k</sub><em>F</em><sub>N</sub> = ${v.muK} &times; ${N.toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>, directed down the ramp (opposing the upward motion).`
          );
        }},
      { label: "b. Magnitude of tension force (<em>F</em><sub>T</sub>)", unit: "N", solve: (v) => v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD) + v.muK * v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD), steps: (v, ans) => {
          const w = v.m * G_ACCEL * Math.sin(v.theta * DEG2RAD), fk = v.muK * v.m * G_ACCEL * Math.cos(v.theta * DEG2RAD);
          return guidedSteps(
            `Constant velocity means zero net force along the ramp. Up the ramp: tension <em>F</em><sub>T</sub>. Down the ramp: the weight component <em>m</em><em>g</em> sin &theta; = ${w.toFixed(1)} N and kinetic friction ${fk.toFixed(1)} N (from part a).`,
            `Set the forces equal: <em>F</em><sub>T</sub> = <em>m</em><em>g</em> sin &theta; + <em>f</em><sub>k</sub>.`,
            `Substitute: <em>F</em><sub>T</sub> = ${w.toFixed(1)} + ${fk.toFixed(1)} = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }}
    ]
  },
  {
    id: "DYN-55", docNum: "Set 3 #1", title: "Skier on Frictionless Hill: Weight Components, Normal Force and Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Inclined Planes", diagram: "incline",
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
    renderPrompt: (v) => `The man pictured pulls a <strong>${v.m}-kg</strong> crate up a frictionless <strong>${v.theta}&deg;</strong> incline. (There is friction where he&rsquo;s standing, so he doesn&rsquo;t move.) If he accelerates the crate at a rate of <strong>${v.a} m/s&sup2;</strong>, with how much force is he pulling on the rope?`,
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Multi-Body Systems and Pulleys",
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
    renderPrompt: (v) => `Mass 2 (<strong>${v.m2} kg</strong>) is on a frictionless table, and it&rsquo;s connected to hanging mass 1 (<strong>${v.m1} kg</strong>).<br/><strong>a.</strong> What is the acceleration of the masses?<br/><strong>b.</strong> What is the tension in the string connecting them?`,
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Elevators and Apparent Weight",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Elevators and Apparent Weight",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Elevators and Apparent Weight",
    baseVars: { pct: 113 },
    randomize: () => ({ pct: Math.round(rnd(115, 0.08, 0)) }),
    renderPrompt: (v) => `A box is on a scale in an elevator, and the scale reads <strong>${v.pct}%</strong> of the box&rsquo;s usual weight. Find the magnitude and direction of the elevator&rsquo;s acceleration.`,
    parts: [{ label: "Acceleration magnitude (<em>a</em>)", unit: "m/s²", directionOptions: ["Upward", "Downward"], expectedDirection: "Upward", solve: (v) => ((v.pct / 100) - 1) * G_ACCEL, steps: (v, ans) => guidedSteps(
          `The scale reads the normal force: <em>F</em><sub>N</sub> = ${v.pct}% of the weight = ${(v.pct / 100).toFixed(2)}<em>m</em><em>g</em>. Because this is <em>more</em> than the weight, the net force must point upward.`,
          `Take up as positive. Newton's second law: <em>F</em><sub>N</sub> &minus; <em>m</em><em>g</em> = <em>m</em><em>a</em>, so ${(v.pct / 100).toFixed(2)}<em>m</em><em>g</em> &minus; <em>m</em><em>g</em> = <em>m</em><em>a</em>. The mass cancels: <em>a</em> = (${(v.pct / 100).toFixed(2)} &minus; 1)<em>g</em>.`,
          `Substitute: <em>a</em> = ${((v.pct / 100) - 1).toFixed(2)} &times; 9.80 = <strong>${ans.toFixed(2)} m/s², upward</strong>. (The elevator could be speeding up while rising, or slowing down while descending.)`
        )}]
  },
  {
    id: "DYN-38", docNum: "Set 2 #38", title: "Elevator Scale Reading During Upward Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Elevators and Apparent Weight",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Elevators and Apparent Weight",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors",
    baseVars: { Fw: 11.0, Fs: 16.0, Fe: 21.0, m: 2.0 },
    randomize: (b) => { const Fw = rnd(b.Fw, 0.2, 1); return { Fw, Fs: rnd(b.Fs, 0.2, 1), Fe: Number((Fw + rnd(b.Fe - b.Fw, 0.2, 1)).toFixed(1)), m: rnd(b.m, 0.2, 1) }; },
    renderPrompt: (v) => `Forces of <strong>${v.Fw} N west</strong>, <strong>${v.Fs} N south</strong>, and <strong>${v.Fe} N east</strong> act on a <strong>${v.m}-kg</strong> mass. Find acceleration magnitude and direction.`,
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors",
    baseVars: { Fw: 8.5, Fn: 13.2, m: 6.8 },
    randomize: (b) => ({ Fw: rnd(b.Fw, 0.2, 2), Fn: rnd(b.Fn, 0.2, 1), m: rnd(b.m, 0.2, 2) }),
    renderPrompt: (v) => `Forces of <strong>${v.Fw} N west</strong> and <strong>${v.Fn} N north</strong> act on a <strong>${v.m}-kg</strong> mass.<br/><strong>a.</strong> What is the net force on the mass?<br/><strong>b.</strong> What is the magnitude of the mass&rsquo;s acceleration?<br/><strong>c.</strong> What is the direction of the mass&rsquo;s acceleration?`,
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors",
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
    id: "DYN-23", docNum: "Set 2 #23", title: "Tension in Two Symmetric Support Ropes",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors", diagram: "symmetricRopes",
    baseVars: { W: 88.0, theta: 12.0 },
    randomize: (b) => ({ W: rnd(b.W, 0.2, 1), theta: rnd(b.theta, 0.2, 1) }),
    renderPrompt: (v) => `Two symmetric ropes each making <strong>${v.theta}&deg;</strong> with horizontal support a <strong>${v.W}-N</strong> mass. Find tension in each rope.`,
    parts: [{ label: "Tension in each rope (<em>F</em><sub>T</sub>)", unit: "N", solve: (v) => v.W / (2 * Math.sin(v.theta * DEG2RAD)), steps: (v, ans) => guidedSteps(
          `The mass hangs at rest, so the forces balance. Each rope has tension <em>F</em><sub>T</sub> at ${v.theta}&deg; above the horizontal. By symmetry, the two horizontal components cancel each other.`,
          `Vertically, the two upward components of the tension carry the weight: 2<em>F</em><sub>T</sub> sin &theta; = <em>W</em> = ${v.W} N.`,
          `Solve: <em>F</em><sub>T</sub> = <em>W</em> / (2 sin &theta;) = ${v.W} / (2 sin ${v.theta}&deg;) = <strong>${ans.toFixed(1)} N</strong>. This is much larger than the weight because the ropes are nearly horizontal, so only a small part of each tension points up.`
        )}]
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
  {
    id: "DYN-66", docNum: "Set 3 #12", title: "Two Men Holding a Suspended Rock at Rest with Asymmetric Ropes",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors", diagram: "twoMenRopesRock",
    baseVars: { m: 60.0, theta1: 21.0, T1: 532 },
    randomize: (b) => {
      const m = rnd(b.m, 0.15, 1);
      const theta1 = rnd(b.theta1, 0.15, 1);
      const T1 = Math.round(rnd(b.T1, 0.12, 0));
      return { m, theta1, T1 };
    },
    renderPrompt: (v) => `The men pictured hold the <strong>${v.m}-kg</strong> rock at rest. The left rope forms a <strong>${v.theta1}&deg;</strong> angle with the horizontal and applies a <strong>${v.T1}-N</strong> tension force. Find the size of the tension in the rope held by the man on the right, and the angle his rope makes with the horizontal.`,
    parts: [
      {
        label: "a. Tension in the right rope (<em>T</em><sub>2</sub>)", unit: "N",
        solve: (v) => {
          const T2x = v.T1 * Math.cos(v.theta1 * DEG2RAD);
          const T2y = v.m * G_ACCEL - v.T1 * Math.sin(v.theta1 * DEG2RAD);
          return Math.hypot(T2x, T2y);
        },
        steps: (v, ans) => {
          const T2x = v.T1 * Math.cos(v.theta1 * DEG2RAD), T2y = v.m * G_ACCEL - v.T1 * Math.sin(v.theta1 * DEG2RAD);
          return guidedSteps(
            `The rock is at rest, so the net force is zero in both directions. The left rope pulls up and to the left with <em>T</em><sub>1</sub> = ${v.T1} N at ${v.theta1}&deg;, the right rope pulls up and to the right with <em>T</em><sub>2</sub>, and the weight <em>m</em><em>g</em> = ${v.m} &times; 9.80 = ${(v.m * G_ACCEL).toFixed(1)} N pulls down.`,
            `Horizontal: the right rope must cancel the left rope's horizontal pull, so <em>T</em><sub>2x</sub> = <em>T</em><sub>1</sub> cos &theta;<sub>1</sub> = ${v.T1} cos ${v.theta1}&deg; = ${T2x.toFixed(1)} N.`,
            `Vertical: <em>T</em><sub>1y</sub> + <em>T</em><sub>2y</sub> = <em>m</em><em>g</em>, so <em>T</em><sub>2y</sub> = <em>m</em><em>g</em> &minus; <em>T</em><sub>1</sub> sin &theta;<sub>1</sub> = ${(v.m * G_ACCEL).toFixed(1)} &minus; ${(v.T1 * Math.sin(v.theta1 * DEG2RAD)).toFixed(1)} = ${T2y.toFixed(1)} N.`,
            `Combine: <em>T</em><sub>2</sub> = &radic;(<em>T</em><sub>2x</sub>&sup2; + <em>T</em><sub>2y</sub>&sup2;) = &radic;(${T2x.toFixed(1)}&sup2; + ${T2y.toFixed(1)}&sup2;) = <strong>${ans.toFixed(1)} N</strong>.`
          );
        }},
      {
        label: "b. Angle of the right rope with the horizontal (&theta;<sub>2</sub>)", unit: "°",
        solve: (v) => {
          const T2x = v.T1 * Math.cos(v.theta1 * DEG2RAD);
          const T2y = v.m * G_ACCEL - v.T1 * Math.sin(v.theta1 * DEG2RAD);
          return Math.atan2(T2y, T2x) * RAD2DEG;
        },
        steps: (v, ans) => {
          const T2x = v.T1 * Math.cos(v.theta1 * DEG2RAD), T2y = v.m * G_ACCEL - v.T1 * Math.sin(v.theta1 * DEG2RAD);
          return guidedSteps(
            `From part a, the right rope's components are <em>T</em><sub>2x</sub> = ${T2x.toFixed(1)} N (horizontal) and <em>T</em><sub>2y</sub> = ${T2y.toFixed(1)} N (vertical).`,
            `The angle with the horizontal comes from tan &theta;<sub>2</sub> = <em>T</em><sub>2y</sub> / <em>T</em><sub>2x</sub> = ${T2y.toFixed(1)} / ${T2x.toFixed(1)} = ${(T2y / T2x).toFixed(3)}.`,
            `&theta;<sub>2</sub> = arctan(${(T2y / T2x).toFixed(3)}) = <strong>${ans.toFixed(1)}&deg;</strong> above the horizontal.`
          );
        }}
    ]
  },
  {
    id: "DYN-67", docNum: "Set 3 #13", title: "Mass Hanging from Car Rear-View Mirror During Acceleration",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: 2D Forces and Vectors",
    baseVars: { m: 1.8, theta: 23.0 },
    randomize: (b) => ({ m: rnd(b.m, 0.20, 2), theta: rnd(b.theta, 0.18, 1) }),
    renderPrompt: (v) => `You are the passenger in a car, and at one point you notice that a <strong>${v.m}-kg</strong> mass attached to the rear-view mirror hangs at rest (relative to the car) on a string that forms an angle of <strong>${v.theta}&deg;</strong> with the vertical. Determine the acceleration of the car.`,
    parts: [
      {
        label: "Acceleration of the car (<em>a</em>)", unit: "m/s²",
        solve: (v) => G_ACCEL * Math.tan(v.theta * DEG2RAD),
        steps: (v, ans) => guidedSteps(
          `Only two forces act on the hanging mass: its weight <em>m</em><em>g</em> (down) and the string tension <em>T</em> (along the string, which is tilted ${v.theta}&deg; from the vertical). The mass accelerates with the car, which is horizontal.`,
          `Vertical: no vertical acceleration, so <em>T</em> cos &theta; = <em>m</em><em>g</em>. Horizontal: the horizontal part of the tension is the net force, so <em>T</em> sin &theta; = <em>m</em><em>a</em>.`,
          `Divide the horizontal equation by the vertical one: tan &theta; = <em>a</em> / <em>g</em>. The mass cancels, and the tension is not needed.`,
          `<em>a</em> = <em>g</em> tan &theta; = 9.80 tan ${v.theta}&deg; = <strong>${ans.toFixed(2)} m/s²</strong>, in the direction the mass swings away from (the car is accelerating forward and the mass hangs back).`
        )}
    ]
  },

  // --- UNIT 2: FORCE AND TRANSLATIONAL DYNAMICS - NEWTON'S 3RD LAW (CED 2.3) ---
  {
    id: "DYN-01", docNum: "Set 2 #1", title: "Girl in a Canoe Pushing Off a Dock",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's 3rd Law and Impulse",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's 3rd Law and Impulse",
    baseVars: { mA: 128, mC: 52, aA: 1.3, t: 1.8 },
    randomize: (b) => ({ mA: Math.round(rnd(b.mA, 0.2, 0)), mC: rnd(b.mC, 0.2, 1), aA: rnd(b.aA, 0.2, 2), t: rnd(b.t, 0.2, 2) }),
    renderPrompt: (v) => `A <strong>${v.mA}-kg</strong> astronaut pushes a <strong>${v.mC}-kg</strong> crate, and he accelerates at <strong>${v.aA} m/s&sup2;</strong> for <strong>${v.t} s</strong>.<br/><strong>a.</strong> What is the force on the crate?<br/><strong>b.</strong> What is the force on the astronaut?<br/><strong>c.</strong> What is the crate&rsquo;s acceleration?<br/><strong>d.</strong> What is the astronaut&rsquo;s speed as he floats away?<br/><strong>e.</strong> What is the crate&rsquo;s speed as it floats away?`,
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's 3rd Law and Impulse",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's 3rd Law and Impulse",
    baseVars: { vi: 2.4, vf: 2.07, dtMs: 2.86, m: 0.38 },
    randomize: (b) => ({ vi: rnd(b.vi, 0.15, 2), vf: rnd(b.vf, 0.15, 2), dtMs: rnd(b.dtMs, 0.15, 2), m: rnd(b.m, 0.15, 3) }),
    renderPrompt: (v) => `A <strong>${v.m}-kg</strong> ball hits a cushion at <strong>&minus;${v.vi} m/s</strong> and rebounds at <strong>+${v.vf} m/s</strong> in <strong>${v.dtMs} ms</strong>.<br/><strong>a.</strong> What is the ball&rsquo;s average acceleration?<br/><strong>b.</strong> What is the average net force on the ball?`,
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
    baseVars: { m: 3592, Fdrive: 2853, Fwind: 765, Fwater: 1345 },
    randomize: (b) => {
      const Fwind = Math.round(rnd(b.Fwind, 0.15, 0));
      const Fwater = Math.round(rnd(b.Fwater, 0.15, 0));
      const Fdrive = Fwind + Fwater + Math.round(rnd(743, 0.25, 0));
      return { m: Math.round(rnd(b.m, 0.15, 0)), Fdrive, Fwind, Fwater };
    },
    renderPrompt: (v) => `A boat has a mass of <strong>${v.m.toLocaleString()} kg</strong>. Its engines generate a drive force of <strong>${v.Fdrive.toLocaleString()} N due west</strong>, while the wind exerts a force of <strong>${v.Fwind} N due east</strong> and the water exerts a resistive force of <strong>${v.Fwater.toLocaleString()} N due east</strong>. Take west to be the negative direction. What is the boat&rsquo;s acceleration, with the correct sign?`,
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
    baseVars: { m: 62 },
    randomize: (b) => ({ m: rnd(b.m, 0.20, 1) }),
    renderPrompt: (v) => `<strong>a.</strong> What is the acceleration of a <strong>${v.m}-kg</strong> skydiver, when the force of air resistance acting on her is one-fourth of her weight?<br/><strong>b.</strong> After opening the parachute, she descends to the ground at a constant speed. What is the force of air resistance now?`,
    parts: [
      { label: "a. Acceleration of skydiver (<em>a</em>)", unit: "m/s²", acceptNegative: true, solve: () => 0.75 * G_ACCEL, steps: (v, ans) => guidedSteps(
          `Take down as positive. Two forces act on the skydiver: her weight <em>m</em><em>g</em> (down) and air resistance, which is one-fourth of her weight, 0.25<em>m</em><em>g</em> (up).`,
          `Net force: <em>F</em><sub>net</sub> = <em>m</em><em>g</em> &minus; 0.25<em>m</em><em>g</em> = 0.75<em>m</em><em>g</em>. Newton's second law: <em>a</em> = <em>F</em><sub>net</sub> / <em>m</em> = 0.75<em>g</em>. The mass (${v.m} kg) cancels.`,
          `Substitute: <em>a</em> = 0.75 &times; 9.80 = <strong>${ans.toFixed(2)} m/s²</strong>, directed downward.`
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
    baseVars: { m: 2.00, h: 1.00, t: 0.64 },
    randomize: (b) => ({ m: rnd(b.m, 0.20, 2), h: rnd(b.h, 0.20, 2), t: rnd(b.t, 0.18, 2) }),
    renderPrompt: (v) => `An astronaut drops a <strong>${v.m.toFixed(2)} kg</strong> rock from a height of <strong>${v.h.toFixed(2)} meter</strong> above the surface of a new planet. It takes the rock <strong>${v.t} seconds</strong> to hit the ground.<br/><strong>a.</strong> What is the acceleration due to gravity on the planet?<br/><strong>b.</strong> What is the rock&rsquo;s weight on the planet?`,
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Elevators and Apparent Weight",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Dynamics and Forces",
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
  }
];
