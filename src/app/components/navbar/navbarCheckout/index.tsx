import { AuthContextStore } from "@/app/contexts/AuthContextStore";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useContext } from "react";
import Image from "next/image";
import { FiChevronLeft } from "react-icons/fi";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export function NavbarCheckout() {

    const router = useRouter();
    const { colors } = useTheme();
    const { configs } = useContext(AuthContextStore);

    return (
        <header
            className="flex items-center justify-between bg-white px-4 py-3 shadow-sm"
            style={{ background: colors?.fundo_do_menu || "#000" }}
        >
            <div onClick={() => router.back()} className="flex items-center text-white cursor-pointer">
                <FiChevronLeft className="mr-2 text-xl" />
                VOLTAR
            </div>
            <div>
                <Image
                    src={`${API_URL}/files/${configs?.logo}`}
                    alt={configs?.name || "loja"}
                    width={120}
                    height={32}
                />
            </div>
            <span className="text-sm text-white">Ambiente 100% seguro</span>
        </header>
    )
}