import noImage from '../../public/no-image.png';
import StoreLayout from './components/layouts/storeLayout'; 
import { FooterStore } from './components/footer/footerStore';  
import { NavbarStore } from './components/navbar/navbarStore'; 
import HomePage from './components/homePage'; 
import { setupAPIClient } from "../services/api";
import { Metadata, ResolvingMetadata } from "next";
import { SlideBannerClient } from './components/slideBannerClient'; 
import { PublicationSidebarClient } from './components/publicationSidebarClient'; 

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STORE_URL = process.env.NEXT_PUBLIC_URL_STORE;

export async function generateMetadata(
  parent: ResolvingMetadata
): Promise<Metadata> {

  const fallbackMetadata: Metadata = {
    title: "Loja",
    description: "Os melhores produtos para você.",
    openGraph: {
      images: [{ url: noImage.src }]
    }
  };

  try {
    const apiClient = setupAPIClient();

    if (!API_URL || !STORE_URL) {
      throw new Error('Variáveis de ambiente não configuradas!');
    }

    const response = await apiClient.get<any>('/configuration_ecommerce/get_configs');
    const { data } = await apiClient.get<any>(`/seo/get_page?page=Pagina principal`);

    if (!data) {
      return fallbackMetadata;
    }

    const previousImages = (await parent).openGraph?.images || [];

    const ogImages = data?.ogImages?.map((image: string) => ({
      url: new URL(`/files/${image}`, API_URL).toString(),
      width: Number(data.ogImageWidth) || 1200,
      height: data.ogImageHeight || 630,
      alt: data.ogImageAlt || 'Loja',
    })) || [];

    const twitterImages = data?.twitterImages?.map((image: string) => ({
      url: new URL(`/files/${image}`, API_URL).toString(),
      width: Number(data.ogImageWidth) || 1200,
      height: data.ogImageHeight || 630,
      alt: data.ogImageAlt || 'Loja',
    })) || [];

    const faviconUrl = response.data.favicon
      ? new URL(`/files/${response.data.favicon}`, API_URL).toString()
      : "./favicon.ico";

    return {
      title: data?.title || 'Nossa Loja',
      description: data?.description || 'Conheça nossa loja',
      metadataBase: new URL(STORE_URL!),
      robots: {
        follow: true,
        index: true
      },
      icons: {
        icon: faviconUrl
      },
      openGraph: {
        title: data?.ogTitle || 'Nossa Loja',
        description: data?.ogDescription || 'Conheça nossa loja...',
        images: [
          ...ogImages,
          ...previousImages,
        ],
        locale: 'pt_BR',
        siteName: response.data.name_blog || 'Nossa Loja',
        type: "website"
      },
      twitter: {
        card: 'summary_large_image',
        title: data?.twitterTitle || 'Nosso Loja',
        description: data?.twitterDescription || 'Conheça nossa loja...',
        images: [
          ...twitterImages,
          ...previousImages,
        ],
        creator: data?.twitterCreator || '@perfil_twitter',
      },
      keywords: data?.keywords || [],
    };
  } catch (error) {
    console.error('Erro ao gerar metadados:', error);
    return fallbackMetadata;
  }
}

export default async function Home_page() {

  return (
    <StoreLayout
      navbar={<NavbarStore />}
      bannersSlide={<SlideBannerClient position="SLIDER" local='Pagina_inicial' local_site='Pagina_inicial' />}
      footer={<FooterStore />}
      local='Pagina_inicial'
      sidebar_publication={<PublicationSidebarClient local='Pagina_inicial' />}
    >
      <HomePage />
    </StoreLayout>
  );
}