"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { FileText, Globe, Languages, ListChecks, Mail, Paperclip, Scissors, Telescope } from "lucide-react";
import {
  ShiftComposer,
  type ComposerAttachment,
  type ComposerMessage,
  type ComposerModel,
  type ComposerSuggestion,
  type ComposerTool,
} from "./shift-composer";

// Provider logos for the demo only (from LobeHub Icons, MIT). They are the providers' trademarks; the component
// itself takes any icon.
const OpenAI = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden>
    <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" />
  </svg>
);

const Claude = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path fill="#D97757" d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" />
  </svg>
);

const Gemini = () => {
  const id = useId();
  const star = "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z";
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1="7" x2="11" y1="15.5" y2="12">
          <stop stopColor="#08B962" />
          <stop offset="1" stopColor="#08B962" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}r`} gradientUnits="userSpaceOnUse" x1="8" x2="11.5" y1="5.5" y2="11">
          <stop stopColor="#F94543" />
          <stop offset="1" stopColor="#F94543" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}y`} gradientUnits="userSpaceOnUse" x1="3.5" x2="17.5" y1="13.5" y2="12">
          <stop stopColor="#FABC12" />
          <stop offset=".46" stopColor="#FABC12" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={star} fill="#3186FF" />
      <path d={star} fill={`url(#${id}g)`} />
      <path d={star} fill={`url(#${id}r)`} />
      <path d={star} fill={`url(#${id}y)`} />
    </svg>
  );
};

const Grok = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden>
    <path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" />
  </svg>
);

const Mistral = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path fill="#FFD700" d="M3.428 3.4h3.429v3.428H3.428V3.4zm13.714 0h3.43v3.428h-3.43V3.4z" />
    <path fill="#FFAF00" d="M3.428 6.828h6.857v3.429H3.429V6.828zm10.286 0h6.857v3.429h-6.857V6.828z" />
    <path fill="#FF8205" d="M3.428 10.258h17.144v3.428H3.428v-3.428z" />
    <path fill="#FA500F" d="M3.428 13.686h3.429v3.428H3.428v-3.428zm6.858 0h3.429v3.428h-3.429v-3.428zm6.856 0h3.43v3.428h-3.43v-3.428z" />
    <path fill="#E10500" d="M0 17.114h10.286v3.429H0v-3.429zm13.714 0H24v3.429H13.714v-3.429z" />
  </svg>
);

const models: ComposerModel[] = [
  { id: "gpt", label: "GPT-5.2", description: "OpenAI", icon: <OpenAI /> },
  { id: "opus", label: "Claude Opus 5.5", description: "Anthropic", icon: <Claude /> },
  { id: "sonnet", label: "Claude Sonnet 5.5", description: "Anthropic", icon: <Claude /> },
  { id: "gemini", label: "Gemini 3 Pro", description: "Google", icon: <Gemini /> },
  { id: "grok", label: "Grok 4", description: "xAI", icon: <Grok /> },
  { id: "mistral", label: "Mistral Large", description: "Mistral AI", icon: <Mistral /> },
];

const tools: ComposerTool[] = [
  { id: "web", label: "Search", icon: <Globe /> },
  { id: "research", label: "Research", icon: <Telescope /> },
];

const suggestions: ComposerSuggestion[] = [
  {
    id: "quote",
    label: "Turn it into a quote",
    icon: <FileText />,
    prompt: "Turn the walkthrough into a quote with labour and materials on separate lines.",
  },
  { id: "email", label: "Email the client", icon: <Mail />, prompt: "Write the client a short email with the three options." },
  { id: "punch", label: "Make a punch list", icon: <ListChecks /> },
  { id: "shorter", label: "Shorter", icon: <Scissors />, prompt: "Say that again in half the words." },
  { id: "spanish", label: "Spanish for the crew", icon: <Languages />, prompt: "Translate the plan into Spanish for the crew." },
];

const context: ComposerAttachment[] = [{ id: "walkthrough", kind: "file", name: "14 Elm St walkthrough", meta: "Today" }];

interface Turn {
  id: number;
  from: "you" | "model";
  text: string;
  model?: string;
  files?: string[];
  state?: "thinking" | "writing" | "done" | "stopped";
}

const START: Turn[] = [
  { id: 1, from: "you", text: "Notes from this morning at 14 Elm St. She wants the kitchen floor done before her parents visit." },
  {
    id: 2,
    from: "model",
    model: "gpt",
    state: "done",
    text: "Got it. She's choosing between porcelain, slate and vinyl plank, and the subfloor by the back door needs levelling first. Want prices for each?",
  },
];

// Canned replies, so the demo can show a reply being written without calling a model.
const REPLIES = [
  "Here it is split out. Porcelain comes to $4,850: $2,100 labour, $2,750 materials. Slate is $6,200, mostly the stone. Vinyl plank is $2,300 and done in a day. I'd lead with porcelain, it's the one she kept coming back to.",
  "Short version for the client: three options attached, porcelain is the one we'd recommend, and we can start the week of the 18th if she confirms by Friday.",
  "Punch list: level the subfloor by the back door, swap the cracked outlet cover over the sink, recaulk the window, and check the dishwasher supply line before any tile goes down.",
];

function ModelTurn({ turn }: { turn: Turn }) {
  const model = models.find((m) => m.id === turn.model);
  const words = turn.text ? turn.text.split(" ") : [];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[92%]">
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-white ring-1 ring-black/[0.06] dark:bg-neutral-800 dark:ring-white/10 [&_svg]:size-3.5">
          {model?.icon}
        </span>
        <span className="text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400">{model?.label}</span>
      </div>
      {turn.state === "thinking" ? (
        <div aria-label="Thinking" className="mt-3 flex h-6 items-center gap-1 pl-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-neutral-400"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[15px] leading-[1.6] text-neutral-900 dark:text-neutral-100">
          {words.map((word, i) => (
            <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {word}{" "}
            </motion.span>
          ))}
          {turn.state === "stopped" && <span className="text-neutral-400">(stopped)</span>}
        </p>
      )}
    </motion.div>
  );
}

function YourTurn({ turn }: { turn: Turn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", duration: 0.45, bounce: 0 }}
      className="ml-auto max-w-[85%] origin-bottom-right rounded-[20px] rounded-br-md bg-white px-4 py-2.5 text-[15px] leading-[1.55] text-neutral-900 shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-black/[0.06] dark:bg-neutral-800 dark:text-neutral-100 dark:ring-white/10"
    >
      {turn.text}
      {turn.files && turn.files.length > 0 && (
        <span className={turn.text ? "mt-2 flex flex-wrap gap-1.5" : "flex flex-wrap gap-1.5"}>
          {turn.files.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[12.5px] text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
              <Paperclip className="size-3" /> {name}
            </span>
          ))}
        </span>
      )}
    </motion.div>
  );
}

export default function ShiftComposerDemo() {
  const [turns, setTurns] = useState<Turn[]>(START);
  const thread = useRef<HTMLDivElement>(null);
  const stopReply = useRef<() => void>(() => {});
  const seq = useRef(START.length);
  const replies = useRef(0);

  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const update = (id: number, patch: Partial<Turn>) => setTurns((all) => all.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  // Adds your message, then "writes" a canned reply a few words at a time. Resolving the promise turns stop back into send.
  const onSubmit = (message: ComposerMessage) =>
    new Promise<void>((resolve) => {
      const you = ++seq.current;
      const reply = ++seq.current;
      setTurns((all) => [
        ...all,
        { id: you, from: "you", text: message.text, files: message.attachments.map((a) => a.name) },
        { id: reply, from: "model", model: message.model, text: "", state: "thinking" },
      ]);
      const words = REPLIES[replies.current++ % REPLIES.length].split(" ");
      let shown = 0;
      let timer = setTimeout(function write() {
        shown++;
        update(reply, { text: words.slice(0, shown).join(" "), state: shown < words.length ? "writing" : "done" });
        if (shown < words.length) timer = setTimeout(write, 45);
        else resolve();
      }, 900);
      stopReply.current = () => {
        clearTimeout(timer);
        update(reply, { state: "stopped", text: words.slice(0, shown).join(" ") });
        resolve();
      };
    });

  return (
    <div className="mx-auto flex h-[540px] w-full max-w-[640px] flex-col">
      <div
        ref={thread}
        className="min-h-0 flex-1 overflow-y-auto px-1 [mask-image:linear-gradient(to_bottom,transparent,#000_48px)] [scrollbar-width:none]"
      >
        <div className="flex min-h-full flex-col justify-end gap-6 pb-6 pt-12">
          {turns.map((turn) => (turn.from === "you" ? <YourTurn key={turn.id} turn={turn} /> : <ModelTurn key={turn.id} turn={turn} />))}
        </div>
      </div>
      <ShiftComposer
        placeholder="Ask about the walkthrough"
        models={models}
        defaultModel="gpt"
        tools={tools}
        suggestions={suggestions}
        defaultAttachments={context}
        onSubmit={onSubmit}
        onStop={() => stopReply.current()}
      />
    </div>
  );
}
