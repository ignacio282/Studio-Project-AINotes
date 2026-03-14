import RouteLoadingScreen from "@/components/ui/RouteLoadingScreen";

export default function BookRouteLoading() {
  return (
    <RouteLoadingScreen
      eyebrow="Book"
      title="Loading your book workspace"
      detail="Bringing in notes, assistant context, and chapter memory for this book."
    />
  );
}
