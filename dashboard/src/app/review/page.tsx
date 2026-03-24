"use client";

import { Header } from "@/components/layout/header";
import { ReviewCard } from "@/components/review/review-card";
import { ReviewToolbar } from "@/components/review/review-toolbar";
import { useReviewQueue } from "@/hooks/use-review-queue";
import { ClipboardCheck } from "lucide-react";

export default function ReviewPage() {
  const {
    queueData,
    items,
    counts,
    filter,
    setFilter,
    destinations,
    pushing,
    approve,
    reject,
    editOutput,
    approveAll,
    pushApproved,
    clearQueue,
  } = useReviewQueue();

  return (
    <div className="flex flex-col h-full">
      <Header title="Review Queue" />
      <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
        {/* Empty state */}
        {!queueData && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-clay-700 flex items-center justify-center">
              <ClipboardCheck className="h-8 w-8 text-clay-300" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-clay-100 mb-1">
                No items to review
              </h3>
              <p className="text-sm text-clay-300 max-w-md">
                Run a batch in the Workbench, then click &quot;Send to Review&quot; to
                review and approve results before pushing to a destination.
              </p>
            </div>
          </div>
        )}

        {/* Queue content */}
        {queueData && (
          <div className="space-y-6">
            {/* Queue header */}
            <div>
              <h2 className="text-sm font-semibold text-clay-100">
                {queueData.functionName}
              </h2>
              <p className="text-xs text-clay-300">
                {queueData.items.length} results to review
              </p>
            </div>

            {/* Toolbar */}
            <ReviewToolbar
              counts={counts}
              filter={filter}
              onFilterChange={setFilter}
              destinations={destinations}
              pushing={pushing}
              onApproveAll={approveAll}
              onPushApproved={pushApproved}
              onClear={clearQueue}
            />

            {/* Cards */}
            <div className="space-y-3">
              {items.map((item) => (
                <ReviewCard
                  key={item.id}
                  item={item}
                  onApprove={approve}
                  onReject={reject}
                  onEdit={editOutput}
                />
              ))}
              {items.length === 0 && (
                <p className="text-xs text-clay-300 text-center py-8">
                  No items match this filter
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
