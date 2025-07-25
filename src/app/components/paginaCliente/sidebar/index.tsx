// app/components/paginaCliente/Sidebar.tsx
"use client";

import { useState, useEffect, JSX } from "react";
import { ShoppingCart, User, MapPin, LogOut } from "lucide-react";

export type MenuKey = "pedidos" | "dados" | "enderecos" | "sair";

interface SidebarProps {
  active: MenuKey;
  onSelect: (menu: MenuKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ active, onSelect }) => {
  // detecta se estamos em mobile
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const items: { key: MenuKey; label: string; icon: JSX.Element }[] = [
    { key: "pedidos", label: "Pedidos",   icon: <ShoppingCart size={20} /> },
    { key: "dados",   label: "Dados",     icon: <User size={20} /> },
    { key: "enderecos", label: "Endereços",icon: <MapPin size={20} /> },
    { key: "sair",    label: "Sair",      icon: <LogOut size={20} /> },
  ];

  // Modo MOBILE: barra horizontal fixa abaixo da Navbar
  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-10">
        <div className="flex justify-around">
          {items.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`flex flex-col items-center justify-center py-2 flex-1
                ${active === key
                  ? "text-blue-600 border-t-2 border-blue-600"
                  : "text-gray-600"}
              `}
            >
              {icon}
              <span className="text-xs mt-1">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    );
  }

  // Modo DESKTOP: sidebar fixa vertical
  return (
    <nav className="hidden md:block w-64 bg-white border-r h-screen p-4">
      <h2 className="font-bold text-2xl mb-6 text-black">Minha Conta</h2>
      <div className="space-y-2">
        <p className="uppercase text-sm font-semibold text-gray-800">
          Minhas compras
        </p>
        {items.slice(0, 1).map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`
              flex items-center w-full p-2 rounded hover:bg-gray-100
              ${active === key ? "bg-gray-100" : ""}
              text-gray-600 border border-gray-300
            `}
          >
            <span className="mr-2">{icon}</span>
            {label}
          </button>
        ))}

        <p className="uppercase text-sm font-semibold text-gray-800 mt-6">
          Cadastro
        </p>
        {items.slice(1).map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`
              flex items-center w-full p-2 rounded hover:bg-gray-100
              ${active === key ? "bg-gray-100" : ""}
              text-gray-600 border border-gray-300
            `}
          >
            <span className="mr-2">{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
};