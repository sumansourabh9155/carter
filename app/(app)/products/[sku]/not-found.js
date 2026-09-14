import { PackageX } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export default function ProductNotFound() {
  return (
    <EmptyState
      icon={PackageX}
      title="Product not found"
      body="That SKU doesn't exist in your catalog, or the link is stale."
      cta={{ label: "Back to products", href: "/products" }}
    />
  );
}
