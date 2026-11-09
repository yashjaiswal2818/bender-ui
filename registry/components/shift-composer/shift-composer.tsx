"use client";

import {
  AnimatePresence,
  motion,
  useAnimate,
  useReducedMotionConfig,
  type HTMLMotionProps,
  type Transition,
} from "motion/react";
import {
  ArrowUp,
  AudioLines,
  Check,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  Image as ImageIcon,
  Link2,
  Mic,
  MicOff,
  Pause,
  Play,
  Plus,
  Square,
  Upload,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type ComponentProps,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";

export type ComposerAttachmentKind = "file" | "image" | "audio" | "link" | "voice";

export interface ComposerAttachment {
  id: string;
  /** Picks the chip's icon and how it's shown. */
  kind: ComposerAttachmentKind;
  /** Main label of the chip. */
  name: string;
  /** The quieter second label: a size, a day, a duration. */
  meta?: string;
  /** The picked or dropped file, when it came from the device. */
  file?: File;
  /** Where a link points, or an object URL for a recording. */
  url?: string;
  /** Thumbnail URL. Images added in the composer get one automatically. */
  preview?: string;
}

export interface ComposerModel {
  id: string;
  /** Name in the picker and the menu. */
  label: string;
  /** A quiet second line in the menu, such as who makes it. */
  description?: string;
  /** Logo shown in the picker and the menu, drawn at 16px. */
  icon?: ReactNode;
}

export interface ComposerTool {
  id: string;
  /** Read out for the button, and shown next to the icon while the tool is on. Keep it to a word or two. */
  label: string;
  /** Any node, such as a lucide icon. */
  icon: ReactNode;
}

export interface ComposerSuggestion {
  id: string;
  /** Text on the suggestion. */
  label: string;
  /** Shown before the label. Any node, such as a lucide icon. */
  icon?: ReactNode;
  /** What goes in the field when it's picked. Defaults to the label. */
  prompt?: string;
}

export interface ComposerMessage {
  /** What was typed. */
  text: string;
  /** Chips attached when it was sent. */
  attachments: ComposerAttachment[];
  /** Id of the chosen model. */
  model?: string;
  /** Ids of the tools that were on. */
  tools: string[];
}

export interface ShiftComposerProps {
  /** Shown in the empty field before the first message. */
  placeholder?: string;
  /** Takes over from `placeholder` once something has been sent. */
  followUpPlaceholder?: string;
  /** Fills the model picker. Leave it out to hide the picker. */
  models?: ComposerModel[];
  /** Id of the model picked at the start. Defaults to the first. */
  defaultModel?: string;
  /** Toggles on the toolbar, such as web search. */
  tools?: ComposerTool[];
  /** Next steps offered in the toolbar after a message is sent. */
  suggestions?: ComposerSuggestion[];
  /** Chips the composer starts with, such as the document the chat is about. */
  defaultAttachments?: ComposerAttachment[];
  /** Return a promise and the send button becomes a stop button until it settles. */
  onSubmit?: (message: ComposerMessage) => void | Promise<unknown>;
  /** Called when the stop button is pressed while `onSubmit` is pending. */
  onStop?: () => void;
  /** Passed to the file picker, e.g. "image/*,.pdf". */
  accept?: string;
  className?: string;
}

type View = "text" | "drop" | "voice";
type Swap = Pick<HTMLMotionProps<"div">, "initial" | "animate" | "exit" | "transition">;

/**
 * Colours live in variables so the composer can be re-themed from outside with a className, e.g.
 * `[--sc-accent:#0f766e] [--sc-accent-ink:#115e59]`. The accent marks what acts: send, stop, the drop zone, tools
 * that are on. Everything else stays neutral.
 */
const THEME = cn(
  "[--sc-surface:#fff] [--sc-sunken:#f4f4f5] [--sc-line:rgb(0_0_0/0.08)] [--sc-line-strong:rgb(0_0_0/0.16)]",
  "[--sc-ink:#0a0a0a] [--sc-muted:#5f5f66] [--sc-faint:#9a9aa1]",
  "[--sc-accent:oklch(0.55_0.2_272)] [--sc-accent-ink:oklch(0.47_0.2_272)] [--sc-on-accent:#fff]",
  "dark:[--sc-surface:#18181b] dark:[--sc-sunken:#27272a] dark:[--sc-line:rgb(255_255_255/0.09)] dark:[--sc-line-strong:rgb(255_255_255/0.2)]",
  "dark:[--sc-ink:#fafafa] dark:[--sc-muted:#a1a1aa] dark:[--sc-faint:#71717a]",
  "dark:[--sc-accent:oklch(0.62_0.18_272)] dark:[--sc-accent-ink:oklch(0.8_0.11_272)]",
);

const ICON_BUTTON =
  "relative grid size-9 shrink-0 place-items-center rounded-full text-(--sc-muted) outline-none transition-[background-color,color,opacity] duration-150 hover:bg-(--sc-sunken) hover:text-(--sc-ink) focus-visible:ring-2 focus-visible:ring-(--sc-accent) disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-[18px]";
const ACCENT_BUTTON =
  "relative grid size-9 shrink-0 place-items-center rounded-full bg-(--sc-accent) text-(--sc-on-accent) outline-none transition-[background-color,color,opacity,scale] duration-200 hover:brightness-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-(--sc-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--sc-surface) disabled:pointer-events-none [&_svg]:size-[18px]";

/** Chip icons get a tint by kind. Same lightness and chroma, only the hue moves, so the set reads as one. */
const KIND_HUE: Record<ComposerAttachmentKind, number> = { file: 250, image: 250, audio: 155, link: 300, voice: 25 };

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** The surface follows its content's height. Critically damped, so the bottom edge never overshoots. */
const RESIZE: Transition = { type: "spring", duration: 0.45, bounce: 0 };
const ENTER: Transition = {
  default: { type: "spring", duration: 0.45, bounce: 0 },
  opacity: { duration: 0.22, ease: "linear", delay: 0.04 },
  filter: { duration: 0.3, ease: EASE_OUT },
};
const EXIT: Transition = { duration: 0.14, ease: [0.4, 0, 1, 1] };
const MAX_FIELD = 200;

/**
 * Old content blurs out while the new one blurs in from a few pixels away, so a change of mode reads as one
 * surface reshaping rather than two panels swapping. With reduced motion it's a plain fade.
 */
function swap(reduce: boolean | null, from: { x?: number; y?: number } = { y: 6 }): Swap {
  if (reduce) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0.12 } }, transition: { duration: 0.2 } };
  }
  const x = from.x ?? 0;
  const y = from.y ?? 0;
  return {
    initial: { opacity: 0, x, y, scale: 0.98, filter: "blur(4px)" },
    animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } },
    exit: { opacity: 0, x: -x / 2, y: -y / 2, scale: 0.98, filter: "blur(4px)", transition: EXIT },
    transition: ENTER,
  };
}

/** For icons trading places inside one button. */
function pop(reduce: boolean | null): Swap {
  if (reduce) return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } };
  return {
    initial: { opacity: 0, scale: 0.5, filter: "blur(2px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 0.5, filter: "blur(2px)" },
    transition: { type: "spring", duration: 0.3, bounce: 0 },
  };
}

const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");

const focusSoon = (ref: RefObject<HTMLElement | null>) =>
  requestAnimationFrame(() => ref.current?.focus({ preventScroll: true }));

const KIND_ICON: Record<ComposerAttachmentKind, ReactNode> = {
  file: <FileText />,
  image: <ImageIcon />,
  audio: <AudioLines />,
  link: <Link2 />,
  voice: <Mic />,
};

const VOICE_HINT = {
  idle: "",
  requesting: "Allow the microphone to start",
  recording: "Recording. Press the check to attach it",
  paused: "Paused",
  error: "The microphone is blocked or missing",
};

type RecorderStatus = keyof typeof VOICE_HINT;

/** Microphone recording with a clock that stops while paused. Everything is released on cancel, finish and unmount. */
function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const session = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  // Time banked before the current run, and when the current run began.
  const clock = useRef({ banked: 0, since: 0 });
  const ticker = useRef(0);
  // Feeds the level meter. Recording still works if the browser won't give us one.
  const meter = useRef<{ context: AudioContext; analyser: AnalyserNode } | null>(null);

  const runClock = () => {
    clock.current.since = performance.now();
    window.clearInterval(ticker.current);
    ticker.current = window.setInterval(() => setElapsed(clock.current.banked + performance.now() - clock.current.since), 250);
  };
  const stopClock = () => {
    window.clearInterval(ticker.current);
    clock.current.banked += performance.now() - clock.current.since;
    setElapsed(clock.current.banked);
  };
  const release = useCallback(() => {
    window.clearInterval(ticker.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
    void meter.current?.context.close();
    meter.current = null;
  }, []);

  useEffect(() => release, [release]);

  const start = async () => {
    const id = ++session.current;
    chunks.current = [];
    clock.current = { banked: 0, since: 0 };
    setElapsed(0);
    setStatus("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("unsupported");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Cancelled while the permission prompt was up.
      if (id !== session.current) return media.getTracks().forEach((track) => track.stop());
      const rec = new MediaRecorder(media);
      rec.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      stream.current = media;
      recorder.current = rec;
      try {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(media).connect(analyser);
        meter.current = { context, analyser };
      } catch {
        meter.current = null;
      }
      rec.start();
      runClock();
      setStatus("recording");
    } catch {
      if (id === session.current) setStatus("error");
    }
  };

  const togglePause = () => {
    const rec = recorder.current;
    if (rec?.state === "recording") {
      rec.pause();
      stopClock();
      setStatus("paused");
    } else if (rec?.state === "paused") {
      rec.resume();
      runClock();
      setStatus("recording");
    }
  };

  const finish = () =>
    new Promise<{ audio: Blob; ms: number } | null>((resolve) => {
      const rec = recorder.current;
      session.current++;
      setStatus("idle");
      if (!rec || rec.state === "inactive") return resolve(null);
      if (rec.state === "recording") stopClock();
      const ms = clock.current.banked;
      rec.onstop = () => {
        release();
        resolve({ audio: new Blob(chunks.current, { type: rec.mimeType || "audio/webm" }), ms });
      };
      rec.stop();
    });

  const cancel = () => {
    session.current++;
    const rec = recorder.current;
    if (rec && rec.state !== "inactive") {
      rec.ondataavailable = null;
      rec.stop();
    }
    release();
    setStatus("idle");
    setElapsed(0);
  };

  return { status, elapsed, meter, start, togglePause, finish, cancel };
}

const BARS = 44;

/**
 * A level meter that scrolls: a new bar on the right every 70ms, older ones fading out to the left. It writes bar
 * heights straight to the DOM so React doesn't re-render at 15fps.
 */
function Waveform({ meter, live }: { meter: RefObject<{ analyser: AnalyserNode } | null>; live: boolean }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const levels = useRef<number[]>(Array(BARS).fill(0));

  useEffect(() => {
    if (!live) return;
    const data = new Uint8Array(512);
    let frame = 0;
    let last = 0;
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (time - last < 70) return;
      last = time;
      const analyser = meter.current?.analyser;
      let level = 0;
      if (analyser) {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < analyser.fftSize; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        // A square-root curve so normal speech fills the bars instead of barely moving them.
        level = Math.min(1, Math.sqrt(Math.sqrt(sum / analyser.fftSize)) * 1.6);
      }
      levels.current.push(level);
      levels.current.shift();
      levels.current.forEach((l, i) => {
        const bar = bars.current[i];
        if (bar) bar.style.height = `${Math.max(3, Math.round(l * 24))}px`;
      });
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [live, meter]);

  return (
    <div
      aria-hidden
      className="flex h-6 min-w-0 flex-1 items-center justify-end gap-[3px] overflow-clip [mask-image:linear-gradient(to_right,transparent,#000_45%)]"
    >
      {Array.from({ length: BARS }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            bars.current[i] = el;
          }}
          className={cn(
            "w-[3px] shrink-0 rounded-full transition-[height,background-color] duration-100",
            live ? "bg-(--sc-accent)" : "bg-(--sc-faint)",
          )}
          style={{ height: 3 }}
        />
      ))}
    </div>
  );
}

function IconButton({ label, className, ...props }: ComponentProps<"button"> & { label: string }) {
  return <button type="button" aria-label={label} title={label} className={cn(ICON_BUTTON, className)} {...props} />;
}

function Chip({ attachment, onRemove, reduce }: { attachment: ComposerAttachment; onRemove: () => void; reduce: boolean | null }) {
  return (
    <motion.span
      layout={reduce ? false : "position"}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, filter: "blur(2px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, filter: "blur(2px)", transition: EXIT }}
      transition={reduce ? { duration: 0.15 } : { type: "spring", duration: 0.35, bounce: 0 }}
      className="inline-flex h-8 min-w-0 max-w-full items-center gap-1.5 rounded-full bg-(--sc-sunken) pl-1 pr-1 text-[13px]"
    >
      <span
        style={{ "--hue": KIND_HUE[attachment.kind] } as CSSProperties}
        className="grid size-6 shrink-0 place-items-center overflow-clip rounded-full bg-[oklch(0.93_0.045_var(--hue))] text-[oklch(0.48_0.14_var(--hue))] dark:bg-[oklch(0.34_0.07_var(--hue))] dark:text-[oklch(0.85_0.09_var(--hue))] [&_svg]:size-3.5"
      >
        {attachment.preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={attachment.preview} alt="" className="size-full object-cover" />
        ) : (
          KIND_ICON[attachment.kind]
        )}
      </span>
      <span className="max-w-[180px] truncate font-medium text-(--sc-ink)">{attachment.name}</span>
      {attachment.meta && <span className="shrink-0 tabular-nums text-(--sc-muted)">{attachment.meta}</span>}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        className="grid size-6 shrink-0 place-items-center rounded-full text-(--sc-muted) outline-none transition-colors hover:bg-(--sc-line) hover:text-(--sc-ink) focus-visible:ring-2 focus-visible:ring-(--sc-accent) [&_svg]:size-3.5"
      >
        <X />
      </button>
    </motion.span>
  );
}

/** A row of next steps that scrolls sideways, fading at whichever edge has more to show. */
function SuggestionStrip({
  suggestions,
  onPick,
  reduce,
}: {
  suggestions: ComposerSuggestion[];
  onPick: (suggestion: ComposerSuggestion) => void;
  reduce: boolean | null;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges((prev) => {
      const next = { start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 };
      return prev.start === next.start && prev.end === next.end ? prev : next;
    });
  }, []);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const fade = `linear-gradient(to right, transparent, #000 ${edges.start ? 28 : 0}px, #000 calc(100% - ${edges.end ? 52 : 0}px), transparent)`;

  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={scroller}
        onScroll={measure}
        className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            onClick={() => onPick(suggestion)}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-medium text-(--sc-ink) outline-none ring-1 ring-inset ring-(--sc-line) transition-colors hover:bg-(--sc-sunken) focus-visible:ring-2 focus-visible:ring-(--sc-accent) [&_svg]:size-4 [&_svg]:text-(--sc-accent-ink)"
          >
            {suggestion.icon}
            {suggestion.label}
          </button>
        ))}
      </div>
      <AnimatePresence initial={false}>
        {edges.end && (
          <motion.button
            key="more"
            type="button"
            tabIndex={-1}
            aria-label="More suggestions"
            onClick={() => {
              const el = scroller.current;
              el?.scrollBy({ left: el.clientWidth * 0.6, behavior: reduce ? "auto" : "smooth" });
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-1/2 -mt-3.5 grid size-7 place-items-center rounded-full bg-(--sc-surface) text-(--sc-ink) shadow-[0_1px_3px_rgb(0_0_0/0.1)] ring-1 ring-(--sc-line) [&_svg]:size-4"
          >
            <ChevronRight />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModelMenu({
  id,
  models,
  value,
  style,
  anchor,
  reduce,
  onPick,
  onClose,
}: {
  id: string;
  models: ComposerModel[];
  value?: string;
  style: CSSProperties;
  anchor: RefObject<HTMLButtonElement | null>;
  reduce: boolean | null;
  onPick: (id: string) => void;
  onClose: (refocus: boolean) => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const below = style.top !== undefined;

  useEffect(() => {
    items.current[Math.max(0, models.findIndex((m) => m.id === value))]?.focus({ preventScroll: true });
    // Only when the menu opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !anchor.current?.contains(target)) onClose(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [anchor, onClose]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items.current.filter((item): item is HTMLButtonElement => item !== null);
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => {
      event.preventDefault();
      list[(i + list.length) % list.length]?.focus();
    };
    if (event.key === "ArrowDown") go(at + 1);
    else if (event.key === "ArrowUp") go(at - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(list.length - 1);
    else if (event.key === "Tab") onClose(false);
    else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    }
  };

  return (
    <motion.div
      ref={menu}
      id={id}
      role="menu"
      aria-label="Model"
      onKeyDown={onKeyDown}
      style={{ ...style, transformOrigin: below ? "top left" : "bottom left" }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: below ? -4 : 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: below ? -4 : 4, transition: EXIT }}
      transition={reduce ? { duration: 0.15 } : { type: "spring", duration: 0.3, bounce: 0 }}
      className="absolute z-30 max-h-[min(380px,70vh)] w-64 overflow-y-auto rounded-[18px] bg-(--sc-surface) p-1.5 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.22)] ring-1 ring-(--sc-line)"
    >
      {models.map((model, i) => (
        <button
          key={model.id}
          ref={(el) => {
            items.current[i] = el;
          }}
          type="button"
          role="menuitemradio"
          aria-checked={model.id === value}
          onClick={() => onPick(model.id)}
          className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left outline-none transition-colors hover:bg-(--sc-sunken) focus-visible:bg-(--sc-sunken)"
        >
          {model.icon && (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-(--sc-surface) text-(--sc-ink) ring-1 ring-inset ring-(--sc-line) [&_svg]:size-4">
              {model.icon}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-medium text-(--sc-ink)">{model.label}</span>
            {model.description && <span className="block text-[12.5px] text-(--sc-muted)">{model.description}</span>}
          </span>
          {model.id === value && <Check className="size-4 shrink-0 text-(--sc-accent-ink)" />}
        </button>
      ))}
    </motion.div>
  );
}

/**
 * One composer surface with three modes: typing, a drop zone for files and links, and a voice recorder. Switching
 * reshapes the surface to fit what's inside instead of swapping panels, and dragging a file over it opens the drop
 * zone on its own.
 */
export function ShiftComposer({
  placeholder = "Ask anything",
  followUpPlaceholder = "Reply, or pick a next step",
  models,
  defaultModel,
  tools = [],
  suggestions = [],
  defaultAttachments = [],
  onSubmit,
  onStop,
  accept,
  className,
}: ShiftComposerProps) {
  const reduce = useReducedMotionConfig();
  const baseId = useId();
  const [view, setView] = useState<View>("text");
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>(defaultAttachments);
  const [model, setModel] = useState(defaultModel ?? models?.[0]?.id);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const [offering, setOffering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<CSSProperties | null>(null);
  const [dragging, setDragging] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [height, setHeight] = useState<number | "auto">("auto");
  const [pillWidth, setPillWidth] = useState<number>();
  const recorder = useRecorder();
  const [linkScope, animateLink] = useAnimate<HTMLFormElement>();

  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const pill = useRef<HTMLButtonElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);
  const linkButton = useRef<HTMLButtonElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const seq = useRef(0);
  const run = useRef(0);
  const ownPreviews = useRef(new Set<string>());
  const drag = useRef({ timer: 0, auto: false, from: "text" as View });

  const current = models?.find((m) => m.id === model);
  // Starting chips are context, not a message: there's something to send once there's text or a chip of your own.
  const canSend = text.trim().length > 0 || attachments.some((a) => !defaultAttachments.some((d) => d.id === a.id));
  const live = recorder.status === "recording" || recorder.status === "paused";
  const nextId = () => `${baseId}-${++seq.current}`;
  const measurePill = useCallback((el: HTMLSpanElement | null) => {
    if (el) setPillWidth(el.offsetWidth);
  }, []);

  // The surface animates to the height of whatever is inside it.
  useLayoutEffect(() => {
    const el = content.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.getBoundingClientRect().height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_FIELD)}px`;
  }, [text, view]);

  useEffect(() => {
    const previews = ownPreviews.current;
    const timer = drag.current;
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
      window.clearTimeout(timer.timer);
    };
  }, []);

  const go = (next: View, focus = true) => {
    setView(next);
    setMenu(null);
    setLinkOpen(false);
    setLinkInvalid(false);
    if (focus) focusSoon(next === "text" ? field : next === "drop" ? uploadButton : cancelButton);
  };

  const addFiles = (list: FileList | File[]) => {
    const added = Array.from(list).map((file): ComposerAttachment => {
      const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : "file";
      const preview = kind === "image" ? URL.createObjectURL(file) : undefined;
      if (preview) ownPreviews.current.add(preview);
      return { id: nextId(), kind, name: file.name, meta: formatBytes(file.size), file, preview };
    });
    if (added.length) setAttachments((prev) => [...prev, ...added]);
  };

  const remove = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    const gone = attachments.find((a) => a.id === id)?.preview;
    if (gone && ownPreviews.current.delete(gone)) URL.revokeObjectURL(gone);
    focusSoon(field);
  };

  const send = async () => {
    if (busy || !canSend) return;
    const message: ComposerMessage = { text: text.trim(), attachments, model, tools: activeTools };
    setText("");
    setAttachments([]);
    setSent(true);
    if (suggestions.length) setOffering(true);
    const result = onSubmit?.(message);
    if (!result || typeof (result as Promise<unknown>).then !== "function") return;
    const id = ++run.current;
    setBusy(true);
    try {
      await result;
    } catch {
      // The caller handles its own errors; the composer just stops waiting.
    } finally {
      if (id === run.current) setBusy(false);
    }
  };

  const stop = () => {
    run.current++;
    setBusy(false);
    onStop?.();
    focusSoon(field);
  };

  const pick = (suggestion: ComposerSuggestion) => {
    setText(suggestion.prompt ?? suggestion.label);
    requestAnimationFrame(() => {
      const el = field.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const openMenu = () => {
    const anchor = pill.current?.getBoundingClientRect();
    const box = root.current?.getBoundingClientRect();
    if (!anchor || !box) return;
    // Composers usually sit at the bottom of a chat, so it opens upward when there's room and downward otherwise.
    const need = Math.min(380, 16 + (models?.length ?? 0) * 52);
    const below = anchor.top < need + 8 && window.innerHeight - anchor.bottom > anchor.top;
    const left = anchor.left - box.left;
    setMenu(below ? { top: anchor.bottom - box.top + 8, left } : { bottom: box.bottom - anchor.top + 8, left });
  };

  const closeMenu = useCallback((refocus: boolean) => {
    setMenu(null);
    if (refocus) focusSoon(pill);
  }, []);

  const startVoice = () => {
    go("voice");
    void recorder.start();
  };

  const cancelVoice = () => {
    recorder.cancel();
    go("text");
  };

  const finishVoice = async () => {
    const result = await recorder.finish();
    if (result && result.ms > 300) {
      const type = result.audio.type || "audio/webm";
      const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
      const file = new File([result.audio], `voice-note.${ext}`, { type });
      setAttachments((prev) => [...prev, { id: nextId(), kind: "voice", name: "Voice note", meta: formatTime(result.ms), file }]);
    }
    go("text");
  };

  const submitLink = () => {
    const value = link.trim();
    try {
      const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
      if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) throw new Error("not a web link");
      const path = url.pathname === "/" ? "" : url.pathname;
      setAttachments((prev) => [...prev, { id: nextId(), kind: "link", name: url.hostname.replace(/^www\./, "") + path, url: url.href }]);
      setLink("");
      go("text");
    } catch {
      setLinkInvalid(true);
      if (!reduce && linkScope.current) void animateLink(linkScope.current, { x: [0, -6, 6, -3, 3, 0] }, { duration: 0.35 });
      linkInput.current?.focus();
    }
  };

  // A file dragged over the composer opens the drop zone; it closes again if the file leaves without being dropped.
  // dragleave also fires when the panel under the pointer is swapped out, so only a pointer outside the surface
  // counts. dragover keeps firing during a drag, so a long silence ends one that never reported leaving.
  const endDrag = () => {
    setDragging(false);
    if (drag.current.auto) {
      drag.current.auto = false;
      setView(drag.current.from);
    }
  };
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event) || view === "voice") return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!dragging) {
      setDragging(true);
      setMenu(null);
      if (view !== "drop") {
        drag.current.auto = true;
        drag.current.from = view;
        setView("drop");
      }
    }
    window.clearTimeout(drag.current.timer);
    drag.current.timer = window.setTimeout(endDrag, 1200);
  };
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const to = event.relatedTarget as Node | null;
    if (to && event.currentTarget.contains(to)) return;
    const box = event.currentTarget.getBoundingClientRect();
    const { clientX: x, clientY: y } = event;
    if ((x || y) && x > box.left && x < box.right && y > box.top && y < box.bottom) return;
    window.clearTimeout(drag.current.timer);
    drag.current.timer = window.setTimeout(endDrag, 60);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasFiles(event) || view === "voice") return;
    event.preventDefault();
    window.clearTimeout(drag.current.timer);
    drag.current.auto = false;
    setDragging(false);
    addFiles(event.dataTransfer.files);
    go("text");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    if (view === "drop") {
      event.preventDefault();
      if (linkOpen) {
        setLinkOpen(false);
        setLinkInvalid(false);
        focusSoon(linkButton);
      } else go("text");
    } else if (view === "voice") {
      event.preventDefault();
      cancelVoice();
    }
  };

  const onFieldKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!event.clipboardData.files.length) return;
    event.preventDefault();
    addFiles(event.clipboardData.files);
  };

  const textView = (
    <motion.div key="text" {...swap(reduce)} className="p-2">
      <div className={cn("relative flex flex-wrap gap-1.5", attachments.length > 0 && "px-1 pb-0.5 pt-0.5")}>
        <AnimatePresence mode="popLayout" initial={false}>
          {attachments.map((attachment) => (
            <Chip key={attachment.id} attachment={attachment} reduce={reduce} onRemove={() => remove(attachment.id)} />
          ))}
        </AnimatePresence>
      </div>
      <textarea
        ref={field}
        rows={1}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onFieldKeyDown}
        onPaste={onPaste}
        placeholder={sent ? followUpPlaceholder : placeholder}
        aria-label="Message"
        className="block w-full resize-none overflow-y-auto bg-transparent px-2.5 py-2 text-[15px] leading-6 text-(--sc-ink) outline-none placeholder:text-(--sc-faint)"
        style={{ maxHeight: MAX_FIELD }}
      />
      <div className="mt-1 flex items-center gap-1">
        <div className="relative flex min-w-0 flex-1 items-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {offering ? (
              <motion.div key="next" {...swap(reduce, { x: 12 })} className="flex min-w-0 flex-1 items-center gap-1.5">
                <IconButton label="Hide suggestions" onClick={() => setOffering(false)} className="ring-1 ring-inset ring-(--sc-line)">
                  <X />
                </IconButton>
                <SuggestionStrip suggestions={suggestions} onPick={pick} reduce={reduce} />
              </motion.div>
            ) : (
              <motion.div key="tools" {...swap(reduce, { x: -12 })} className="flex min-w-0 flex-1 items-center gap-1">
                <IconButton label="Add files or a link" onClick={() => go("drop")}>
                  <Plus />
                </IconButton>
                {models && current && (
                  <button
                    ref={pill}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={menu !== null}
                    aria-controls={menu ? `${baseId}-menu` : undefined}
                    onClick={() => (menu ? closeMenu(false) : openMenu())}
                    className={cn(
                      "inline-flex h-9 min-w-0 shrink-0 items-center gap-1.5 rounded-full pr-2.5 text-[13.5px] font-medium text-(--sc-ink) outline-none ring-1 ring-inset ring-(--sc-line) transition-colors hover:bg-(--sc-sunken) focus-visible:ring-2 focus-visible:ring-(--sc-accent)",
                      current.icon ? "pl-2.5" : "pl-3.5",
                    )}
                  >
                    {/* The name trades places with the next one while the pill eases to its width. */}
                    <motion.span
                      initial={false}
                      animate={{ width: pillWidth ?? "auto" }}
                      transition={reduce ? { duration: 0 } : RESIZE}
                      className="relative flex overflow-clip"
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={current.id}
                          ref={measurePill}
                          {...swap(reduce, { y: 8 })}
                          className="flex shrink-0 items-center gap-2 whitespace-nowrap [&_svg]:size-4 [&_svg]:shrink-0"
                        >
                          {current.icon}
                          {current.label}
                        </motion.span>
                      </AnimatePresence>
                    </motion.span>
                    <ChevronsUpDown className="size-3.5 shrink-0 text-(--sc-muted)" />
                  </button>
                )}
                {tools.map((tool) => {
                  const on = activeTools.includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      aria-pressed={on}
                      aria-label={tool.label}
                      title={tool.label}
                      onClick={() => setActiveTools((prev) => (on ? prev.filter((t) => t !== tool.id) : [...prev, tool.id]))}
                      className={cn(
                        "hidden h-9 shrink-0 items-center rounded-full px-[9px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-(--sc-accent) @md:inline-flex [&_svg]:size-[18px] [&_svg]:shrink-0",
                        on ? "bg-(--sc-accent)/10 text-(--sc-accent-ink)" : "text-(--sc-muted) hover:bg-(--sc-sunken) hover:text-(--sc-ink)",
                      )}
                    >
                      {tool.icon}
                      <AnimatePresence initial={false}>
                        {on && (
                          <motion.span
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "auto", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={reduce ? { duration: 0 } : RESIZE}
                            className="hidden overflow-clip whitespace-nowrap text-[13px] font-medium @lg:block"
                          >
                            <span className="block pl-1.5 pr-1">{tool.label}</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <IconButton label="Record a voice note" onClick={startVoice} className="ring-1 ring-inset ring-(--sc-line)">
          <Mic />
        </IconButton>
        <button
          type="button"
          onClick={busy ? stop : () => void send()}
          disabled={!busy && !canSend}
          aria-label={busy ? "Stop" : "Send"}
          title={busy ? "Stop" : "Send"}
          className={cn(ACCENT_BUTTON, !busy && !canSend && "bg-(--sc-accent)/30 dark:bg-(--sc-accent)/35")}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={busy ? "stop" : "send"} {...pop(reduce)} className="grid place-items-center">
              {busy ? <Square className="size-3.5! fill-current" /> : <ArrowUp />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );

  const dropView = (
    <motion.div key="drop" {...swap(reduce)} className="p-1.5">
      <div
        onClick={(event) => {
          if (event.target === event.currentTarget) picker.current?.click();
        }}
        className={cn(
          "relative flex flex-col items-center rounded-[20px] border border-dashed px-5 pb-5 pt-6 text-center transition-colors duration-200",
          dragging ? "border-(--sc-accent) bg-(--sc-accent)/10" : "border-(--sc-accent)/35 bg-(--sc-accent)/[0.045]",
        )}
      >
        <IconButton label="Close" onClick={() => go("text")} className="absolute right-1.5 top-1.5 size-8 [&_svg]:size-4">
          <X />
        </IconButton>
        <div className="pointer-events-none relative grid h-6 w-full place-items-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p key={dragging ? "drag" : "rest"} {...swap(reduce, { y: 4 })} className="text-[15px] font-medium text-(--sc-accent-ink)">
              {dragging ? (
                "Let go to add it"
              ) : (
                <>
                  Drop files here or{" "}
                  <button
                    type="button"
                    onClick={() => picker.current?.click()}
                    className="pointer-events-auto underline decoration-(--sc-accent-ink)/35 underline-offset-4 outline-none transition-colors hover:decoration-(--sc-accent-ink) focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-(--sc-accent)"
                  >
                    browse
                  </button>
                </>
              )}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="pointer-events-none mt-1 text-[13px] text-(--sc-accent-ink)/65">PDFs, images, audio and links</p>
        <motion.div
          animate={{ opacity: dragging ? 0.35 : 1 }}
          transition={{ duration: 0.2 }}
          className="relative mt-4 flex h-10 w-full max-w-sm justify-center"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {linkOpen ? (
              <motion.form
                key="link"
                ref={linkScope}
                {...swap(reduce, { y: 4 })}
                onSubmit={(event) => {
                  event.preventDefault();
                  submitLink();
                }}
                className={cn(
                  "flex h-10 w-full items-center gap-2 rounded-full bg-(--sc-surface) pl-3.5 pr-1 ring-1 transition-shadow focus-within:ring-2",
                  linkInvalid ? "ring-red-500/70 focus-within:ring-red-500/70" : "ring-(--sc-line) focus-within:ring-(--sc-accent)",
                )}
              >
                <Link2 className="size-4 shrink-0 text-(--sc-muted)" />
                <input
                  ref={linkInput}
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  value={link}
                  onChange={(event) => {
                    setLink(event.target.value);
                    setLinkInvalid(false);
                  }}
                  placeholder="Paste a link"
                  aria-label="Link"
                  aria-invalid={linkInvalid}
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-(--sc-ink) outline-none placeholder:text-(--sc-faint)"
                />
                <button
                  type="submit"
                  disabled={!link.trim()}
                  className="h-8 shrink-0 rounded-full bg-(--sc-accent) px-3.5 text-[13px] font-medium text-(--sc-on-accent) outline-none transition-[filter,opacity] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-(--sc-accent) focus-visible:ring-offset-2 disabled:opacity-30"
                >
                  Add
                </button>
              </motion.form>
            ) : (
              <motion.div key="sources" {...swap(reduce, { y: 4 })} className="flex items-center gap-2.5">
                <button ref={uploadButton} type="button" aria-label="Upload files" title="Upload files" onClick={() => picker.current?.click()} className={cn(ACCENT_BUTTON, "size-10")}>
                  <Upload />
                </button>
                <button type="button" aria-label="Record a voice note" title="Record a voice note" onClick={startVoice} className={cn(ACCENT_BUTTON, "size-10")}>
                  <Mic />
                </button>
                <button
                  ref={linkButton}
                  type="button"
                  aria-label="Add a link"
                  title="Add a link"
                  onClick={() => {
                    setLinkOpen(true);
                    focusSoon(linkInput);
                  }}
                  className={cn(ACCENT_BUTTON, "size-10")}
                >
                  <Link2 />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );

  const paused = recorder.status === "paused";
  const recording = recorder.status === "recording";
  const voiceView = (
    <motion.div key="voice" {...swap(reduce)} className="px-2 pb-2 pt-3">
      <p aria-live="polite" className="h-4 text-center text-[12.5px] leading-4 text-(--sc-muted)">
        {VOICE_HINT[recorder.status]}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        <button
          ref={cancelButton}
          type="button"
          onClick={cancelVoice}
          className="h-9 shrink-0 rounded-full bg-(--sc-sunken) px-4 text-[14px] font-medium text-(--sc-ink) outline-none transition-colors hover:bg-(--sc-line) focus-visible:ring-2 focus-visible:ring-(--sc-accent)"
        >
          {recorder.status === "error" ? "Back" : "Cancel"}
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5 pl-1.5 pr-1">
          {recorder.status === "error" ? (
            <span className="flex items-center gap-2 text-[14px] text-(--sc-muted) [&_svg]:size-4">
              <MicOff /> No microphone
            </span>
          ) : (
            <>
              <Waveform meter={recorder.meter} live={recording} />
              <motion.span
                aria-hidden
                className={cn("size-2 rounded-full transition-colors", live ? "bg-red-500" : "bg-(--sc-faint)")}
                animate={recording && !reduce ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
                transition={recording && !reduce ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
              />
              <span role="timer" className="min-w-[2.6em] text-[17px] font-semibold tabular-nums tracking-tight text-(--sc-ink)">
                {formatTime(recorder.elapsed)}
              </span>
            </>
          )}
        </div>
        <IconButton
          label={paused ? "Resume" : "Pause"}
          onClick={recorder.togglePause}
          disabled={!live}
          className="ring-1 ring-inset ring-(--sc-line) text-(--sc-ink)"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={paused ? "play" : "pause"} {...pop(reduce)} className="grid place-items-center">
              {paused ? <Play className="size-4! fill-current" /> : <Pause className="size-4! fill-current" />}
            </motion.span>
          </AnimatePresence>
        </IconButton>
        <button
          type="button"
          aria-label="Attach the recording"
          title="Attach the recording"
          onClick={() => void finishVoice()}
          disabled={!live}
          className={cn(ACCENT_BUTTON, "disabled:opacity-30")}
        >
          <Check />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div
      ref={root}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onKeyDown={onKeyDown}
      className={cn("@container relative w-full", THEME, className)}
    >
      <motion.div
        initial={false}
        animate={{ height }}
        transition={reduce ? { duration: 0 } : RESIZE}
        className="relative overflow-clip rounded-[26px] bg-(--sc-surface) shadow-[0_1px_1px_rgb(0_0_0/0.03),0_3px_8px_-2px_rgb(0_0_0/0.05),0_22px_44px_-18px_rgb(0_0_0/0.18)] ring-1 ring-(--sc-line) transition-shadow duration-200 focus-within:ring-(--sc-line-strong)"
      >
        <div ref={content} className="relative">
          <AnimatePresence mode="popLayout" initial={false}>
            {view === "text" ? textView : view === "drop" ? dropView : voiceView}
          </AnimatePresence>
        </div>
      </motion.div>

      <input
        ref={picker}
        type="file"
        multiple
        accept={accept}
        hidden
        tabIndex={-1}
        onChange={(event) => {
          if (event.target.files?.length) {
            addFiles(event.target.files);
            go("text");
          }
          event.target.value = "";
        }}
      />

      <AnimatePresence>
        {menu && models && (
          <ModelMenu
            key="menu"
            id={`${baseId}-menu`}
            models={models}
            value={model}
            style={menu}
            anchor={pill}
            reduce={reduce}
            onPick={(id) => {
              setModel(id);
              closeMenu(true);
            }}
            onClose={closeMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ShiftComposer;
