"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_CLIENT_SLUG = "twelve-labs";

export default function ClientsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/clients/${DEFAULT_CLIENT_SLUG}`);
  }, [router]);

  return null;
}
