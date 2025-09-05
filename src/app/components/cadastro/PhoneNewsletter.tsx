import React from "react";

type Props = {
    form: Record<string, string>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
};

const PhoneNewsletter: React.FC<Props> = ({ form, handleChange }) => {
    return (
        <>
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

            <label className="inline-flex items-center mb-6 space-x-2">
                <input
                    type="checkbox"
                    name="newsletter"
                    className="accent-red-600"
                    onChange={handleChange}
                    checked={form.newsletter === "true"}
                />
                <span>Recebimento de Newsletter</span>
            </label>
        </>
    );
};

export default PhoneNewsletter;