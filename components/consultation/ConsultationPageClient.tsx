"use client";

import { useRouter } from "next/navigation";
import ConsultationWizard from "@/components/consultation/ConsultationWizard";

export default function ConsultationPageClient() {
  const router = useRouter();

  return (
    <ConsultationWizard
      onComplete={(id) => {
        if (id) {
          router.push(`/consultation/results?consultation_id=${id}`);
        }
      }}
    />
  );
}
