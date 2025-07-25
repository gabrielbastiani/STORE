"use client"

import { useState, useEffect, useContext } from "react";
import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import { setupAPIClient } from "@/services/api";
import { toast } from "react-toastify";
import { AxiosResponse } from "axios";

// Definição do tipo de endereço
export interface AddressProps {
    id: string;
    recipient_name: string;
    zipCode: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    number: string;
    complement?: string;
    reference?: string;
    country: string;
}

// Máscara de CEP
const maskCep = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.replace(/(\d{5})(\d)/, "$1-$2");
};

const estadosBR = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function AddressList() {
    const { user } = useContext(AuthContextStore);

    const [addresses, setAddresses] = useState<AddressProps[]>([]);
    const [loading, setLoading] = useState(true);

    // controle de formulário
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Omit<AddressProps, "id">>({
        recipient_name: "",
        zipCode: "",
        street: "",
        neighborhood: "",
        city: "",
        state: "",
        number: "",
        complement: "",
        reference: "",
        country: "Brasil"
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    // confirmação de exclusão
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    // carregar lista
    useEffect(() => {
        if (!user) return;
        async function load() {
            try {
                const api = setupAPIClient();
                const { data } = await api.get<AddressProps[]>(
                    `/customer/address/list?customer_id=${user?.id}`
                );
                setAddresses(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [user]);

    // CEP → busca auto
    const handleCepBlur = async () => {
        const raw = formData.zipCode.replace(/\D/g, "");
        if (raw.length !== 8) return;
        try {
            const resp = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
            const json = await resp.json();
            if (!json.erro) {
                setFormData(f => ({
                    ...f,
                    street: json.logradouro || "",
                    neighborhood: json.bairro || "",
                    city: json.localidade || "",
                    state: json.uf || "",
                }));
            }
        } catch { }
    };

    // novo
    const handleNew = () => {
        setIsEditing(false);
        setEditingId(null);
        setFormData({
            recipient_name: "",
            zipCode: "",
            street: "",
            neighborhood: "",
            city: "",
            state: "",
            number: "",
            complement: "",
            reference: "",
            country: "Brasil"
        });
        setShowForm(true);
    };

    // editar
    const handleEdit = (addr: AddressProps) => {
        setIsEditing(true);
        setEditingId(addr.id);
        setFormData({ ...addr });
        setShowForm(true);
    };

    // solicita confirmação
    const requestRemove = (id: string) => {
        setDeleteTarget(id);
    };

    // confirma exclusão
    const confirmRemove = async () => {
        if (!deleteTarget) return;
        try {
            const api = setupAPIClient();
            await api.delete(`/customer/address/delete?address_id=${deleteTarget}`);
            setAddresses(a => a.filter(x => x.id !== deleteTarget));
            toast.success("Endereço removido");
        } catch {
            toast.error("Erro ao remover");
        } finally {
            setDeleteTarget(null);
        }
    };

    // cancelar exclusão
    const cancelRemove = () => {
        setDeleteTarget(null);
    };

    // salvar form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const api = setupAPIClient();
            const payload = {
                customer_id: user!.id,
                ...formData,
                zipCode: formData.zipCode.replace(/\D/g, ""),
            };
            let resp: AxiosResponse<any>;
            if (isEditing && editingId) {
                resp = await api.put(`/customer/address/update`, {
                    address_id: editingId,
                    ...payload,
                });
                setAddresses(a =>
                    a.map(x => x.id === editingId ? resp.data : x)
                );
                toast.success("Endereço atualizado");
            } else {
                resp = await api.post(`/address/customer/create`, payload);
                setAddresses(a => [...a, resp.data]);
                toast.success("Endereço cadastrado");
            }
            setShowForm(false);
        } catch {
            toast.error("Falha ao salvar endereço");
        }
    };

    return (
        <div className="space-y-6 text-black">
            <div className="flex justify-end">
                <button
                    onClick={handleNew}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                    Cadastrar Novo Endereço
                </button>
            </div>

            {loading
                ? <p>Carregando endereços…</p>
                : addresses.length === 0
                    ? <p>Nenhum endereço cadastrado.</p>
                    : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {addresses.map(addr => (
                                <div key={addr.id} className="border rounded p-4 bg-white shadow-sm space-y-2">
                                    <p className="font-semibold">{addr.recipient_name}</p>
                                    <p>{addr.street}, {addr.number}</p>
                                    {addr.complement && <p>Comp.: {addr.complement}</p>}
                                    {addr.reference && <p>Ref.: {addr.reference}</p>}
                                    <p>{addr.neighborhood} — {addr.city} / {addr.state}</p>
                                    <p>CEP: {addr.zipCode}</p>
                                    <div className="flex space-x-2 pt-2">
                                        <button
                                            onClick={() => requestRemove(addr.id)}
                                            className="flex-1 bg-gray-200 text-gray-700 py-1 rounded hover:bg-gray-300"
                                        >
                                            Remover
                                        </button>
                                        <button
                                            onClick={() => handleEdit(addr)}
                                            className="flex-1 bg-red-600 text-white py-1 rounded hover:bg-red-700"
                                        >
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
            }

            {/* Modal de exclusão */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black bg-opacity-30" onClick={cancelRemove} />
                    <div className="bg-white p-6 rounded shadow-md z-10 max-w-sm mx-auto space-y-4">
                        <p className="text-lg">Confirma a exclusão deste endereço?</p>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={cancelRemove}
                                className="px-4 py-2 border rounded hover:bg-gray-100"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmRemove}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* drawer / modal de formulário */}
            {showForm && (
                <div className="fixed inset-0 z-40 flex">
                    <div
                        className="absolute inset-0 bg-black bg-opacity-30"
                        onClick={() => setShowForm(false)}
                    />
                    <div className="relative bg-white w-full md:w-1/2 h-full overflow-auto p-6 z-50">
                        <h3 className="text-xl font-semibold mb-4">
                            {isEditing ? "Editar Endereço" : "Novo Endereço"}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
                            {/* Destinatário */}
                            <div>
                                <label className="block text-sm font-medium">Nome do Destinatário *</label>
                                <input
                                    type="text"
                                    value={formData.recipient_name}
                                    onChange={e => setFormData(f => ({ ...f, recipient_name: e.target.value }))}
                                    required
                                    className="mt-1 w-full border rounded p-2"
                                    placeholder="Quem receberá a entrega?"
                                />
                            </div>

                            {/* CEP */}
                            <div className="grid grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-medium">CEP *</label>
                                    <input
                                        type="text"
                                        value={formData.zipCode}
                                        onChange={e => setFormData(f => ({ ...f, zipCode: maskCep(e.target.value) }))}
                                        onBlur={handleCepBlur}
                                        required
                                        className="mt-1 w-full border rounded p-2"
                                        placeholder="99999-999"
                                    />
                                </div>
                                <div>
                                    <button
                                        type="button"
                                        onClick={handleCepBlur}
                                        className="text-sm text-blue-600 underline"
                                    >
                                        Não sabe o CEP?
                                    </button>
                                </div>
                            </div>

                            {/* Logradouro */}
                            <div>
                                <label className="block text-sm font-medium">Logradouro</label>
                                <input
                                    type="text"
                                    value={formData.street}
                                    onChange={e => setFormData(f => ({ ...f, street: e.target.value }))}
                                    className="mt-1 w-full border rounded p-2"
                                    placeholder="Logradouro"
                                />
                            </div>

                            {/* Bairro */}
                            <div>
                                <label className="block text-sm font-medium">Bairro</label>
                                <input
                                    type="text"
                                    value={formData.neighborhood}
                                    onChange={e => setFormData(f => ({ ...f, neighborhood: e.target.value }))}
                                    className="mt-1 w-full border rounded p-2"
                                    placeholder="Bairro"
                                />
                            </div>

                            {/* Cidade / UF / Número */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Cidade</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={e => setFormData(f => ({ ...f, city: e.target.value }))}
                                        className="mt-1 w-full border rounded p-2"
                                        placeholder="Cidade"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Estado (UF)</label>
                                    <select
                                        value={formData.state}
                                        onChange={e => setFormData(f => ({ ...f, state: e.target.value }))}
                                        required
                                        className="mt-1 w-full border rounded p-2 bg-white"
                                    >
                                        <option value="">Selecione a UF</option>
                                        {estadosBR.map(uf => (
                                            <option key={uf} value={uf}>{uf}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Número</label>
                                    <input
                                        type="text"
                                        value={formData.number}
                                        onChange={e => setFormData(f => ({ ...f, number: e.target.value }))}
                                        className="mt-1 w-full border rounded p-2"
                                        placeholder="Número"
                                    />
                                </div>
                            </div>

                            {/* Complemento / Referência */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium">Complemento</label>
                                    <input
                                        type="text"
                                        value={formData.complement || ""}
                                        onChange={e => setFormData(f => ({ ...f, complement: e.target.value }))}
                                        className="mt-1 w-full border rounded p-2"
                                        placeholder="Complemento"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Referência de entrega</label>
                                    <input
                                        type="text"
                                        value={formData.reference || ""}
                                        onChange={e => setFormData(f => ({ ...f, reference: e.target.value }))}
                                        className="mt-1 w-full border rounded p-2"
                                        placeholder="Referência"
                                    />
                                </div>
                            </div>

                            {/* Ações */}
                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 border rounded hover:bg-gray-100"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    Salvar Endereço
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}