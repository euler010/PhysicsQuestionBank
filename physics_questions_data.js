// --- UNIT 2: DYNAMICS & NEWTON'S LAWS ---
  {
    id: "DYN-01", docNum: "Dyn #1", title: "Weight and Mass on Another Planet",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's Laws",
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
        steps: (v, ans) => 'Weight is calculated by <em>F</em><sub>g</sub> = <em>m</em><em>g</em>: (' + v.mRock + ' kg)(' + v.gPlanet + ' m/s²) = <strong>' + ans.toFixed(1) + ' N</strong>.'
      },
      {
        label: "b. Mass of boulder",
        getLabel: (v) => 'b. Mass of ' + v.wBoulderKN + '-kN boulder',
        unit: "kg",
        solve: (v) => (v.wBoulderKN * 1000) / v.gPlanet,
        steps: (v, ans) => 'Mass is given by <em>m</em> = <em>F</em><sub>g</sub> / <em>g</em>: (' + (v.wBoulderKN * 1000) + ' N) / (' + v.gPlanet + ' m/s²) = <strong>' + ans.toFixed(1) + ' kg</strong>.'
      }
    ]
  },
  {
    id: "DYN-02", docNum: "Dyn #2", title: "Superman Stopping a Train",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's Laws",
    baseVars: { d: 135, mExp5: 3.8, v0Kmh: 90 }, // v0 assumed 90 km/h (25 m/s) if not specified
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
          const v0 = (v.v0Kmh * 1000) / 3600;
          const a = (v0 * v0) / (2 * v.d);
          return '<em>v</em><sub>0</sub> = ' + v0.toFixed(2) + ' m/s. Acceleration magnitude |<em>a</em>| = <em>v</em><sub>0</sub>² / (2<em>d</em>) = ' + a.toFixed(3) + ' m/s². Force <em>F</em> = <em>m</em>|<em>a</em>| = (' + (v.mExp5 * 1e5).toExponential(2) + ' kg)(' + a.toFixed(3) + ' m/s²) = <strong>' + ans.toExponential(3) + ' N</strong>.';
        }
      }
    ]
  },
  {
    id: "DYN-03", docNum: "Dyn #3", title: "Automobile Crash Survivability",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's Laws",
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
        steps: (v, ans) => '<em>a</em> = ' + v.gLimit + ' × 9.80 m/s² = ' + (v.gLimit * G_ACCEL).toFixed(1) + ' m/s². <em>F</em><sub>net</sub> = <em>m</em><em>a</em> = (' + v.m + ' kg)(' + (v.gLimit * G_ACCEL).toFixed(1) + ' m/s²) = <strong>' + ans.toFixed(0) + ' N</strong>.'
      },
      {
        label: "b. Net force in pounds",
        getLabel: () => 'b. Force in pounds',
        unit: "lb",
        solve: (v) => (v.m * (v.gLimit * G_ACCEL)) / 4.45,
        steps: (v, ans) => '<em>F</em><sub>lb</sub> = <em>F</em><sub>net</sub> / 4.45 = <strong>' + ans.toFixed(0) + ' lb</strong>.'
      },
      {
        label: "c. Stopping distance",
        getLabel: (v) => 'c. Distance to stop from ' + v.v0Kmh + ' km/h',
        unit: "m",
        solve: (v) => {
          const v0 = (v.v0Kmh * 1000) / 3600;
          return (v0 * v0) / (2 * (v.gLimit * G_ACCEL));
        },
        steps: (v, ans) => {
          const v0 = (v.v0Kmh * 1000) / 3600;
          return '<em>v</em><sub>0</sub> = ' + v0.toFixed(2) + ' m/s. <em>d</em> = <em>v</em><sub>0</sub>² / (2<em>a</em>) = (' + v0.toFixed(2) + ')² / (2 × ' + (v.gLimit * G_ACCEL).toFixed(1) + ') = <strong>' + ans.toFixed(2) + ' m</strong>.';
        }
      }
    ]
  },
  {
    id: "DYN-04", docNum: "Dyn #4", title: "Stacked Blocks Normal Forces",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's Laws",
    baseVars: { m1: 12.8, m2: 15.4, m3: 18.3 },
    randomize: (b) => ({
      m1: rnd(b.m1, 0.20, 1),
      m2: rnd(b.m2, 0.20, 1),
      m3: rnd(b.m3, 0.20, 1)
    }),
    renderPrompt: (v) => 'Blocks one, two, and three are stacked on top of each other (block 1 on top, block 2 in middle, block 3 at the bottom), and their masses are <strong>' + v.m1 + ' kg</strong>, <strong>' + v.m2 + ' kg</strong>, and <strong>' + v.m3 + ' kg</strong>, respectively.<br/><strong>a.</strong> What is the size of the force blocks one and two exert on each other?<br/><strong>b.</strong> What is the size of the force blocks two and three exert on each other?<br/><strong>c.</strong> What is the size of the force block three and the ground exert on each other?',
    parts: [
      {
        label: "a. Force between block 1 and 2",
        unit: "N",
        solve: (v) => v.m1 * G_ACCEL,
        steps: (v, ans) => 'The normal force supports block 1: <em>N</em><sub>12</sub> = <em>m</em><sub>1</sub><em>g</em> = (' + v.m1 + ' kg)(9.80 m/s²) = <strong>' + ans.toFixed(1) + ' N</strong>.'
      },
      {
        label: "b. Force between block 2 and 3",
        unit: "N",
        solve: (v) => (v.m1 + v.m2) * G_ACCEL,
        steps: (v, ans) => 'The normal force supports blocks 1 and 2: <em>N</em><sub>23</sub> = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub>)<em>g</em> = (' + (v.m1 + v.m2).toFixed(1) + ' kg)(9.80 m/s²) = <strong>' + ans.toFixed(1) + ' N</strong>.'
      },
      {
        label: "c. Force between block 3 and ground",
        unit: "N",
        solve: (v) => (v.m1 + v.m2 + v.m3) * G_ACCEL,
        steps: (v, ans) => 'The ground supports all three blocks: <em>N</em><sub>3G</sub> = (<em>m</em><sub>1</sub> + <em>m</em><sub>2</sub> + <em>m</em><sub>3</sub>)<em>g</em> = (' + (v.m1 + v.m2 + v.m3).toFixed(1) + ' kg)(9.80 m/s²) = <strong>' + ans.toFixed(1) + ' N</strong>.'
      }
    ]
  },
  {
    id: "DYN-05", docNum: "Dyn #5", title: "Tension in an Accelerated Bucket",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's Laws",
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
        steps: (v, ans) => '<em>T</em> − <em>m</em><em>g</em> = <em>m</em><em>a</em> ⇒ <em>T</em> = <em>m</em>(<em>g</em> + <em>a</em>) = (' + v.m + ' kg)(9.80 + ' + v.aUp + ') = <strong>' + ans.toFixed(1) + ' N</strong>.'
      },
      {
        label: "b. Tension accelerating downwards",
        unit: "N",
        solve: (v) => v.m * (G_ACCEL - v.aDown),
        steps: (v, ans) => '<em>m</em><em>g</em> − <em>T</em> = <em>m</em><em>a</em> ⇒ <em>T</em> = <em>m</em>(<em>g</em> − <em>a</em>) = (' + v.m + ' kg)(9.80 − ' + v.aDown + ') = <strong>' + ans.toFixed(1) + ' N</strong>.'
      }
    ]
  },
  {
    id: "DYN-06", docNum: "Dyn #6", title: "Asteroid Deflection by Space Tug",
    unitTag: "Unit 2: Force and Translational Dynamics", topic: "Unit 2: Newton's Laws",
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
        solve: (v) => ((v.mExp9 * 1e9) * (v.dvCmS / 100)) / v.
