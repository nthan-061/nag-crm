import { ActivitiesBoard } from "@/components/activities/activities-board";
import { AppFrame } from "@/components/layout/app-frame";
import { getActivitiesBoard } from "@/lib/services/activities-service";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const board = await getActivitiesBoard();

  return (
    <AppFrame>
      <div className="h-[calc(100vh-1.5rem)] md:h-[calc(100vh-2rem)]">
        <ActivitiesBoard initialBoard={board} />
      </div>
    </AppFrame>
  );
}
