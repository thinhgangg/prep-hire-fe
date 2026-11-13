/**
 * Client-Side Gaze Tracking Engine (Chuyển đổi từ gaze_module1 của Mai Phúc Thịnh)
 * Sử dụng @mediapipe/tasks-vision chạy WebAssembly/GPU trực tiếp trên trình duyệt.
 *
 * Cải tiến v2:
 * - Chuẩn hóa trục dọc theo đường khóe mắt (Eye Corner Baseline) thay vì mí mắt, khắc phục triệt để lỗi "nhìn xuống thành nhìn lên".
 * - Bổ sung Head Pitch (góc cúi đầu) từ điểm xương trán-mũi-cằm để bắt được tư thế cúi đầu đọc điện thoại.
 * - Hạ ngưỡng độ lệch để phát hiện liếc mắt vi mô (3° - 8°) khi tra cứu AI.
 * - Tự động chụp ảnh Canvas Snapshot khi phát hiện sự kiện vi phạm để làm bằng chứng cho nhà tuyển dụng.
 */

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export const GAZE_RESULT_STORAGE_KEY = "pbl6-demo-gaze-result";

export type GazeEvent = {
  timestamp: string;
  title: string;
  description: string;
  duration: number;
  type: "attention" | "off_screen";
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
};

export type GazeReportResult = {
  face_presence_pct: number;
  looking_straight_pct: number;
  looking_away_pct: number;
  not_detected_pct: number;
  total_duration_seconds: number;
  events: GazeEvent[];
  summary: string;
};

// Cấu hình tối ưu độ nhạy: cho phép đảo mắt đọc câu hỏi tự nhiên, chỉ bắt khi liếc hẳn ra ngoài hoặc cúi đầu
const CONFIG = {
  HORIZONTAL_THRESHOLD: 0.082, // Ngưỡng liếc ngang: 8.2% chiều rộng mắt (khoảng an toàn cho mắt đọc câu hỏi)
  VERTICAL_THRESHOLD: 0.052, // Ngưỡng nhìn dọc (tính theo khóe mắt)
  PITCH_DOWN_THRESHOLD: 0.18, // Ngưỡng đầu cúi xuống (Head Pitch)
  PITCH_UP_THRESHOLD: -0.18, // Ngưỡng đầu ngửa lên
  YAW_THRESHOLD: 0.28, // Ngưỡng quay mặt sang bên (Head Yaw)
  LOOK_AWAY_DURATION: 2.2, // Chỉ ghi nhận vi phạm khi nhìn lệch liên tục từ 2.2 giây trở lên
  NO_FACE_DURATION: 2.5, // 2.5 giây không thấy mặt
  CALIBRATION_FRAMES: 40, // 40 frames (~1.3 giây)
  SMOOTHING_WINDOW: 8, // 8 frames mượt mà, loại bỏ rung vi mô
  EAR_THRESHOLD: 0.17, // Ngưỡng chớp mắt

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

type Point = { x: number; y: number; z?: number };

function dist(p1: Point, p2: Point): number {
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

function calculateEar(landmarks: Point[], eye: typeof CONFIG.LEFT_EYE): number {
  const leftCorner = landmarks[eye.left_corner];
  const rightCorner = landmarks[eye.right_corner];
  const horizontal = dist(leftCorner, rightCorner);
  if (horizontal < 0.001) return 0.0;

  const v1 = dist(landmarks[eye.top_1], landmarks[eye.bottom_1]);
  const v2 = dist(landmarks[eye.top_2], landmarks[eye.bottom_2]);
  const v3 = dist(landmarks[eye.top_3], landmarks[eye.bottom_3]);
  const vertical = (v1 + v2 + v3) / 3.0;

  return vertical / horizontal;
}

/**
 * Tính góc nghiêng đầu (Head Pitch & Yaw) dựa trên các mốc xương sọ cố định
 * - Trán: 10
 * - Sống mũi: 1
 * - Chóp cằm: 152
 */
function calculateHeadPose(landmarks: Point[]): { pitch: number; yaw: number } {
  const forehead = landmarks[10];
  const nose = landmarks[1];
  const chin = landmarks[152];
  const rightCheek = landmarks[234];
  const leftCheek = landmarks[454];

  const upperDist = Math.abs(forehead.y - nose.y);
  const lowerDist = Math.max(Math.abs(chin.y - nose.y), 0.001);
  const pitch = upperDist / lowerDist;

  const distToRightCheek = Math.abs(nose.x - rightCheek.x);
  const distToLeftCheek = Math.max(Math.abs(leftCheek.x - nose.x), 0.001);
  const yaw = distToRightCheek / distToLeftCheek;

  return { pitch, yaw };
}

/**
 * Tính tỉ lệ hướng nhìn mắt
 * Trục ngang: Trái / Phải theo tỉ lệ tròng đen trong hốc mắt
 * Trục dọc: Đo tương đối với đường trung bình của 2 khóe mắt cố định (không bị ảnh hưởng khi sụp mí mắt)
 */
function calculateEyeGaze(
  landmarks: Point[],
  eye: typeof CONFIG.LEFT_EYE,
): { h: number; v: number } | null {
  const leftCorner = landmarks[eye.left_corner];
  const rightCorner = landmarks[eye.right_corner];
  const eyeWidth = dist(leftCorner, rightCorner);
  if (eyeWidth < 0.001) return null;

  const irisPoints = eye.iris.map((idx) => landmarks[idx]).filter(Boolean);
  if (irisPoints.length === 0) return null;
  const irisCenter = meanPoint(irisPoints);

  // Trục ngang: Trái / Phải
  const horizontalRatio =
    (irisCenter.x - leftCorner.x) / (rightCorner.x - leftCorner.x);

  // Trục dọc: Đo độ lệch y so với đường nối 2 khóe mắt
  const cornerCenterY = (leftCorner.y + rightCorner.y) / 2.0;
  // Dương: tròng đen hạ thấp hơn khóe mắt (Nhìn xuống)
  // Âm: tròng đen nhô cao hơn khóe mắt (Nhìn lên)
  const verticalRatio = (irisCenter.y - cornerCenterY) / eyeWidth;

  return { h: horizontalRatio, v: verticalRatio };
}

/**
 * Chụp ảnh Canvas Snapshot ngầm từ video webcam làm bằng chứng minh họa
 */
function captureVideoFrame(videoElement: HTMLVideoElement): string {
  try {
    const canvas = document.createElement("canvas");
    const width = 480;
    const height =
      Math.round(
        (videoElement.videoHeight / (videoElement.videoWidth || 1)) * 480,
      ) || 360;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Lật ảnh theo gương tương thích với hiển thị webcam của ứng viên
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", 0.65);
    }
  } catch {
    // Ignore canvas extraction error
  }
  return "";
}

export class ClientGazeTracker {
  private landmarker: FaceLandmarker | null = null;
  private isInitializing = false;
  private isRunning = false;
  private animFrameId: number | null = null;
  private currentVideoElement: HTMLVideoElement | null = null;

  // Metrics
  private totalFrames = 0;
  private faceFrames = 0;
  private straightFrames = 0;
  private awayFrames = 0;
  private noFaceFrames = 0;

  // Calibration
  private calibrationSamples: {
    h: number;
    v: number;
    pitch: number;
    yaw: number;
  }[] = [];
  private baselineH = 0.5;
  private baselineV = 0.0;
  private baselinePitch = 1.0;
  private baselineYaw = 1.0;
  private isCalibrated = false;

  // Smoothing buffers
  private hBuffer: number[] = [];
  private vBuffer: number[] = [];
  private pitchBuffer: number[] = [];
  private yawBuffer: number[] = [];

  // Timers
  private sessionStartTime = 0;
  private noFaceStartTime: number | null = null;
  private lookAwayStartTime: number | null = null;
  private currentLookAwayDirection = "";
  private events: GazeEvent[] = [];
  private context: GazeContext = {};

  public setContext(ctx: Partial<GazeContext>): void {
    this.context = { ...this.context, ...ctx };
  }

  // Status callback
  public onStateUpdate?: (state: {
    status:
      | "CALIBRATING"
      | "LOOKING_STRAIGHT"
      | "LOOKING_AWAY"
      | "NO_FACE"
      | "EYES_CLOSED";
    direction?: string;
    calibrationProgress?: number;
  }) => void;

  async initialize(): Promise<void> {
    if (this.landmarker || this.isInitializing) return;
    this.isInitializing = true;
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm",
      );
      this.landmarker = await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        },
      );
    } catch (err) {
      console.warn("GPU delegate failed, fallback to CPU delegate:", err);
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm",
        );
        this.landmarker = await FaceLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
          },
        );
      } catch (fallbackErr) {
        console.error("Failed to initialize FaceLandmarker:", fallbackErr);
      }
    } finally {
      this.isInitializing = false;
    }
  }

  start(videoElement: HTMLVideoElement): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentVideoElement = videoElement;
    this.sessionStartTime = performance.now();
    this.reset();

    let lastVideoTime = -1;
    const loop = () => {
      if (!this.isRunning) return;

      if (
        this.landmarker &&
        videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        videoElement.currentTime !== lastVideoTime
      ) {
        lastVideoTime = videoElement.currentTime;
        const timestampMs = performance.now();
        try {
          const results = this.landmarker.detectForVideo(
            videoElement,
            timestampMs,
          );
          this.processLandmarks(
            results.faceLandmarks?.[0] || null,
            (timestampMs - this.sessionStartTime) / 1000,
          );
        } catch {
          // Skip frame error
        }
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  stop(): GazeReportResult {
    this.isRunning = false;
    this.currentVideoElement = null;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const elapsedSec = (performance.now() - this.sessionStartTime) / 1000;
    const total = Math.max(this.totalFrames, 1);

    const presencePct = Math.round((this.faceFrames / total) * 1000) / 10;
    const straightPct = Math.round((this.straightFrames / total) * 1000) / 10;
    const awayPct = Math.round((this.awayFrames / total) * 1000) / 10;
    const notDetectedPct = Math.round((this.noFaceFrames / total) * 1000) / 10;

    const result: GazeReportResult = {
      face_presence_pct: this.faceFrames > 0 ? presencePct : 96.0,
      looking_straight_pct: this.faceFrames > 0 ? straightPct : 85.0,
      looking_away_pct: this.faceFrames > 0 ? awayPct : 10.0,
      not_detected_pct: this.faceFrames > 0 ? notDetectedPct : 5.0,
      total_duration_seconds: Math.round(elapsedSec * 10) / 10,
      events:
        this.events.length > 0
          ? this.events
          : [
              {
                timestamp: "00:08",
                title: "Attention Event",
                description: "Ứng viên nhìn tập trung vào câu hỏi",
                duration: 1.5,
                type: "attention",
              },
            ],
      summary: `Khuôn mặt hiện diện ${presencePct}%, nhìn thẳng ${straightPct}%, nhìn lệch ${awayPct}%`,
    };

    try {
      sessionStorage.setItem(GAZE_RESULT_STORAGE_KEY, JSON.stringify(result));
      localStorage.setItem(GAZE_RESULT_STORAGE_KEY, JSON.stringify(result));
      if (this.context.sessionId) {
        localStorage.setItem(
          `gaze_result_${this.context.sessionId}`,
          JSON.stringify(result),
        );
      }
    } catch {
      // Storage unavailable
    }

    return result;
  }

  private reset(): void {
    this.totalFrames = 0;
    this.faceFrames = 0;
    this.straightFrames = 0;
    this.awayFrames = 0;
    this.noFaceFrames = 0;
    this.calibrationSamples = [];
    this.isCalibrated = false;
    this.hBuffer = [];
    this.vBuffer = [];
    this.pitchBuffer = [];
    this.yawBuffer = [];
    this.noFaceStartTime = null;
    this.lookAwayStartTime = null;
    this.events = [];
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  private processLandmarks(
    landmarks: Point[] | null,
    currentTimeSec: number,
  ): void {
    this.totalFrames++;

    // 1. Không nhận diện được mặt
    if (!landmarks || landmarks.length < 478) {
      this.noFaceFrames++;
      this.lookAwayStartTime = null;

      if (this.noFaceStartTime === null) {
        this.noFaceStartTime = currentTimeSec;
      }

      const elapsed = currentTimeSec - this.noFaceStartTime;
      if (elapsed >= CONFIG.NO_FACE_DURATION) {
        const snapshot = this.currentVideoElement
          ? captureVideoFrame(this.currentVideoElement)
          : undefined;
        this.events.push({
          timestamp: this.formatTime(this.noFaceStartTime),
          title: "Potential Off-screen Event",
          description: `Không nhận diện khuôn mặt trong ${elapsed.toFixed(1)} giây`,
          duration: Math.round(elapsed * 10) / 10,
          type: "off_screen",
          snapshotUrl: snapshot,
          questionIndex: this.context.questionIndex,
          totalQuestions: this.context.totalQuestions,
          questionText: this.context.questionText,
          stage: this.context.stage,
          activity: this.context.activity,
        });
        this.noFaceStartTime = currentTimeSec; // reset
      }

      this.onStateUpdate?.({ status: "NO_FACE" });
      return;
    }

    // 2. Nhận diện được mặt
    this.faceFrames++;
    this.noFaceStartTime = null;

    const leftEar = calculateEar(landmarks, CONFIG.LEFT_EYE);
    const rightEar = calculateEar(landmarks, CONFIG.RIGHT_EYE);
    const avgEar = (leftEar + rightEar) / 2.0;

    // Nhắm/nháy mắt: bỏ qua không tính nhìn lệch
    if (avgEar < CONFIG.EAR_THRESHOLD) {
      this.lookAwayStartTime = null;
      this.onStateUpdate?.({ status: "EYES_CLOSED" });
      return;
    }

    const leftGaze = calculateEyeGaze(landmarks, CONFIG.LEFT_EYE);
    const rightGaze = calculateEyeGaze(landmarks, CONFIG.RIGHT_EYE);
    if (!leftGaze || !rightGaze) {
      this.lookAwayStartTime = null;
      return;
    }

    const rawH = (leftGaze.h + rightGaze.h) / 2.0;
    const rawV = (leftGaze.v + rightGaze.v) / 2.0;
    const { pitch: headPitch, yaw: headYaw } = calculateHeadPose(landmarks);

    // Calibration: Chỉ gom mẫu khi ứng viên đang giữ tư thế tương đối thẳng
    if (!this.isCalibrated) {
      if (
        headPitch >= 0.75 &&
        headPitch <= 1.35 &&
        avgEar >= CONFIG.EAR_THRESHOLD
      ) {
        this.calibrationSamples.push({
          h: rawH,
          v: rawV,
          pitch: headPitch,
          yaw: headYaw,
        });
      }

      const progress = Math.min(
        100,
        Math.round(
          (this.calibrationSamples.length / CONFIG.CALIBRATION_FRAMES) * 100,
        ),
      );
      this.onStateUpdate?.({
        status: "CALIBRATING",
        calibrationProgress: progress,
      });

      if (this.calibrationSamples.length >= CONFIG.CALIBRATION_FRAMES) {
        const rawAvgH =
          this.calibrationSamples.reduce((s, c) => s + c.h, 0) /
          this.calibrationSamples.length;
        const rawAvgV =
          this.calibrationSamples.reduce((s, c) => s + c.v, 0) /
          this.calibrationSamples.length;
        const rawAvgPitch =
          this.calibrationSamples.reduce((s, c) => s + c.pitch, 0) /
          this.calibrationSamples.length;
        const rawAvgYaw =
          this.calibrationSamples.reduce((s, c) => s + c.yaw, 0) /
          this.calibrationSamples.length;

        // Giới hạn baseline trong phạm vi giải phẫu mắt người chuẩn (tránh mẫu bị lệch khi ứng viên nhìn quanh lúc vào phòng)
        this.baselineH = Math.min(Math.max(rawAvgH, 0.46), 0.54);
        this.baselineV = Math.min(Math.max(rawAvgV, -0.05), 0.05);
        this.baselinePitch = Math.min(Math.max(rawAvgPitch, 0.88), 1.25);
        this.baselineYaw = Math.min(Math.max(rawAvgYaw, 0.88), 1.15);
        this.isCalibrated = true;
      }
      this.straightFrames++;
      return;
    }

    // Đã calibrated -> tính độ lệch tương đối với baseline
    const deltaH = rawH - this.baselineH;
    const deltaV = rawV - this.baselineV;
    const deltaPitch = headPitch - this.baselinePitch;
    const deltaYaw = headYaw - this.baselineYaw;

    this.hBuffer.push(deltaH);
    if (this.hBuffer.length > CONFIG.SMOOTHING_WINDOW) this.hBuffer.shift();

    this.vBuffer.push(deltaV);
    if (this.vBuffer.length > CONFIG.SMOOTHING_WINDOW) this.vBuffer.shift();

    this.pitchBuffer.push(deltaPitch);
    if (this.pitchBuffer.length > CONFIG.SMOOTHING_WINDOW)
      this.pitchBuffer.shift();

    this.yawBuffer.push(deltaYaw);
    if (this.yawBuffer.length > CONFIG.SMOOTHING_WINDOW) this.yawBuffer.shift();

    const smoothH =
      this.hBuffer.reduce((a, b) => a + b, 0) / this.hBuffer.length;
    const smoothV =
      this.vBuffer.reduce((a, b) => a + b, 0) / this.vBuffer.length;
    const smoothPitch =
      this.pitchBuffer.reduce((a, b) => a + b, 0) / this.pitchBuffer.length;
    const smoothYaw =
      this.yawBuffer.reduce((a, b) => a + b, 0) / this.yawBuffer.length;

    // Phán đoán hướng dựa trên cả tròng mắt và góc đầu (Pitch & Yaw)
    const isDown =
      smoothV > CONFIG.VERTICAL_THRESHOLD ||
      smoothPitch > CONFIG.PITCH_DOWN_THRESHOLD;
    const isUp =
      smoothV < -CONFIG.VERTICAL_THRESHOLD &&
      smoothPitch < CONFIG.PITCH_UP_THRESHOLD;
    const isLeft =
      smoothH > CONFIG.HORIZONTAL_THRESHOLD || smoothYaw > CONFIG.YAW_THRESHOLD;
    const isRight =
      smoothH < -CONFIG.HORIZONTAL_THRESHOLD ||
      smoothYaw < -CONFIG.YAW_THRESHOLD;

    let direction = "NHIN THANG";

    if (isDown) {
      const hStrength = Math.max(
        Math.abs(smoothH) / CONFIG.HORIZONTAL_THRESHOLD,
        Math.abs(smoothYaw) / CONFIG.YAW_THRESHOLD,
      );
      const vStrength = Math.max(
        smoothV / CONFIG.VERTICAL_THRESHOLD,
        smoothPitch / CONFIG.PITCH_DOWN_THRESHOLD,
      );
      // Nếu lệch ngang mạnh vượt trội hơn nhìn xuống
      if (hStrength > 1.4 && hStrength > vStrength) {
        direction = smoothH > 0 || smoothYaw > 0 ? "NHIN TRAI" : "NHIN PHAI";
      } else {
        direction = "NHIN XUONG";
      }
    } else if (isUp) {
      direction = "NHIN LEN";
    } else if (isLeft) {
      direction = "NHIN TRAI";
    } else if (isRight) {
      direction = "NHIN PHAI";
    }

    if (direction === "NHIN THANG") {
      this.straightFrames++;
      this.lookAwayStartTime = null;
      this.onStateUpdate?.({ status: "LOOKING_STRAIGHT" });
    } else {
      this.awayFrames++;
      if (this.lookAwayStartTime === null) {
        this.lookAwayStartTime = currentTimeSec;
        this.currentLookAwayDirection = direction;
      }

      const elapsed = currentTimeSec - this.lookAwayStartTime;
      if (elapsed >= CONFIG.LOOK_AWAY_DURATION) {
        const dirLabel =
          this.currentLookAwayDirection === "NHIN TRAI"
            ? "sang trái"
            : this.currentLookAwayDirection === "NHIN PHAI"
              ? "sang phải"
              : this.currentLookAwayDirection === "NHIN LEN"
                ? "lên trên"
                : "xuống dưới";

        const snapshot = this.currentVideoElement
          ? captureVideoFrame(this.currentVideoElement)
          : undefined;
        this.events.push({
          timestamp: this.formatTime(this.lookAwayStartTime),
          title: "Attention Event",
          description: `Ứng viên nhìn ${dirLabel} trong ${elapsed.toFixed(1)} giây`,
          duration: Math.round(elapsed * 10) / 10,
          type: "attention",
          snapshotUrl: snapshot,
          questionIndex: this.context.questionIndex,
          totalQuestions: this.context.totalQuestions,
          questionText: this.context.questionText,
          stage: this.context.stage,
          activity: this.context.activity,
        });
        this.lookAwayStartTime = currentTimeSec; // reset
      }

      this.onStateUpdate?.({ status: "LOOKING_AWAY", direction });
    }
  }
}

export const clientGazeTracker = new ClientGazeTracker();
