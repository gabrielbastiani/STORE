import React, { useEffect, ChangeEvent } from "react";

export type Address = {
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
};

type Props = {
    cep: string;
    setCep: React.Dispatch<React.SetStateAction<string>>;
    address: Address;
    setAddress: React.Dispatch<React.SetStateAction<Address>>;
    manualAddress: boolean;
    setManualAddress: React.Dispatch<React.SetStateAction<boolean>>;
    form: Record<string, string>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
};

const estadosBR = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const AddressForm: React.FC<Props> = ({
    cep,
    setCep,
    address,
    setAddress,
    manualAddress,
    setManualAddress,
    form,
    handleChange,
}) => {

    // CEP handler: mantém máscara 99999-999
    const handleCepChange = (e: ChangeEvent<HTMLInputElement>) => {
        let v = e.target.value.replace(/\D/g, "");
        if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5, 8);
        setCep(v);
    };

    // Busca via CEP (viacep) ao completar 8 dígitos
    useEffect(() => {
        const digits = cep.replace(/\D/g, "");
        if (digits.length === 8) {
            fetch(`https://viacep.com.br/ws/${digits}/json/`)
                .then((res) => res.json())
                .then((data) => {
                    if (!data.erro) {
                        setAddress({
                            logradouro: data.logradouro || "",
                            bairro: data.bairro || "",
                            localidade: data.localidade || "",
                            uf: data.uf || "",
                        });
                        setManualAddress(false);
                    } else {
                        setAddress({ logradouro: "", bairro: "", localidade: "", uf: "" });
                        setManualAddress(true);
                    }
                })
                .catch(() => {
                    setAddress({ logradouro: "", bairro: "", localidade: "", uf: "" });
                    setManualAddress(true);
                });
        } else {
            setAddress({ logradouro: "", bairro: "", localidade: "", uf: "" });
            setManualAddress(false);
        }
    }, [cep, setAddress, setManualAddress]);

    return (
        <>
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

            <div className="space-y-4 mb-6">
                <input
                    type="text"
                    name="logradouro"
                    value={address.logradouro}
                    onChange={(e) => {
                        setAddress((prev) => ({ ...prev, logradouro: e.target.value }));
                        if (!manualAddress) setManualAddress(true);
                    }}
                    placeholder="Logradouro"
                    required
                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                />

                <input
                    type="text"
                    name="bairro"
                    value={address.bairro}
                    onChange={(e) => {
                        setAddress((prev) => ({ ...prev, bairro: e.target.value }));
                        if (!manualAddress) setManualAddress(true);
                    }}
                    placeholder="Bairro"
                    required
                    className="w-full border border-gray-300 px-3 py-2 text-sm"
                />

                <div className="grid grid-cols-3 gap-4">
                    <input
                        type="text"
                        name="localidade"
                        value={address.localidade}
                        onChange={(e) => {
                            setAddress((prev) => ({ ...prev, localidade: e.target.value }));
                            if (!manualAddress) setManualAddress(true);
                        }}
                        placeholder="Cidade"
                        required
                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                    />

                    <select
                        name="uf"
                        value={address.uf}
                        onChange={(e) => {
                            setAddress((prev) => ({ ...prev, uf: e.target.value }));
                            if (!manualAddress) setManualAddress(true);
                        }}
                        required
                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">{manualAddress ? "Selecione o estado" : "UF (auto)"}</option>
                        {estadosBR.map((sigla) => (
                            <option key={sigla} value={sigla}>
                                {sigla}
                            </option>
                        ))}
                    </select>

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
                    <input
                        type="text"
                        name="complemento"
                        value={form.complemento}
                        onChange={handleChange}
                        placeholder="Complemento"
                        className="w-full border border-gray-300 px-3 py-2 text-sm"
                    />

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
        </>
    );
};

export default AddressForm;