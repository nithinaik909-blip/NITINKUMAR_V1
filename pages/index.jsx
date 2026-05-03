import dynamic from "next/dynamic";

// Load the PCB Finder component (client-side only — uses browser APIs)
const PCBFinder = dynamic(() => import("../components/PCBFinder"), {
  ssr: false,
});

export default function Home() {
  return <PCBFinder />;
}
