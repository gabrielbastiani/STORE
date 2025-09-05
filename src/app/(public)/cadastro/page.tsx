"use client";

import React, {
    useState,
    useContext,
    ChangeEvent,
    FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { setupAPIClient } from "@/services/api";
import { useCart } from "@/app/contexts/CartContext";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import PersonTypeSelector from "@/app/components/cadastro/PersonTypeSelector";
import PersonalDetails from "@/app/components/cadastro/PersonalDetails";
import PasswordFields from "@/app/components/cadastro/PasswordFields";
import PhoneNewsletter from "@/app/components/cadastro/PhoneNewsletter";
import AddressForm, { Address } from "@/app/components/cadastro/AddressForm";
import ErrorAlert from "@/app/components/cadastro/ErrorAlert";
import SubmitButton from "@/app/components/cadastro/SubmitButton";
import { NavbarCheckout } from "@/app/components/navbar/navbarCheckout";
import { FooterCheckout } from "@/app/components/footer/footerCheckout";

type SignInResult = boolean | { success: boolean; message?: string };

function isSignInObject(v: SignInResult): v is { success: boolean; message?: string } {
    return typeof v === 'object' && v !== null && 'success' in v;
}

export default function Cadastro() {
    
    const { cartCount } = useCart();
    const cartOk = cartCount >= 1;
    const { signIn } = useContext(AuthContextStore);

    const api = setupAPIClient();
    const router = useRouter();

    const [personType, setPersonType] = useState<"FISICA" | "JURIDICA">("FISICA");
    const [cep, setCep] = useState("");
    const [address, setAddress] = useState<Address>({
        logradouro: "",
        bairro: "",
        localidade: "",
        uf: "",
    });
    const [manualAddress, setManualAddress] = useState(false);

    const [form, setForm] = useState<Record<string, string>>({
        email: "",
        cpf: "",
        nomeCompleto: "",
        dataNascimento: "",
        genero: "",
        senha: "",
        confirmaSenha: "",
        telefoneDDD: "",
        telefone: "",
        razaoSocial: "",
        cnpj: "",
        inscricaoEstadual: "",
        ieIsento: "false",
        destinatario: "",
        numero: "",
        complemento: "",
        referencia: "",
        newsletter: "false",
    });

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Máscara de CPF
    const formatCPF = (value: string) => {
        let v = value.replace(/\D/g, "").slice(0, 11);
        if (v.length > 9) v = v.slice(0, 9) + "-" + v.slice(9);
        if (v.length > 6) v = v.slice(0, 6) + "." + v.slice(6);
        if (v.length > 3) v = v.slice(0, 3) + "." + v.slice(3);
        return v;
    };

    // Máscara de CNPJ
    const formatCNPJ = (value: string) => {
        let v = value.replace(/\D/g, "").slice(0, 14);
        if (v.length > 12) v = v.slice(0, 12) + "-" + v.slice(12);
        if (v.length > 8) v = v.slice(0, 8) + "/" + v.slice(8);
        if (v.length > 5) v = v.slice(0, 5) + "." + v.slice(5);
        if (v.length > 2) v = v.slice(0, 2) + "." + v.slice(2);
        return v;
    };

    const handleCpfChange = (e: ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCPF(e.target.value);
        setForm((prev) => ({ ...prev, cpf: formatted }));
    };

    const handleCnpjChange = (e: ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCNPJ(e.target.value);
        setForm((prev) => ({ ...prev, cnpj: formatted }));
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const target = e.currentTarget as HTMLInputElement;
        const { name, type, value, checked } = target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? String(checked) : value,
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        if (form.senha !== form.confirmaSenha) {
            setErrorMsg("As senhas não conferem.");
            setLoading(false);
            return;
        }

        try {
            const userPayload = {
                name: personType === "FISICA" ? form.nomeCompleto : form.razaoSocial,
                email: form.email,
                password: form.senha,
                newsletter: form.newsletter,
                phone: `${form.telefoneDDD}${form.telefone}`,
                type_user: personType === "FISICA" ? "FISICA" : "JURIDICA",
                cpf: personType === "FISICA" ? form.cpf : undefined,
                cnpj: personType === "JURIDICA" ? form.cnpj : undefined,
                date_of_birth: personType === "FISICA" ? form.dataNascimento : "",
                sexo: form.genero || "",
                state_registration:
                    personType === "JURIDICA" && form.ieIsento === "true" ? "" : form.inscricaoEstadual || "",
            };

            const createdUser = await api.post("/user/customer/create", userPayload);
            const customerId = createdUser.data.id;

            const addressPayload = {
                customer_id: customerId,
                street: address.logradouro,
                neighborhood: address.bairro,
                city: address.localidade,
                state: address.uf,
                zipCode: cep.replace(/\D/g, ""),
                number: form.numero,
                country: "Brasil",
                complement: form.complemento,
                reference: form.referencia,
            };

            await api.post("/address/customer/create", addressPayload);

            toast.success("Cadastro com sucesso");

            const dataUser = { email: userPayload.email, password: userPayload.password };
            const result = (await signIn(dataUser)) as SignInResult;

            const success = typeof result === "boolean" ? result : Boolean(result.success);

            if (!success) {
                const message = isSignInObject(result) && result.message ? result.message : "Credenciais inválidas";
                toast.error(message);
                return;
            }

            if (cartOk) {
                router.replace("/finalizar-pedido");
                return;
            }

            router.replace("/login");
        } catch (err: any) {
            console.error(err);
            const msg = err?.response?.data?.message || "Erro ao cadastrar";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <NavbarCheckout />
            <div className="bg-white">
                <main className="max-w-4xl mx-auto px-4 py-8 bg-gray-100 text-black">
                    <h1 className="text-3xl font-semibold mb-2">Cadastro</h1>
                    <p className="mb-6">Por favor, preencha os campos abaixo para criar sua conta na loja</p>

                    <PersonTypeSelector personType={personType} setPersonType={setPersonType} />

                    <form onSubmit={handleSubmit}>
                        <ErrorAlert message={errorMsg} />

                        <PersonalDetails
                            personType={personType}
                            form={form}
                            handleChange={handleChange}
                            handleCpfChange={handleCpfChange}
                            handleCnpjChange={handleCnpjChange}
                        />

                        <PasswordFields form={form} handleChange={handleChange} />

                        <PhoneNewsletter form={form} handleChange={handleChange} />

                        <AddressForm
                            cep={cep}
                            setCep={setCep}
                            address={address}
                            setAddress={setAddress}
                            manualAddress={manualAddress}
                            setManualAddress={setManualAddress}
                            form={form}
                            handleChange={handleChange}
                        />

                        <SubmitButton loading={loading} />
                    </form>
                </main>
            </div>
            <FooterCheckout />
        </>
    );
}