import React from "react";
import { Star } from "lucide-react";
import {
  Controller,
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormHandleSubmit
} from "react-hook-form";
import { ReviewFormData } from "Types/types";

interface ReviewFormProps {
  registerReview: UseFormRegister<ReviewFormData>;
  handleSubmitReview: UseFormHandleSubmit<ReviewFormData>;
  reviewErrors: FieldErrors<ReviewFormData>;
  submitReview: (data: ReviewFormData) => void;
  setShowReviewForm: (show: boolean) => void;
  control: Control<ReviewFormData>; // Propriedade obrigatória
}

export default function ReviewForm({
  registerReview,
  handleSubmitReview,
  reviewErrors,
  submitReview,
  setShowReviewForm,
  control // Recebendo a propriedade
}: ReviewFormProps) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-black">Deixe sua avaliação</h3>

      <form onSubmit={handleSubmitReview(submitReview)}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Classificação
          </label>

          <Controller
            name="rating"
            control={control} // Usando a propriedade control
            rules={{
              required: 'Selecione uma classificação',
              validate: (v) => (Number(v) >= 1 && Number(v) <= 5) || 'Selecione uma classificação'
            }}
            render={({ field, fieldState }) => {
              const rating = Number(field.value) || 0;

              return (
                <>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                        className="text-yellow-400 focus:outline-none"
                      >
                        <Star className={`w-8 h-8 ${star <= rating ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>

                  {fieldState.error && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldState.error.message || 'Selecione uma classificação'}
                    </p>
                  )}
                </>
              );
            }}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentário
          </label>
          <textarea
            {...registerReview('comment', { required: 'Comentário é obrigatório' })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-black"
            placeholder="Conte sua experiência com este produto..."
          />
          {reviewErrors.comment && (
            <p className="text-red-500 text-sm mt-1">{reviewErrors.comment.message}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700"
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