import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

const shops = [
  { id: "s1", name: "CUET Gadget Hub", category: "Electronics", rating: 4.8, followers: 890 },
  { id: "s2", name: "Dorm Decor Studio", category: "Home", rating: 4.6, followers: 420 },
  { id: "s3", name: "Second Chance Books", category: "Books", rating: 4.9, followers: 730 }
];

export default function ShopsPage() {
  return (
    <div>
      <PageHeader title="Campus Shops" description="Browse student-owned businesses, filter by category, and explore shop analytics." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shops.map((shop) => (
          <Link key={shop.id} href={`/shops/${shop.id}`}>
            <Card className="transition hover:-translate-y-1">
              <p className="font-semibold">{shop.name}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{shop.category}</p>
              <p className="mt-3 text-xs text-slate-500">Rating {shop.rating} • {shop.followers} followers</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
