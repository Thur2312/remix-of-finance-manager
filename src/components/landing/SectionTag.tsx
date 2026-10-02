interface SectionTagProps {
  index: number;
  total?: number;
  label: string;
}

export function SectionTag({ index, total = 0, label }: SectionTagProps) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 border border-white/10 bg-white/[0.04] backdrop-blur-md">
      <span className="flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold text-white bg-gradient-to-br from-[#318EF1] to-[#1F5FC4] shadow-[0_4px_14px_-4px_rgba(49,142,241,0.75)]">
        {String(index).padStart(2, "0")}
      </span>
      <span className="h-3 w-px bg-white/15" />
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-white/60">{label}</span>
      {total > 0 && <span className="text-[11px] font-medium tabular-nums text-white/25">/{String(total).padStart(2, "0")}</span>}
    </div>
  );
}
