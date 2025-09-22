import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";
import { FieldErrors, UseFormRegister, UseFormHandleSubmit, Control } from "react-hook-form";
import { ReviewFormData, VariantFormData } from "Types/types";
import { ProductFormData } from "Types/types";

interface ProductTabsProps {
  activeTab: "description" | "specifications" | "reviews";
  setActiveTab: (tab: "description" | "specifications" | "reviews") => void;
  product: ProductFormData;
  expandedDescription: string | null;
  setExpandedDescription: (id: string | null) => void;
  selectedVariant: VariantFormData | null;
  reviews: any[];
  showReviewForm: boolean;
  setShowReviewForm: (show: boolean) => void;
  isAuthenticated: boolean;
  registerReview: UseFormRegister<ReviewFormData>;
  handleSubmitReview: UseFormHandleSubmit<ReviewFormData>;
  reviewErrors: FieldErrors<ReviewFormData>;
  submitReview: (data: ReviewFormData) => void;
  setShowLoginModal: (show: boolean) => void;
  control: Control<ReviewFormData>;
  watch?: any;
}

export default function ProductTabs({
  activeTab,
  setActiveTab,
  product,
  expandedDescription,
  setExpandedDescription,
  selectedVariant,
  reviews,
  showReviewForm,
  setShowReviewForm,
  isAuthenticated,
  registerReview,
  handleSubmitReview,
  reviewErrors,
  submitReview,
  setShowLoginModal,
  control,
  watch
}: ProductTabsProps) {

  // Filtra apenas avaliações aprovadas para mostrar o contador na aba
  const approvedReviews = reviews.filter(review => review.status === 'APPROVED');

  return (
    <div className="mt-12 bg-white rounded-lg border border-gray-200">
      <div className="border-b border-gray-200">
        <nav className="flex">
          {(["description", "specifications", "reviews"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-medium border-b-2 text-sm md:text-base ${activeTab === tab
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
                }`}
            >
              {tab === "description" && "Descrição"}
              {tab === "specifications" && "Especificações"}
              {tab === "reviews" && `Avaliações (${approvedReviews.length})`}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === "description" && (
          <div className="space-y-6">
            {product.productsDescriptions?.map((desc: any) => (
              <div key={desc.id} className="space-y-3">
                <button
                  onClick={() =>
                    setExpandedDescription(expandedDescription === desc.id ? null : desc.id)
                  }
                  className="flex items-center justify-between w-full text-left"
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {desc.title}
                  </h3>
                  {expandedDescription === desc.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {expandedDescription === desc.id && (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: desc.description }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "specifications" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">
                Informações Gerais
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">SKU:</span>
                  <span className="font-medium text-black">
                    {product.skuMaster}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Marca:</span>
                  <span className="font-medium text-black">
                    {product.brand}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Peso:</span>
                  <span className="font-medium text-black">
                    {product.weight} kg
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Dimensões:</span>
                  <span className="font-medium text-black">
                    {product.length} × {product.width} × {product.height} cm
                  </span>
                </div>
              </div>
            </div>

            {selectedVariant && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Variante Selecionada
                </h3>
                <div className="space-y-2 text-sm">
                  {selectedVariant.variantAttribute?.map((attr: any, i: any) => (
                    <div
                      key={i}
                      className="flex justify-between py-2 border-b border-gray-100"
                    >
                      <span className="text-gray-600">{attr.key}:</span>
                      <span className="font-medium text-black">
                        {attr.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-6">
            {showReviewForm && isAuthenticated && (
              <ReviewForm
                registerReview={registerReview}
                handleSubmitReview={handleSubmitReview}
                reviewErrors={reviewErrors}
                submitReview={submitReview}
                setShowReviewForm={setShowReviewForm}
                control={control}
              />
            )}

            <ReviewList
              productId={product.id || ""}
              showReviewForm={showReviewForm}
              setShowReviewForm={setShowReviewForm}
              isAuthenticated={isAuthenticated}
              setShowLoginModal={setShowLoginModal}
            />
          </div>
        )}
      </div>
    </div>
  );
}