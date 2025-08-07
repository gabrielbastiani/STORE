import React from "react";
import Image from "next/image";
import whatsapp from "../../../../public/whatsapp-icon.png";
import facebook from "../../../../public/facebook-icon.png";
import X from "../../../../public/X_icon.png";
import linkedin from "../../../../public/linkedin-icon.png";

interface ShareMenuProps {
  showShareMenu: boolean;
  shareProduct: (platform: string) => void;
}

export default function ShareMenu({
  showShareMenu,
  shareProduct
}: ShareMenuProps) {
  if (!showShareMenu) return null;

  return (
    <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg z-50 border border-gray-200 text-black">
      <div className="p-2 space-y-1">
        <button
          onClick={() => shareProduct('whatsapp')}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
        >
          <Image
            src={whatsapp}
            alt="WhatsApp"
            width={40}
            height={40}
            className="w-5 h-5"
          />
          WhatsApp
        </button>
        <button
          onClick={() => shareProduct('facebook')}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
        >
          <Image
            src={facebook}
            alt="Facebook"
            width={20}
            height={20}
            className="w-5 h-5"
          />
          Facebook
        </button>
        <button
          onClick={() => shareProduct('twitter')}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
        >
          <Image
            src={X}
            alt="X"
            width={20}
            height={20}
            className="w-5 h-5"
          />
          X
        </button>
        <button
          onClick={() => shareProduct('linkedin')}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
        >
          <Image
            src={linkedin}
            alt="LinkedIn"
            width={20}
            height={20}
            className="w-5 h-5"
          />
          LinkedIn
        </button>
        <button
          onClick={() => shareProduct('copy')}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            viewBox="0 0 24 24"
          >
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
          </svg>
          Copiar Link
        </button>
      </div>
    </div>
  );
}