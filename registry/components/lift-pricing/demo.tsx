import { LiftPricing, type PricingPlan } from "./lift-pricing";

const plans: PricingPlan[] = [
  {
    id: "solo",
    name: "Solo",
    price: "$0",
    period: "forever",
    description: "For side projects and weekend experiments.",
    features: [
      "Up to 3 projects",
      "Community support",
      "7 days of version history",
      { text: "Custom domains", included: false },
    ],
    ctaLabel: "Start free",
  },
  {
    id: "studio",
    name: "Studio",
    price: "$19",
    period: "per month",
    description: "For freelancers shipping client work every week.",
    features: [
      "Unlimited projects",
      "Email support within a day",
      "90 days of version history",
      "Custom domains",
      "Shareable review links",
    ],
    ctaLabel: "Choose Studio",
  },
  {
    id: "team",
    name: "Team",
    price: "$49",
    period: "per seat, per month",
    description: "For small teams that review each other's work.",
    features: [
      "Everything in Studio",
      "Shared workspaces and roles",
      "Unlimited version history",
      "Single sign-on",
      "Priority support",
      "Usage reports for finance",
    ],
    ctaLabel: "Choose Team",
  },
];

export default function LiftPricingDemo() {
  return (
    <LiftPricing
      eyebrow="Pricing"
      heading="Pay for what you ship."
      description="Start free. Open a plan to see exactly what it includes."
      plans={plans}
    />
  );
}
