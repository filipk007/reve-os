"use client";

import { use } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuickRunForm } from "@/components/functions/quick-run-form";
import { OutputRenderer } from "@/components/output/output-renderer";
import { useQuickRun } from "@/hooks/use-quick-run";
import { Play, ArrowLeft, Loader2, RotateCcw, AlertTriangle } from "lucide-react";

export default function QuickRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    func,
    inputs,
    setInput,
    result,
    running,
    error,
    loading,
    execute,
    reset,
  } = useQuickRun(id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    execute();
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={func ? `Run: ${func.name}` : "Quick Run"} />
      <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-clay-300 hover:text-clay-100 mb-4 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Functions
        </Link>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-clay-300">Loading function...</div>
          </div>
        )}

        {/* Function not found */}
        {!loading && !func && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
            <p className="text-sm text-clay-300">Function not found</p>
            <Link href="/">
              <Button variant="outline" size="sm" className="border-clay-600 text-clay-200">
                Back to Functions
              </Button>
            </Link>
          </div>
        )}

        {/* Main content */}
        {func && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
            {/* Left: Input form */}
            <div>
              <Card className="border-clay-600">
                <CardContent className="p-5">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-clay-100">
                      {func.name}
                    </h2>
                    {func.description && (
                      <p className="text-xs text-clay-300 mt-1">
                        {func.description}
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleSubmit}>
                    <QuickRunForm
                      functionInputs={func.inputs}
                      values={inputs}
                      onChange={setInput}
                      disabled={running}
                    />

                    {/* Error */}
                    {error && (
                      <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                        {error}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-5 flex items-center gap-2">
                      <Button
                        type="submit"
                        disabled={running}
                        className="flex-1 bg-kiln-teal text-clay-950 hover:bg-kiln-teal-light font-semibold"
                      >
                        {running ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Running...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Play className="h-4 w-4" />
                            Run
                          </span>
                        )}
                      </Button>
                      {result && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={reset}
                          className="border-clay-600 text-clay-200 hover:bg-clay-700"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right: Result */}
            <div>
              {result ? (
                <Card className="border-clay-600">
                  <CardContent className="p-5">
                    <h3 className="text-xs font-semibold text-clay-200 uppercase tracking-wider mb-3">
                      Result
                    </h3>
                    <OutputRenderer result={result} />
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <p className="text-sm text-clay-300">
                    {running ? "Processing..." : "Fill in the inputs and click Run"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
