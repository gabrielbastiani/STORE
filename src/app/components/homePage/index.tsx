"use client"

import CategoriesGrid from "../categoriesGrid";
import Highlights from "../highlights";
import { MosaicSliderClient } from "../mosaicSliderClient";
import MosaicSlider from "../mosaicSliderClient/mosaicSlider";
import { Newsletter } from "../newsletter"; 
import Offers from "../offers";
import MarketingPopup from "../popups/marketingPopup"; 
import RecentlyViewed from "../recentlyViewed";

const HomePage = () => {
    return (
        <div className="w-full bg-gray-100">
            <MarketingPopup
                position="POPUP"
                local="Pagina_inicial"
            />
            <Offers />
            <Newsletter />
            <CategoriesGrid />
            <MosaicSliderClient local="Pagina_inicial" />
            <Highlights />
            <RecentlyViewed />
        </div>
    );
};

export default HomePage;