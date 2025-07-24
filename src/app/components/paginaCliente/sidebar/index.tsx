"use client";

import { ShoppingCart, DollarSign, Cloud, AtSign, Key, User, MapPin, LogOut } from "lucide-react";

export type MenuKey =
  | "pedidos"
  | "creditos"
  | "digitais"
  | "alterar-email"
  | "alterar-senha"
  | "dados"
  | "enderecos"
  | "sair";

interface SidebarProps {
  active: MenuKey;
  onSelect: (menu: MenuKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ active, onSelect }) => (
  <nav className="w-64 bg-white border-r h-screen p-4">
    <h2 className="font-bold text-2xl mb-6 text-black">Minha Conta</h2>
    <div className="space-y-2">
      <p className="uppercase text-sm font-semibold text-gray-800">Minhas compras</p>
      <button
        onClick={() => onSelect("pedidos")}
        className={`text-sm flex items-center w-full p-2 rounded hover:bg-gray-100 text-gray-600 border-gray-600 border-2 ${active === "pedidos" ? "bg-gray-100" : ""
          }`}
      >
        <ShoppingCart className="mr-2" size={18} /> Meus Pedidos
      </button>

      <button
        onClick={() => onSelect("creditos")}
        className={`text-sm flex items-center w-full p-2 rounded hover:bg-gray-100 text-gray-600 border-gray-600 border-2 ${active === "creditos" ? "bg-gray-100" : ""
          }`}
      >
        <DollarSign className="mr-2" size={18} /> Meus Créditos
      </button>

      <button
        onClick={() => onSelect("digitais")}
        className={`text-sm flex items-center w-full p-2 rounded hover:bg-gray-100 text-gray-600 border-gray-600 border-2 ${active === "digitais" ? "bg-gray-100" : ""
          }`}
      >
        <Cloud className="mr-2" size={18} /> Meus Produtos Digitais
      </button>

      <p className="uppercase text-sm font-semibold text-gray-800 mt-6">Cadastro</p>

      <button
        onClick={() => onSelect("alterar-email")}
        className="text-sm flex items-center w-full p-2 rounded hover:bg-gray-100 text-gray-600 border-gray-600 border-2"
      >
        <AtSign className="mr-2" size={18} /> Alterar E‑mail
      </button>

      <button
        onClick={() => onSelect("alterar-senha")}
        className="text-sm flex items-center w-full p-2 rounded hover:bg-gray-100 text-gray-600 border-gray-600 border-2"
      >
        <Key className="mr-2" size={18} /> Alterar Senha
      </button>

      <button
        onClick={() => onSelect("dados")}
        className={`text-sm flex items-center w-full p-2 rounded hover:bg-gray-100 text-gray-600 border-gray-600 border-2 ${active === "dados" ? "bg-gray-100" : ""
          }`}
      >
        <User className="mr-2" size={18} /> Meus Dados
      </button>

      <button
        onClick={() => onSelect("enderecos")}
        className="text-sm flex items-center w-full p-2 rounded hover:bg-gray-100 text-gray-600 border-gray-600 border-2"
      >
        <MapPin className="mr-2" size={18} /> Meus Endereços
      </button>

      <button
        onClick={() => onSelect("sair")}
        className="text-sm flex items-center w-full p-2 rounded hover:bg-gray-100 text-gray-600 border-gray-600 border-2 mt-4"
      >
        <LogOut className="mr-2" size={18} /> Sair
      </button>
    </div>
  </nav>
);