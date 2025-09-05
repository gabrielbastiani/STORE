import React from "react";

type Props = {
    personType: "FISICA" | "JURIDICA";
    setPersonType: (v: "FISICA" | "JURIDICA") => void;
};

const PersonTypeSelector: React.FC<Props> = ({ personType, setPersonType }) => {
    return (
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
    );
};

export default PersonTypeSelector;