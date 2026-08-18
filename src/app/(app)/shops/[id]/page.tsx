import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ShopDetailsPage() {
  return (
    <div className="space-y-6">
      <Card className="glass">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">CUET Gadget Hub</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Hero banner, ratings, followers, and discount campaign area.</p>
          </div>
          <Button>Follow Shop</Button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="font-semibold">Featured Products</p></Card>
        <Card><p className="font-semibold">Shop Analytics</p></Card>
        <Card><p className="font-semibold">Discount Banners</p></Card>
      </div>
      <Card>
        <p className="font-semibold">Product Grid and Categories</p>
      </Card>
    </div>
  );
}
