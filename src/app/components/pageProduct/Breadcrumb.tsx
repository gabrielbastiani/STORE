import { ChevronRight } from "lucide-react";
import { ProductFormData } from "Types/types"; 
import React from "react";
import Link from "next/link";

export default function Breadcrumb({ product }: { product: ProductFormData }) {
  return (
    <div className="bg-white border-b mb-6">
      <div className="container mx-auto px-4 py-3">
        <nav className="text-sm text-gray-600 flex flex-wrap items-center gap-1">
          <span className="hover:text-blue-600 cursor-pointer">Home</span>
          {product.categories?.map((cat: any) => (
            <React.Fragment key={cat.category.id}>
              <ChevronRight className="w-4 h-4" />
              <Link href={`/categoria/${cat.category.slug}`} className="hover:text-blue-600 cursor-pointer">
                {cat.category.name}
              </Link>
            </React.Fragment>
          ))}
          <ChevronRight className="w-4 h-4" />
          <span className="font-medium text-gray-800">{product.name}</span>
        </nav>
      </div>
    </div>
  );
}