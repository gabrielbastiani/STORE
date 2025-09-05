import React from "react";

type Props = {
    personType: "FISICA" | "JURIDICA";
    form: Record<string, string>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleCpfChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleCnpjChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const PersonalDetails: React.FC<Props> = ({
    personType,
    form,
    handleChange,
    handleCpfChange,
    handleCnpjChange,
}) => {
    return (
        <>
            <h2 className="text-xl font-bold mb-4">Dados Pessoais</h2>

            <div className="grid grid-cols-2 gap-4">
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

                <div>
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

            {personType === "FISICA" ? (
                <>
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
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Inscrição Estadual {!(form.ieIsento === "true") && <span className="text-red-500"> *</span>}
                            </label>
                            <input
                                type="text"
                                name="inscricaoEstadual"
                                value={form.inscricaoEstadual}
                                onChange={handleChange}
                                required={!(form.ieIsento === "true")}
                                disabled={form.ieIsento === "true"}
                                className="w-full border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                            />
                        </div>

                        <div className="flex items-center mt-6">
                            <label className="inline-flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    name="ieIsento"
                                    checked={form.ieIsento === "true"}
                                    onChange={handleChange}
                                    className="accent-red-600"
                                />
                                <span>I.E. Isento</span>
                            </label>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default PersonalDetails;