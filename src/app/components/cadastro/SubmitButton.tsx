import React from "react";

type Props = {
    loading: boolean;
};

const SubmitButton: React.FC<Props> = ({ loading }) => {
    return (
        <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 uppercase font-medium hover:bg-red-700 transition disabled:opacity-50"
        >
            {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
    );
};

export default SubmitButton;