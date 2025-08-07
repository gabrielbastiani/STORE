import { X } from "lucide-react";
import { CognitiveChallenge } from "@/app/components/cognitiveChallenge";
import { useRouter } from "next/navigation";
import { FieldErrors, UseFormRegister, UseFormHandleSubmit } from "react-hook-form";
import { LoginFormData } from "Types/types";
import React from "react";
import { toast } from "react-toastify";

interface LoginModalProps {
  setShowLoginModal: (show: boolean) => void;
  handleSubmitLogin: UseFormHandleSubmit<LoginFormData>;
  registerLogin: UseFormRegister<LoginFormData>;
  loginErrors: FieldErrors<LoginFormData>;
  cognitiveValid: boolean;
  setCognitiveValid: (valid: boolean) => void;
  onSubmitLogin: (data: LoginFormData) => Promise<void>; // Alterado para Promise
  router: ReturnType<typeof useRouter>;
}

export default function LoginModal({
  setShowLoginModal,
  handleSubmitLogin,
  registerLogin,
  loginErrors,
  cognitiveValid,
  setCognitiveValid,
  onSubmitLogin,
  router
}: LoginModalProps) {
  // Função para lidar com a submissão do formulário
  const handleFormSubmit = async (data: LoginFormData) => {
    if (!cognitiveValid) {
      toast.error('Complete o desafio de segurança antes de enviar');
      return;
    }
    await onSubmitLogin(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={() => setShowLoginModal(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-center mb-6 text-black">Faça seu login</h2>

        {/* Formulário com tratamento assíncrono correto */}
        <form
          onSubmit={handleSubmitLogin(handleFormSubmit)}
          className="space-y-4"
        >
          <div>
            <input
              type="text"
              placeholder="E-mail"
              {...registerLogin('email', {
                required: 'E-mail é obrigatório',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'E-mail inválido'
                }
              })}
              className="w-full h-12 px-4 border border-[#999999] placeholder-[#999999] text-black text-sm focus:outline-none focus:border-black"
            />
            {loginErrors.email && (
              <p className="text-xs text-red-600 mt-1">
                {loginErrors.email.message}
              </p>
            )}
          </div>

          <div>
            <input
              type="password"
              placeholder="Senha"
              {...registerLogin('password', { required: 'Senha é obrigatória' })}
              className="w-full h-12 px-4 border border-[#999999] placeholder-[#999999] text-black text-sm focus:outline-none focus:border-black"
            />
            {loginErrors.password && (
              <p className="text-xs text-red-600 mt-1">
                {loginErrors.password.message}
              </p>
            )}
          </div>

          <div className="mt-6">
            <CognitiveChallenge
              onValidate={(isValid: boolean) => setCognitiveValid(isValid)}
            />
          </div>

          <button
            type="submit"
            disabled={!cognitiveValid}
            className={`w-full h-12 text-white font-semibold text-sm ${!cognitiveValid
              ? 'bg-[#E71C25]/50 cursor-not-allowed'
              : 'bg-[#E71C25] hover:bg-[#c21a23]'
              }`}
          >
            ENTRAR
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setShowLoginModal(false);
              router.push('/cadastro');
            }}
            className="text-orange-600 hover:underline"
          >
            Não tem conta? Cadastre-se
          </button>
        </div>
      </div>
    </div>
  );
}