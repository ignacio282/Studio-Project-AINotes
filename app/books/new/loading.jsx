import RouteLoadingScreen from "@/components/ui/RouteLoadingScreen";

export default function NewBookLoading() {
  return (
    <RouteLoadingScreen
      eyebrow="Library"
      title="Preparing book setup"
      detail="Getting the add-book flow ready."
    />
  );
}
