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
import type { SkillRadarPoint } from "@/utils/dashboardMetrics";

type UserSkillRadarCardProps = {
  title?: string;
  overallScore: number;
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
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 shadow-lg">
      <div className="text-[12px] font-semibold text-zinc-900">
        {item.fullLabel}
      </div>
      <div className="mt-1 text-[13px] font-bold text-emerald-600 tabular-nums">
        {item.score}/100 điểm
      </div>
    </div>
  );
}

export function UserSkillRadarCard({
  title = "Chỉ số năng lực",
  overallScore,
  skills,
  loading = false,
}: UserSkillRadarCardProps) {
  const scoreTone =
    overallScore >= 80
      ? "text-emerald-600"
      : overallScore >= 50
        ? "text-zinc-950"
        : overallScore > 0
          ? "text-amber-600"
          : "text-zinc-400";

  return (
    <Card className="flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6">
      {/* Header + Overall Score Hero */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-[16px] font-semibold tracking-tight text-zinc-950">
            {title}
          </h2>
          <span className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-medium text-zinc-700">
            4 nhóm kỹ năng
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 px-4 py-3">
          <div>
            <div className="text-[12px] font-medium text-zinc-600">
              Điểm tổng gần nhất
            </div>
            <div className="mt-0.5 text-[12px] text-zinc-500">
              Đánh giá AI trên thang 100
            </div>
          </div>
          <div className="flex items-baseline gap-0.5 tabular-nums">
            <span className={`text-[30px] font-bold leading-none ${scoreTone}`}>
              {overallScore > 0 ? overallScore : "--"}
            </span>
            <span className="text-[13px] font-medium text-zinc-500">/100</span>
          </div>
        </div>
      </div>

      {/* 4-Skill Radar Chart */}
      {loading ? (
        <div className="mt-5 flex flex-1 items-center justify-center">
          <Skeleton className="h-[220px] w-[220px] rounded-full" />
        </div>
      ) : skills.length > 0 ? (
        <div className="mt-4 flex flex-1 flex-col justify-center">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skills}>
                <PolarGrid stroke="#E4E4E7" />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fill: "#27272A", fontSize: 12, fontWeight: 500 }}
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
                  fillOpacity={0.22}
                  dot={{ r: 3.5, fill: "#059669", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#047857" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex min-h-[220px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-5 py-8 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500">
            <RadarIcon className="h-5 w-5" />
          </div>
          <p className="m-0 max-w-xs text-[13px] leading-relaxed text-zinc-600">
            Hoàn thành phiên phỏng vấn đầu tiên để AI phân tích biểu đồ radar 4
            nhóm năng lực.
          </p>
        </div>
      )}
    </Card>
  );
}

