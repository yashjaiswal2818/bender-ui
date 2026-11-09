import { ScatterPrints, type ScatterPrint } from "./scatter-prints";

// Photos from Unsplash (free under the Unsplash License): coasts of Lofoten, the Faroe Islands and western Norway.
// Each tone is a colour that stands out in its photo, all at the same lightness so none of them shouts.
const url = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=72`;
const print = (id: string, caption: string, location: string, tone: string): ScatterPrint => ({
  src: url(id, 420, 525),
  full: url(id, 1600, 1000),
  caption,
  location,
  tone,
});

const PRINTS: ScatterPrint[] = [
  print("1527004013197-933c4bb611b3", "Red cabins", "Lofoten, Norway", "#bf6b60"),
  print("1753252488398-2c6c5815e32b", "Mykines", "Faroe Islands", "#478cc4"),
  print("1780857774274-079152a315f8", "Nusfjord", "Lofoten, Norway", "#9e842a"),
  print("1742458500183-7c5dd1ecd9eb", "Tromsø", "Northern Norway", "#2f91bd"),
  print("1702217172431-268c4f58e401", "Waterfall", "Faroe Islands", "#619655"),
  print("1723390601001-9bd8d5a29e4f", "Bergen", "Western Norway", "#0099a0"),
  print("1569690262769-16c7bc5dbc65", "Reine", "Lofoten, Norway", "#b7743d"),
  print("1724582980082-6753d3c54ede", "Vágar", "Faroe Islands", "#0995b2"),
  print("1764503852723-34f9f5fbfb3d", "Sea stacks", "Faroe Islands", "#009b97"),
  print("1792338293364-95aaa22e6017", "Above Reine", "Lofoten, Norway", "#be6d54"),
  print("1787385149318-8cc10ada3636", "On stilts", "Lofoten, Norway", "#6d944b"),
  print("1787385149364-ae2ad8096e03", "From above", "Lofoten, Norway", "#5788c7"),
];

export default function ScatterPrintsDemo() {
  return (
    <ScatterPrints prints={PRINTS} className="h-[600px] rounded-[20px] max-sm:h-[520px]">
      <div className="flex h-full select-none flex-col p-[clamp(18px,3cqw,30px)] text-[13px]">
        <header className="flex items-center justify-between">
          <span className="font-semibold tracking-[-0.01em]">Ines Halden</span>
          <nav className="hidden gap-7 opacity-65 sm:flex">
            <span>Work</span>
            <span>Prints</span>
            <span>Notes</span>
          </nav>
          <span className="underline decoration-current/30 underline-offset-4">Write to me</span>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-[23cqw] leading-[0.8] font-extrabold tracking-[-0.05em]">halden</p>
          <p className="mt-[3.2cqw] max-w-[34ch] self-end text-[13.5px] leading-relaxed opacity-70 sm:mr-[7cqw]">
            I photograph northern coasts in the hour before anyone else is up. Prints, a book every few years, and the
            odd commission.
          </p>
        </div>

        <footer className="flex items-end justify-between opacity-60">
          <span>Based in Bergen</span>
          <span>Shooting since 2019</span>
        </footer>
      </div>
    </ScatterPrints>
  );
}
