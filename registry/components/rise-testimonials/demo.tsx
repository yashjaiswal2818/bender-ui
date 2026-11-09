import { RiseTestimonials, type Testimonial } from "./rise-testimonials";

const testimonials: Testimonial[] = [
  {
    id: "hana",
    name: "Hana Ito",
    role: "Illustrator",
    headline: "I stopped chasing invoices.",
    quote:
      "The last Friday of every month used to go on emailing people about money. Now the reminders go out on their own and I just draw.",
    metric: { value: "11 → 3 days", label: "to get paid" },
  },
  {
    id: "marcus",
    name: "Marcus Bell",
    role: "Plumber, Bell & Daughters",
    headline: "My wife thinks I hired someone.",
    quote:
      "Quotes go out from the van and the deposit is in before I've found the stopcock. She asked who I'd taken on for the paperwork. Nobody. It's the app.",
    metric: { value: "6 hrs", label: "of paperwork back, every week" },
  },
  {
    id: "dana",
    name: "Dana Whitlock",
    role: "Bookkeeper",
    headline: "Clients finally send things in order.",
    quote:
      "Every March I used to get a shoebox of receipts. This year I got a folder, named properly, from people who aren't paid to be organised.",
    metric: { value: "40%", label: "less time on year-end" },
  },
  {
    id: "tomas",
    name: "Tomás Rivera",
    role: "Owner, Rivera Tile",
    headline: "Paid before I'd loaded the truck.",
    quote:
      "A customer paid from the driveway while I was still strapping down the tiles. I checked the screen twice because I thought it was lying.",
    metric: { value: "7 in 10", label: "jobs paid the same day" },
  },
  {
    id: "aisha",
    name: "Aisha Rahman",
    role: "Freelance developer",
    headline: "Fine. It beats my spreadsheet.",
    quote:
      "I built my own tracker three times and abandoned it three times. This one I've used for fourteen months, which says more than I can.",
    metric: { value: "14 months", label: "and still open" },
  },
  {
    id: "jonas",
    name: "Jonas Eklund",
    role: "Photographer",
    headline: "It stays out of my way.",
    quote:
      "I open it twice a week, send what needs sending, and close it. That is the highest praise I have for any piece of software.",
    metric: { value: "2 × 10 min", label: "a week, all in" },
  },
];

export default function RiseTestimonialsDemo() {
  return <RiseTestimonials testimonials={testimonials} />;
}
