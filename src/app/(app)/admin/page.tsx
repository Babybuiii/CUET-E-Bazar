import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <div>
      <PageHeader title="Admin Dashboard" description="Moderation console for users, scam reports, fake listings, warnings, and platform analytics." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Users" value="5,820" />
        <MetricCard label="Reports Open" value="48" />
        <MetricCard label="Warnings Issued" value="113" />
        <MetricCard label="Banned Accounts" value="17" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">Interactive platform charts</Card>
        <Card>Fake listing review queue</Card>
        <Card>Latest reported scams</Card>
        <Card>User management table</Card>
      </div>
    </div>
  );
}
