"use client";

import React from "react";
import { API_URL } from "./helpers";

type Props = { configs?: any };

const PrintHeader: React.FC<Props> = ({ configs }) => {
  return (
    <div className="print-only mb-2">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          {configs?.logo ? (
            <img src={`${API_URL}/files/${configs.logo}`} alt="Logo" style={{ height: 36, objectFit: "contain" }} />
          ) : (
            <img src="/public/no-image.png" alt="Logo" style={{ height: 36, objectFit: "contain" }} />
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700 }}>{configs?.name ?? "Nome da Loja"}</div>
          <div style={{ fontSize: 12 }}>CNPJ/CPF: {configs?.cnpj || configs?.cpf}</div>
          <div style={{ fontSize: 12 }}>Telefone: {configs?.phone ?? "—"}</div>
        </div>
      </div>
      <hr />
    </div>
  );
};

export default PrintHeader;