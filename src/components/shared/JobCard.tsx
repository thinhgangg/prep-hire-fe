import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { deduplicateJobSkills, getAvatarInitials } from "@/utils/scoreMeta";

export type SharedJobCardProps = {
  title: string;
  company: string;
  location?: string | null;
  level?: string | null;
  skills?: string[];
  footer: ReactNode;
};

export function JobCard({
  title,
  company,
  location,
  level,
  skills = [],
  footer,
}: SharedJobCardProps) {
  const cleanLocation = (location || "").trim();
  const cleanLevel = (level || "").trim();
  const dedupedSkills = deduplicateJobSkills(skills, cleanLocation, cleanLevel);
  const initials = getAvatarInitials(company || title, "JB");

  return (
    <Card className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300">
      <div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="m-0 line-clamp-2 text-[14px] font-semibold leading-snug text-zinc-950">
              {title}
            </h4>
            {company && (
              <p className="m-0 mt-1 truncate text-xs text-zinc-500">
                {company}
              </p>
            )}
          </div>
        </div>

        {(cleanLocation || cleanLevel) && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {cleanLocation && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <span>{cleanLocation}</span>
              </span>
            )}
            {cleanLevel && (
              <Badge
                variant="outline"
                className="whitespace-nowrap text-[11px] uppercase"
              >
                {cleanLevel}
              </Badge>
            )}
          </div>
        )}

        {dedupedSkills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dedupedSkills.slice(0, 4).map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="text-[11px] font-normal"
              >
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
        {footer}
      </div>
    </Card>
  );
}

