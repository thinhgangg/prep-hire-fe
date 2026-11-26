/**
 * Client-Side Gaze Tracking & Integrity Engine v4
 *
 * Nâng cấp v4:
 * - VOR Head+Eye Vector Compensation (Bù trừ phản xạ tiền đình-mắt):
 *   Kết hợp vector góc đầu (Head Yaw/Pitch) + góc mắt (MediaPipe Blendshapes + Iris)
 *   theo phép CỘNG HƯỞNG (worldGaze = headUnit + eyeUnit) thay vì OR:
 *   + Xoay đầu trái/phải/lên/xuống nhưng mắt vẫn xoay ngược nhìn thẳng màn hình -> triệt tiêu (~0) -> NHÌN THẲNG!
 *   + Nhìn sang màn hình phụ hoặc cúi xuống điện thoại (đầu + mắt cùng hướng, hoặc liếc mạnh) -> cộng hưởng (>1.05) -> BẮT CHUẨN!
 * - Bật MediaPipe `outputFaceBlendshapes: true` để lấy `eyeLookIn/Out/Up/Down` & `eyeBlinkLeft/Right`
 *   (chính xác hơn nhiều khi ngửa đầu/cúi đầu bị che một phần tròng đen hoặc hẹp mí mắt).
 * - Lớp A (Context-Aware 3 pha):
 *   + Pha "reading" (AI đang đọc câu hỏi / 6s đầu câu mới): vẫn bắt chặt Người thứ 2, Rời khung hình, Cúi nhìn điện thoại;
 *     miễn phạt liếc ngang để đọc câu hỏi.
 *   + Pha "thinking" & "answering": chấm đầy đủ 100% Rubric (10-20 docx).
 */

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { saveSessionGazeReport, type PersistedGazeReport } from "./interviewApi";
import {
  INTEGRITY_RUBRIC,
  scoreSessionIntegrity,
  type IntegrityBehaviorType,
  type IntegrityViolationEpisode,
  type QuestionIntegrityInput,
  type SessionIntegritySummary,
} from "@/utils/integrityRubric";

export const GAZE_RESULT_STORAGE_KEY = "prephire-gaze-result";

export type GazePhase = "reading" | "thinking" | "answering";

export type GazeEvent = {
  timestamp: string;
  title: string;
  description: string;
  duration: number;
  type: "attention" | "off_screen" | "second_person";
  behavior?: IntegrityBehaviorType;
  penalty?: number;
  direction?: string;
  snapshotUrl?: string;
  questionIndex?: number;
  totalQuestions?: number;
  questionText?: string;
  stage?: string;
  activity?: string;
};

export type GazeContext = {
  sessionId?: string;
  questionIndex?: number;
  totalQuestions?: number;
  questionText?: string;
  stage?: string;
  activity?: string;
  phase?: GazePhase;
};

export type GazeReportResult = {
  camera_active: boolean;
  total_frames: number;
  face_frames: number;
  face_presence_pct: number;
  looking_straight_pct: number;
  looking_away_pct: number;
  not_detected_pct: number;
  gaze_left_pct?: number;
  gaze_right_pct?: number;
  total_duration_seconds: number;
  events: GazeEvent[];
  summary: string;
  integrity?: SessionIntegritySummary | null;
};

export type EyeBlendshapeScores = {
  eyeLookInLeft: number;
  eyeLookOutLeft: number;
  eyeLookInRight: number;
  eyeLookOutRight: number;
  eyeLookUpLeft: number;
  eyeLookUpRight: number;
  eyeLookDownLeft: number;
  eyeLookDownRight: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
};

export const GAZE_CONFIG = {
  // VOR Normalized Unit Scales (2D landmark projection scales ~0.75 * tan(theta):
  // at 25-30° head turn deltaYaw ≈ 0.45 and counter eyeBlendX ≈ -0.35 -> both ≈ 1.0 unit!)
  HEAD_YAW_SCALE: 0.46,
  HEAD_PITCH_SCALE: 0.26,
  EYE_IRIS_H_SCALE: 0.095,
  EYE_IRIS_V_SCALE: 0.062,
  EYE_BLEND_H_SCALE: 0.34,
  EYE_BLEND_V_SCALE: 0.34,

  // Combined World Gaze decision thresholds (in normalized VOR units)
  WORLD_X_THRESHOLD: 1.15,
  WORLD_Y_DOWN_THRESHOLD: 1.15,
  WORLD_Y_UP_THRESHOLD: 1.15,
  // Hard physical limit: head turned > ~50° where eyeballs physically cannot face camera
  EXTREME_HEAD_UNIT_CAP: 2.2,

  // Backwards-compatible legacy reference constants
  HORIZONTAL_THRESHOLD: 0.095,
  VERTICAL_DOWN_THRESHOLD: 0.062,
  VERTICAL_UP_THRESHOLD: 0.055,
  PITCH_DOWN_THRESHOLD: 0.26,
  PITCH_UP_THRESHOLD: -0.26,
  YAW_THRESHOLD: 0.46,

  // Calibration & smoothing
  CALIBRATION_FRAMES: 15, // ~1.5s at 10 FPS
  SMOOTHING_WINDOW: 4, // ~0.4s at 10 FPS
  EAR_THRESHOLD: 0.16,
  BLINK_BLENDSHAPE_THRESHOLD: 0.62,

  // Edge-case guards
  BLINK_GRACE_SEC: 0.35,
  RECOVERY_GRACE_SEC: 0.2,
  DETECT_INTERVAL_MS: 100, // ~10 FPS throttle
  MAX_FRAME_DT_SEC: 0.5,
  MAX_SNAPSHOTS: 12,

  LEFT_EYE: {
    left_corner: 33,
    right_corner: 133,
    top_1: 159,
    bottom_1: 145,
    top_2: 160,
    bottom_2: 144,
    top_3: 158,
    bottom_3: 153,
    iris: [468, 469, 470, 471, 472],
  },

  RIGHT_EYE: {
    left_corner: 362,
    right_corner: 263,
    top_1: 386,
    bottom_1: 374,
    top_2: 387,
    bottom_2: 373,
    top_3: 385,
    bottom_3: 380,
    iris: [473, 474, 475, 476, 477],
  },
};

export type Point = { x: number; y: number; z?: number };

export function dist(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function meanPoint(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function calculateEar(
  landmarks: Point[],
  eye: typeof GAZE_CONFIG.LEFT_EYE,
): number {
  const leftCorner = landmarks[eye.left_corner];
  const rightCorner = landmarks[eye.right_corner];
  if (!leftCorner || !rightCorner) return 0.25;
  const horizontal = dist(leftCorner, rightCorner);
  if (horizontal < 0.001) return 0.0;

  const v1 = dist(landmarks[eye.top_1], landmarks[eye.bottom_1]);
  const v2 = dist(landmarks[eye.top_2], landmarks[eye.bottom_2]);
  const v3 = dist(landmarks[eye.top_3], landmarks[eye.bottom_3]);
  const vertical = (v1 + v2 + v3) / 3.0;

  return vertical / horizontal;
}

/**
 * Symmetric normalized Head Pitch & Head Yaw in [-1, 1]:
 * - pitch > 0: đầu cúi xuống; pitch < 0: đầu ngửa lên
 * - yaw   > 0: đầu quay sang trái màn hình gương (trái của người dùng)
 * - yaw   < 0: đầu quay sang phải màn hình gương (phải của người dùng)
 */
export function calculateHeadPose(landmarks: Point[]): {
  pitch: number;
  yaw: number;
} {
  const forehead = landmarks[10];
  const nose = landmarks[1];
  const chin = landmarks[152];
  const rightCheek = landmarks[234];
  const leftCheek = landmarks[454];

  const upperDist = Math.abs(forehead.y - nose.y);
  const lowerDist = Math.abs(chin.y - nose.y);
  const vDenom = Math.max(upperDist + lowerDist, 0.001);
  const pitch = (upperDist - lowerDist) / vDenom;

  const distToRightCheek = Math.abs(nose.x - rightCheek.x);
  const distToLeftCheek = Math.abs(leftCheek.x - nose.x);
  const hDenom = Math.max(distToRightCheek + distToLeftCheek, 0.001);
  const yaw = (distToRightCheek - distToLeftCheek) / hDenom;

  return { pitch, yaw };
}

export function calculateEyeGaze(
  landmarks: Point[],
  eye: typeof GAZE_CONFIG.LEFT_EYE,
): { h: number; v: number } | null {
  const leftCorner = landmarks[eye.left_corner];
  const rightCorner = landmarks[eye.right_corner];
  if (!leftCorner || !rightCorner) return null;
  const eyeWidth = dist(leftCorner, rightCorner);
  if (eyeWidth < 0.001) return null;

  const irisPoints = eye.iris.map((idx) => landmarks[idx]).filter(Boolean);
  if (irisPoints.length === 0) return null;
  const irisCenter = meanPoint(irisPoints);

  const rawH =
    (irisCenter.x - leftCorner.x) /
    Math.max(Math.abs(rightCorner.x - leftCorner.x), 0.001);
  const horizontalRatio = Math.min(1.2, Math.max(-0.2, rawH));

  const cornerCenterY = (leftCorner.y + rightCorner.y) / 2.0;
  const verticalRatio = (irisCenter.y - cornerCenterY) / eyeWidth;

  return { h: horizontalRatio, v: verticalRatio };
}

export function extractEyeBlendshapes(
  categories?: { categoryName: string; score: number }[] | null,
): EyeBlendshapeScores | null {
  if (!categories || categories.length === 0) return null;
  const map = new Map<string, number>();
  for (const c of categories) {
    map.set(c.categoryName, c.score);
  }
  if (!map.has("eyeLookInLeft") && !map.has("eyeLookDownLeft")) {
    return null;
  }
  return {
    eyeLookInLeft: map.get("eyeLookInLeft") ?? 0,
    eyeLookOutLeft: map.get("eyeLookOutLeft") ?? 0,
    eyeLookInRight: map.get("eyeLookInRight") ?? 0,
    eyeLookOutRight: map.get("eyeLookOutRight") ?? 0,
    eyeLookUpLeft: map.get("eyeLookUpLeft") ?? 0,
    eyeLookUpRight: map.get("eyeLookUpRight") ?? 0,
    eyeLookDownLeft: map.get("eyeLookDownLeft") ?? 0,
    eyeLookDownRight: map.get("eyeLookDownRight") ?? 0,
    eyeBlinkLeft: map.get("eyeBlinkLeft") ?? 0,
    eyeBlinkRight: map.get("eyeBlinkRight") ?? 0,
  };
}

export type CompensatedGazeOutput = {
  direction:
    | "NHIN THANG"
    | "NHIN TRAI"
    | "NHIN PHAI"
    | "NHIN LEN"
    | "NHIN XUONG";
  worldX: number;
  worldY: number;
  headUnitX: number;
  headUnitY: number;
  eyeUnitX: number;
  eyeUnitY: number;
  compensated: boolean;
};

/**
 * Pure VOR (Vestibulo-Ocular Reflex) World Gaze Estimator.
 *
 * Khi ứng viên xoay đầu theo 1 hướng (VD: headUnitX = +1.1) nhưng mắt xoay ngược lại
 * để nhìn thẳng vào màn hình (eyeUnitX = -1.0):
 *   worldX = (+1.1) + (-1.0) = +0.10 -> |worldX| < 1.05 -> NHIN THANG!
 *
 * Khi ứng viên nhìn sang màn hình phụ hoặc điện thoại (đầu + mắt cùng hướng, hoặc liếc mạnh):
 *   worldX = (+0.8) + (+0.7) = +1.50 -> |worldX| >= 1.05 -> NHIN TRAI!
 */
export function computeCompensatedWorldGaze(input: {
  deltaYaw: number;
  deltaPitch: number;
  deltaIrisH: number;
  deltaIrisV: number;
  deltaBlendX?: number | null;
  deltaBlendY?: number | null;
}): CompensatedGazeOutput {
  const headUnitX = input.deltaYaw / GAZE_CONFIG.HEAD_YAW_SCALE;
  const headUnitY = input.deltaPitch / GAZE_CONFIG.HEAD_PITCH_SCALE;

  const irisUnitX = input.deltaIrisH / GAZE_CONFIG.EYE_IRIS_H_SCALE;
  const irisUnitY = input.deltaIrisV / GAZE_CONFIG.EYE_IRIS_V_SCALE;

  const hasBlendX =
    input.deltaBlendX !== undefined && input.deltaBlendX !== null;
  const hasBlendY =
    input.deltaBlendY !== undefined && input.deltaBlendY !== null;

  const eyeUnitX = hasBlendX
    ? 0.65 * (input.deltaBlendX! / GAZE_CONFIG.EYE_BLEND_H_SCALE) +
      0.35 * irisUnitX
    : irisUnitX;

  const eyeUnitY = hasBlendY
    ? 0.7 * (input.deltaBlendY! / GAZE_CONFIG.EYE_BLEND_V_SCALE) +
      0.3 * irisUnitY
    : irisUnitY;

  const worldX = headUnitX + eyeUnitX;
  const worldY = headUnitY + eyeUnitY;

  const isCompensatingX =
    headUnitX * eyeUnitX < -0.15 && Math.abs(worldX) < GAZE_CONFIG.WORLD_X_THRESHOLD;
  const isCompensatingY =
    headUnitY * eyeUnitY < -0.15 &&
    worldY < GAZE_CONFIG.WORLD_Y_DOWN_THRESHOLD &&
    worldY > -GAZE_CONFIG.WORLD_Y_UP_THRESHOLD;

  // Hard physical cap: if head is turned extremely far (~>48°), flag even if iris is noisy
  const extremeLeft = headUnitX > GAZE_CONFIG.EXTREME_HEAD_UNIT_CAP;
  const extremeRight = headUnitX < -GAZE_CONFIG.EXTREME_HEAD_UNIT_CAP;
  const extremeDown = headUnitY > GAZE_CONFIG.EXTREME_HEAD_UNIT_CAP;
  const extremeUp = headUnitY < -GAZE_CONFIG.EXTREME_HEAD_UNIT_CAP;

  const isDown = worldY >= GAZE_CONFIG.WORLD_Y_DOWN_THRESHOLD || extremeDown;
  const isUp = worldY <= -GAZE_CONFIG.WORLD_Y_UP_THRESHOLD || extremeUp;
  const isLeft = worldX >= GAZE_CONFIG.WORLD_X_THRESHOLD || extremeLeft;
  const isRight = worldX <= -GAZE_CONFIG.WORLD_X_THRESHOLD || extremeRight;

  let direction: CompensatedGazeOutput["direction"] = "NHIN THANG";

  if (isDown || isUp || isLeft || isRight) {
    const absX = Math.max(Math.abs(worldX), extremeLeft || extremeRight ? Math.abs(headUnitX) : 0);
    const absY = Math.max(Math.abs(worldY), extremeDown || extremeUp ? Math.abs(headUnitY) : 0);

    if (isDown && absY >= absX * 0.85) {
      direction = "NHIN XUONG";
    } else if (isLeft && (!isRight || worldX >= 0) && absX >= absY) {
      direction = "NHIN TRAI";
    } else if (isRight && absX >= absY) {
      direction = "NHIN PHAI";
    } else if (isDown) {
      direction = "NHIN XUONG";
    } else if (isUp) {
      direction = "NHIN LEN";
    } else if (isLeft) {
      direction = "NHIN TRAI";
    } else if (isRight) {
      direction = "NHIN PHAI";
    }
  }

  return {
    direction,
    worldX: Math.round(worldX * 100) / 100,
    worldY: Math.round(worldY * 100) / 100,
    headUnitX: Math.round(headUnitX * 100) / 100,
    headUnitY: Math.round(headUnitY * 100) / 100,
    eyeUnitX: Math.round(eyeUnitX * 100) / 100,
    eyeUnitY: Math.round(eyeUnitY * 100) / 100,
    compensated: isCompensatingX || isCompensatingY,
  };
}

function captureVideoFrame(videoElement: HTMLVideoElement): string {
  try {
    const canvas = document.createElement("canvas");
    const width = 360;
    const height =
      Math.round(
        (videoElement.videoHeight / (videoElement.videoWidth || 1)) * width,
      ) || 270;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", 0.55);
    }
  } catch {}
  return "";
}

function formatSec(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function directionToBehavior(
  direction: string,
): IntegrityBehaviorType | null {
  if (direction === "SECOND_PERSON") return "SECOND_PERSON";
  if (direction === "NO_FACE") return "NO_FACE";
  if (direction === "NHIN LEN") return "LOOK_UP";
  if (
    direction === "NHIN TRAI" ||
    direction === "NHIN PHAI" ||
    direction === "NHIN XUONG"
  ) {
    return "SIDE_OR_DOWN";
  }
  return null;
}

function describeEpisode(ep: IntegrityViolationEpisode): {
  title: string;
  description: string;
  type: GazeEvent["type"];
} {
  const dur = ep.durationSec.toFixed(1);
  if (ep.behavior === "SECOND_PERSON") {
    return {
      title: "Phát hiện người thứ hai",
      description: `Phát hiện từ 2 khuôn mặt trong khung hình liên tục ${dur} giây`,
      type: "second_person",
    };
  }
  if (ep.behavior === "NO_FACE") {
    return {
      title: "Rời khỏi khung hình",
      description: `Không nhận diện khuôn mặt (rời khung hình / che camera) trong ${dur} giây`,
      type: "off_screen",
    };
  }
  if (ep.behavior === "LOOK_UP") {
    return {
      title: "Nhìn lên trên kéo dài",
      description: `Ứng viên nhìn lên trên liên tục ${dur} giây`,
      type: "attention",
    };
  }
  const dirLabel =
    ep.direction === "NHIN TRAI"
      ? "sang trái"
      : ep.direction === "NHIN PHAI"
        ? "sang phải"
        : "xuống dưới";
  return {
    title: "Nhìn lệch hướng (màn hình phụ / điện thoại)",
    description: `Ứng viên nhìn ${dirLabel} liên tục ${dur} giây`,
    type: "attention",
  };
}

export type FrameClassification =
  | { kind: "CALIBRATING" }
  | { kind: "STRAIGHT" }
  | { kind: "BLINK" }
  | {
      kind: "LOOK_AWAY";
      direction: "NHIN TRAI" | "NHIN PHAI" | "NHIN LEN" | "NHIN XUONG";
    }
  | { kind: "NO_FACE" }
  | { kind: "SECOND_PERSON" };

type ActiveEpisode = {
  behavior: IntegrityBehaviorType;
  direction: string;
  startSec: number;
  lastSeenSec: number;
  durationSec: number;
  questionIndex: number;
  questionText?: string;
  stage?: string;
  activity?: string;
  snapshotCaptured: boolean;
  snapshotUrl?: string;
};

type QuestionBucket = {
  questionIndex: number;
  questionText?: string;
  totalDurationSec: number;
  straightDurationSec: number;
  episodes: IntegrityViolationEpisode[];
};

const SNAPSHOT_PRIORITY: Record<IntegrityBehaviorType, number> = {
  SECOND_PERSON: 4,
  NO_FACE: 3,
  SIDE_OR_DOWN: 2,
  LOOK_UP: 1,
};

export class GazeSessionStateMachine {
  public totalFrames = 0;
  public faceFrames = 0;
  public totalTrackedSec = 0;
  public faceDurationSec = 0;
  public straightDurationSec = 0;
  public awayDurationSec = 0;
  public leftDurationSec = 0;
  public rightDurationSec = 0;
  public noFaceDurationSec = 0;

  private lastTimestampSec: number | null = null;
  private activeEpisode: ActiveEpisode | null = null;
  private blinkStartSec: number | null = null;
  private recoveryStartSec: number | null = null;
  private currentContext: GazeContext = { questionIndex: 1, phase: "thinking" };
  private buckets = new Map<number, QuestionBucket>();
  private snapshotCount = 0;

  public reset(): void {
    this.totalFrames = 0;
    this.faceFrames = 0;
    this.totalTrackedSec = 0;
    this.faceDurationSec = 0;
    this.straightDurationSec = 0;
    this.awayDurationSec = 0;
    this.leftDurationSec = 0;
    this.rightDurationSec = 0;
    this.noFaceDurationSec = 0;
    this.lastTimestampSec = null;
    this.activeEpisode = null;
    this.blinkStartSec = null;
    this.recoveryStartSec = null;
    this.buckets.clear();
    this.snapshotCount = 0;
  }

  public getPhase(): GazePhase {
    return this.currentContext.phase || "thinking";
  }

  public setContext(ctx: Partial<GazeContext>, nowSec?: number): void {
    const prevQ = this.currentContext.questionIndex || 1;
    const nextQ = ctx.questionIndex ?? prevQ;
    if (nextQ !== prevQ && this.activeEpisode) {
      this.commitActiveEpisode(nowSec ?? this.activeEpisode.lastSeenSec);
    }
    this.currentContext = {
      ...this.currentContext,
      ...ctx,
      questionIndex: nextQ,
    };
    const bucket = this.getOrCreateBucket(nextQ);
    if (ctx.questionText) bucket.questionText = ctx.questionText;
  }

  private getOrCreateBucket(questionIndex: number): QuestionBucket {
    let bucket = this.buckets.get(questionIndex);
    if (!bucket) {
      bucket = {
        questionIndex,
        questionText: this.currentContext.questionText,
        totalDurationSec: 0,
        straightDurationSec: 0,
        episodes: [],
      };
      this.buckets.set(questionIndex, bucket);
    }
    return bucket;
  }

  /**
   * Process a classified frame. Returns whether a horizontal glance was exempted due to "reading" phase.
   */
  public step(
    obs: FrameClassification,
    nowSec: number,
    captureSnapshot?: () => string,
  ): { readingExempted: boolean } {
    this.totalFrames += 1;

    const rawDt =
      this.lastTimestampSec === null
        ? GAZE_CONFIG.DETECT_INTERVAL_MS / 1000
        : Math.max(0, nowSec - this.lastTimestampSec);
    this.lastTimestampSec = nowSec;
    const dt = Math.min(rawDt, GAZE_CONFIG.MAX_FRAME_DT_SEC);

    const qIdx = this.currentContext.questionIndex || 1;
    const bucket = this.getOrCreateBucket(qIdx);

    if (obs.kind === "CALIBRATING") {
      this.faceFrames += 1;
      return { readingExempted: false };
    }

    // Lớp A — Phase "reading": exempt horizontal eye scan while reading the question prompt,
    // while STILL strictly enforcing SECOND_PERSON, NO_FACE, and NHIN XUONG (phone).
    if (
      this.currentContext.phase === "reading" &&
      obs.kind === "LOOK_AWAY" &&
      (obs.direction === "NHIN TRAI" || obs.direction === "NHIN PHAI")
    ) {
      this.blinkStartSec = null;
      this.faceFrames += 1;
      this.totalTrackedSec += dt;
      this.faceDurationSec += dt;
      this.straightDurationSec += dt;
      bucket.totalDurationSec += dt;
      bucket.straightDurationSec += dt;
      if (this.activeEpisode && this.activeEpisode.behavior === "SIDE_OR_DOWN") {
        this.commitActiveEpisode(nowSec);
      }
      return { readingExempted: true };
    }

    if (obs.kind === "BLINK") {
      this.faceFrames += 1;
      this.totalTrackedSec += dt;
      this.faceDurationSec += dt;
      bucket.totalDurationSec += dt;

      if (this.blinkStartSec === null) {
        this.blinkStartSec = nowSec;
      }
      const blinkElapsed = nowSec - this.blinkStartSec;
      if (this.activeEpisode && blinkElapsed <= GAZE_CONFIG.BLINK_GRACE_SEC) {
        this.activeEpisode.durationSec += dt;
        this.activeEpisode.lastSeenSec = nowSec;
        return { readingExempted: false };
      }
      this.commitActiveEpisode(nowSec);
      this.straightDurationSec += dt;
      bucket.straightDurationSec += dt;
      return { readingExempted: false };
    }

    this.blinkStartSec = null;
    this.totalTrackedSec += dt;
    bucket.totalDurationSec += dt;

    if (obs.kind === "STRAIGHT") {
      this.faceFrames += 1;
      this.faceDurationSec += dt;
      this.straightDurationSec += dt;
      bucket.straightDurationSec += dt;

      if (this.activeEpisode) {
        if (this.recoveryStartSec === null) {
          this.recoveryStartSec = nowSec;
        }
        if (nowSec - this.recoveryStartSec >= GAZE_CONFIG.RECOVERY_GRACE_SEC) {
          this.commitActiveEpisode(this.recoveryStartSec);
          this.recoveryStartSec = null;
        }
      }
      return { readingExempted: false };
    }

    this.recoveryStartSec = null;
    let behavior: IntegrityBehaviorType;
    let direction: string;

    if (obs.kind === "SECOND_PERSON") {
      this.faceFrames += 1;
      this.faceDurationSec += dt;
      behavior = "SECOND_PERSON";
      direction = "SECOND_PERSON";
    } else if (obs.kind === "NO_FACE") {
      this.noFaceDurationSec += dt;
      behavior = "NO_FACE";
      direction = "NO_FACE";
    } else {
      this.faceFrames += 1;
      this.faceDurationSec += dt;
      this.awayDurationSec += dt;
      if (obs.direction === "NHIN TRAI") this.leftDurationSec += dt;
      if (obs.direction === "NHIN PHAI") this.rightDurationSec += dt;
      direction = obs.direction;
      behavior = obs.direction === "NHIN LEN" ? "LOOK_UP" : "SIDE_OR_DOWN";
    }

    if (this.activeEpisode && this.activeEpisode.behavior === behavior) {
      this.activeEpisode.durationSec += dt;
      this.activeEpisode.lastSeenSec = nowSec;
      this.activeEpisode.direction = direction;
    } else {
      if (this.activeEpisode) {
        this.commitActiveEpisode(nowSec);
      }
      this.activeEpisode = {
        behavior,
        direction,
        startSec: Math.max(0, nowSec - dt),
        lastSeenSec: nowSec,
        durationSec: dt,
        questionIndex: qIdx,
        questionText: this.currentContext.questionText,
        stage: this.currentContext.stage,
        activity: this.currentContext.activity,
        snapshotCaptured: false,
      };
    }

    const rule = INTEGRITY_RUBRIC.BEHAVIORS[behavior];
    if (
      this.activeEpisode &&
      !this.activeEpisode.snapshotCaptured &&
      this.activeEpisode.durationSec >= rule.thresholdSec &&
      captureSnapshot
    ) {
      this.activeEpisode.snapshotCaptured = true;
      if (this.snapshotCount < GAZE_CONFIG.MAX_SNAPSHOTS) {
        const snap = captureSnapshot();
        if (snap) {
          this.activeEpisode.snapshotUrl = snap;
          this.snapshotCount += 1;
        }
      }
    }

    return { readingExempted: false };
  }

  public recordOffScreenSpan(durationSec: number, endSec: number): void {
    if (durationSec <= 0) return;
    if (this.activeEpisode && this.activeEpisode.behavior !== "NO_FACE") {
      this.commitActiveEpisode(Math.max(0, endSec - durationSec));
    }
    const qIdx = this.currentContext.questionIndex || 1;
    const bucket = this.getOrCreateBucket(qIdx);
    this.totalTrackedSec += durationSec;
    this.noFaceDurationSec += durationSec;
    bucket.totalDurationSec += durationSec;

    if (this.activeEpisode && this.activeEpisode.behavior === "NO_FACE") {
      this.activeEpisode.durationSec += durationSec;
      this.activeEpisode.lastSeenSec = endSec;
    } else {
      bucket.episodes.push({
        behavior: "NO_FACE",
        startSec: Math.max(0, endSec - durationSec),
        endSec,
        durationSec,
        timestamp: formatSec(Math.max(0, endSec - durationSec)),
        direction: "NO_FACE",
        questionIndex: qIdx,
        questionText: this.currentContext.questionText,
        stage: this.currentContext.stage,
        activity: this.currentContext.activity,
      });
    }
    this.lastTimestampSec = endSec;
  }

  public commitActiveEpisode(endSec: number): void {
    if (!this.activeEpisode) return;
    const ep = this.activeEpisode;
    this.activeEpisode = null;

    const rule = INTEGRITY_RUBRIC.BEHAVIORS[ep.behavior];
    if (ep.durationSec >= rule.thresholdSec) {
      const bucket = this.getOrCreateBucket(ep.questionIndex);
      bucket.episodes.push({
        behavior: ep.behavior,
        startSec: ep.startSec,
        endSec: Math.max(endSec, ep.lastSeenSec),
        durationSec: ep.durationSec,
        timestamp: formatSec(ep.startSec),
        direction: ep.direction,
        questionIndex: ep.questionIndex,
        questionText: ep.questionText,
        stage: ep.stage,
        activity: ep.activity,
        snapshotUrl: ep.snapshotUrl,
      });
    }
  }

  public finalize(endSec: number): GazeReportResult {
    this.commitActiveEpisode(endSec);

    if (this.faceFrames <= 0 || this.totalTrackedSec <= 0) {
      return {
        camera_active: false,
        total_frames: this.totalFrames,
        face_frames: 0,
        face_presence_pct: 0,
        looking_straight_pct: 0,
        looking_away_pct: 0,
        not_detected_pct: 100,
        gaze_left_pct: 0,
        gaze_right_pct: 0,
        total_duration_seconds: Math.max(0, Math.round(endSec * 10) / 10),
        events: [],
        summary: "Không có dữ liệu camera trong phiên phỏng vấn này.",
        integrity: null,
      };
    }

    const totalSec = Math.max(this.totalTrackedSec, 0.001);
    const presencePct =
      Math.round(Math.min(100, (this.faceDurationSec / totalSec) * 100) * 10) /
      10;
    const straightPct =
      Math.round(
        Math.min(100, (this.straightDurationSec / totalSec) * 100) * 10,
      ) / 10;
    const awayPct =
      Math.round(Math.min(100, (this.awayDurationSec / totalSec) * 100) * 10) /
      10;
    const leftPct =
      Math.round(Math.min(100, (this.leftDurationSec / totalSec) * 100) * 10) /
      10;
    const rightPct =
      Math.round(Math.min(100, (this.rightDurationSec / totalSec) * 100) * 10) /
      10;
    const notDetectedPct =
      Math.round(
        Math.min(100, (this.noFaceDurationSec / totalSec) * 100) * 10,
      ) / 10;

    const questionInputs: QuestionIntegrityInput[] = Array.from(
      this.buckets.values(),
    ).map((b) => ({
      questionIndex: b.questionIndex,
      questionText: b.questionText,
      totalDurationSec: b.totalDurationSec,
      straightDurationSec: b.straightDurationSec,
      episodes: b.episodes,
    }));

    const integrity = scoreSessionIntegrity(questionInputs);

    const allViolations = integrity.questions
      .flatMap((q) => q.violations)
      .sort((a, b) => a.startSec - b.startSec);

    const snapshotSorted = [...allViolations]
      .filter((v) => Boolean(v.snapshotUrl))
      .sort(
        (a, b) =>
          (SNAPSHOT_PRIORITY[b.behavior] || 0) -
          (SNAPSHOT_PRIORITY[a.behavior] || 0),
      );
    const keptSnapshots = new Set(
      snapshotSorted.slice(0, GAZE_CONFIG.MAX_SNAPSHOTS),
    );

    const events: GazeEvent[] = allViolations.map((v) => {
      const meta = describeEpisode(v);
      return {
        timestamp: v.timestamp,
        title: meta.title,
        description: meta.description,
        duration: v.durationSec,
        type: meta.type,
        behavior: v.behavior,
        penalty: v.penalty,
        direction: v.direction,
        snapshotUrl: keptSnapshots.has(v) ? v.snapshotUrl : undefined,
        questionIndex: v.questionIndex,
        questionText: v.questionText,
        stage: v.stage,
        activity: v.activity,
      };
    });

    return {
      camera_active: true,
      total_frames: this.totalFrames,
      face_frames: this.faceFrames,
      face_presence_pct: presencePct,
      looking_straight_pct: straightPct,
      looking_away_pct: awayPct,
      not_detected_pct: notDetectedPct,
      gaze_left_pct: leftPct,
      gaze_right_pct: rightPct,
      total_duration_seconds: Math.round(totalSec * 10) / 10,
      events,
      summary: `Độ trung thực: ${integrity.overallScore}/100 (${integrity.rank}) · Hiện diện ${presencePct}%, nhìn thẳng ${straightPct}%, nhìn lệch ${awayPct}%`,
      integrity,
    };
  }
}

export function persistedGazeToReportResult(
  raw: PersistedGazeReport,
): GazeReportResult {
  const cameraActive = Boolean(raw.camera_active && raw.face_frames > 0);
  const presencePct = cameraActive ? Number(raw.face_presence_pct ?? 0) : 0;
  const straightPct = cameraActive ? Number(raw.gaze_center_pct ?? 0) : 0;
  const awayPct = cameraActive ? Number(raw.gaze_away_pct ?? 0) : 0;
  const notDetectedPct = cameraActive
    ? Math.max(0, Math.round((100 - presencePct) * 10) / 10)
    : 100;

  let integrity: SessionIntegritySummary | null =
    (raw as any).integrity_summary ?? null;
  if (!integrity && Array.isArray(raw.gaze_timeline)) {
    const metaEntry = raw.gaze_timeline.find(
      (item: any) => item && item._type === "integrity_summary" && item.summary,
    );
    if (metaEntry && typeof (metaEntry as any).summary === "object") {
      integrity = (metaEntry as any).summary as SessionIntegritySummary;
    }
  }

  const events: GazeEvent[] = (raw.gaze_events || []).map((ev) => {
    const dir = ev.direction || "AWAY";
    const isSecond = dir === "SECOND_PERSON";
    const isOff = dir === "NO_FACE" || dir === "off_screen";
    const behavior =
      directionToBehavior(dir) ||
      (isSecond ? "SECOND_PERSON" : isOff ? "NO_FACE" : "SIDE_OR_DOWN");
    const desc = describeEpisode({
      behavior,
      startSec: 0,
      endSec: ev.duration,
      durationSec: ev.duration,
      timestamp: ev.timestamp,
      direction: dir,
      questionIndex: ev.question_index ?? 1,
    });
    return {
      timestamp: ev.timestamp,
      title: desc.title,
      description: desc.description,
      duration: ev.duration,
      type: desc.type,
      behavior,
      penalty: (ev as any).penalty,
      direction: dir,
      snapshotUrl: ev.snapshot || undefined,
      questionIndex: ev.question_index ?? undefined,
      questionText: ev.question_text ?? undefined,
    };
  });

  const summaryPrefix = integrity
    ? `Độ trung thực: ${integrity.overallScore}/100 (${integrity.rank}) · `
    : "";

  return {
    camera_active: cameraActive,
    total_frames: raw.total_frames,
    face_frames: raw.face_frames,
    face_presence_pct: presencePct,
    looking_straight_pct: straightPct,
    looking_away_pct: awayPct,
    not_detected_pct: notDetectedPct,
    gaze_left_pct: raw.gaze_left_pct ?? undefined,
    gaze_right_pct: raw.gaze_right_pct ?? undefined,
    total_duration_seconds: raw.duration_sec,
    events,
    summary: cameraActive
      ? `${summaryPrefix}Khuôn mặt hiện diện ${presencePct}%, nhìn thẳng ${straightPct}%, nhìn lệch ${awayPct}%`
      : "Không có dữ liệu camera trong phiên phỏng vấn này.",
    integrity,
  };
}

export function buildGazeReportFromCounters(counters: {
  totalFrames: number;
  faceFrames: number;
  straightFrames: number;
  awayFrames: number;
  leftFrames: number;
  rightFrames: number;
  noFaceFrames: number;
  elapsedSec: number;
  events: GazeEvent[];
}): GazeReportResult {
  const durationSec = Math.max(0, Math.round(counters.elapsedSec * 10) / 10);

  if (counters.faceFrames <= 0 || counters.totalFrames <= 0) {
    return {
      camera_active: false,
      total_frames: counters.totalFrames,
      face_frames: 0,
      face_presence_pct: 0,
      looking_straight_pct: 0,
      looking_away_pct: 0,
      not_detected_pct: 100,
      gaze_left_pct: 0,
      gaze_right_pct: 0,
      total_duration_seconds: durationSec,
      events: [],
      summary: "Không có dữ liệu camera trong phiên phỏng vấn này.",
      integrity: null,
    };
  }

  const total = counters.totalFrames;
  const presencePct = Math.round((counters.faceFrames / total) * 1000) / 10;
  const straightPct = Math.round((counters.straightFrames / total) * 1000) / 10;
  const awayPct = Math.round((counters.awayFrames / total) * 1000) / 10;
  const leftPct = Math.round((counters.leftFrames / total) * 1000) / 10;
  const rightPct = Math.round((counters.rightFrames / total) * 1000) / 10;
  const notDetectedPct = Math.round((counters.noFaceFrames / total) * 1000) / 10;

  return {
    camera_active: true,
    total_frames: counters.totalFrames,
    face_frames: counters.faceFrames,
    face_presence_pct: presencePct,
    looking_straight_pct: straightPct,
    looking_away_pct: awayPct,
    not_detected_pct: notDetectedPct,
    gaze_left_pct: leftPct,
    gaze_right_pct: rightPct,
    total_duration_seconds: durationSec,
    events: counters.events,
    summary: `Khuôn mặt hiện diện ${presencePct}%, nhìn thẳng ${straightPct}%, nhìn lệch ${awayPct}%`,
    integrity: null,
  };
}

export class ClientGazeTracker {
  private landmarker: FaceLandmarker | null = null;
  private isInitializing = false;
  private isRunning = false;
  private cameraDisabled = false;
  private cameraDisabledAtSec: number | null = null;
  private tabHiddenAtSec: number | null = null;
  private animFrameId: number | null = null;
  private currentVideoElement: HTMLVideoElement | null = null;

  private machine = new GazeSessionStateMachine();
  private context: GazeContext = { questionIndex: 1, phase: "reading" };
  private activeSessionKey: string | null = null;

  // Calibration baselines (iris + head pose + blendshapes)
  private calibrationSamples: {
    h: number;
    v: number;
    pitch: number;
    yaw: number;
    blendX: number | null;
    blendY: number | null;
  }[] = [];
  private baselineH = 0.5;
  private baselineV = 0.0;
  private baselinePitch = 0.0;
  private baselineYaw = 0.0;
  private baselineBlendX = 0.0;
  private baselineBlendY = 0.0;
  private isCalibrated = false;

  // Smoothing buffers
  private hBuffer: number[] = [];
  private vBuffer: number[] = [];
  private pitchBuffer: number[] = [];
  private yawBuffer: number[] = [];
  private blendXBuffer: number[] = [];
  private blendYBuffer: number[] = [];

  private sessionStartTime = 0;
  private lastDetectMs = 0;

  public onStateUpdate?: (state: {
    status:
      | "CALIBRATING"
      | "LOOKING_STRAIGHT"
      | "READING_QUESTION"
      | "LOOKING_AWAY"
      | "NO_FACE"
      | "SECOND_PERSON"
      | "EYES_CLOSED";
    direction?: string;
    calibrationProgress?: number;
  }) => void;

  private handleVisibilityChange = () => {
    if (!this.isRunning) return;
    const nowSec = (performance.now() - this.sessionStartTime) / 1000;
    if (document.hidden) {
      this.tabHiddenAtSec = nowSec;
    } else if (this.tabHiddenAtSec !== null) {
      const hiddenDur = Math.max(0, nowSec - this.tabHiddenAtSec);
      this.tabHiddenAtSec = null;
      if (hiddenDur >= 1.0) {
        this.machine.recordOffScreenSpan(hiddenDur, nowSec);
      }
    }
  };

  public setContext(ctx: Partial<GazeContext>): void {
    const nowSec =
      this.sessionStartTime > 0
        ? (performance.now() - this.sessionStartTime) / 1000
        : 0;
    this.context = { ...this.context, ...ctx };
    this.machine.setContext(ctx, nowSec);
  }

  public setCameraDisabled(
    disabled: boolean,
    videoElement?: HTMLVideoElement | null,
  ): void {
    if (!this.isRunning) {
      this.cameraDisabled = disabled;
      return;
    }
    const nowSec = (performance.now() - this.sessionStartTime) / 1000;
    if (disabled && !this.cameraDisabled) {
      this.cameraDisabled = true;
      this.cameraDisabledAtSec = nowSec;
      this.currentVideoElement = null;
      this.onStateUpdate?.({ status: "NO_FACE" });
    } else if (!disabled) {
      if (this.cameraDisabled && this.cameraDisabledAtSec !== null) {
        const offDur = Math.max(0, nowSec - this.cameraDisabledAtSec);
        if (offDur > 0.2) {
          this.machine.recordOffScreenSpan(offDur, nowSec);
        }
      }
      this.cameraDisabled = false;
      this.cameraDisabledAtSec = null;
      if (videoElement) {
        this.currentVideoElement = videoElement;
      }
    }
  }

  async initialize(): Promise<void> {
    if (this.landmarker || this.isInitializing) return;
    this.isInitializing = true;
    const createForDelegate = async (delegate: "GPU" | "CPU") => {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm",
      );
      return FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate,
        },
        runningMode: "VIDEO",
        numFaces: 2,
        outputFaceBlendshapes: true,
      });
    };

    try {
      this.landmarker = await createForDelegate("GPU");
    } catch (err) {
      console.warn("GPU delegate failed, fallback to CPU delegate:", err);
      try {
        this.landmarker = await createForDelegate("CPU");
      } catch (fallbackErr) {
        console.error("Failed to initialize FaceLandmarker:", fallbackErr);
      }
    } finally {
      this.isInitializing = false;
    }
  }

  start(
    videoElement: HTMLVideoElement,
    options?: { preserveSession?: boolean },
  ): void {
    const currentSid = this.context.sessionId || null;
    const sameActiveSession =
      Boolean(options?.preserveSession) ||
      (this.isRunning &&
        currentSid !== null &&
        currentSid === this.activeSessionKey);

    if (this.isRunning && sameActiveSession) {
      this.setCameraDisabled(false, videoElement);
      return;
    }

    if (this.isRunning) {
      this.isRunning = false;
      if (this.animFrameId !== null) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
    }

    this.isRunning = true;
    this.cameraDisabled = false;
    this.cameraDisabledAtSec = null;
    this.tabHiddenAtSec = null;
    this.currentVideoElement = videoElement;
    this.activeSessionKey = currentSid;
    this.sessionStartTime = performance.now();
    this.lastDetectMs = 0;
    this.resetCalibrationAndState();

    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }

    let lastVideoTime = -1;
    const loop = () => {
      if (!this.isRunning) return;

      const nowMs = performance.now();
      const videoEl = this.currentVideoElement;

      if (
        !this.cameraDisabled &&
        this.landmarker &&
        videoEl &&
        nowMs - this.lastDetectMs >= GAZE_CONFIG.DETECT_INTERVAL_MS &&
        videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        videoEl.currentTime !== lastVideoTime
      ) {
        this.lastDetectMs = nowMs;
        lastVideoTime = videoEl.currentTime;
        try {
          const results = this.landmarker.detectForVideo(videoEl, nowMs);
          const blendshapes = extractEyeBlendshapes(
            results.faceBlendshapes?.[0]?.categories,
          );
          this.processDetections(
            results.faceLandmarks || [],
            blendshapes,
            (nowMs - this.sessionStartTime) / 1000,
          );
        } catch {}
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  stop(explicitSessionId?: string): GazeReportResult {
    const wasRunning = this.isRunning;
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }

    const elapsedSec =
      this.sessionStartTime > 0
        ? (performance.now() - this.sessionStartTime) / 1000
        : 0;

    if (wasRunning && this.cameraDisabled && this.cameraDisabledAtSec !== null) {
      this.machine.recordOffScreenSpan(
        Math.max(0, elapsedSec - this.cameraDisabledAtSec),
        elapsedSec,
      );
      this.cameraDisabledAtSec = null;
    }
    if (wasRunning && this.tabHiddenAtSec !== null) {
      this.machine.recordOffScreenSpan(
        Math.max(0, elapsedSec - this.tabHiddenAtSec),
        elapsedSec,
      );
      this.tabHiddenAtSec = null;
    }

    this.currentVideoElement = null;
    this.activeSessionKey = null;

    const result = this.machine.finalize(elapsedSec);
    const targetSessionId = explicitSessionId || this.context.sessionId;

    if (targetSessionId) {
      try {
        localStorage.setItem(
          `gaze_result_${targetSessionId}`,
          JSON.stringify(result),
        );
      } catch {
        try {
          const slim: GazeReportResult = {
            ...result,
            events: result.events.map(({ snapshotUrl: _s, ...rest }) => rest),
          };
          localStorage.setItem(
            `gaze_result_${targetSessionId}`,
            JSON.stringify(slim),
          );
        } catch {}
      }

      void saveSessionGazeReport(targetSessionId, {
        total_frames: result.total_frames,
        face_frames: result.face_frames,
        duration_sec: result.total_duration_seconds,
        camera_active: result.camera_active,
        face_presence_pct: result.camera_active ? result.face_presence_pct : null,
        gaze_center_pct: result.camera_active ? result.looking_straight_pct : null,
        gaze_left_pct: result.camera_active ? (result.gaze_left_pct ?? 0) : null,
        gaze_right_pct: result.camera_active ? (result.gaze_right_pct ?? 0) : null,
        gaze_away_pct: result.camera_active ? result.looking_away_pct : null,
        gaze_events: result.events.slice(0, 50).map((ev) => ({
          timestamp: ev.timestamp,
          direction:
            ev.direction ||
            (ev.type === "second_person"
              ? "SECOND_PERSON"
              : ev.type === "off_screen"
                ? "NO_FACE"
                : "AWAY"),
          duration: ev.duration,
          behavior: ev.behavior || null,
          penalty: ev.penalty ?? null,
          snapshot: ev.snapshotUrl || null,
          question_index: ev.questionIndex ?? null,
          question_text: ev.questionText ?? null,
        })),
        gaze_timeline: result.integrity
          ? [{ _type: "integrity_summary", summary: result.integrity }]
          : [],
        integrity_score: result.integrity ? result.integrity.overallScore : null,
        integrity_rank: result.integrity ? result.integrity.rank : null,
        integrity_summary: result.integrity || null,
      }).catch((err) => {
        console.warn("Could not persist gaze report to backend:", err);
      });
    }

    return result;
  }

  private resetCalibrationAndState(): void {
    this.machine.reset();
    this.machine.setContext(this.context, 0);
    this.calibrationSamples = [];
    this.isCalibrated = false;
    this.baselineH = 0.5;
    this.baselineV = 0.0;
    this.baselinePitch = 0.0;
    this.baselineYaw = 0.0;
    this.baselineBlendX = 0.0;
    this.baselineBlendY = 0.0;
    this.hBuffer = [];
    this.vBuffer = [];
    this.pitchBuffer = [];
    this.yawBuffer = [];
    this.blendXBuffer = [];
    this.blendYBuffer = [];
  }

  private processDetections(
    faces: Point[][],
    blendshapes: EyeBlendshapeScores | null,
    currentTimeSec: number,
  ): void {
    const capture = () =>
      this.currentVideoElement
        ? captureVideoFrame(this.currentVideoElement)
        : "";

    // 1. Second person detected
    if (faces.length >= 2) {
      this.machine.step({ kind: "SECOND_PERSON" }, currentTimeSec, capture);
      this.onStateUpdate?.({ status: "SECOND_PERSON" });
      return;
    }

    const landmarks = faces[0] || null;

    // 2. No face detected
    if (!landmarks || landmarks.length < 478) {
      this.machine.step({ kind: "NO_FACE" }, currentTimeSec, capture);
      this.onStateUpdate?.({ status: "NO_FACE" });
      return;
    }

    // 3. Blink detection (prefer neural eyeBlink blendshapes so upward head tilt doesn't false-trigger!)
    const isBlinking = blendshapes
      ? (blendshapes.eyeBlinkLeft + blendshapes.eyeBlinkRight) / 2.0 >
        GAZE_CONFIG.BLINK_BLENDSHAPE_THRESHOLD
      : (calculateEar(landmarks, GAZE_CONFIG.LEFT_EYE) +
          calculateEar(landmarks, GAZE_CONFIG.RIGHT_EYE)) /
          2.0 <
        GAZE_CONFIG.EAR_THRESHOLD;

    if (isBlinking) {
      this.machine.step({ kind: "BLINK" }, currentTimeSec, capture);
      this.onStateUpdate?.({ status: "EYES_CLOSED" });
      return;
    }

    const leftGaze = calculateEyeGaze(landmarks, GAZE_CONFIG.LEFT_EYE);
    const rightGaze = calculateEyeGaze(landmarks, GAZE_CONFIG.RIGHT_EYE);
    if (!leftGaze || !rightGaze) {
      this.machine.step({ kind: "STRAIGHT" }, currentTimeSec, capture);
      return;
    }

    const rawH = (leftGaze.h + rightGaze.h) / 2.0;
    const rawV = (leftGaze.v + rightGaze.v) / 2.0;
    const { pitch: headPitch, yaw: headYaw } = calculateHeadPose(landmarks);

    // Blendshape signed eye angles:
    // +X = person's left (raw-right / mirrored-left), -X = person's right (raw-left / mirrored-right)
    // +Y = down, -Y = up
    const rawBlendX = blendshapes
      ? (blendshapes.eyeLookOutLeft +
          blendshapes.eyeLookInRight -
          (blendshapes.eyeLookInLeft + blendshapes.eyeLookOutRight)) /
        2.0
      : null;
    const rawBlendY = blendshapes
      ? (blendshapes.eyeLookDownLeft +
          blendshapes.eyeLookDownRight -
          (blendshapes.eyeLookUpLeft + blendshapes.eyeLookUpRight)) /
        2.0
      : null;

    // 4. Calibration (~1.5s straight posture)
    if (!this.isCalibrated) {
      if (Math.abs(headPitch) <= 0.25 && Math.abs(headYaw) <= 0.25) {
        this.calibrationSamples.push({
          h: rawH,
          v: rawV,
          pitch: headPitch,
          yaw: headYaw,
          blendX: rawBlendX,
          blendY: rawBlendY,
        });
      }
      const progress = Math.min(
        100,
        Math.round(
          (this.calibrationSamples.length / GAZE_CONFIG.CALIBRATION_FRAMES) *
            100,
        ),
      );
      this.onStateUpdate?.({
        status: "CALIBRATING",
        calibrationProgress: progress,
      });

      if (this.calibrationSamples.length >= GAZE_CONFIG.CALIBRATION_FRAMES) {
        const n = this.calibrationSamples.length;
        const avgH = this.calibrationSamples.reduce((s, c) => s + c.h, 0) / n;
        const avgV = this.calibrationSamples.reduce((s, c) => s + c.v, 0) / n;
        const avgPitch =
          this.calibrationSamples.reduce((s, c) => s + c.pitch, 0) / n;
        const avgYaw =
          this.calibrationSamples.reduce((s, c) => s + c.yaw, 0) / n;

        const blendXSamp = this.calibrationSamples
          .map((c) => c.blendX)
          .filter((x): x is number => x !== null);
        const blendYSamp = this.calibrationSamples
          .map((c) => c.blendY)
          .filter((y): y is number => y !== null);

        this.baselineH = Math.min(Math.max(avgH, 0.45), 0.55);
        this.baselineV = Math.min(Math.max(avgV, -0.05), 0.05);
        this.baselinePitch = Math.min(Math.max(avgPitch, -0.15), 0.15);
        this.baselineYaw = Math.min(Math.max(avgYaw, -0.12), 0.12);
        this.baselineBlendX =
          blendXSamp.length > 0
            ? Math.min(
                Math.max(
                  blendXSamp.reduce((a, b) => a + b, 0) / blendXSamp.length,
                  -0.15,
                ),
                0.15,
              )
            : 0;
        this.baselineBlendY =
          blendYSamp.length > 0
            ? Math.min(
                Math.max(
                  blendYSamp.reduce((a, b) => a + b, 0) / blendYSamp.length,
                  -0.18,
                ),
                0.18,
              )
            : 0;
        this.isCalibrated = true;
      }

      this.machine.step({ kind: "CALIBRATING" }, currentTimeSec);
      return;
    }

    // 5. Smooth relative deviations
    const pushSmooth = (buf: number[], val: number): number => {
      buf.push(val);
      if (buf.length > GAZE_CONFIG.SMOOTHING_WINDOW) buf.shift();
      return buf.reduce((a, b) => a + b, 0) / buf.length;
    };

    const smoothH = pushSmooth(this.hBuffer, rawH - this.baselineH);
    const smoothV = pushSmooth(this.vBuffer, rawV - this.baselineV);
    const smoothPitch = pushSmooth(this.pitchBuffer, headPitch - this.baselinePitch);
    const smoothYaw = pushSmooth(this.yawBuffer, headYaw - this.baselineYaw);
    const smoothBlendX =
      rawBlendX !== null
        ? pushSmooth(this.blendXBuffer, rawBlendX - this.baselineBlendX)
        : null;
    const smoothBlendY =
      rawBlendY !== null
        ? pushSmooth(this.blendYBuffer, rawBlendY - this.baselineBlendY)
        : null;

    // 6. VOR Head+Eye Vector Compensation
    const gaze = computeCompensatedWorldGaze({
      deltaYaw: smoothYaw,
      deltaPitch: smoothPitch,
      deltaIrisH: smoothH,
      deltaIrisV: smoothV,
      deltaBlendX: smoothBlendX,
      deltaBlendY: smoothBlendY,
    });

    if (gaze.direction === "NHIN THANG") {
      this.machine.step({ kind: "STRAIGHT" }, currentTimeSec, capture);
      this.onStateUpdate?.({ status: "LOOKING_STRAIGHT" });
    } else {
      const { readingExempted } = this.machine.step(
        { kind: "LOOK_AWAY", direction: gaze.direction },
        currentTimeSec,
        capture,
      );
      if (readingExempted) {
        this.onStateUpdate?.({ status: "READING_QUESTION" });
      } else {
        this.onStateUpdate?.({
          status: "LOOKING_AWAY",
          direction: gaze.direction,
        });
      }
    }
  }
}

export const clientGazeTracker = new ClientGazeTracker();
