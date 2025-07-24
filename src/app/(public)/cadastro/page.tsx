"use client"

import { setupAPIClient } from "@/services/api";
import React, {
    useState,
    useEffect,
    ChangeEvent,
    FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { NavbarCheckout } from "@/app/components/navbar/navbarCheckout";
import { FooterCheckout } from "@/app/components/footer/footerCheckout";
import { toast } from "react-toastify";

interface Address {
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
}

export default function Cadastro() {

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

    // Máscara de CPF: 000.000.000-00
    const formatCPF = (value: string) => {
        let v = value.replace(/\D/g, "").slice(0, 11);
        if (v.length > 9) v = v.slice(0, 9) + "-" + v.slice(9);
        if (v.length > 6) v = v.slice(0, 6) + "." + v.slice(6);
        if (v.length > 3) v = v.slice(0, 3) + "." + v.slice(3);
        return v;
    };

    // Máscara de CNPJ: 00.000.000/0000-00
    const formatCNPJ = (value: string) => {
        let v = value.replace(/\D/g, "").slice(0, 14);
        if (v.length > 12) v = v.slice(0, 12) + "-" + v.slice(12);
        if (v.length > 8) v = v.slice(0, 8) + "/" + v.slice(8);
        if (v.length > 5) v = v.slice(0, 5) + "." + v.slice(5);
        if (v.length > 2) v = v.slice(0, 2) + "." + v.slice(2);
        return v;
    };

    // Handlers específicos para CPF/CNPJ
    const handleCpfChange = (e: ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCPF(e.target.value);
        setForm((prev) => ({ ...prev, cpf: formatted }));
    };

    const handleCnpjChange = (e: ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCNPJ(e.target.value);
        setForm((prev) => ({ ...prev, cnpj: formatted }));
    };

    // Formata CEP como 99999-999
    const handleCepChange = (e: ChangeEvent<HTMLInputElement>) => {
        let v = e.target.value.replace(/\D/g, "");
        if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5, 8);
        setCep(v);
    };

    // Busca endereço ao completar CEP
    useEffect(() => {
        const digits = cep.replace(/\D/g, "");
        if (digits.length === 8) {
            fetch(`https://viacep.com.br/ws/${digits}/json/`)
                .then((res) => res.json())
                .then((data) => {
                    if (!data.erro) {
                        setAddress({
                            logradouro: data.logradouro,
                            bairro: data.bairro,
                            localidade: data.localidade,
                            uf: data.uf,
                        });
                        setManualAddress(false);
                    } else {
                        // CEP não encontrado → liberamos preenchimento manual
                        setAddress({ logradouro: "", bairro: "", localidade: "", uf: "" });
                        setManualAddress(true);
                    }
                })
                .catch(() => {
                    // Em caso de erro de rede, também caímos no manual
                    setAddress({ logradouro: "", bairro: "", localidade: "", uf: "" });
                    setManualAddress(true);
                });
        } else {
            // CEP incompleto ainda: escondemos endereço até completar
            setAddress({ logradouro: "", bairro: "", localidade: "", uf: "" });
            setManualAddress(false);
        }
    }, [cep]);

    // --- lista de siglas dos estados ---
    const estadosBR = [
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
        "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    ];

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
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
            // Monta o objeto exatamente com as chaves que o backend espera:
            const userPayload = {
                name:
                    personType === "FISICA"
                        ? form.nomeCompleto
                        : form.razaoSocial,
                email: form.email,
                password: form.senha,
                newsletter: form.newsletter,
                phone: `${form.telefoneDDD}${form.telefone}`,
                type_user: personType === "FISICA" ? "FISICA" : "JURIDICA",
                cpf: personType === "FISICA" ? form.cpf : undefined,
                cnpj: personType === "JURIDICA" ? form.cnpj : undefined,
                date_of_birth:
                    personType === "FISICA" ? form.dataNascimento : "",
                sexo: form.genero || "",
                state_registration:
                    personType === "JURIDICA" && form.ieIsento === "true"
                        ? ""
                        : form.inscricaoEstadual || "",
            };

            // **AQUI** enviamos o payload puro, não embrulhado:
            const createdUser = await api.post(
                "/user/customer/create",
                userPayload
            );

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

            await api.post(
                "/address/customer/create",
                addressPayload
            );

            toast.success("Cadastro com sucesso");
            router.push("/fechamento");
        } catch (err: any) {
            console.error(err);
            const msg =
                err.response?.data?.message ||
                "Erro ao cadastrar";
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
                    <h1 className="text-3xl font-semibold mb-2">
                        Cadastro
                    </h1>
                    <p className="mb-6">
                        Por favor, preencha os campos abaixo para
                        criar sua conta na loja
                    </p>

                    {/* tipo de pessoa */}
                    <div className="mb-6 flex items-center space-x-4 bg-white px-4 py-3 rounded">
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="personType"
                                value="FISICA"
                                checked={personType === "FISICA"}
                                onChange={() => setPersonType("FISICA")}
                                className="accent-red-600"
                            />
                            <span>Pessoa Física</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="personType"
                                value="JURIDICA"
                                checked={personType === "JURIDICA"}
                                onChange={() => setPersonType("JURIDICA")}
                                className="accent-red-600"
                            />
                            <span>Pessoa Jurídica</span>
                        </label>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* erro geral */}
                        {errorMsg && (
                            <div className="mb-4 text-red-600">
                                {errorMsg}
                            </div>
                        )}

                        {/* DADOS PESSOAIS */}
                        <h2 className="text-xl font-bold mb-4">
                            Dados Pessoais
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {/* email */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    E-mail *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    placeholder="E-Mail"
                                />
                            </div>

                            {/* cpf ou cnpj */}
                            <div>
                                {/* CPF / CNPJ com máscara */}
                                {personType === "FISICA" ? (
                                    <div>
                                        <label>CPF *</label>
                                        <input
                                            type="text"
                                            name="cpf"
                                            value={form.cpf}
                                            onChange={handleCpfChange}
                                            required
                                            className="w-full border border-gray-300 px-3 py-2 text-sm"
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label>CNPJ *</label>
                                        <input
                                            type="text"
                                            name="cnpj"
                                            value={form.cnpj}
                                            onChange={handleCnpjChange}
                                            required
                                            className="w-full border border-gray-300 px-3 py-2 text-sm"
                                            placeholder="00.000.000/0000-00"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* FISICA x JURIDICA */}
                        {personType === "FISICA" ? (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">
                                        Nome Completo *
                                    </label>
                                    <input
                                        type="text"
                                        name="nomeCompleto"
                                        value={form.nomeCompleto}
                                        onChange={handleChange}
                                        required
                                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Data de Nascimento *
                                        </label>
                                        <input
                                            type="date"
                                            name="dataNascimento"
                                            value={form.dataNascimento}
                                            onChange={handleChange}
                                            required
                                            className="w-full border border-gray-300 px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Gênero *
                                        </label>
                                        <select
                                            name="genero"
                                            value={form.genero}
                                            onChange={handleChange}
                                            required
                                            className="w-full border border-gray-300 px-3 py-2 text-sm"
                                        >
                                            <option value="">
                                                Selecione...
                                            </option>
                                            <option value="F">
                                                Feminino
                                            </option>
                                            <option value="M">
                                                Masculino
                                            </option>
                                            <option value="O">Outro</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">
                                        Razão Social *
                                    </label>
                                    <input
                                        type="text"
                                        name="razaoSocial"
                                        value={form.razaoSocial}
                                        onChange={handleChange}
                                        required
                                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Inscrição Estadual
                                            {/* só exibimos o asterisco se for obrigatório */}
                                            {!(form.ieIsento === 'true') && <span className="text-red-500"> *</span>}
                                        </label>
                                        <input
                                            type="text"
                                            name="inscricaoEstadual"
                                            value={form.inscricaoEstadual}
                                            onChange={handleChange}
                                            required={!(form.ieIsento === 'true')}
                                            disabled={form.ieIsento === 'true'}
                                            className="w-full border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                                            placeholder=""
                                        />
                                    </div>

                                    {/* Checkbox I.E. Isento */}
                                    <div className="flex items-center mt-6">
                                        <label className="inline-flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                name="ieIsento"
                                                checked={form.ieIsento === 'true'}
                                                onChange={handleChange}
                                                className="accent-red-600"
                                            />
                                            <span>I.E. Isento</span>
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* senhas */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Informe a Senha *
                                </label>
                                <input
                                    type="password"
                                    name="senha"
                                    value={form.senha}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Confirme a Senha *
                                </label>
                                <input
                                    type="password"
                                    name="confirmaSenha"
                                    value={form.confirmaSenha}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        {/* telefone */}
                        <div className="grid grid-cols-[80px_1fr] gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Telefone *
                                </label>
                                <input
                                    type="text"
                                    name="telefoneDDD"
                                    value={form.telefoneDDD}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    placeholder="DDD"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    &nbsp;
                                </label>
                                <input
                                    type="text"
                                    name="telefone"
                                    value={form.telefone}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    placeholder="Telefone"
                                />
                            </div>
                        </div>

                        {/* newsletter */}
                        <label className="inline-flex items-center mb-6 space-x-2">
                            <input
                                type="checkbox"
                                name="newsletter"
                                className="accent-red-600"
                                onChange={handleChange}
                            />
                            <span>Recebimento de Newsletter</span>
                        </label>

                        {/* ENDEREÇO */}
                        <h2 className="text-xl font-bold mb-4">Endereço de Cadastro</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">
                                Nome do Destinatário *
                            </label>
                            <input
                                type="text"
                                name="destinatario"
                                value={form.destinatario}
                                onChange={handleChange}
                                required
                                className="w-full border border-gray-300 px-3 py-2 text-sm"
                                placeholder="Quem receberá a entrega?"
                            />
                        </div>

                        {/* CEP */}
                        <div className="grid grid-cols-[150px_1fr] gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">CEP *</label>
                                <input
                                    type="text"
                                    name="cep"
                                    value={cep}
                                    onChange={handleCepChange}
                                    required
                                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    placeholder="99999-999"
                                    maxLength={9}
                                />
                            </div>
                        </div>

                        {/* Campos de endereço (auto ou manual) */}
                        <div className="space-y-4 mb-6">
                            {/* Logradouro */}
                            <input
                                type="text"
                                name="logradouro"
                                value={address.logradouro}
                                onChange={(e) => {
                                    setAddress(a => ({ ...a, logradouro: e.target.value }));
                                    if (!manualAddress) setManualAddress(true);
                                }}
                                placeholder="Logradouro"
                                required
                                className="w-full border border-gray-300 px-3 py-2 text-sm"
                            />

                            {/* Bairro */}
                            <input
                                type="text"
                                name="bairro"
                                value={address.bairro}
                                onChange={(e) => {
                                    setAddress(a => ({ ...a, bairro: e.target.value }));
                                    if (!manualAddress) setManualAddress(true);
                                }}
                                placeholder="Bairro"
                                required
                                className="w-full border border-gray-300 px-3 py-2 text-sm"
                            />

                            <div className="grid grid-cols-3 gap-4">
                                {/* Cidade */}
                                <input
                                    type="text"
                                    name="localidade"
                                    value={address.localidade}
                                    onChange={(e) => {
                                        setAddress(a => ({ ...a, localidade: e.target.value }));
                                        if (!manualAddress) setManualAddress(true);
                                    }}
                                    placeholder="Cidade"
                                    required
                                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                                />

                                {/* UF como select */}
                                <select
                                    name="uf"
                                    value={address.uf}
                                    onChange={(e) => {
                                        setAddress(a => ({ ...a, uf: e.target.value }));
                                        if (!manualAddress) setManualAddress(true);
                                    }}
                                    required
                                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                                >
                                    <option value="">
                                        {manualAddress
                                            ? "Selecione o estado"
                                            : "UF (auto)"}
                                    </option>
                                    {estadosBR.map(sigla => (
                                        <option key={sigla} value={sigla}>
                                            {sigla}
                                        </option>
                                    ))}
                                </select>

                                {/* Número */}
                                <input
                                    type="text"
                                    name="numero"
                                    value={form.numero}
                                    onChange={handleChange}
                                    placeholder="Número"
                                    required
                                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Complemento */}
                                <input
                                    type="text"
                                    name="complemento"
                                    value={form.complemento}
                                    onChange={handleChange}
                                    placeholder="Complemento"
                                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                                />

                                {/* Referência de Entrega */}
                                <input
                                    type="text"
                                    name="referencia"
                                    value={form.referencia}
                                    onChange={handleChange}
                                    placeholder="Referência de entrega"
                                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 text-white py-3 uppercase font-medium hover:bg-red-700 transition disabled:opacity-50"
                        >
                            {loading
                                ? "Cadastrando..."
                                : "Cadastrar"}
                        </button>
                    </form>
                </main>
            </div>
            <FooterCheckout />
        </>
    );
}