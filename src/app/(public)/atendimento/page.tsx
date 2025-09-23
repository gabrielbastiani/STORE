"use client"

import React, { useContext, useState } from "react";
import { toast } from "react-toastify";
import { setupAPIClient } from "@/services/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { NavbarStore } from "@/app/components/navbar/navbarStore";
import { FooterStore } from "@/app/components/footer/footerStore";
import { useTheme } from "@/app/contexts/ThemeContext";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import { CognitiveChallenge } from "@/app/components/cognitiveChallenge";

const MAX_NAME = 200;
const MAX_SUBJECT = 250;
const MAX_MESSAGE = 5000;

const contactSchema = z.object({
    name_user: z
        .string()
        .min(1, "Nome é obrigatório")
        .max(MAX_NAME, `Nome deve ter no máximo ${MAX_NAME} caracteres`),
    email_user: z
        .string()
        .min(1, "Email é obrigatório")
        .email("Email inválido")
        .max(200, "Email muito longo"),
    subject: z
        .string()
        .min(1, "Assunto é obrigatório")
        .max(MAX_SUBJECT, `Assunto deve ter no máximo ${MAX_SUBJECT} caracteres`),
    message: z
        .string()
        .min(1, "Mensagem é obrigatória")
        .max(MAX_MESSAGE, `Mensagem deve ter no máximo ${MAX_MESSAGE} caracteres`),
});

type ContactFormData = z.infer<typeof contactSchema>;

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
}

export default function Atendimento() {

    const { colors } = useTheme();
    const { configs } = useContext(AuthContextStore);

    return (
        <>
            <NavbarStore />
            <div
                style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}
            >
                <main
                    className="max-w-6xl mx-auto px-4 py-12 text-black"
                >
                    <h1 className="text-3xl font-semibold mb-4">Atendimento — Fale conosco</h1>
                    <p className="text-gray-600 mb-8">
                        Use o formulário abaixo para entrar em contato com nossa equipe. Responderemos o mais breve possível.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="order-2 md:order-1">
                            <ContactForm />
                        </div>

                        <aside className="order-1 md:order-2 bg-white shadow rounded-lg p-6">
                            <h2 className="text-xl font-medium mb-3">Outras formas de contato</h2>
                            <p className="text-sm text-gray-600">Telefone: <strong>{configs?.phone}</strong></p>
                            <p className="text-sm text-gray-600">Email: <strong>{configs?.email}</strong></p>
                        </aside>
                    </div>
                </main>
            </div>
            <FooterStore />
        </>
    );
}

function ContactForm() {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
        mode: "onTouched",
        defaultValues: {
            name_user: "",
            email_user: "",
            subject: "",
            message: "",
        },
    });

    const messageValue = watch("message") || "";
    const [cognitiveValid, setCognitiveValid] = useState(false);

    async function onSubmit(data: ContactFormData) {
        if (!cognitiveValid) {
                    toast.error('Complete o desafio de segurança antes de enviar');
                    return;
                }
        const payload = {
            ...data,
            slug_name_user: slugify(data.name_user),
        };

        try {
            const api = setupAPIClient();
            await api.post("/form_contact/create_form_contact", payload);
            toast.success("Mensagem enviada com sucesso. Obrigado pelo contato!");
            reset();
        } catch (err: any) {
            console.error("Erro ao enviar formulário:", err);
            const message = err?.response?.data?.message || "Erro ao enviar a mensagem";
            toast.error(message);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded-lg p-6">
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="name_user">
                    Nome
                </label>
                <input
                    id="name_user"
                    aria-invalid={!!errors.name_user}
                    {...register("name_user")}
                    maxLength={MAX_NAME}
                    className={`block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 ${errors.name_user ? "border-red-500" : "border-gray-200"
                        }`}
                    placeholder="Seu nome completo"
                />
                {errors.name_user && (
                    <p className="text-xs text-red-600 mt-1">{errors.name_user.message as string}</p>
                )}
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="email_user">
                    Email
                </label>
                <input
                    id="email_user"
                    aria-invalid={!!errors.email_user}
                    {...register("email_user")}
                    className={`block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 ${errors.email_user ? "border-red-500" : "border-gray-200"
                        }`}
                    placeholder="seu@exemplo.com"
                />
                {errors.email_user && (
                    <p className="text-xs text-red-600 mt-1">{errors.email_user.message as string}</p>
                )}
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="subject">
                    Assunto
                </label>
                <input
                    id="subject"
                    aria-invalid={!!errors.subject}
                    {...register("subject")}
                    maxLength={MAX_SUBJECT}
                    className={`block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 ${errors.subject ? "border-red-500" : "border-gray-200"
                        }`}
                    placeholder="Assunto da mensagem"
                />
                {errors.subject && (
                    <p className="text-xs text-red-600 mt-1">{errors.subject.message as string}</p>
                )}
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1" htmlFor="message">
                    Mensagem
                </label>
                <textarea
                    id="message"
                    aria-invalid={!!errors.message}
                    {...register("message")}
                    maxLength={MAX_MESSAGE}
                    rows={8}
                    className={`block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 ${errors.message ? "border-red-500" : "border-gray-200"
                        }`}
                    placeholder="Como podemos ajudar?"
                />
                <div className="flex justify-between items-center">
                    {errors.message ? (
                        <p className="text-xs text-red-600 mt-1">{errors.message.message as string}</p>
                    ) : (
                        <div />
                    )}

                    <p className="text-xs text-gray-500 mt-1 ml-auto">{messageValue.length}/{MAX_MESSAGE}</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                
                <CognitiveChallenge
                    onValidate={(isValid: boolean) => setCognitiveValid(isValid)}
                />
                        
                <button
                    type="submit"
                    disabled={isSubmitting || !cognitiveValid}
                    className="inline-flex items-center justify-center rounded-md bg-orange-600 text-white px-4 py-2 text-sm font-medium hover:bg-orange-700 disabled:opacity-60"
                >
                    {isSubmitting ? "Enviando..." : "Enviar mensagem"}
                </button>

                <button
                    type="button"
                    onClick={() => reset()}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                >
                    Limpar
                </button>
            </div>
        </form>
    );
}