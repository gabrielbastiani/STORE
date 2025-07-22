"use client"

import { FooterCheckout } from '@/app/components/footer/footerCheckout';
import { NavbarCheckout } from '@/app/components/navbar/navbarCheckout';
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';

interface Address {
    logradouro: string;
    numero: string;
    complemento: string;
    referenciaEntrega: string;
    bairro: string;
    localidade: string;
    uf: string;
}

export default function Cadastro() {

    const [personType, setPersonType] = useState<'pf' | 'pj'>('pf');
    const [cep, setCep] = useState('');
    const [address, setAddress] = useState<Address>({
        logradouro: '',
        numero: '',
        complemento: '',
        referenciaEntrega: '',
        bairro: '',
        localidade: '',
        uf: ''
    });
    const [form, setForm] = useState<Record<string, string>>({
        email: '', cpf: '', nomeCompleto: '', dataNascimento: '', genero: '', senha: '', confirmaSenha: '',
        telefoneDDD: '', telefone: '', razaoSocial: '', cnpj: '', inscricaoEstadual: '', ieIsento: 'false', destinatario: '',
        numero: '', complemento: '', referenciaEntrega: ''
    });

    // Format CEP as 99999-999
    const handleCepChange = (e: ChangeEvent<HTMLInputElement>) => {
        let v = e.currentTarget.value.replace(/\D/g, '');
        if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5, 8);
        setCep(v);
    };

    // Fetch address when CEP is complete
    useEffect(() => {
        const digits = cep.replace(/\D/g, '');
        if (digits.length === 8) {
            fetch(`https://viacep.com.br/ws/${digits}/json/`)
                .then(res => res.json())
                .then((data) => {
                    if (!data.erro) {
                        setAddress(prev => ({
                            ...prev,
                            logradouro: data.logradouro,
                            bairro: data.bairro,
                            localidade: data.localidade,
                            uf: data.uf
                        }));
                        // Pre-fill form fields for editable inputs
                        setForm(prev => ({
                            ...prev,
                            numero: prev.numero,
                            complemento: prev.complemento,
                            referenciaEntrega: prev.referenciaEntrega
                        }));
                    }
                });
        }
    }, [cep]);

    const handleChange = (
        e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLSelectElement>
    ) => {
        const target = e.currentTarget as HTMLInputElement;
        const { name, value, type, checked } = target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? String(checked) : value
        }));
        // If editing address fields manually
        if (['numero', 'complemento', 'referenciaEntrega', 'logradouro', 'bairro', 'localidade', 'uf'].includes(name)) {
            setAddress(prev => ({
                ...prev,
                [name]: value
            } as Address));
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        // Aqui você terá acesso a form + cep + address com os campos novos
        console.log('Form data', { personType, ...form, cep, address });
    };

    return (
        <>
            <NavbarCheckout />
            <div className='bg-white'>
                <main className="max-w-4xl mx-auto px-4 py-8 bg-gray-100 text-black">
                    <h1 className="text-3xl font-semibold mb-2">Cadastro</h1>
                    <p className="mb-6">Por favor, preencha os campos abaixo para criar sua conta na loja</p>

                    <div className="mb-6 flex items-center space-x-4 bg-white">
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="personType"
                                value="pf"
                                checked={personType === 'pf'}
                                onChange={() => setPersonType('pf')}
                                className="accent-red-600"
                            />
                            <span>Pessoa Física</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="personType"
                                value="pj"
                                checked={personType === 'pj'}
                                onChange={() => setPersonType('pj')}
                                className="accent-red-600"
                            />
                            <span>Pessoa Jurídica</span>
                        </label>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <h2 className="text-xl font-bold mb-4">Dados Pessoais</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {/* E-mail */}
                            <div>
                                <label className="block text-sm font-medium mb-1">E-mail *</label>
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

                            {/* CPF / CNPJ */}
                            {personType === 'pf' ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1">CPF *</label>
                                    <input
                                        type="text"
                                        name="cpf"
                                        value={form.cpf}
                                        onChange={handleChange}
                                        required
                                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                                        placeholder="CPF"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1">CNPJ *</label>
                                    <input
                                        type="text"
                                        name="cnpj"
                                        value={form.cnpj}
                                        onChange={handleChange}
                                        required
                                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                                        placeholder="CNPJ"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Campos adicionais por tipo*/}
                        {personType === 'pf' ? (
                            <>
                                {/* Nome Completo */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Nome Completo *</label>
                                    <input
                                        type="text"
                                        name="nomeCompleto"
                                        value={form.nomeCompleto}
                                        onChange={handleChange}
                                        required
                                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                {/* Data e gênero */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Data de Nascimento *</label>
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
                                        <label className="block text-sm font-medium mb-1">Gênero *</label>
                                        <select
                                            name="genero"
                                            value={form.genero}
                                            onChange={handleChange}
                                            required
                                            className="w-full border border-gray-300 px-3 py-2 text-sm"
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="F">Feminino</option>
                                            <option value="M">Masculino</option>
                                            <option value="O">Outro</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Razão Social */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Razão Social *</label>
                                    <input
                                        type="text"
                                        name="razaoSocial"
                                        value={form.razaoSocial}
                                        onChange={handleChange}
                                        required
                                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                {/* Inscrição Estadual */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Inscrição Estadual *</label>
                                        <input
                                            type="text"
                                            name="inscricaoEstadual"
                                            value={form.inscricaoEstadual}
                                            onChange={handleChange}
                                            required
                                            className="w-full border border-gray-300 px-3 py-2 text-sm"
                                        />
                                    </div>
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

                        {/* Senha */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Informe a Senha *</label>
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
                                <label className="block text-sm font-medium mb-1">Confirme a Senha *</label>
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

                        {/* Telefone */}
                        <div className="grid grid-cols-[80px_1fr] gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Telefone *</label>
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
                                <label className="block text-sm font-medium mb-1">&nbsp;</label>
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

                        {/* Newsletter */}
                        <label className="inline-flex items-center mb-6 space-x-2">
                            <input
                                type="checkbox"
                                name="receberNewsletter"
                                className="accent-red-600"
                                onChange={handleChange}
                            />
                            <span>Recebimento de Newsletter</span>
                        </label>

                        {/* Endereço */}
                        <h2 className="text-xl font-bold mb-4">Endereço de Cadastro</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Nome do Destinatário *</label>
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

                        {/* Campos de endereço auto preenchidos e editáveis */}
                        {(address.logradouro || true) && (
                            <div className="space-y-4 mb-6 bg-white p-4 border border-gray-200">
                                <input
                                    name="logradouro"
                                    value={address.logradouro}
                                    onChange={handleChange}
                                    placeholder="Logradouro"
                                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                                />
                                <div className="grid grid-cols-3 gap-4">
                                    <input
                                        name="numero"
                                        value={form.numero}
                                        onChange={handleChange}
                                        placeholder="Número"
                                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    />
                                    <input
                                        name="complemento"
                                        value={form.complemento}
                                        onChange={handleChange}
                                        placeholder="Complemento"
                                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    />
                                    <input
                                        name="referenciaEntrega"
                                        value={form.referenciaEntrega}
                                        onChange={handleChange}
                                        placeholder="Referência de Entrega"
                                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        name="bairro"
                                        value={address.bairro}
                                        onChange={handleChange}
                                        placeholder="Bairro"
                                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    />
                                    <input
                                        name="localidade"
                                        value={address.localidade}
                                        onChange={handleChange}
                                        placeholder="Cidade"
                                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                <input
                                    name="uf"
                                    value={address.uf}
                                    onChange={handleChange}
                                    placeholder="UF"
                                    className="w-1/4 border border-gray-300 px-3 py-2 text-sm"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-red-600 text-white py-3 uppercase font-medium hover:bg-red-700 transition"
                        >
                            Cadastrar
                        </button>
                    </form>
                </main>
            </div>

            <FooterCheckout />
        </>
    );
};