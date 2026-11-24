/* fbd_scenarios_data.js - the Free-Body Diagram scenario library.
   Edit this file to add or change scenarios. Both the builder and every exported student app read their scenarios from here.
   Part of the Physics Question Library (euler010/PhysicsQuestionBank). Loaded by index.html / library/index.html when the Free-Body Diagrams section is used. */
window.FBD_SCENARIO_DATA_FN = function () {
        /*
            Shared scenario library (used by the builder and by every generated app).
            Canvas orientation: +X is right, +Y is DOWN.
            - Down = +PI/2, Up = -PI/2, Right = 0, Left = PI
            - Ramp rises to the right at INCLINE_DEG:
              Parallel downhill = PI - INCLINE_RAD, Parallel uphill = -INCLINE_RAD
              Perpendicular outward = -PI/2 - INCLINE_RAD
            FR maps a friction kind ('static' | 'kinetic') to the force id / name / symbol
            that the teacher chose (F_f for both, or F_s and F_k).
        */
        function buildScenarioLibrary(INCLINE_DEG, INCLINE_RAD, FR) {
            const T = (id, htmlName, targetAngle, refMag, explanation) => ({ id, htmlName, targetAngle, toleranceAngle: 0.33, refMag, explanation });
            const DOWN = Math.PI / 2, UP = -Math.PI / 2, RIGHT = 0, LEFT = Math.PI;
            const UPHILL = -INCLINE_RAD, DOWNHILL = Math.PI - INCLINE_RAD, NORMAL_OUT = -Math.PI / 2 - INCLINE_RAD;
            const FG = 'Gravity force (F<sub>g</sub>)', FN = 'Normal force (F<sub>N</sub>)', FA = 'Applied force (F<sub>A</sub>)';
            const FT = 'Tension force (F<sub>T</sub>)', FD = 'Drag force (F<sub>D</sub>)';
            const fkId = FR.id('kinetic'), fsId = FR.id('static');
            const FK = FR.name('kinetic'), FKs = FR.sym('kinetic');
            const FS = FR.name('static'), FSs = FR.sym('static');

            return [
                // ---------- Horizontal surface ----------
                {
                    id: 'sc1', group: 'horizontal', geomType: 'horizontal',
                    baseTitle: 'Box Pushed Across Horizontal Surface', shortName: 'Box Pushed Horizontally',
                    prompt: 'A box is pushed to the right across a horizontal surface with a constant velocity by a horizontal force. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 95, `${FG} acts vertically downward.`),
                        T('fn', FN, UP, 95, `${FN} acts vertically upward supporting the box (F<sub>N</sub> = F<sub>g</sub>).`),
                        T('fa', FA, RIGHT, 80, `${FA} is directed horizontally to the right.`),
                        T(fkId, FK, LEFT, 80, `${FK} acts horizontally to the left opposing motion.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>N</sub>: Vertically upward (F<sub>N</sub> = F<sub>g</sub>)',
                        '&bull; F<sub>A</sub>: Horizontally to the right',
                        `&bull; ${FKs}: Horizontally to the left opposing motion (${FKs} = F<sub>A</sub>)`
                    ]
                },
                {
                    id: 'sc2', group: 'horizontal', geomType: 'horizontal',
                    baseTitle: 'Block Sliding to the Right, Coming to Rest', shortName: 'Block Sliding to Rest',
                    prompt: 'A block is sliding to the right on a non-smooth horizontal surface, slowing down and eventually coming to rest. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 95, `${FG} acts vertically downward toward Earth.`),
                        T('fn', FN, UP, 95, `${FN} acts vertically upward, balancing gravity (F<sub>N</sub> = F<sub>g</sub>).`),
                        T(fkId, FK, LEFT, 75, `${FK} acts horizontally to the left opposing the forward motion (causing deceleration).`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward toward Earth',
                        '&bull; F<sub>N</sub>: Vertically upward supporting the block (F<sub>N</sub> = F<sub>g</sub>)',
                        `&bull; ${FKs}: Horizontally to the left opposing motion`,
                        '&bull; Note: There is <strong>no</strong> applied forward force once the block is sliding on its own'
                    ]
                },
                {
                    id: 'sc13', group: 'horizontal', geomType: 'horizontal',
                    baseTitle: 'Box Pushed Left, Slowing Down', shortName: 'Box Pushed Left, Slowing',
                    prompt: 'A box is pushed to the left along a horizontal surface, but it is slowing down due to a friction force opposing its motion. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 95, `${FG} acts vertically downward toward Earth.`),
                        T('fn', FN, UP, 95, `${FN} acts vertically upward, balancing gravity (F<sub>N</sub> = F<sub>g</sub>).`),
                        T('fa', FA, LEFT, 50, `${FA} pushes the box horizontally to the left.`),
                        T(fkId, FK, RIGHT, 85, `${FK} acts horizontally to the right, opposing the leftward motion.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>N</sub>: Vertically upward (F<sub>N</sub> = F<sub>g</sub>)',
                        '&bull; F<sub>A</sub>: Horizontally to the left',
                        `&bull; ${FKs}: Horizontally to the right, opposing motion`,
                        `&bull; The box slows down, so ${FKs} &gt; F<sub>A</sub> (net force points right, opposite the velocity)`
                    ]
                },
                {
                    id: 'sc14', group: 'horizontal', geomType: 'horizontal',
                    baseTitle: 'Box Pushed Right, Speeding Up', shortName: 'Box Pushed Right, Speeding Up',
                    prompt: 'A box is pushed to the right along a horizontal surface, its motion is opposed by a friction force, and the box is speeding up due to the applied force. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 95, `${FG} acts vertically downward toward Earth.`),
                        T('fn', FN, UP, 95, `${FN} acts vertically upward, balancing gravity (F<sub>N</sub> = F<sub>g</sub>).`),
                        T('fa', FA, RIGHT, 95, `${FA} pushes the box horizontally to the right.`),
                        T(fkId, FK, LEFT, 50, `${FK} acts horizontally to the left, opposing the motion.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>N</sub>: Vertically upward (F<sub>N</sub> = F<sub>g</sub>)',
                        '&bull; F<sub>A</sub>: Horizontally to the right',
                        `&bull; ${FKs}: Horizontally to the left, opposing motion`,
                        `&bull; The box speeds up, so F<sub>A</sub> &gt; ${FKs} (net force points right, same as the velocity)`
                    ]
                },
                {
                    id: 'sc8', group: 'horizontal', geomType: 'horizontal', extraSnapDeg: 30,
                    baseTitle: 'Box Pushed with Applied Force at 30&deg; Below Horizontal', shortName: 'Box Pushed at 30° Below Horizontal',
                    prompt: 'A box is pushed to the right across a non-smooth horizontal surface at a constant velocity by an applied force acting at an angle of 30&deg; below the horizontal. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 90, `${FG} acts vertically downward toward Earth.`),
                        T('fn', FN, UP, 135, `${FN} acts upward and must support both gravity and the downward component of the applied force (F<sub>N</sub> &gt; F<sub>g</sub>).`),
                        T('fa', FA, (30 * Math.PI) / 180, 90, `${FA} is directed 30&deg; below horizontal, pushing down and right.`),
                        T(fkId, FK, LEFT, 75, `${FK} acts horizontally to the left opposing the forward motion.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>N</sub>: Vertically upward (greater than F<sub>g</sub> due to downward push)',
                        '&bull; F<sub>A</sub>: 30&deg; below horizontal (downward &amp; right)',
                        `&bull; ${FKs}: Horizontally left along surface (balances F<sub>A</sub> cos 30&deg;)`
                    ]
                },
                {
                    id: 'sc9', group: 'horizontal', geomType: 'horizontal', extraSnapDeg: -45,
                    baseTitle: 'Box Pulled with Applied Force at 45&deg; Above Horizontal', shortName: 'Box Pulled at 45° Above Horizontal',
                    prompt: 'A box is pulled to the right across a non-smooth horizontal surface by an applied force acting at an angle of 45&deg; above the horizontal. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 110, `${FG} acts vertically downward.`),
                        T('fn', FN, UP, 55, `${FN} acts upward, but is noticeably smaller than gravity because the upward pull partially lifts the box (F<sub>N</sub> &lt; F<sub>g</sub>).`),
                        T('fa', FA, (-45 * Math.PI) / 180, 85, `${FA} is directed 45&deg; above horizontal, pulling up and to the right.`),
                        T(fkId, FK, LEFT, 60, `${FK} acts horizontally to the left opposing sliding.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>N</sub>: Vertically upward (less than F<sub>g</sub> due to upward pulling component)',
                        '&bull; F<sub>A</sub>: 45&deg; above horizontal (upward &amp; right)',
                        `&bull; ${FKs}: Horizontally left along surface`
                    ]
                },
                {
                    id: 'sc18', group: 'horizontal', geomType: 'horizontal', collinearPair: ['fd', fkId],
                    baseTitle: 'Toy Car Slowed by Wind and Friction', shortName: 'Toy Car Slowed by Wind',
                    prompt: 'A toy car rolling to the right is slowing down due to a wind blowing left and a friction force opposing its motion. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 95, `${FG} acts vertically downward toward Earth.`),
                        T('fn', FN, UP, 95, `${FN} acts vertically upward, balancing gravity (F<sub>N</sub> = F<sub>g</sub>).`),
                        T('fd', FD, LEFT, 70, `The wind exerts a drag force (F<sub>D</sub>) horizontally to the left.`),
                        T(fkId, FK, LEFT, 40, `${FK} acts horizontally to the left, opposing the rightward motion.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>N</sub>: Vertically upward (F<sub>N</sub> = F<sub>g</sub>)',
                        '&bull; F<sub>D</sub>: Horizontally to the left (wind)',
                        `&bull; ${FKs}: Horizontally to the left, opposing motion`,
                        '&bull; Note: There is <strong>no</strong> forward force; both horizontal forces point left, so the car slows down'
                    ]
                },

                // ---------- Inclined plane ----------
                {
                    id: 'sc3', group: 'incline', geomType: 'incline',
                    baseTitle: 'Box at Rest on an Inclined Plane', shortName: 'Box at Rest on Incline',
                    prompt: 'A wooden box is at rest on a stationary rough inclined plane. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 110, `${FG} acts vertically downward toward the center of the Earth.`),
                        T('fn', FN, NORMAL_OUT, 110 * Math.cos(INCLINE_RAD), `${FN} acts perpendicular to the ramp surface pointing outward, balancing F<sub>gy</sub>.`),
                        T(fsId, FS, UPHILL, 110 * Math.sin(INCLINE_RAD), `${FS} points parallel up the incline to prevent sliding down, balancing F<sub>gx</sub>.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward toward Earth',
                        '&bull; F<sub>N</sub>: Perpendicular outward from ramp (balances F<sub>gy</sub>)',
                        `&bull; ${FSs}: Parallel up the incline (balances F<sub>gx</sub>)`
                    ]
                },
                {
                    id: 'sc4', group: 'incline', geomType: 'incline',
                    baseTitle: 'Box Pushed Up a Non-Smooth Incline', shortName: 'Box Pushed Up Incline',
                    prompt: 'A box is pushed up a non-smooth inclined plane at a constant velocity by a force acting parallel to the incline. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 110, `${FG} points vertically straight downward toward Earth.`),
                        T('fn', FN, NORMAL_OUT, 110 * Math.cos(INCLINE_RAD), `${FN} points perpendicular to the ramp, away from the surface.`),
                        T('fa', FA, UPHILL, 110 * Math.sin(INCLINE_RAD) + 40, `${FA} is directed parallel up the inclined plane to push the box upward.`),
                        T(fkId, FK, DOWNHILL, 40, `${FK} opposes upward motion, acting parallel down the incline.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward toward Earth',
                        '&bull; F<sub>N</sub>: Perpendicular to ramp (pointing away)',
                        '&bull; F<sub>A</sub>: Parallel up the incline pushing the box',
                        `&bull; ${FKs}: Parallel down the incline opposing upward sliding (F<sub>A</sub> = F<sub>gx</sub> + ${FKs})`
                    ]
                },
                {
                    id: 'sc5', group: 'incline', geomType: 'incline',
                    baseTitle: 'Block Sliding Down a Smooth Incline', shortName: 'Block Sliding Down Smooth Incline',
                    prompt: 'A block slides down a smooth inclined plane. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 115, `${FG} acts vertically downward toward Earth.`),
                        T('fn', FN, NORMAL_OUT, 115 * Math.cos(INCLINE_RAD), `${FN} acts perpendicular outward from the incline.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward toward Earth',
                        '&bull; F<sub>N</sub>: Perpendicular outward from the incline (F<sub>N</sub> = F<sub>gy</sub>)',
                        '&bull; Note: The surface is smooth (frictionless), so there is <strong>no</strong> friction force!'
                    ]
                },
                {
                    id: 'sc6', group: 'incline', geomType: 'incline',
                    baseTitle: 'Box Pulled Up Incline with a Rope', shortName: 'Box Pulled Up Incline',
                    prompt: 'A rope pulls a box up a non-smooth inclined plane while acting parallel to the incline, and the box\'s velocity remains constant. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 110, `${FG} points vertically straight downward.`),
                        T('fn', FN, NORMAL_OUT, 110 * Math.cos(INCLINE_RAD), `${FN} points perpendicular to the ramp, away from the surface.`),
                        T('t', FT, UPHILL, 110 * Math.sin(INCLINE_RAD) + 40, `${FT} from the rope pulls parallel up the inclined plane.`),
                        T(fkId, FK, DOWNHILL, 40, `${FK} opposes upward motion, acting parallel down the incline.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>N</sub>: Perpendicular outward from ramp',
                        '&bull; F<sub>T</sub>: Along the rope, pulling parallel up the incline',
                        `&bull; ${FKs}: Parallel down the incline opposing upward motion`
                    ]
                },
                {
                    id: 'sc7', group: 'incline', geomType: 'incline',
                    baseTitle: 'Box Accelerating Down a Non-Smooth Incline', shortName: 'Box Accelerating Down Incline',
                    prompt: 'A box speeds up as it slides down a non-smooth inclined plane. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 120, `${FG} acts vertically straight downward.`),
                        T('fn', FN, NORMAL_OUT, 120 * Math.cos(INCLINE_RAD), `${FN} acts perpendicular outward from the surface.`),
                        T(fkId, FK, UPHILL, 35, `${FK} opposes downhill motion, pointing up the incline (smaller than the downhill gravity component, so the box accelerates).`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>N</sub>: Perpendicular outward from incline',
                        `&bull; ${FKs}: Parallel to surface pointing up ramp (${FKs} &lt; F<sub>gx</sub>)`
                    ]
                },
                {
                    id: 'sc10', group: 'incline', geomType: 'incline', collinearPair: ['t', 'fa'],
                    baseTitle: 'Box Moved Up a Hill by Two People', shortName: 'Box Moved Up Hill by 2 People',
                    prompt: 'A box is moved up a hill with a non-smooth surface by two people, and the box\'s velocity is kept constant. One person pulls the box up the hill with a rope, and a second person pushes the box up the hill from behind. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 110, `${FG} points vertically straight downward toward Earth.`),
                        T('fn', FN, NORMAL_OUT, 110 * Math.cos(INCLINE_RAD), `${FN} acts perpendicular outward from the incline.`),
                        T('t', FT, UPHILL, (110 * Math.sin(INCLINE_RAD) + 40) / 2, `${FT} from the pulling rope acts parallel up the incline.`),
                        T('fa', FA, UPHILL, (110 * Math.sin(INCLINE_RAD) + 40) / 2, `${FA} from the second person pushes parallel up the incline from behind.`),
                        T(fkId, FK, DOWNHILL, 40, `${FK} acts parallel down the incline opposing upward motion.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward toward Earth',
                        '&bull; F<sub>N</sub>: Perpendicular outward from incline (F<sub>N</sub> = F<sub>gy</sub>)',
                        '&bull; F<sub>T</sub>: Parallel up the incline (rope pull)',
                        '&bull; F<sub>A</sub>: Parallel up the incline (push from behind)',
                        `&bull; ${FKs}: Parallel down the incline opposing upward sliding (F<sub>T</sub> + F<sub>A</sub> = F<sub>gx</sub> + ${FKs})`
                    ]
                },

                // ---------- Free fall ----------
                {
                    id: 'sc11', group: 'freefall', geomType: 'freefall',
                    baseTitle: 'Skydiver Accelerating Downward', shortName: 'Skydiver Accelerating',
                    prompt: 'A skydiver is accelerating downwards in free fall without his chute open, and the drag force on him is equal to one half of his weight. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 120, `${FG} acts vertically downward toward Earth.`),
                        T('fd', FD, UP, 60, `${FD} acts vertically upward, opposing the downward motion through the air.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward toward Earth',
                        '&bull; F<sub>D</sub>: Vertically upward, opposing motion (F<sub>D</sub> = &frac12; F<sub>g</sub>)',
                        '&bull; Net force is downward (F<sub>g</sub> &gt; F<sub>D</sub>), so the skydiver speeds up',
                        '&bull; Note: No surface touches the skydiver, so there is <strong>no</strong> normal force or friction'
                    ]
                },
                {
                    id: 'sc12', group: 'freefall', geomType: 'freefall',
                    baseTitle: 'Skydiver at Terminal Velocity', shortName: 'Skydiver at Terminal Velocity',
                    prompt: 'A skydiver is in free fall without his chute open, and he has reached terminal velocity, during which time he falls at a constant velocity. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 110, `${FG} acts vertically downward toward Earth.`),
                        T('fd', FD, UP, 110, `${FD} acts vertically upward and balances gravity at terminal velocity (F<sub>D</sub> = F<sub>g</sub>).`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward toward Earth',
                        '&bull; F<sub>D</sub>: Vertically upward, opposing motion (F<sub>D</sub> = F<sub>g</sub>)',
                        '&bull; Net force is zero, so velocity stays constant',
                        '&bull; Note: No surface touches the skydiver, so there is <strong>no</strong> normal force or friction'
                    ]
                },

                // ---------- Hanging from a rope ----------
                {
                    id: 'sc15', group: 'hanging', geomType: 'hanging',
                    baseTitle: 'Bucket Raised at Constant Velocity', shortName: 'Bucket Raised, Constant Velocity',
                    prompt: 'A bucket hanging from a rope is raised upwards at a constant velocity. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 100, `${FG} acts vertically downward toward Earth.`),
                        T('t', FT, UP, 100, `${FT} from the rope pulls the bucket vertically upward.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>T</sub>: Vertically upward along the rope',
                        '&bull; Constant velocity, so net force is zero: F<sub>T</sub> = F<sub>g</sub>',
                        '&bull; Note: No surface touches the bucket, so there is <strong>no</strong> normal force or friction'
                    ]
                },
                {
                    id: 'sc16', group: 'hanging', geomType: 'hanging',
                    baseTitle: 'Bucket Accelerated Upward', shortName: 'Bucket Accelerated Up',
                    prompt: 'A bucket hanging from a rope is accelerated upwards. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 90, `${FG} acts vertically downward toward Earth.`),
                        T('t', FT, UP, 130, `${FT} from the rope pulls the bucket vertically upward.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>T</sub>: Vertically upward along the rope',
                        '&bull; Acceleration is upward, so F<sub>T</sub> &gt; F<sub>g</sub>',
                        '&bull; Note: No surface touches the bucket, so there is <strong>no</strong> normal force or friction'
                    ]
                },
                {
                    id: 'sc17', group: 'hanging', geomType: 'hanging',
                    baseTitle: 'Bucket Accelerated Downward', shortName: 'Bucket Accelerated Down',
                    prompt: 'A bucket hanging from a rope is accelerated downwards. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 120, `${FG} acts vertically downward toward Earth.`),
                        T('t', FT, UP, 70, `${FT} from the rope still pulls the bucket vertically upward, even while it accelerates downward.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>T</sub>: Vertically upward along the rope (a rope can only pull)',
                        '&bull; Acceleration is downward, so F<sub>T</sub> &lt; F<sub>g</sub>',
                        '&bull; Note: No surface touches the bucket, so there is <strong>no</strong> normal force or friction'
                    ]
                },

                // ---------- Circular motion ----------
                {
                    id: 'sc19', group: 'circular', geomType: 'swing', extraSnapDeg: -120,
                    baseTitle: 'Child on a Swing Ride (Conical Pendulum)', shortName: 'Child on a Swing Ride',
                    prompt: 'A child on a swing ride (a conical pendulum) is traveling along a horizontal circle at a constant speed. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 90, `${FG} acts vertically downward toward Earth.`),
                        T('t', FT, -2 * Math.PI / 3, 90 / Math.cos(Math.PI / 6), `${FT} pulls along the cable, up and toward the center of the circle.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>T</sub>: Along the cable, up and toward the center of the circle',
                        '&bull; The vertical part of F<sub>T</sub> balances F<sub>g</sub>, so F<sub>T</sub> &gt; F<sub>g</sub>',
                        '&bull; The horizontal part of F<sub>T</sub> points toward the center: it is the centripetal force',
                        '&bull; Note: There is <strong>no</strong> separate &ldquo;centripetal force&rdquo; vector to draw'
                    ]
                },
                {
                    id: 'sc20', group: 'circular', geomType: 'valley',
                    baseTitle: 'Car at the Bottom of a Valley', shortName: 'Car at Bottom of a Valley',
                    prompt: 'A car drives down into a valley that is semi-circular, and the car is at the bottom of the valley. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 85, `${FG} acts vertically downward toward Earth.`),
                        T('fn', FN, UP, 125, `${FN} from the road acts vertically upward, toward the center of the circle.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>N</sub>: Vertically upward, toward the center of the valley&rsquo;s circle',
                        '&bull; The net force must point up (toward the center), so F<sub>N</sub> &gt; F<sub>g</sub>',
                        '&bull; Note: There is <strong>no</strong> separate &ldquo;centripetal force&rdquo; vector to draw'
                    ]
                },
                {
                    id: 'sc21', group: 'circular', geomType: 'loopTop', collinearPair: ['fg', 'fn'],
                    baseTitle: 'Rider Upside Down at the Top of a Loop', shortName: 'Rider at Top of a Loop',
                    prompt: 'A boy riding on a roller coaster is upside down at the top of a loop, and he feels the seat pushing on him with twice his weight. Draw the complete free-body diagram.',
                    targetForces: [
                        T('fg', FG, DOWN, 60, `${FG} acts vertically downward toward Earth.`),
                        T('fn', FN, DOWN, 120, `${FN} from the seat pushes the upside-down rider downward, toward the center of the loop.`)
                    ],
                    breakdown: [
                        '&bull; F<sub>g</sub>: Vertically downward',
                        '&bull; F<sub>N</sub>: Vertically <strong>downward</strong>: the seat is above the upside-down rider and pushes him toward the center',
                        '&bull; F<sub>N</sub> = 2F<sub>g</sub> (the seat pushes with twice his weight)',
                        '&bull; Both forces point toward the center, and together they are the centripetal force',
                        '&bull; Note: There is <strong>no</strong> separate &ldquo;centripetal force&rdquo; vector to draw'
                    ]
                }
            ];
        }

        // Master list of every vector a teacher can offer students (display order in the force palette)
        const ALL_FORCES = [
            { id: 'fg',  name: 'Gravity force', label: { base: 'F', sub: 'g' }, htmlName: 'Gravity force: F<sub>g</sub>', color: '#dc2626' },
            { id: 'fn',  name: 'Normal force', label: { base: 'F', sub: 'N' }, htmlName: 'Normal force: F<sub>N</sub>', color: '#2563eb' },
            { id: 'ff',  name: 'Friction force', label: { base: 'F', sub: 'f' }, htmlName: 'Friction force: F<sub>f</sub>', color: '#d97706', friction: 'general' },
            { id: 'fs',  name: 'Static friction', label: { base: 'F', sub: 's' }, htmlName: 'Static friction: F<sub>s</sub>', color: '#16a34a', friction: 'split' },
            { id: 'fk',  name: 'Kinetic friction', label: { base: 'F', sub: 'k' }, htmlName: 'Kinetic friction: F<sub>k</sub>', color: '#d97706', friction: 'split' },
            { id: 't',   name: 'Tension force', label: { base: 'F', sub: 'T' }, htmlName: 'Tension force: F<sub>T</sub>', color: '#9333ea' },
            { id: 'fa',  name: 'Applied force', label: { base: 'F', sub: 'A' }, htmlName: 'Applied force: F<sub>A</sub>', color: '#0891b2' },
            { id: 'fd',  name: 'Drag force (Air resistance)', label: { base: 'F', sub: 'D' }, htmlName: 'Drag force (Air resistance): F<sub>D</sub>', color: '#db2777' },
            { id: 'fsp', name: 'Spring force', label: { base: 'F', sub: 'sp' }, htmlName: 'Spring force: F<sub>sp</sub>', color: '#4f46e5' },
            { id: 'fb',  name: 'Buoyant force', label: { base: 'F', sub: 'B' }, htmlName: 'Buoyant force: F<sub>B</sub>', color: '#65a30d' }
        ];

        function makeFrictionHelpers(mode) {
            const split = mode === 'split';
            return {
                id: k => split ? (k === 'static' ? 'fs' : 'fk') : 'ff',
                name: k => split ? (k === 'static' ? 'Static friction (F<sub>s</sub>)' : 'Kinetic friction (F<sub>k</sub>)') : 'Friction force (F<sub>f</sub>)',
                sym: k => split ? (k === 'static' ? 'F<sub>s</sub>' : 'F<sub>k</sub>') : 'F<sub>f</sub>'
            };
        }
        return { buildScenarioLibrary, ALL_FORCES, makeFrictionHelpers };
};
