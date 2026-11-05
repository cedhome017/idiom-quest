import { Star } from "lucide-react";

/** 頁面內確認列（發布環境的沙盒不能用 window.confirm） */
export function ConfirmBar({
  text,
  okLabel,
  cancelLabel = "繼續",
  onOk,
  onCancel,
}: {
  text: string;
  okLabel: string;
  cancelLabel?: string;
  onOk: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label={text}
      className="anim-pop mb-4 rounded-2xl bg-white p-4 shadow-[0_3px_0_rgba(27,42,65,0.18)] ring-2 ring-coral"
    >
      <p className="font-bold">{text}</p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={onOk}
          className="min-h-[48px] flex-1 rounded-xl bg-coral px-3 font-bold text-white"
        >
          {okLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[48px] flex-1 rounded-xl bg-sky-pale px-3 font-bold"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

export function Stars({ count, size = 22, max = 3 }: { count: number; size?: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${count} 顆星，共 ${max} 顆`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={2}
          className={n <= count ? "fill-sun text-sun-deep" : "fill-transparent text-ink/25"}
        />
      ))}
    </span>
  );
}

export const card = "rounded-2xl bg-white shadow-[0_3px_0_rgba(27,42,65,0.18)]";
