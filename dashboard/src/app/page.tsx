import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { JobList } from "@/components/dashboard/job-list";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { SkillDistribution } from "@/components/dashboard/skill-distribution";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <ErrorBoundary>
          <StatsCards />
        </ErrorBoundary>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ErrorBoundary>
              <ActivityChart />
            </ErrorBoundary>
          </div>
          <ErrorBoundary>
            <SkillDistribution />
          </ErrorBoundary>
        </div>

        <div>
          <h3 className="text-sm text-clay-500 uppercase tracking-wide mb-3 font-[family-name:var(--font-sans)]">
            Recent Jobs
          </h3>
          <ErrorBoundary>
            <JobList />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
