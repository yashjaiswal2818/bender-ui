"use client";

import {
  ActionsPreview,
  CursorsPreview,
  FeedPreview,
  PresencePreview,
  StirFeatures,
  ThreadPreview,
  type StirFeature,
} from "./stir-features";

const features: StirFeature[] = [
  {
    id: "send",
    title: "Send it where the work is",
    description: "Turn a comment into a ticket in the tracker your team already uses.",
    preview: <FeedPreview />,
  },
  {
    id: "presence",
    title: "See who's on the page",
    description: "Faces show up the moment someone opens the doc. Click one to wave.",
    hue: 285,
    preview: <PresencePreview />,
  },
  {
    id: "thread",
    title: "Comment on the exact line",
    description: "Threads stay pinned to what they're about. Mention a teammate, or just react.",
    hue: 32,
    tall: true,
    preview: <ThreadPreview />,
  },
  {
    id: "actions",
    title: "Close the loop in one click",
    description: "Resolve a thread or hand it to someone without opening another tab.",
    hue: 160,
    preview: <ActionsPreview />,
  },
  {
    id: "cursors",
    title: "Edit together, live",
    description: "Everyone's cursor shows up while they work. Grab a bar and join in.",
    preview: <CursorsPreview />,
  },
];

export default function StirFeaturesDemo() {
  return <StirFeatures features={features} />;
}
