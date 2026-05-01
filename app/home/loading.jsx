import ScribaLoadingScreen from "@/components/ui/ScribaLoadingScreen";

export default function HomeLoading() {
  return (
    <ScribaLoadingScreen
      title="Preparing your dashboard"
      message="Checking your latest notes and memory..."
      status="Preparing home dashboard"
    />
  );
}
