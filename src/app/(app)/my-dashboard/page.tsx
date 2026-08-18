import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";

export default function IndividualSellerDashboardPage() {
  return (
    <div>
      <PageHeader title="My Seller Dashboard" description="Manage listings, mark sold, handle buyer chats, and track your personal analytics." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>Manage listings</Card>
        <Card>Buyer chats and unread queue</Card>
        <Card>Reviews and response score</Card>
        <Card>Notifications and warnings</Card>
        <Card>Weekly analytics</Card>
        <Card>Mark sold workflow</Card>
      </div>
    </div>
  );
}
