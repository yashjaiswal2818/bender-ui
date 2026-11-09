"use client";

import {
  animate,
  AnimatePresence,
  motion,
  motionValue,
  stagger,
  useAnimate,
  useInView,
  useMotionValueEvent,
  useReducedMotionConfig,
  type AnimationPlaybackControls,
  type MotionValue,
  type Transition,
  type Variants,
} from "motion/react";
import {
  ArrowUp,
  AtSign,
  Bell,
  CalendarClock,
  GitPullRequest,
  Hash,
  ListTodo,
  Mail,
  SmilePlus,
  Ticket,
  UserPlus,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";

export interface StirFeature {
  id: string;
  /** Heading of the card. */
  title: string;
  /** A line or two under the heading. */
  description?: string;
  /** The live picture at the top of the card: one of the previews in this file, or any node. */
  preview?: ReactNode;
  /** Hue (0-360) of the card's tone. Leave it out for a warm neutral. */
  hue?: number;
  /** Spans two rows once there are two columns. */
  tall?: boolean;
}

export interface StirFeaturesProps {
  /** One card each. Five fills the grid neatly. */
  features: StirFeature[];
  className?: string;
}

export interface Person {
  /** Shown on their name tag and in the tooltip. */
  name: string;
  /** Hue (0-360) of their avatar, cursor and name tag. */
  hue?: number;
  /** What the presence tooltip says they're doing. */
  status?: string;
}

const THEME = cn(
  "[--fb-paper:#fff] [--fb-ink:#141416] [--fb-muted:#6c6c74] [--fb-line:rgb(0_0_0/0.07)]",
  "dark:[--fb-paper:#1c1c20] dark:[--fb-ink:#f4f4f5] dark:[--fb-muted:#a1a1aa] dark:[--fb-line:rgb(255_255_255/0.09)]",
);
/** Tinted cards share one lightness and one chroma and only change hue, so any set of hues sits together. */
const TINTED = cn(
  "[--fb-bg:oklch(0.8_0.1_var(--h))] [--fb-fg:oklch(0.26_0.05_var(--h))] [--fb-soft:oklch(0.37_0.06_var(--h))] [--fb-glass:rgb(255_255_255/0.36)]",
  "dark:[--fb-bg:oklch(0.34_0.07_var(--h))] dark:[--fb-fg:oklch(0.96_0.02_var(--h))] dark:[--fb-soft:oklch(0.82_0.04_var(--h))] dark:[--fb-glass:rgb(255_255_255/0.09)]",
);
const NEUTRAL = cn(
  "[--h:85] [--fb-bg:oklch(0.965_0.012_85)] [--fb-fg:oklch(0.25_0.01_85)] [--fb-soft:oklch(0.46_0.012_85)] [--fb-glass:rgb(0_0_0/0.05)]",
  "dark:[--fb-bg:oklch(0.25_0.006_85)] dark:[--fb-fg:oklch(0.96_0.004_85)] dark:[--fb-soft:oklch(0.76_0.008_85)] dark:[--fb-glass:rgb(255_255_255/0.07)]",
);
/** The white surfaces that sit on a card: the ticket, the thread, the resolve chip. */
const PAPER = "bg-(--fb-paper) text-(--fb-ink) shadow-[0_1px_2px_rgb(0_0_0/0.06),0_16px_32px_-16px_rgb(0_0_0/0.32)]";
const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-(--fb-fg)/40";
const GREEN = "oklch(0.63 0.15 155)";

type Bezier = [number, number, number, number];
const EASE: Bezier = [0.22, 1, 0.36, 1];
const NOW = { duration: 0 } as const;
/** Critically damped, for things that travel between spots and must not overshoot them. */
const GLIDE: Transition = { type: "spring", duration: 0.7, bounce: 0 };
/** A little give, for things that pop. */
const SNAP: Transition = { type: "spring", duration: 0.45, bounce: 0.25 };
const FADE: Transition = { duration: 0.35, ease: EASE };

const LIST: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const ITEM: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};
const ITEM_NOW: Variants = { hidden: ITEM.hidden, show: { opacity: 1, y: 0, transition: NOW } };

const PEOPLE = {
  noor: { name: "Noor Haddad", hue: 25 },
  kenji: { name: "Kenji Mori", hue: 255 },
  ines: { name: "Ines Duarte", hue: 155 },
  theo: { name: "Theo Park", hue: 75 },
  ruth: { name: "Ruth Okafor", hue: 320 },
} satisfies Record<string, Person>;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
const firstName = (name: string) => name.split(/\s+/)[0] || name;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const hueVar = (hue: number | undefined) => ({ "--h": hue ?? 250 }) as CSSProperties;

/* ------------------------------------------------------------------ */
/* What a preview knows about its card                                 */
/* ------------------------------------------------------------------ */

interface CardState {
  /** On screen right now. Loops only run while this is true. */
  inView: boolean;
  /** Has been on screen at least once. Entrances wait for it. */
  seen: boolean;
  /** The pointer or focus is inside the card. Loops that would fight the person pause. */
  hot: boolean;
}

// Outside a card (a preview used on its own) everything simply plays.
const CardContext = createContext<CardState>({ inView: true, seen: true, hot: false });
const useCard = () => useContext(CardContext);

const subscribe = () => () => {};
/** Reduced motion, but only once hydrated, so the first client render matches the server's. */
function useStill() {
  const reduce = useReducedMotionConfig();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return hydrated && reduce === true;
}

/** Calls `tick` every `ms` while the card is on screen and nobody is using it. */
function useTicker(ms: number, tick: () => void) {
  const { inView, hot } = useCard();
  const still = useStill();
  const latest = useRef(tick);
  useEffect(() => {
    latest.current = tick;
  });
  const run = inView && !hot && !still;
  useEffect(() => {
    if (!run) return;
    const id = window.setInterval(() => latest.current(), ms);
    return () => window.clearInterval(id);
  }, [run, ms]);
}

function Face({ person, size, className }: { person: Person; size: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ ...hueVar(person.hue), width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cn(
        "grid shrink-0 select-none place-items-center rounded-full font-semibold leading-none",
        "bg-[oklch(0.9_0.06_var(--h))] text-[oklch(0.4_0.12_var(--h))] dark:bg-[oklch(0.42_0.08_var(--h))] dark:text-[oklch(0.94_0.04_var(--h))]",
        className,
      )}
    >
      {initials(person.name)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Feed: actions roll through, the middle one becomes a ticket         */
/* ------------------------------------------------------------------ */

export interface FeedItem {
  id: string;
  /** Main line of the item. */
  label: string;
  /** Shown under the label while the item is the ticket in the middle. */
  detail?: string;
  /** Shown on a tint of `hue`. Any node, such as a lucide icon. */
  icon: ReactNode;
  /** Hue (0-360) of the icon's tint. */
  hue?: number;
}

const FEED: FeedItem[] = [
  { id: "ticket", label: "Open a ticket", detail: "WEB-214 · Fix the checkout copy", icon: <Ticket />, hue: 255 },
  { id: "pr", label: "Link a pull request", detail: "#482 · copy-fixes, 2 approvals", icon: <GitPullRequest />, hue: 300 },
  { id: "sprint", label: "Add to this sprint", detail: "Sprint 19 · ends Thursday", icon: <ListTodo />, hue: 155 },
  { id: "remind", label: "Remind me Friday", detail: "Fri 9:00 · only you", icon: <CalendarClock />, hue: 65 },
  { id: "ping", label: "Ping #design", detail: "14 people · Noor answers first", icon: <Bell />, hue: 25 },
];

// Where an item sits relative to the ticket. The middle copy is invisible: the ticket covers that spot.
const SLOTS = {
  above: { x: -24, y: -112, rotate: -5, opacity: 0, scale: 0.94 },
  top: { x: -24, y: -58, rotate: -5, opacity: 1, scale: 1 },
  middle: { x: 0, y: 0, rotate: -1.5, opacity: 0, scale: 0.94 },
  bottom: { x: 24, y: 58, rotate: 4, opacity: 1, scale: 1 },
  below: { x: 24, y: 112, rotate: 4, opacity: 0, scale: 0.94 },
};
const slotOf = (rel: number, n: number) =>
  rel === 0 ? SLOTS.middle : rel === 1 ? SLOTS.bottom : rel === n - 1 ? SLOTS.top : rel === 2 ? SLOTS.below : SLOTS.above;

// The ticket arrives from the chip it replaces and leaves towards the next one, so the stack reads as one roll.
const TICKET: Variants = {
  enter: (dir: number) => ({ ...(dir > 0 ? SLOTS.bottom : SLOTS.top), opacity: 0 }),
  exit: (dir: number) => ({ ...(dir > 0 ? SLOTS.top : SLOTS.bottom), opacity: 0 }),
};

/** A stack of actions that rolls upward on its own. Point at the card to hold it; click a chip to bring it to the middle. Four or more items read best. */
export function FeedPreview({ items = FEED, every = 2800 }: { items?: FeedItem[]; every?: number }) {
  const still = useStill();
  const { hot, inView } = useCard();
  const [{ index, dir }, setRoll] = useState({ index: 0, dir: 1 });
  useTicker(every, () => setRoll((r) => ({ index: r.index + 1, dir: 1 })));

  const n = items.length;
  if (!n) return null;
  const active = index % n;
  const current = items[active];
  const spread = hot ? 1.12 : 1;
  const move = still ? NOW : GLIDE;

  return (
    <div className="relative grid h-[200px] w-full max-w-[300px] place-items-center">
      {items.map((item, i) => {
        const rel = (i - active + n) % n;
        const slot = slotOf(rel, n);
        const shown = slot === SLOTS.top || slot === SLOTS.bottom;
        return (
          <motion.button
            key={item.id}
            type="button"
            tabIndex={shown ? 0 : -1}
            aria-hidden={!shown}
            onClick={() => setRoll({ index: i, dir: rel === 1 ? 1 : -1 })}
            initial={false}
            animate={{ ...slot, x: slot.x * spread, y: slot.y * spread }}
            transition={move}
            className={cn(
              "col-start-1 row-start-1 flex items-center gap-2 whitespace-nowrap rounded-xl bg-(--fb-glass) px-3 py-2 text-[13px] font-medium text-(--fb-fg) [&_svg]:size-[15px] [&_svg]:shrink-0",
              FOCUS,
              !shown && "pointer-events-none",
            )}
          >
            {item.icon}
            {item.label}
          </motion.button>
        );
      })}

      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={current.id}
          custom={dir}
          variants={TICKET}
          initial="enter"
          animate={{ x: 0, y: 0, rotate: -1.5, opacity: 1, scale: hot ? 1.04 : 1 }}
          exit="exit"
          transition={move}
          className={cn("relative z-10 col-start-1 row-start-1 flex items-center gap-3 rounded-2xl py-2.5 pl-2.5 pr-4", PAPER)}
        >
          <span
            style={hueVar(current.hue)}
            className="relative grid size-9 shrink-0 place-items-center rounded-full bg-[oklch(0.93_0.045_var(--h))] text-[oklch(0.47_0.13_var(--h))] dark:bg-[oklch(0.36_0.07_var(--h))] dark:text-[oklch(0.85_0.09_var(--h))] [&_svg]:size-[17px]"
          >
            {current.icon}
            {inView && !still && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full border-[1.5px] border-current"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.75, opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.6, ease: "easeOut" }}
              />
            )}
          </span>
          <span className="flex flex-col">
            <span className="whitespace-nowrap text-[13.5px] font-medium leading-snug">{current.label}</span>
            {current.detail && <span className="whitespace-nowrap text-[12px] leading-snug text-(--fb-muted)">{current.detail}</span>}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Presence: who's here, and what they're doing                        */
/* ------------------------------------------------------------------ */

const PRESENCE: Person[] = [
  { ...PEOPLE.noor, status: "Reading the brief" },
  { ...PEOPLE.kenji, status: "Editing the hero" },
  { ...PEOPLE.ines, status: "Viewing now" },
  { ...PEOPLE.theo, status: "Away for 4 min" },
  { ...PEOPLE.ruth, status: "Writing a comment" },
];

const FACE = 46;
const ARROW = "M4.5 3.5 19 10.2l-6.3 1.9-2.4 6.4z";

function LiveDot({ pulse }: { pulse: boolean }) {
  return (
    <span className="relative size-1.5 shrink-0 rounded-full bg-emerald-400">
      {pulse && (
        <motion.span
          className="absolute inset-0 rounded-full bg-emerald-400"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 2.8, opacity: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
    </span>
  );
}

/** A row of faces that joins one by one. A cursor visits each person in turn; point at one to see what they're doing, click to wave. */
export function PresencePreview({
  people = PRESENCE,
  defaultActive = 2,
  idleStatus = "Viewing now",
}: {
  people?: Person[];
  defaultActive?: number;
  /** Status for people without their own. */
  idleStatus?: string;
}) {
  const still = useStill();
  const { hot, seen, inView } = useCard();
  const [active, setActive] = useState(defaultActive);
  const [joined, setJoined] = useState(false);
  const [waves, setWaves] = useState<{ id: number; x: number }[]>([]);
  const waveId = useRef(0);
  useTicker(2400, () => setActive((a) => (a + 1) % Math.max(1, people.length)));

  // The join stagger only applies once; after that, a face reacts the moment it's picked.
  useEffect(() => {
    if (!seen || joined) return;
    const id = window.setTimeout(() => setJoined(true), 700 + people.length * 70);
    return () => window.clearTimeout(id);
  }, [seen, joined, people.length]);

  if (!people.length) return null;
  const at = clamp(active, 0, people.length - 1);
  const person = people[at];
  // Initials, unlike photos, can't hide behind a neighbour, so faces only overlap by a few pixels.
  const step = hot ? 50 : 40;
  const row = (people.length - 1) * step + FACE;
  const left = (i: number) => i * step - row / 2;
  const move = still ? NOW : GLIDE;

  const wave = (i: number) => {
    setActive(i);
    if (still) return;
    const id = ++waveId.current;
    setWaves((all) => [...all, { id, x: left(i) + FACE / 2 }]);
  };

  return (
    <div className="relative h-[190px] w-full max-w-[300px]">
      <motion.div
        className="absolute left-1/2 top-3 w-[148px] -translate-x-1/2 overflow-clip rounded-[14px] bg-neutral-950 px-3 py-2 text-center text-white shadow-[0_14px_28px_-14px_rgb(0_0_0/0.6)] dark:bg-white dark:text-neutral-950"
        initial={false}
        animate={{ x: left(at) + FACE / 2, opacity: seen ? 1 : 0 }}
        transition={still ? NOW : { type: "spring", duration: 0.6, bounce: 0.12 }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={at}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={still ? NOW : FADE}
          >
            <p className="truncate text-[14px] font-semibold leading-tight">{firstName(person.name)}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[12px] leading-tight opacity-75">
              <LiveDot pulse={inView && !still} />
              <span className="truncate">{person.status ?? idleStatus}</span>
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {people.map((p, i) => {
        const on = i === at;
        return (
          <motion.div
            key={`${p.name}-${i}`}
            className="absolute left-1/2 top-[98px]"
            style={{ zIndex: on ? 20 : i }}
            initial={false}
            animate={{ x: left(i) }}
            transition={move}
          >
            <motion.button
              type="button"
              aria-label={`Wave at ${p.name}, ${p.status ?? idleStatus}`}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") setActive(i);
              }}
              onFocus={() => setActive(i)}
              onClick={() => wave(i)}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={seen ? { opacity: 1, scale: on ? 1.16 : 1, y: on ? -4 : 0 } : { opacity: 0, scale: 0.5, y: 0 }}
              transition={still ? NOW : { ...SNAP, delay: joined ? 0 : i * 0.07 }}
              className={cn("block rounded-full shadow-[0_0_0_3px_var(--fb-paper),0_8px_16px_-8px_rgb(0_0_0/0.45)]", FOCUS)}
            >
              <Face person={p} size={FACE} />
            </motion.button>
          </motion.div>
        );
      })}

      <motion.svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-1/2 top-[98px] z-30 size-[22px] drop-shadow-[0_2px_3px_rgb(0_0_0/0.3)]"
        initial={false}
        animate={{ x: left(at) + FACE - 10, y: FACE - 12, opacity: seen ? 1 : 0 }}
        transition={still ? NOW : { type: "spring", duration: 0.9, bounce: 0.1 }}
      >
        <path d={ARROW} className="fill-neutral-950 stroke-white" strokeWidth={1.6} strokeLinejoin="round" />
      </motion.svg>

      {waves.map((w) => (
        <motion.span
          key={w.id}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[86px] z-40 -ml-3 text-[22px] leading-none"
          initial={{ x: w.x, y: 0, opacity: 0, scale: 0.4 }}
          animate={{ y: -54, opacity: [0, 1, 1, 0], scale: 1, rotate: [0, -16, 14, -8, 0] }}
          transition={{ duration: 1.2, ease: EASE }}
          onAnimationComplete={() => setWaves((all) => all.filter((x) => x.id !== w.id))}
        >
          👋
        </motion.span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Thread: a comment thread that plays out, then takes your reply      */
/* ------------------------------------------------------------------ */

export interface Reaction {
  /** The reaction itself. */
  emoji: string;
  /** How many people left it. */
  count: number;
}

export interface ThreadMessage {
  id: string;
  /** Who wrote it. */
  author: Person;
  /** When, as you want it shown, like "2m". */
  time: string;
  /** The message. */
  text: ReactNode;
  /** Shown under the message. */
  reactions?: Reaction[];
}

export function Mention({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-[oklch(0.5_0.16_255)] dark:text-[oklch(0.78_0.11_255)]">{children}</span>;
}

const THREAD: ThreadMessage[] = [
  {
    id: "noor",
    author: PEOPLE.noor,
    time: "10:42",
    text: (
      <>
        <Mention>@Kenji</Mention> the hero still says &ldquo;launching soon&rdquo;. Can it change before the 3pm demo?
      </>
    ),
  },
  {
    id: "kenji",
    author: PEOPLE.kenji,
    time: "10:44",
    text: "Swapping it now. New line in ten.",
    reactions: [
      { emoji: "👍", count: 2 },
      { emoji: "🙏", count: 1 },
    ],
  },
];

const YOU: Person = { name: "You", hue: 210 };
const EXTRA = "🎉";

function Count({ value, still }: { value: number; still: boolean }) {
  return (
    <span className="relative inline-flex h-4 items-center overflow-clip tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={still ? NOW : SNAP}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Message({
  message,
  reactions,
  mine,
  onToggle,
  still,
}: {
  message: ThreadMessage;
  reactions: Reaction[];
  mine: Record<string, boolean>;
  onToggle: (key: string) => void;
  still: boolean;
}) {
  const extraKey = `${message.id}:${EXTRA}`;
  const list =
    mine[extraKey] && !reactions.some((r) => r.emoji === EXTRA) ? [...reactions, { emoji: EXTRA, count: 0 }] : reactions;

  return (
    <div className="group/msg relative flex gap-2.5 px-4 pt-3.5">
      <Face person={message.author} size={24} className="mt-px" />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2 pr-6 leading-none">
          <span className="text-[12.5px] font-semibold">{firstName(message.author.name)}</span>
          <span className="text-[11px] text-(--fb-muted)">{message.time}</span>
        </p>
        <div className="mt-1 text-pretty text-[13px] leading-snug">{message.text}</div>
        <AnimatePresence initial={false}>
          {list.length > 0 && (
            <motion.div
              key="reactions"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={still ? NOW : { duration: 0.35, ease: EASE }}
              className="overflow-clip"
            >
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {list.map((r, i) => {
                    const key = `${message.id}:${r.emoji}`;
                    const on = !!mine[key];
                    const count = r.count + (on ? 1 : 0);
                    return (
                      <motion.button
                        key={r.emoji}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${r.emoji} ${count}`}
                        onClick={() => onToggle(key)}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        whileTap={{ scale: 0.88 }}
                        transition={still ? NOW : { ...SNAP, delay: i * 0.08 }}
                        className={cn(
                          "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11.5px] transition-colors",
                          on
                            ? "border-[oklch(0.72_0.12_var(--h))] bg-[oklch(0.95_0.035_var(--h))] dark:bg-[oklch(0.36_0.07_var(--h))]"
                            : "border-(--fb-line) bg-(--fb-paper) hover:border-[oklch(0.8_0.08_var(--h))]",
                          FOCUS,
                        )}
                      >
                        <span aria-hidden>{r.emoji}</span>
                        <Count value={count} still={still} />
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Shows on hover, like a chat app's message actions, so messages without reactions stay one row shorter. */}
      <button
        type="button"
        aria-label={`React with ${EXTRA}`}
        aria-pressed={!!mine[extraKey]}
        onClick={() => onToggle(extraKey)}
        className={cn(
          "absolute right-3 top-2.5 grid size-6 place-items-center rounded-full text-(--fb-muted) opacity-0 transition hover:bg-black/[0.05] hover:text-(--fb-ink) focus-visible:opacity-100 group-hover/msg:opacity-100 dark:hover:bg-white/[0.08]",
          FOCUS,
        )}
      >
        <SmilePlus className="size-3.5" />
      </button>
    </div>
  );
}

function Typing({ person, still }: { person: Person; still: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-3.5">
      <Face person={person} size={24} />
      <span className="flex h-7 items-center gap-1 rounded-full bg-black/[0.05] px-3 dark:bg-white/[0.08]">
        <span className="sr-only">{firstName(person.name)} is typing</span>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="size-1.5 rounded-full bg-(--fb-muted)"
            animate={still ? { y: 0, opacity: 0.7 } : { y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
            transition={still ? NOW : { duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * A comment pinned to a line of a document. The first time it's on screen the conversation plays out: someone
 * types, the reply lands, the reactions come in. Then it's yours: react, or send a reply and someone reacts to it.
 */
export function ThreadPreview({
  messages = THREAD,
  you = YOU,
  placeholder = "Reply or @mention someone",
  replyReaction = "👀",
}: {
  messages?: ThreadMessage[];
  you?: Person;
  placeholder?: string;
  /** What lands on your reply a moment after you send it. */
  replyReaction?: string;
}) {
  const still = useStill();
  const { seen, hot, inView } = useCard();
  // 0 shows the first message. After that each message gets two steps (its author typing, then the message),
  // and the last step brings in the reactions.
  const end = Math.max(1, messages.length * 2 - 1);
  const [phase, setPhase] = useState(0);
  const at = still ? end : phase;
  const [sent, setSent] = useState<ThreadMessage[]>([]);
  const [mine, setMine] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!seen || still || phase >= end) return;
    const id = window.setTimeout(() => setPhase((p) => p + 1), phase % 2 ? 1500 : 900);
    return () => window.clearTimeout(id);
  }, [seen, still, phase, end]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const shown = messages.slice(0, Math.floor(at / 2) + 1);
  const typing = at % 2 === 1 && at < end ? messages[Math.floor(at / 2) + 1]?.author : undefined;
  const settled = at >= end;
  const rows = [
    ...shown.map((m) => ({ m, reactions: settled ? (m.reactions ?? []) : [] })),
    ...sent.map((m) => ({ m, reactions: m.reactions ?? [] })),
  ];
  const t: Transition = still ? NOW : { duration: 0.45, ease: EASE };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const id = `you-${Date.now()}`;
    setSent((all) => [...all, { id, author: you, time: "now", text }]);
    setDraft("");
    timers.current.push(
      window.setTimeout(
        () => setSent((all) => all.map((m) => (m.id === id ? { ...m, reactions: [{ emoji: replyReaction, count: 1 }] } : m))),
        still ? 0 : 1100,
      ),
    );
  };

  return (
    <div className="flex w-full max-w-[330px] flex-col gap-7 self-stretch pt-1">
      <motion.div
        initial={false}
        animate={{ y: hot ? -4 : 0 }}
        transition={still ? NOW : GLIDE}
        className={cn("overflow-clip rounded-[20px]", PAPER)}
      >
        {/* The panel is as tall as the finished conversation from the start: an invisible copy of it sets the
            height, and the live messages sit in front, anchored to the bottom like any chat. Nothing on the page
            moves while the thread plays out, and replies scroll the oldest message out of the top. */}
        <div className="relative max-h-[262px] overflow-clip">
          <div aria-hidden className="invisible pb-1">
            {messages.map((m) => (
              <Message key={m.id} message={m} reactions={m.reactions ?? []} mine={{}} onToggle={() => {}} still />
            ))}
          </div>
          <div
            className={cn(
              "absolute inset-0 flex flex-col justify-end overflow-clip pb-1",
              sent.length > 0 && "[mask-image:linear-gradient(to_bottom,transparent,#000_36px)]",
            )}
          >
            <AnimatePresence initial={false}>
              {rows.map(({ m, reactions }) => (
                <motion.div
                  key={m.id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={t}
                  className="shrink-0 overflow-clip"
                >
                  <Message message={m} reactions={reactions} mine={mine} onToggle={(k) => setMine((all) => ({ ...all, [k]: !all[k] }))} still={still} />
                </motion.div>
              ))}
              {typing && (
                <motion.div
                  key="typing"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={t}
                  className="shrink-0 overflow-clip"
                >
                  <Typing person={typing} still={still} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <form onSubmit={submit} className="mt-2 border-t border-(--fb-line)">
          <input
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            aria-label="Reply"
            className="block w-full bg-transparent px-4 pb-1 pt-3 text-[13px] text-(--fb-ink) outline-none placeholder:text-(--fb-muted)"
          />
          <div className="flex items-center px-2 pb-2 pt-1">
            <button
              type="button"
              aria-label="Mention someone"
              onClick={() => {
                setDraft((d) => (d && !d.endsWith(" ") ? `${d} @` : `${d}@`));
                input.current?.focus();
              }}
              className={cn(
                "grid size-7 place-items-center rounded-full text-(--fb-muted) transition-colors hover:bg-black/[0.05] hover:text-(--fb-ink) dark:hover:bg-white/[0.08]",
                FOCUS,
              )}
            >
              <AtSign className="size-[15px]" />
            </button>
            <motion.button
              type="submit"
              aria-label="Send"
              disabled={!draft.trim()}
              whileTap={{ scale: 0.88 }}
              className={cn(
                "ml-auto grid size-7 place-items-center rounded-full bg-[oklch(0.6_0.15_var(--h))] text-white transition-opacity disabled:opacity-40",
                FOCUS,
              )}
            >
              <ArrowUp className="size-4" />
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* The page the thread is about, with the line it's pinned to. */}
      <div
        aria-hidden
        // h-0 + flex-1: it fills whatever the card has left and never makes the card taller.
        className="flex h-0 min-h-[84px] flex-1 flex-col gap-2.5 overflow-clip px-1 pt-1 [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]"
      >
        <i className="block h-2 w-[88%] shrink-0 rounded-full bg-(--fb-glass)" />
        <span className="flex shrink-0 items-center gap-2">
          <i className="block h-2 w-[26%] rounded-full bg-(--fb-glass)" />
          <i className="block h-4 w-[38%] rounded-[5px] bg-(--fb-paper)/75" />
          <motion.span
            className="-my-3 rounded-full rounded-bl-[4px] bg-(--fb-paper) p-[3px] shadow-[0_8px_16px_-8px_rgb(0_0_0/0.4)]"
            animate={inView && !still ? { y: [0, -4, 0] } : { y: 0 }}
            transition={inView && !still ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" } : NOW}
          >
            <Face person={messages[0]?.author ?? you} size={24} />
          </motion.span>
        </span>
        {[74, 52, 0, 90, 82, 64, 86, 40].map((w, i) =>
          w ? (
            <i key={i} style={{ width: `${w}%` }} className="block h-2 shrink-0 rounded-full bg-(--fb-glass)" />
          ) : (
            <i key={i} className="block h-2 shrink-0" />
          ),
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Actions: loose chips you can throw around, and one that resolves    */
/* ------------------------------------------------------------------ */

export interface ActionItem {
  id: string;
  /** Text on the chip. */
  label: string;
  /** Shown before the label. Any node, such as a lucide icon. */
  icon: ReactNode;
}

const ACTIONS: ActionItem[] = [
  { id: "post", label: "Post in #launch", icon: <Hash /> },
  { id: "email", label: "Email the client", icon: <Mail /> },
  { id: "assign", label: "Assign to Ines", icon: <UserPlus /> },
];

/** Follow-up chips that drift, drag and spring back home, around a white chip that resolves the thread. */
export function ActionsPreview({
  actions = ACTIONS,
  resolveLabel = "Resolve thread",
  resolvedLabel = "Resolved",
  defaultResolved = false,
  onResolvedChange,
}: {
  actions?: ActionItem[];
  resolveLabel?: string;
  resolvedLabel?: string;
  defaultResolved?: boolean;
  onResolvedChange?: (resolved: boolean) => void;
}) {
  const still = useStill();
  const { hot, inView } = useCard();
  const [resolved, setResolved] = useState(defaultResolved);
  const [labelWidth, setLabelWidth] = useState<number | null>(null);
  const [scope, animateScope] = useAnimate();
  // A drag ends with a click on the chip under the pointer; this keeps that click from toggling.
  const dragged = useRef(false);
  const measure = useCallback((el: HTMLSpanElement | null) => {
    if (el) setLabelWidth(el.offsetWidth);
  }, []);

  const half = Math.ceil(actions.length / 2);
  const rows: (ActionItem | null)[] = [...actions.slice(0, half), null, ...actions.slice(half)];
  const gap = rows.length > 1 ? 136 / (rows.length - 1) : 0;
  const bobbing = inView && !still;

  const toggle = () => {
    if (dragged.current) return;
    const next = !resolved;
    setResolved(next);
    onResolvedChange?.(next);
    // The follow-ups give a small nod as the thread closes.
    if (next && !still && actions.length) {
      animateScope("[data-chip='action']", { scale: [1, 1.07, 1] }, { duration: 0.45, delay: stagger(0.06, { startDelay: 0.08 }) });
    }
  };

  return (
    <div ref={scope} className="relative h-[200px] w-full max-w-[300px]">
      {rows.map((item, i) => {
        const x = item ? (i % 2 ? 42 : -40) : -2;
        const y = -68 + i * gap;
        const rotate = item ? (i % 2 ? 5 : -5) : -2;
        return (
          <motion.div
            key={item?.id ?? "resolve"}
            className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2", !item && "z-10")}
            initial={false}
            animate={{ x: x * (hot ? 1.14 : 1), y: y * (hot ? 1.06 : 1) }}
            transition={still ? NOW : GLIDE}
          >
            <motion.div
              drag
              dragSnapToOrigin
              dragElastic={0.22}
              dragTransition={{ bounceStiffness: 380, bounceDamping: 20 }}
              whileDrag={{ scale: 1.07, zIndex: 30 }}
              onPointerDown={() => {
                dragged.current = false;
              }}
              onDragStart={() => {
                dragged.current = true;
              }}
              className="relative cursor-grab touch-none active:cursor-grabbing"
            >
              <motion.div
                animate={bobbing ? { y: [0, -3, 0] } : { y: 0 }}
                transition={bobbing ? { duration: 3 + (i % 3) * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 } : NOW}
              >
                {item ? (
                  <div
                    data-chip="action"
                    style={{ rotate: `${rotate}deg` }}
                    className="flex select-none items-center gap-2 whitespace-nowrap rounded-xl bg-(--fb-glass) px-3 py-2 text-[13px] font-medium text-(--fb-fg) [&_svg]:size-[15px] [&_svg]:shrink-0"
                  >
                    {item.icon}
                    {item.label}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-pressed={resolved}
                    style={{ rotate: `${rotate}deg` }}
                    className={cn("flex select-none items-center gap-2.5 rounded-2xl py-2.5 pl-2.5 pr-4 text-[14px] font-medium", PAPER, FOCUS)}
                  >
                    <span className="relative grid size-6 shrink-0 place-items-center">
                      <span
                        className={cn(
                          "absolute inset-0 rounded-full border-[1.5px] border-[oklch(0.63_0.15_155)] transition-colors duration-300",
                          resolved ? "bg-[oklch(0.63_0.15_155)]" : "bg-transparent",
                        )}
                      />
                      {resolved && !still && (
                        <motion.span
                          className="absolute inset-0 rounded-full border-2 border-[oklch(0.63_0.15_155)]"
                          initial={{ scale: 1, opacity: 0.7 }}
                          animate={{ scale: 2.3, opacity: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      )}
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="relative size-3.5">
                        <motion.path
                          key={resolved ? "on" : "off"}
                          d="M5 12.5l4.5 4.5L19 7.5"
                          stroke={resolved ? "#fff" : GREEN}
                          strokeWidth={2.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={resolved && !still ? { pathLength: 0 } : false}
                          animate={{ pathLength: 1, opacity: resolved ? 1 : 0.55 }}
                          transition={still ? NOW : { duration: 0.35, ease: EASE, delay: 0.08 }}
                        />
                      </svg>
                    </span>
                    <motion.span
                      className="relative inline-flex overflow-clip"
                      initial={false}
                      animate={{ width: labelWidth ?? "auto" }}
                      transition={still ? NOW : GLIDE}
                    >
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          key={resolved ? "done" : "open"}
                          ref={measure}
                          className="whitespace-nowrap"
                          initial={{ y: 14, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -14, opacity: 0 }}
                          transition={still ? NOW : SNAP}
                        >
                          {resolved ? resolvedLabel : resolveLabel}
                        </motion.span>
                      </AnimatePresence>
                    </motion.span>
                  </button>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cursors: teammates resize a chart while you watch, and so can you   */
/* ------------------------------------------------------------------ */

const CREW: Person[] = [PEOPLE.noor, PEOPLE.kenji, PEOPLE.ines];
/** Height of the chart, in px. */
const H = 180;
// Where the cursors wait before anyone starts working, and where they stay with reduced motion.
const REST = [
  { x: 36, y: 40 },
  { x: 190, y: 24 },
  { x: 120, y: 118 },
];

type Tween = { duration: number; ease?: Bezier };
// x and y take different curves on the way to a bar, so the path bends like a hand's would.
const REACH_X: Tween = { duration: 0.95, ease: [0.45, 0, 0.2, 1] };
const REACH_Y: Tween = { duration: 0.95, ease: [0.25, 0, 0.35, 1] };
const PRESS: Tween = { duration: 0.12 };
const PULL: Tween = { duration: 0.75, ease: [0.65, 0, 0.35, 1] };
const DRIFT: Tween = { duration: 1.1, ease: [0.4, 0, 0.2, 1] };

/** Who has a bar: a teammate's index, YOURS, or nobody. */
const YOURS = -1;

type CursorValues = { x: MotionValue<number>; y: MotionValue<number>; scale: MotionValue<number> };

function CrewCursor({
  person,
  cursor,
  stage,
  still,
}: {
  person: Person;
  cursor: CursorValues;
  stage: RefObject<HTMLDivElement | null>;
  still: boolean;
}) {
  const [flip, setFlip] = useState(false);
  // Near the right edge the name tag swings to the cursor's left, so the card never cuts it off.
  useMotionValueEvent(cursor.x, "change", (x) => setFlip(x > (stage.current?.offsetWidth ?? 300) - 96));
  const swing = still ? NOW : SNAP;

  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-10 origin-top-left"
      style={{ x: cursor.x, y: cursor.y, scale: cursor.scale, ...hueVar(person.hue) }}
    >
      <svg viewBox="0 0 24 24" className="block size-[18px] -translate-x-[3px] -translate-y-[2px] drop-shadow-[0_1px_2px_rgb(0_0_0/0.25)]">
        <path d={ARROW} className="fill-[oklch(0.68_0.15_var(--h))] stroke-white" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
      <motion.span className="absolute left-3 top-3.5" initial={false} animate={{ x: flip ? -15 : 0 }} transition={swing}>
        <motion.span
          className="block whitespace-nowrap rounded-full bg-[oklch(0.83_0.11_var(--h))] px-2.5 py-[3px] text-[12px] font-semibold text-[oklch(0.27_0.07_var(--h))] shadow-[0_6px_14px_-8px_rgb(0_0_0/0.4)]"
          initial={false}
          animate={{ x: flip ? "-100%" : "0%" }}
          transition={swing}
        >
          {firstName(person.name)}
        </motion.span>
      </motion.span>
    </motion.div>
  );
}

/**
 * A bar chart with teammates' cursors on it. Each one picks a bar, grabs its top and drags it to a new height,
 * then wanders off. Drag a bar yourself and whoever had it lets go. The cursors keep going while you point at the card.
 */
export function CursorsPreview({
  people = CREW,
  bars = [38, 62, 92, 54, 74],
}: {
  people?: Person[];
  /** Starting heights, in percent. Read once. */
  bars?: number[];
}) {
  const still = useStill();
  const { inView } = useCard();
  const stage = useRef<HTMLDivElement>(null);
  const columns = useRef<(HTMLDivElement | null)[]>([]);
  const [heights] = useState(() => bars.map((b) => motionValue(((H - 12) * clamp(b, 5, 100)) / 100)));
  const [cursors] = useState(() =>
    people.map((_, i) => {
      const rest = REST[i % REST.length];
      return { x: motionValue(rest.x), y: motionValue(rest.y), scale: motionValue(1) };
    }),
  );
  const [holders, setHolders] = useState<(number | null)[]>(() => bars.map(() => null));
  const held = useRef<number | null>(null);
  // Stops whatever a teammate is doing to a bar. Set by the running loop.
  const halt = useRef<(bar: number) => void>(() => {});
  const crew = Math.min(people.length, cursors.length);

  useEffect(() => {
    if (!inView || still) return;
    let alive = true;
    const live = new Map<AnimationPlaybackControls, () => void>();
    const byBar = new Map<number, AnimationPlaybackControls[]>();
    const timers = new Set<number>();
    const busy = new Set<number>();
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const claim = (bar: number, who: number | null, unless?: number) =>
      setHolders((all) => all.map((v, i) => (i === bar && v !== unless ? who : v)));

    // Resolves when the animation finishes or is stopped, so a loop never waits on a cancelled step.
    const go = (value: MotionValue<number>, to: number, tween: Tween, bar?: number) =>
      new Promise<void>((done) => {
        const holder: { controls?: AnimationPlaybackControls } = {};
        const finish = () => {
          if (holder.controls) live.delete(holder.controls);
          done();
        };
        holder.controls = animate(value, to, { ...tween, onComplete: finish });
        live.set(holder.controls, finish);
        if (bar !== undefined) byBar.set(bar, [...(byBar.get(bar) ?? []), holder.controls]);
      });
    const stop = (controls: AnimationPlaybackControls) => {
      controls.stop();
      live.get(controls)?.();
    };
    const wait = (ms: number) =>
      new Promise<void>((done) => {
        const id = window.setTimeout(() => {
          timers.delete(id);
          done();
        }, ms);
        timers.add(id);
      });

    halt.current = (bar) => {
      byBar.get(bar)?.forEach(stop);
      byBar.delete(bar);
    };

    const work = async (p: number) => {
      const me = cursors[p];
      await wait(500 + p * 1100);
      while (alive) {
        const free = heights.map((_, b) => b).filter((b) => !busy.has(b) && held.current !== b);
        if (!free.length) {
          await wait(400);
          continue;
        }
        const bar = free[Math.floor(Math.random() * free.length)];
        const column = columns.current[bar];
        if (!column) return;
        busy.add(bar);
        const x = column.offsetLeft + column.offsetWidth * rand(0.35, 0.65);
        await Promise.all([go(me.x, x, REACH_X), go(me.y, H - heights[bar].get(), REACH_Y)]);
        if (!alive) return;
        if (held.current !== bar) {
          claim(bar, p);
          await go(me.scale, 0.85, PRESS);
          if (!alive) return;
          if (held.current !== bar) {
            const from = heights[bar].get();
            let to = rand(28, H - 18);
            if (Math.abs(to - from) < 36) to = from > H / 2 ? from - rand(40, 70) : from + rand(40, 70);
            to = clamp(to, 18, H - 10);
            await Promise.all([go(heights[bar], to, PULL, bar), go(me.y, H - to, PULL, bar)]);
            if (!alive) return;
          }
          byBar.delete(bar);
          claim(bar, null, YOURS);
          void go(me.scale, 1, PRESS);
        }
        busy.delete(bar);
        const width = stage.current?.offsetWidth ?? 280;
        await Promise.all([
          go(me.x, clamp(me.x.get() + rand(-60, 60), 8, width - 72), DRIFT),
          go(me.y, clamp(me.y.get() - rand(16, 54), 6, H - 36), DRIFT),
        ]);
        if (!alive) return;
        await wait(rand(600, 1700));
      }
    };
    for (let p = 0; p < crew; p++) void work(p);

    return () => {
      alive = false;
      live.forEach((finish, controls) => {
        controls.stop();
        finish();
      });
      timers.forEach((id) => window.clearTimeout(id));
      halt.current = () => {};
      setHolders((all) => all.map((v) => (v === YOURS ? v : null)));
      cursors.forEach((c) => c.scale.set(1));
    };
  }, [inView, still, cursors, heights, crew]);

  const follow = (bar: number, clientY: number) => {
    const box = stage.current?.getBoundingClientRect();
    if (box) heights[bar].set(clamp(box.bottom - clientY, 14, H - 4));
  };
  const grab = (bar: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
    // A finger only grabs the handle at the top of a bar, so the rest of the card still scrolls the page.
    if (e.button !== 0 || (e.pointerType !== "mouse" && !(e.target as HTMLElement).closest("[data-handle]"))) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    held.current = bar;
    halt.current(bar);
    setHolders((all) => all.map((v, i) => (i === bar ? YOURS : v)));
    follow(bar, e.clientY);
  };
  const release = (bar: number) => () => {
    if (held.current !== bar) return;
    held.current = null;
    setHolders((all) => all.map((v, i) => (i === bar ? null : v)));
  };

  return (
    <div ref={stage} aria-hidden className="relative h-[180px] w-full max-w-[300px] select-none">
      <div className="absolute inset-0 flex items-end gap-2.5">
        {heights.map((height, b) => {
          const who = holders[b];
          const teammate = who !== null && who !== YOURS ? people[who] : undefined;
          return (
            <div
              key={b}
              ref={(el) => {
                columns.current[b] = el;
              }}
              onPointerDown={grab(b)}
              onPointerMove={(e) => {
                if (held.current === b) follow(b, e.clientY);
              }}
              onPointerUp={release(b)}
              onPointerCancel={release(b)}
              onLostPointerCapture={release(b)}
              className="group/bar flex h-full flex-1 cursor-ns-resize items-end"
            >
              <motion.div
                style={{ height, ...(teammate ? hueVar(teammate.hue) : {}) }}
                className={cn(
                  "relative w-full rounded-[10px] transition-colors duration-300",
                  who === null && "bg-(--fb-glass)",
                  who === YOURS && "bg-(--fb-fg)/20",
                  teammate && "bg-[oklch(0.84_0.1_var(--h))] dark:bg-[oklch(0.5_0.1_var(--h))]",
                )}
              >
                <span data-handle className="absolute inset-x-0 -top-3 flex h-7 touch-none justify-center pt-3">
                  <span
                    className={cn(
                      "h-[3px] w-4 rounded-full bg-(--fb-fg)/35 transition-opacity",
                      who === YOURS ? "opacity-100" : "opacity-0 group-hover/bar:opacity-100",
                    )}
                  />
                </span>
              </motion.div>
            </div>
          );
        })}
      </div>

      {people.slice(0, crew).map((p, i) => (
        <CrewCursor key={`${p.name}-${i}`} person={p} cursor={cursors[i]} stage={stage} still={still} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The grid                                                            */
/* ------------------------------------------------------------------ */

function Card({ feature, still }: { feature: StirFeature; still: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const titleId = useId();
  const inView = useInView(ref, { amount: 0.3 });
  const seen = useInView(ref, { amount: 0.3, once: true });
  // Pointer and focus are tracked apart: pressing a chip moves focus out of the card while the pointer is still on it.
  const [pointer, setPointer] = useState(false);
  const [focus, setFocus] = useState(false);
  const hot = pointer || focus;
  const tinted = feature.hue !== undefined;

  return (
    <motion.li
      ref={ref}
      variants={still ? ITEM_NOW : ITEM}
      aria-labelledby={titleId}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setPointer(true);
      }}
      onPointerLeave={() => setPointer(false)}
      onFocus={() => setFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false);
      }}
      style={tinted ? hueVar(feature.hue) : undefined}
      className={cn(
        "relative flex min-h-[300px] flex-col overflow-clip rounded-[28px] bg-(--fb-bg) text-(--fb-fg) ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]",
        tinted ? TINTED : NEUTRAL,
        feature.tall && "@xl:row-span-2",
      )}
    >
      <CardContext.Provider value={{ inView, seen, hot }}>
        <div className="relative flex flex-1 items-center justify-center px-5 pt-6">{feature.preview}</div>
        <div className="px-6 pb-6 pt-4">
          <h3 id={titleId} className="text-[17px] font-semibold leading-snug tracking-[-0.01em]">
            {feature.title}
          </h3>
          {feature.description && <p className="mt-1 text-pretty text-[14px] leading-snug text-(--fb-soft)">{feature.description}</p>}
        </div>
      </CardContext.Provider>
    </motion.li>
  );
}

/**
 * A bento of feature cards where each picture is a small working product. One column on phones, two from a
 * medium container, three from a wide one; a `tall` card spans two rows.
 */
export function StirFeatures({ features, className }: StirFeaturesProps) {
  const still = useStill();
  return (
    <div className={cn("@container", THEME, className)}>
      <motion.ul
        variants={LIST}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="grid grid-cols-1 gap-3 @xl:grid-flow-dense @xl:auto-rows-[minmax(300px,auto)] @xl:grid-cols-2 @xl:gap-4 @4xl:grid-cols-3"
      >
        {features.map((feature) => (
          <Card key={feature.id} feature={feature} still={still} />
        ))}
      </motion.ul>
    </div>
  );
}

export default StirFeatures;
