import { setupAPIClient } from "@/services/api";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";

interface ReviewListProps {
  productId: string;
  showReviewForm: boolean;
  setShowReviewForm: (show: boolean) => void;
  isAuthenticated: boolean;
  setShowLoginModal: (show: boolean) => void;
}

interface Review {
  id: string;
  rating: string;
  comment: string;
  created_at: string;
  nameCustomer: string;
  customer?: { name: string };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalReviews: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function ReviewList({
  productId,
  showReviewForm,
  setShowReviewForm,
  isAuthenticated,
  setShowLoginModal
}: ReviewListProps) {

  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  const reviewsSectionRef = useRef<HTMLDivElement>(null);

  const ratingToNumber = (r: string) => {
    if (!r) return 0;
    switch (r.toUpperCase()) {
      case 'ONE': return 1;
      case 'TWO': return 2;
      case 'THREE': return 3;
      case 'FOUR': return 4;
      case 'FIVE': return 5;
      default: return 0;
    }
  };

  // Buscar avaliações paginadas
  const fetchReviews = async (page: number = 1) => {
    const api = setupAPIClient();
    setLoading(true);
    const scrollPosition = reviewsSectionRef.current?.scrollTop || 0;
    try {
      const response = await api.get(`/review/pagination?product_id=${productId}&page=${page}&limit=6`);

      setReviews(response.data.reviews);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (reviewsSectionRef.current) {
          reviewsSectionRef.current.scrollTop = scrollPosition;
        }
      }, 0)
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [productId]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (pagination?.totalPages || 1)) {
      fetchReviews(page);
    }
  };

  if (loading) {
    return (
      <div
        className="space-y-6"
        ref={reviewsSectionRef}
        style={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border-b pb-4">
              <div className="flex items-center mb-2">
                <div className="flex">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="w-5 h-5 bg-gray-200 rounded mr-1"></div>
                  ))}
                </div>
                <div className="ml-2 w-24 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensagem para primeiro avaliador */}
      {pagination?.totalReviews === 0 && !showReviewForm && (
        <div className="text-center text-gray-500 py-8">
          <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>Seja o primeiro a avaliar este produto!</p>
          <button
            onClick={() => {
              if (isAuthenticated) {
                setShowReviewForm(true);
              } else {
                setShowLoginModal(true);
              }
            }}
            className="mt-4 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
          >
            Escrever Avaliação
          </button>
        </div>
      )}

      {/* Exibir avaliações */}
      {pagination && pagination.totalReviews > 0 && (
        <>
          <h3 className="text-lg font-semibold text-black">
            Avaliações dos Clientes ({pagination.totalReviews})
          </h3>

          {/* Botão para adicionar nova avaliação */}
          {!showReviewForm && pagination && pagination.totalReviews > 0 && (
            <div className="flex mt-6">
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    setShowReviewForm(true);
                  } else {
                    setShowLoginModal(true);
                  }
                }}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
              >
                Adicionar Avaliação
              </button>
            </div>
          )}

          {reviews.map((review) => {
            const ratingNum = ratingToNumber(review.rating);

            return (
              <div key={review.id} className="border-b pb-4">
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < ratingNum ? 'fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-500">
                    {new Date(review.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-gray-700 mb-2">
                  {review.customer?.name || review.nameCustomer || "Anônimo"}
                </p>
                <p className="text-gray-800">{review.comment}</p>
              </div>
            );
          })}

          {/* Controles de paginação */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage}
              className={`text-black flex items-center px-4 py-2 rounded-md ${pagination.hasPreviousPage
                ? 'bg-gray-200 hover:bg-gray-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Anterior
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`text-gray-500 w-8 h-8 rounded-full ${pagination.currentPage === pageNum
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {pagination.totalPages > 5 && pagination.currentPage < pagination.totalPages - 2 && (
                <span className="px-2">...</span>
              )}

              {pagination.totalPages > 5 && pagination.currentPage < pagination.totalPages - 2 && (
                <button
                  onClick={() => handlePageChange(pagination.totalPages)}
                  className={`w-8 h-8 rounded-full ${pagination.currentPage === pagination.totalPages
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                >
                  {pagination.totalPages}
                </button>
              )}
            </div>

            <button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className={`text-black flex items-center px-4 py-2 rounded-md ${pagination.hasNextPage
                ? 'bg-gray-200 hover:bg-gray-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
              Próxima
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}