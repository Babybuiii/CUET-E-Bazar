import { ProductCard } from "@/components/marketplace/product-card";
import { PageHeader } from "@/components/shared/page-header";
import { products } from "@/data/mock";

export default function WishlistPage() {
  return (
    <div>
      <PageHeader title="Wishlist" description="Saved products with quick chat access and stock/activity indicators." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
