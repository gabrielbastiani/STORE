import { Star } from "lucide-react";
import { FieldErrors, UseFormRegister, UseFormHandleSubmit } from "react-hook-form";
import { ReviewFormData } from "Types/types"; 
import React from "react";

interface ReviewFormProps {
  registerReview: UseFormRegister<ReviewFormData>;
  handleSubmitReview: UseFormHandleSubmit<ReviewFormData>;
  reviewErrors: FieldErrors<ReviewFormData>;
  submitReview: (data: ReviewFormData) => void;
  setShowReviewForm: (show: boolean) => void;
}

export default function ReviewForm({
  registerReview,
  handleSubmitReview,
  reviewErrors,
  submitReview,
  setShowReviewForm
}: ReviewFormProps) {
  const [rating, setRating] = React.useState(0);

  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Deixe sua avaliação</h3>
      <form onSubmit={handleSubmitReview(submitReview)}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Classificação
          </label>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  setRating(star);
                  registerReview('rating').onChange(star);
                }}
                className="text-yellow-400 focus:outline-none"
              >
                <Star
                  className={`w-8 h-8 ${star <= rating ? 'fill-current' : ''}`}
                />
              </button>
            ))}
          </div>
          {reviewErrors.rating && (
            <p className="text-red-500 text-sm mt-1">Selecione uma classificação</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentário
          </label>
          <textarea
            {...registerReview('comment', { required: 'Comentário é obrigatório' })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Conte sua experiência com este produto..."
          ></textarea>
          {reviewErrors.comment && (
            <p className="text-red-500 text-sm mt-1">{reviewErrors.comment.message}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Enviar Avaliação
          </button>
          <button
            type="button"
            onClick={() => setShowReviewForm(false)}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}