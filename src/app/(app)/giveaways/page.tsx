import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

const giveaways = [
  { title: "Thermodynamics Book", location: "CUET Library", deadline: "2h left", condition: "Used - Good", claimed: false },
  { title: "Table Lamp", location: "Shaheed Hall", deadline: "Claimed", condition: "Like New", claimed: true },
  { title: "Lab Apron", location: "Civil Dept", deadline: "6h left", condition: "Used - Fair", claimed: false }
];

export default function GiveawaysPage() {
  return (
    <div>
      <PageHeader title="Giveaways" description="Special cards with pickup location, countdown, claim status, and trust-first flow." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {giveaways.map((item) => (
          <Card key={item.title} className="space-y-3">
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Pickup: {item.location}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Condition: {item.condition}</p>
            <p className="text-sm font-medium text-brand-orange">{item.deadline}</p>
            {item.claimed ? (
              <span className="inline-flex rounded-lg bg-slate-200 px-3 py-1 text-xs font-semibold dark:bg-slate-700">Claimed</span>
            ) : (
              <Button className="w-full">Claim Item</Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
