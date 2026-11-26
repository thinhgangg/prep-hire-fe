import { Radar as RadarIcon } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getScoreTier,
  type SkillRadarPoint,
} from "@/utils/dashboardMetrics";

type UserSkillRadarCardProps = {
  title?: string;
  skills: SkillRadarPoint[];
  loading?: boolean;
};

type RadarTooltipProps = {
  active?: boolean;
  payload?: { payload: SkillRadarPoint }[];
};

function SkillRadarTooltip({ active, payload }: RadarTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  const tier = getScoreTier(item.score);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 shadow-lg">
      <div className="text-[12px] font-semibold text-zinc-900">
        {item.fullLabel}
      </div>
      <div className="mt-1 flex items-center gap-2 text-[13px] font-bold tabular-nums">
        <span className={tier.textClass}>{item.score}/100</span>
        <span className="text-[11px] font-medium text-zinc-500">
          · {tier.label}
        </span>
      </div>
    </div>
  );
}

type CustomAngleTickProps = {
  x?: string | number;
  y?: string | number;
  cx?: string | number;
  cy?: string | number;
  payload?: { value?: string };
  skills: SkillRadarPoint[];
};

function RadarAxisTick({
  x = 0,
  y = 0,
  cx = 0,
  cy = 0,
  payload,
  skills,
}: CustomAngleTickProps) {
  const numX = Number(x) || 0;
  const numY = Number(y) || 0;
  const numCx = Number(cx) || 0;
  const numCy = Number(cy) || 0;
  const label = payload?.value || "";
  const match = skills.find((s) => s.skill === label);
  const score = match?.score ?? 0;
  const tier = getScoreTier(score);

  const dx = numX - numCx;
  const dy = numY - numCy;
  const isHorizontal = Math.abs(dx) > Math.abs(dy) * 0.6;
  const textAnchor = isHorizontal ? (dx > 0 ? "start" : "end") : "middle";
  const offsetX = isHorizontal ? (dx > 0 ? 6 : -6) : 0;
  const baseY = !isHorizontal ? (dy < 0 ? numY - 10 : numY + 10) : numY - 2;

  return (
    <g transform={`translate(${numX + offsetX},${baseY})`}>
      <text
        x={0}
        y={0}
        textAnchor={textAnchor}
        fill="#27272A"
        fontSize={12}
        fontWeight={500}
      >
        {label}
      </text>
      <text
        x={0}
        y={15}
        textAnchor={textAnchor}
        fill={tier.hex}
        fontSize={12}
        fontWeight={700}
      >
        {score}/100
      </text>
    </g>
  );
}

export function UserSkillRadarCard({
  title = "Chỉ số năng lực",
  skills,
  loading = false,
}: UserSkillRadarCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-[16px] font-semibold tracking-tight text-zinc-950">
          {title}
        </h2>
        <span className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700">
          4 nhóm kỹ năng
        </span>
      </div>

      {/* 4-Skill Radar Chart with inline numeric axis values */}
      {loading ? (
        <div className="mt-5 flex flex-1 items-center justify-center">
          <Skeleton className="h-[220px] w-[220px] rounded-full" />
        </div>
      ) : skills.length > 0 ? (
        <div className="mt-2 flex flex-1 flex-col justify-center">
          <div className="h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="60%"
                data={skills}
                margin={{ top: 18, right: 44, bottom: 18, left: 44 }}
              >
                <PolarGrid stroke="#E4E4E7" />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={(props) => (
                    <RadarAxisTick {...props} skills={skills} />
                  )}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Tooltip
                  wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                  content={<SkillRadarTooltip />}
                />
                <Radar
                  name="Điểm kỹ năng"
                  dataKey="score"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="#059669"
                  fillOpacity={0.2}
                  dot={{ r: 3.5, fill: "#059669", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#047857" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex min-h-[240px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-5 py-8 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500">
            <RadarIcon className="h-5 w-5" />
          </div>
          <p className="m-0 max-w-xs text-[13px] leading-relaxed text-zinc-600">
            Hoàn thành phiên phỏng vấn đầu tiên để xem biểu đồ phân tích 4 nhóm
            năng lực.
          </p>
        </div>
      )}
    </Card>
  );
}
