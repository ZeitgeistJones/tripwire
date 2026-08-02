import { redirect } from "next/navigation";

/** ClawdWire is the public front door — freshness over the stale multi-token board. */
export default function Home() {
  redirect("/dashboard?tab=ClawdWire");
}
