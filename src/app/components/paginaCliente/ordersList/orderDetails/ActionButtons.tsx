"use client";

import React from "react";
import { Printer, ArrowLeft } from "lucide-react";

type Props = { onBack: () => void };

const ActionButtons: React.FC<Props> = ({ onBack }) => (
    <div className="flex justify-between no-print">
        <button onClick={onBack} className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            <ArrowLeft className="mr-2" size={16} /> Voltar
        </button>

        <button onClick={() => window.print()} className="flex items-center bg-orange-900 text-white px-4 py-2 rounded hover:bg-orange-700">
            <Printer className="mr-2" size={16} /> Imprimir
        </button>
    </div>
);

export default ActionButtons;