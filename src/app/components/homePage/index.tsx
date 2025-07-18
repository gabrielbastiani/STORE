"use client"

import { Newsletter } from "../newsletter"; 
import Offers from "../offers";
import MarketingPopup from "../popups/marketingPopup"; 

const HomePage = () => {
    return (
        <div className="w-full bg-gray-100">
            <MarketingPopup
                position="POPUP"
                local="Pagina_inicial"
            />
            <Offers />
            <Newsletter />
        </div>
    );
};

export default HomePage;