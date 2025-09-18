"use client";

import React from "react";

type Props = { pickupAddress?: any };

const AddressSection: React.FC<Props> = ({ pickupAddress }) => (
    <div className="border rounded p-4 space-y-2">
        <h2 className="flex items-center text-lg font-semibold">Endereço de Retirada</h2>
        <div className="text-sm space-y-1">
            <div><span className="font-medium">Nome do Destinatário:</span> {pickupAddress?.recipient_name ?? "—"}</div>
            <div><span className="font-medium">Logradouro:</span> {pickupAddress?.street ?? "—"}</div>
            <div><span className="font-medium">Número:</span> {pickupAddress?.number ?? "—"}</div>
            <div><span className="font-medium">Bairro:</span> {pickupAddress?.neighborhood ?? "—"}</div>
            <div><span className="font-medium">CEP:</span> {pickupAddress?.cep ?? "—"}</div>
            <div><span className="font-medium">Cidade:</span> {pickupAddress?.city ?? "—"}</div>
            <div><span className="font-medium">Estado:</span> {pickupAddress?.state ?? "—"}</div>
            <div><span className="font-medium">País:</span> {pickupAddress?.country ?? "—"}</div>
            {pickupAddress?.complement && <div><span className="font-medium">Complemento:</span> {pickupAddress.complement}</div>}
            {pickupAddress?.reference && <div><span className="font-medium">Referência:</span> {pickupAddress.reference}</div>}
            {pickupAddress?.obs && <div><span className="font-medium">Obs:</span> {pickupAddress.obs}</div>}
        </div>
    </div>
);

export default AddressSection;