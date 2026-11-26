import { describe, expect, it, vi } from "vitest";
import {
  buildGazeReportFromCounters,
  calculateHeadPose,
  computeCompensatedWorldGaze,
  GAZE_CONFIG,
  GazeSessionStateMachine,
  persistedGazeToReportResult,
  type FrameClassification,
  type Point,
} from "@/services/gazeTracker";
import {
  scoreQuestionIntegrity,
  scoreSessionIntegrity,
} from "@/utils/integrityRubric";

/** Helper to feed N frames of an observation at 10 FPS (0.1s/frame) */
function feedTicks(
  machine: GazeSessionStateMachine,
  obs: FrameClassification,
  durationSec: number,
  startSec: number,
  stepSec = 0.1,
  captureSnapshot?: () => string,
): number {
  const count = Math.round(durationSec / stepSec);
  let t = startSec;
  for (let i = 0; i < count; i += 1) {
    t = Math.round((t + stepSec) * 1000) / 1000;
    machine.step(obs, t, captureSnapshot);
  }
  return t;
}

describe("Integrity Rubric exact math (10-20 docx spec)", () => {
  it("matches the exact 60-second worked example from the specification docx", () => {
    // 60s answer: 5s right + 4s up + 36s straight + 15s short glances (< threshold)
    const result = scoreQuestionIntegrity({
      questionIndex: 1,
      totalDurationSec: 60,
      straightDurationSec: 36,
      episodes: [
        {
          behavior: "SIDE_OR_DOWN",
          direction: "NHIN PHAI",
          startSec: 5,
          endSec: 10,
          durationSec: 5,
          timestamp: "00:05",
          questionIndex: 1,
        },
        {
          behavior: "LOOK_UP",
          direction: "NHIN LEN",
          startSec: 20,
          endSec: 24,
          durationSec: 4,
          timestamp: "00:20",
          questionIndex: 1,
        },
      ],
    });

    // Step 1: 1.5*5 + 0.5*4 = 9.5
    expect(result.pEvents).toBe(9.5);
    // Step 2: remaining = 51s, ratio = 36/51 ≈ 0.706 -> (0.80 - 0.70588)*50 ≈ 4.7
    expect(result.penalizedDurationSec).toBe(9);
    expect(result.unpenalizedDurationSec).toBe(51);
    expect(result.straightRatioOnUnpenalized).toBeCloseTo(0.706, 2);
    expect(result.pFocus).toBeCloseTo(4.7, 1);
    // Step 3: 100 - 9.5 - 4.7 ≈ 85.8, HIGH
    expect(result.score).toBeCloseTo(85.8, 1);
    expect(result.rank).toBe("HIGH");
  });

  it("applies exact rubric thresholds and enforces floor at 0 (never negative)", () => {
    const heavy = scoreQuestionIntegrity({
      questionIndex: 1,
      totalDurationSec: 40,
      straightDurationSec: 2,
      episodes: [
        {
          behavior: "SECOND_PERSON",
          startSec: 0,
          endSec: 10,
          durationSec: 10, // 15 + 5*10 = 65
          timestamp: "00:00",
          questionIndex: 1,
        },
        {
          behavior: "NO_FACE",
          startSec: 10,
          endSec: 30,
          durationSec: 20, // 2.5*20 = 50
          timestamp: "00:10",
          questionIndex: 1,
        },
      ],
    });
    expect(heavy.score).toBe(0);
    expect(heavy.rank).toBe("LOW");
    expect(heavy.hasSecondPerson).toBe(true);
  });

  it("forces LOW rank when second person >= 1.5s even if numeric score >= 65", () => {
    const res = scoreQuestionIntegrity({
      questionIndex: 1,
      totalDurationSec: 30,
      straightDurationSec: 28,
      episodes: [
        {
          behavior: "SECOND_PERSON",
          startSec: 10,
          endSec: 12,
          durationSec: 2.0, // 15 + 5*2 = 25 -> score = 75
          timestamp: "00:10",
          questionIndex: 1,
        },
      ],
    });
    expect(res.pEvents).toBe(25);
    expect(res.score).toBe(75);
    expect(res.hasSecondPerson).toBe(true);
    expect(res.rank).toBe("LOW");

    const session = scoreSessionIntegrity([
      { questionIndex: 1, totalDurationSec: 30, straightDurationSec: 30, episodes: [] }, // 100
      {
        questionIndex: 2,
        totalDurationSec: 30,
        straightDurationSec: 28,
        episodes: [
          {
            behavior: "SECOND_PERSON",
            startSec: 10,
            endSec: 12,
            durationSec: 2.0,
            timestamp: "00:10",
            questionIndex: 2,
          },
        ],
      }, // 75 (second person)
    ]);
    // Avg = 87.5 >= 85, yet session rank MUST be LOW due to 2nd person!
    expect(session.overallScore).toBe(87.5);
    expect(session.hasSecondPerson).toBe(true);
    expect(session.rank).toBe("LOW");
  });
});

describe("GazeSessionStateMachine special edge cases", () => {
  it("Edge Case 1: continuous 5.0s look-away commits ONE full 5.0s event (no chunking loss)", () => {
    const m = new GazeSessionStateMachine();
    m.setContext({ questionIndex: 1 });
    let t = 0;
    t = feedTicks(m, { kind: "STRAIGHT" }, 10.0, t);
    t = feedTicks(m, { kind: "LOOK_AWAY", direction: "NHIN PHAI" }, 5.0, t);
    t = feedTicks(m, { kind: "STRAIGHT" }, 10.0, t);

    const report = m.finalize(t);
    expect(report.camera_active).toBe(true);
    expect(report.events).toHaveLength(1);
    expect(report.events[0].duration).toBeCloseTo(5.0, 1);
    expect(report.events[0].penalty).toBeCloseTo(7.5, 1);
    expect(report.integrity?.overallScore).toBeCloseTo(92.5, 1);
    expect(report.integrity?.rank).toBe("HIGH");
  });

  it("Edge Case 2: short natural blink (0.2s) inside look-away does NOT reset violation timer", () => {
    const m = new GazeSessionStateMachine();
    m.setContext({ questionIndex: 1 });
    let t = 0;
    t = feedTicks(m, { kind: "STRAIGHT" }, 5.0, t);
    // Look left 1.6s -> blink 0.2s -> look left 1.6s (total 3.4s continuous!)
    t = feedTicks(m, { kind: "LOOK_AWAY", direction: "NHIN TRAI" }, 1.6, t);
    t = feedTicks(m, { kind: "BLINK" }, 0.2, t);
    t = feedTicks(m, { kind: "LOOK_AWAY", direction: "NHIN TRAI" }, 1.6, t);
    t = feedTicks(m, { kind: "STRAIGHT" }, 5.0, t);

    const report = m.finalize(t);
    expect(report.events).toHaveLength(1);
    expect(report.events[0].duration).toBeCloseTo(3.4, 1);
    expect(report.events[0].penalty).toBeCloseTo(5.1, 1);
  });

  it("Edge Case 3: natural blinks while looking straight incur ZERO penalty", () => {
    const m = new GazeSessionStateMachine();
    m.setContext({ questionIndex: 1 });
    let t = 0;
    t = feedTicks(m, { kind: "STRAIGHT" }, 5.0, t);
    t = feedTicks(m, { kind: "BLINK" }, 0.2, t);
    t = feedTicks(m, { kind: "STRAIGHT" }, 5.0, t);
    t = feedTicks(m, { kind: "BLINK" }, 0.2, t);
    t = feedTicks(m, { kind: "STRAIGHT" }, 5.0, t);

    const report = m.finalize(t);
    expect(report.events).toHaveLength(0);
    expect(report.integrity?.overallScore).toBe(100);
    expect(report.integrity?.rank).toBe("HIGH");
  });

  it("Edge Case 4: repeated short glances (< 2s each) trigger Step 2 P_focus (50% straight -> -15 pts)", () => {
    const m = new GazeSessionStateMachine();
    m.setContext({ questionIndex: 1 });
    let t = 0;
    // 10 cycles of 1.5s straight + 1.5s glance right = 30s total, 50% straight, 0 Step-1 events
    for (let cycle = 0; cycle < 10; cycle += 1) {
      t = feedTicks(m, { kind: "STRAIGHT" }, 1.5, t);
      t = feedTicks(m, { kind: "LOOK_AWAY", direction: "NHIN PHAI" }, 1.5, t);
    }
    const report = m.finalize(t);
    expect(report.events).toHaveLength(0);
    expect(report.integrity?.totalPEvents).toBe(0);
    // (0.80 - 0.50) * 50 = 15.0 -> score = 85.0
    expect(report.integrity?.totalPFocus).toBeCloseTo(15.0, 1);
    expect(report.integrity?.overallScore).toBeCloseTo(85.0, 1);
    expect(report.integrity?.rank).toBe("HIGH");
  });

  it("Edge Case 5: LOOK_UP 3.0s is NOT penalized, LOOK_UP 4.0s penalized at 0.5/s; switching LOOK_UP -> NHIN XUONG splits cleanly", () => {
    const m = new GazeSessionStateMachine();
    m.setContext({ questionIndex: 1 });
    let t = 0;
    t = feedTicks(m, { kind: "STRAIGHT" }, 10.0, t);
    // 2.5s LOOK_UP (< 3.5s -> ignored in Step 1), then immediately 2.5s NHIN XUONG (>= 2.0s -> -3.75 => -3.8)
    t = feedTicks(m, { kind: "LOOK_AWAY", direction: "NHIN LEN" }, 2.5, t);
    t = feedTicks(m, { kind: "LOOK_AWAY", direction: "NHIN XUONG" }, 2.5, t);
    t = feedTicks(m, { kind: "STRAIGHT" }, 10.0, t);
    // 4.0s LOOK_UP (>= 3.5s -> 0.5 * 4 = -2.0)
    t = feedTicks(m, { kind: "LOOK_AWAY", direction: "NHIN LEN" }, 4.0, t);
    t = feedTicks(m, { kind: "STRAIGHT" }, 10.0, t);

    const report = m.finalize(t);
    expect(report.events).toHaveLength(2);
    expect(report.events[0].behavior).toBe("SIDE_OR_DOWN");
    expect(report.events[0].penalty).toBeCloseTo(3.8, 1);
    expect(report.events[1].behavior).toBe("LOOK_UP");
    expect(report.events[1].penalty).toBeCloseTo(2.0, 1);
  });

  it("Edge Case 6: brief second person (0.9s < 1.5s) is ignored; sustained 4.0s charges base 15pt ONCE (+20 = 35pt)", () => {
    const m = new GazeSessionStateMachine();
    m.setContext({ questionIndex: 1 });
    let t = 0;
    t = feedTicks(m, { kind: "STRAIGHT" }, 10.0, t);
    t = feedTicks(m, { kind: "SECOND_PERSON" }, 0.9, t); // pass-by -> ignored
    t = feedTicks(m, { kind: "STRAIGHT" }, 10.0, t);
    t = feedTicks(m, { kind: "SECOND_PERSON" }, 4.0, t); // sustained -> 15 + 5*4 = 35 (NOT 30 + 20!)
    t = feedTicks(m, { kind: "STRAIGHT" }, 10.0, t);

    const report = m.finalize(t);
    expect(report.events).toHaveLength(1);
    expect(report.events[0].behavior).toBe("SECOND_PERSON");
    expect(report.events[0].duration).toBeCloseTo(4.0, 1);
    expect(report.events[0].penalty).toBe(35);
    expect(report.integrity?.rank).toBe("LOW");
  });

  it("Edge Case 7: switching question mid-episode commits episode to previous question", () => {
    const m = new GazeSessionStateMachine();
    m.setContext({ questionIndex: 1, questionText: "Q1" }, 0);
    let t = 0;
    t = feedTicks(m, { kind: "STRAIGHT" }, 10.0, t);
    t = feedTicks(m, { kind: "NO_FACE" }, 3.0, t); // 3s * 2.5 = 7.5 on Q1
    // Switch directly to Q2 without returning to STRAIGHT first
    m.setContext({ questionIndex: 2, questionText: "Q2" }, t);
    t = feedTicks(m, { kind: "STRAIGHT" }, 15.0, t);

    const report = m.finalize(t);
    expect(report.integrity?.totalQuestionsScored).toBe(2);
    expect(report.integrity?.questions[0].questionIndex).toBe(1);
    expect(report.integrity?.questions[0].pEvents).toBeCloseTo(7.5, 1);
    expect(report.integrity?.questions[0].score).toBeCloseTo(92.5, 1);
    expect(report.integrity?.questions[1].score).toBe(100);
    // Session average = (92.5 + 100) / 2 = 96.3 (rounded 1 decimal)
    expect(report.integrity?.overallScore).toBeCloseTo(96.3, 1);
  });

  it("Edge Case 8: camera turned off / tab hidden mid-session records NO_FACE without wiping prior questions", () => {
    const m = new GazeSessionStateMachine();
    m.setContext({ questionIndex: 1 }, 0);
    let t = 0;
    t = feedTicks(m, { kind: "STRAIGHT" }, 15.0, t);
    // Candidate turns off camera or switches tab for 4 seconds
    t += 4.0;
    m.recordOffScreenSpan(4.0, t);
    t = feedTicks(m, { kind: "STRAIGHT" }, 15.0, t);

    const report = m.finalize(t);
    expect(report.events).toHaveLength(1);
    expect(report.events[0].behavior).toBe("NO_FACE");
    expect(report.events[0].duration).toBe(4.0);
    expect(report.events[0].penalty).toBe(10); // 4.0 * 2.5
    expect(report.integrity?.overallScore).toBe(90);
  });

  it("Edge Case 9: snapshot capture is strictly capped at MAX_SNAPSHOTS", () => {
    const m = new GazeSessionStateMachine();
    m.setContext({ questionIndex: 1 }, 0);
    const capture = vi.fn(() => "data:image/jpeg;base64,abc");
    let t = 0;
    for (let i = 0; i < GAZE_CONFIG.MAX_SNAPSHOTS + 5; i += 1) {
      t = feedTicks(m, { kind: "LOOK_AWAY", direction: "NHIN TRAI" }, 2.2, t, 0.1, capture);
      t = feedTicks(m, { kind: "STRAIGHT" }, 1.0, t, 0.1, capture);
    }
    const report = m.finalize(t);
    expect(capture).toHaveBeenCalledTimes(GAZE_CONFIG.MAX_SNAPSHOTS);
    expect(report.events.filter((e) => Boolean(e.snapshotUrl))).toHaveLength(
      GAZE_CONFIG.MAX_SNAPSHOTS,
    );
  });

  it("Edge Case 10: symmetric normalized Head Yaw gives exact opposite magnitudes for left vs right turn", () => {
    const makeFace = (noseX: number, noseY: number): Point[] => {
      const pts: Point[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
      pts[10] = { x: 0.5, y: 0.3 }; // forehead
      pts[152] = { x: 0.5, y: 0.7 }; // chin
      pts[234] = { x: 0.3, y: 0.5 }; // right cheek
      pts[454] = { x: 0.7, y: 0.5 }; // left cheek
      pts[1] = { x: noseX, y: noseY }; // nose
      return pts;
    };

    const center = calculateHeadPose(makeFace(0.5, 0.5));
    const turnedLeft = calculateHeadPose(makeFace(0.6, 0.5));
    const turnedRight = calculateHeadPose(makeFace(0.4, 0.5));

    expect(center.yaw).toBeCloseTo(0, 5);
    expect(center.pitch).toBeCloseTo(0, 5);
    expect(turnedLeft.yaw).toBeCloseTo(-turnedRight.yaw, 5);
    expect(Math.abs(turnedLeft.yaw)).toBeGreaterThan(GAZE_CONFIG.YAW_THRESHOLD);
  });

  it("Edge Case 11: never fabricates fake percentages or events when camera captured 0 face frames", () => {
    const result = buildGazeReportFromCounters({
      totalFrames: 0,
      faceFrames: 0,
      straightFrames: 0,
      awayFrames: 0,
      leftFrames: 0,
      rightFrames: 0,
      noFaceFrames: 0,
      elapsedSec: 45,
      events: [],
    });

    expect(result.camera_active).toBe(false);
    expect(result.face_presence_pct).toBe(0);
    expect(result.looking_straight_pct).toBe(0);
    expect(result.not_detected_pct).toBe(100);
    expect(result.events).toEqual([]);
    expect(result.integrity).toBeNull();
  });

  it("Edge Case 12: maps persisted DB gaze report with integrity summary cleanly", () => {
    const mapped = persistedGazeToReportResult({
      session_id: "s-1",
      total_frames: 200,
      face_frames: 180,
      duration_sec: 60,
      camera_active: true,
      face_presence_pct: 90,
      gaze_center_pct: 82,
      gaze_left_pct: 5,
      gaze_right_pct: 3,
      gaze_away_pct: 8,
      gaze_events: [
        { timestamp: "00:15", direction: "NHIN TRAI", duration: 2.5, penalty: 3.8 },
      ],
      gaze_timeline: [],
      integrity_score: 85.8,
      integrity_rank: "HIGH",
      integrity_summary: {
        rubricVersion: "video-integrity-rubric-v1",
        overallScore: 85.8,
        rank: "HIGH",
        hasSecondPerson: false,
        totalQuestionsScored: 1,
        totalViolations: 1,
        totalPEvents: 9.5,
        totalPFocus: 4.7,
        questions: [],
        disclaimer: "Note",
      },
    });

    expect(mapped.camera_active).toBe(true);
    expect(mapped.integrity?.overallScore).toBe(85.8);
    expect(mapped.integrity?.rank).toBe("HIGH");
    expect(mapped.events).toHaveLength(1);
    expect(mapped.events[0].penalty).toBe(3.8);
  });
});

describe("VOR Head+Eye Compensation (4 rotated-head cases) & Phase A reading exemption", () => {
  it("Case 1 & 3: turning head LEFT or RIGHT (~25-35 deg) while counter-rotating eyes onto screen stays NHIN THANG", () => {
    // Photo 1: head turned left (+0.48 yaw2D ≈ 30°), eyes rotated right (-0.36 blendX / -0.09 irisH)
    const turnLeftLookScreen = computeCompensatedWorldGaze({
      deltaYaw: 0.48,
      deltaPitch: 0,
      deltaIrisH: -0.09,
      deltaIrisV: 0,
      deltaBlendX: -0.36,
      deltaBlendY: 0,
    });
    expect(turnLeftLookScreen.direction).toBe("NHIN THANG");
    expect(turnLeftLookScreen.compensated).toBe(true);

    // Photo 3: head turned right (-0.48 yaw2D ≈ 30°), eyes rotated left (+0.36 blendX / +0.09 irisH)
    const turnRightLookScreen = computeCompensatedWorldGaze({
      deltaYaw: -0.48,
      deltaPitch: 0,
      deltaIrisH: 0.09,
      deltaIrisV: 0,
      deltaBlendX: 0.36,
      deltaBlendY: 0,
    });
    expect(turnRightLookScreen.direction).toBe("NHIN THANG");
    expect(turnRightLookScreen.compensated).toBe(true);
  });

  it("Case 2 & 4: tilting head UP or DOWN while counter-rotating eyes onto screen stays NHIN THANG", () => {
    // Photo 2: head tilted UP (-0.26 pitch), eyes looking DOWN (+0.36 blendY / +0.06 irisV)
    const tiltUpLookScreen = computeCompensatedWorldGaze({
      deltaYaw: 0,
      deltaPitch: -0.26,
      deltaIrisH: 0,
      deltaIrisV: 0.06,
      deltaBlendX: 0,
      deltaBlendY: 0.36,
    });
    expect(tiltUpLookScreen.direction).toBe("NHIN THANG");
    expect(tiltUpLookScreen.compensated).toBe(true);

    // Photo 4: head tilted DOWN (+0.26 pitch), eyes looking UP (-0.36 blendY / -0.06 irisV)
    const tiltDownLookScreen = computeCompensatedWorldGaze({
      deltaYaw: 0,
      deltaPitch: 0.26,
      deltaIrisH: 0,
      deltaIrisV: -0.06,
      deltaBlendX: 0,
      deltaBlendY: -0.36,
    });
    expect(tiltDownLookScreen.direction).toBe("NHIN THANG");
    expect(tiltDownLookScreen.compensated).toBe(true);
  });

  it("still detects REAL cheating: 2nd monitor (head+eye same side), phone in lap (head+eye down), and pure side-eye", () => {
    const secondMonitor = computeCompensatedWorldGaze({
      deltaYaw: 0.32,
      deltaPitch: 0,
      deltaIrisH: 0.07,
      deltaIrisV: 0,
      deltaBlendX: 0.28,
      deltaBlendY: 0,
    });
    expect(secondMonitor.direction).toBe("NHIN TRAI");

    const phoneInLap = computeCompensatedWorldGaze({
      deltaYaw: 0,
      deltaPitch: 0.22,
      deltaIrisH: 0,
      deltaIrisV: 0.05,
      deltaBlendX: 0,
      deltaBlendY: 0.28,
    });
    expect(phoneInLap.direction).toBe("NHIN XUONG");

    const secretSideEye = computeCompensatedWorldGaze({
      deltaYaw: 0,
      deltaPitch: 0,
      deltaIrisH: -0.11,
      deltaIrisV: 0,
      deltaBlendX: -0.45,
      deltaBlendY: 0,
    });
    expect(secretSideEye.direction).toBe("NHIN PHAI");
  });

  it("Lớp A: reading phase exempts horizontal glances but STILL catches 2nd person, NO_FACE, and phone (NHIN XUONG)", () => {
    const m = new GazeSessionStateMachine();
    m.setContext({ questionIndex: 1, phase: "reading" }, 0);
    let t = 0;
    // Candidate scans left/right for 4s while reading the prompt -> exempted!
    t = feedTicks(m, { kind: "LOOK_AWAY", direction: "NHIN PHAI" }, 4.0, t);
    // Candidate looks down at phone for 3s during reading -> STILL caught!
    t = feedTicks(m, { kind: "LOOK_AWAY", direction: "NHIN XUONG" }, 3.0, t);
    // Moves to answering phase -> horizontal look right 3s IS caught!
    m.setContext({ questionIndex: 1, phase: "answering" }, t);
    t = feedTicks(m, { kind: "STRAIGHT" }, 5.0, t);
    t = feedTicks(m, { kind: "LOOK_AWAY", direction: "NHIN PHAI" }, 3.0, t);
    t = feedTicks(m, { kind: "STRAIGHT" }, 5.0, t);

    const report = m.finalize(t);
    expect(report.events).toHaveLength(2);
    expect(report.events[0].direction).toBe("NHIN XUONG");
    expect(report.events[0].duration).toBeCloseTo(3.0, 1);
    expect(report.events[1].direction).toBe("NHIN PHAI");
    expect(report.events[1].duration).toBeCloseTo(3.0, 1);
  });
});
