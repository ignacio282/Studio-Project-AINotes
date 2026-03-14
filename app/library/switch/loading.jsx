import RouteLoadingScreen from "@/components/ui/RouteLoadingScreen";

export default function SwitchBookLoading() {
  return (
    <RouteLoadingScreen
      eyebrow="Library"
      title="Loading your books"
      detail="Fetching your library so you can switch context without double-tapping."
    />
  );
}
