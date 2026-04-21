"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { fetchClients } from "@/lib/api";
import type { ClientSummary } from "@/lib/types";
import { Users, FileText } from "lucide-react";

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients()
      .then((r) => setClients(r.clients || []))
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-screen bg-clay-950 text-white">
      <Header title="Clients" />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-kiln-teal" />
            <h1 className="text-xl font-semibold">Clients</h1>
            {!loading && (
              <span className="text-xs text-clay-300 ml-2">
                {clients.length} {clients.length === 1 ? "client" : "clients"}
              </span>
            )}
          </div>

          {loading && <p className="text-clay-300 text-sm">Loading...</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {clients.map((c) => (
                <Link
                  key={c.slug}
                  href={`/clients/${c.slug}`}
                  className="group p-4 rounded-lg border border-clay-700 bg-clay-900 hover:border-kiln-teal/50 hover:bg-clay-800 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-clay-300 group-hover:text-kiln-teal mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-white truncate">
                        {c.name || c.slug}
                      </h3>
                      <p className="text-xs text-clay-300 mt-0.5 truncate">
                        {c.slug}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && !error && clients.length === 0 && (
            <div className="text-center py-20 text-clay-300">
              <p className="text-sm">No clients yet</p>
              <p className="text-xs mt-1">
                Add a client profile to <code>clients/</code> folder
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
