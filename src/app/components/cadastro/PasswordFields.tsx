import React from "react";

type Props = {
    form: Record<string, string>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
};

const PasswordFields: React.FC<Props> = ({ form, handleChange }) => {
    return (
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
    );
};

export default PasswordFields;