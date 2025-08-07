import { Star } from "lucide-react";

interface ReviewListProps {
  reviews: any[];
  showReviewForm: boolean;
  setShowReviewForm: (show: boolean) => void;
  isAuthenticated: boolean;
  setShowLoginModal: (show: boolean) => void;
}

export default function ReviewList({
  reviews,
  showReviewForm,
  setShowReviewForm,
  isAuthenticated,
  setShowLoginModal
}: ReviewListProps) {
  return (
    <div className="space-y-6">
      {reviews.length === 0 && !showReviewForm && (
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
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Escrever Avaliação
          </button>
        </div>
      )}

      {reviews.length > 0 && (
        <>
          <h3 className="text-lg font-semibold">Avaliações dos Clientes</h3>
          {reviews.map((review, index) => (
            <div key={index} className="border-b pb-4">
              <div className="flex items-center mb-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${i < review.rating ? 'fill-current' : ''}`}
                    />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-500">
                  {new Date(review.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-gray-700 mb-2">{review.user?.name || "Anônimo"}</p>
              <p className="text-gray-800">{review.comment}</p>
            </div>
          ))}

          {!showReviewForm && (
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setShowReviewForm(true);
                } else {
                  setShowLoginModal(true);
                }
              }}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Adicionar Avaliação
            </button>
          )}
        </>
      )}
    </div>
  );
}