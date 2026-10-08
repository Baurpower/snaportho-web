import { Suspense } from "react";
import { AnkiDeviceLinkPage } from "@/components/anki/AnkiDeviceLinkPage";

export default function BroBotDeckLinkPage() {
  return (
    <Suspense fallback={null}>
      <AnkiDeviceLinkPage />
    </Suspense>
  );
}
