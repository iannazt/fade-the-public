"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  initial: number;
  min?: number;
  max?: number;
};

export default function ThresholdSlider({ initial, min = 50, max = 90 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  // Keep slider in sync if user uses back/forward.
  useEffect(() => {
    const fromUrl = Number(params.get("threshold") ?? initial);
    if (fromUrl !== value) setValue(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function commit(next: number) {
    const sp = new URLSearchParams(params.toString());
    sp.set("threshold", String(next));
    startTransition(() => {
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <label htmlFor="threshold" className="text-sm text-zinc-400">
          Fade threshold
        </label>
        <span className="font-mono text-lg text-emerald-400">
          {value}%{pending ? " …" : ""}
        </span>
      </div>
      <input
        id="threshold"
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onMouseUp={(e) =>
          commit(Number((e.target as HTMLInputElement).value))
        }
        onTouchEnd={(e) =>
          commit(Number((e.target as HTMLInputElement).value))
        }
        onKeyUp={(e) =>
          commit(Number((e.target as HTMLInputElement).value))
        }
        className="w-full accent-emerald-400"
      />
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
}
