import Image from "next/image";
import Link from "next/link";
import { ProductFormData } from "Types/types";
import { ChevronRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface RelatedProductsSectionProps {
    products: ProductFormData[];
}

export default function RelatedProductsSection({ products }: RelatedProductsSectionProps) {

    /*  console.log(products) */

    if (!products || products.length === 0) return null;

    const formatPrice = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    return (
        <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Produtos Relacionados</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                    <div
                        key={product.id}
                        className="flex items-start gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex-shrink-0 w-20 h-20 bg-white border rounded-md overflow-hidden">
                            {product.images?.length ? (
                                <Image
                                    src={`${API_URL}/files/${product.images[0].url}`}
                                    alt={product.images[0].altText || product.name}
                                    width={80}
                                    height={80}
                                    className="object-contain w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                                    Sem imagem
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <Link
                                href={`/produto/${product.slug}`}
                                className="font-medium text-gray-900 hover:text-blue-600 line-clamp-2"
                            >
                                {product.name}
                            </Link>

                            <div className="mt-1">
                                <span className="text-base font-semibold text-gray-900">
                                    {formatPrice(product.price_per)}
                                </span>

                                {product.price_of && product.price_per < product.price_of && (
                                    <span className="text-xs text-gray-500 line-through ml-1">
                                        {formatPrice(product.price_of)}
                                    </span>
                                )}
                            </div>

                            <Link
                                href={`/produto/${product.slug}`}
                                className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                            >
                                Ver produto
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {products.length > 3 && (
                <div className="mt-4 text-center">
                    <Link
                        href="/produtos-relacionados"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                        Ver todos os produtos relacionados ({products.length})
                    </Link>
                </div>
            )}
        </div>
    );
}