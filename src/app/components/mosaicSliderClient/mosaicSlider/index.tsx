'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

export interface PublicationProps {
    id: string
    title: string
    description: string
    local: string
    image_url: string
    redirect_url: string
    text_button: string
    text_publication: string
}

export const MosaicSlider: React.FC = () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
    const [items, setItems] = useState<PublicationProps[]>([])
    const [error, setError] = useState<string | null>(null)

    // monta o endpoint corretamente
    const endpoint = API_URL
        ? `${API_URL}/marketing_publication/existing_mosaic?local=Pagina_inicial`
        : `/api/marketing_publication/existing_mosaic?local=Pagina_inicial`

    // 1) busca dados uma única vez
    useEffect(() => {
        fetch(endpoint)
            .then((r) => {
                if (!r.ok) throw new Error(`Status ${r.status}`)
                return r.json() as Promise<PublicationProps[]>
            })
            .then(setItems)
            .catch((err) => {
                console.error(err)
                setError('Não foi possível carregar o mosaico.')
            })
    }, [endpoint])

    // 2) agrupa *todos* os itens, mesmo que o último seja menor que 4
    const slides = useMemo(() => {
        const out: PublicationProps[][] = []
        for (let i = 0; i < items.length; i += 4) {
            out.push(items.slice(i, i + 4))
        }
        return out
    }, [items])

    if (error) {
        return <div className="text-red-600 text-center py-8">{error}</div>
    }
    if (!slides.length) return null

    // 3) layouts configuráveis para slides de exatamente 4 itens
    const layoutConfigs: Record<number, string[]> = {
        // Slide 0: 75% / 25% (grid-cols-4 grid-rows-2)
        0: ['col-span-3', 'col-span-1', 'col-span-3', 'col-span-1'],
        // Slide 1: 2×2 igualitário (grid-cols-2 grid-rows-2)
        1: ['col-span-1', 'col-span-1', 'col-span-1', 'col-span-1'],
        // Slide 2: full + 3 colunas (grid-cols-4)
        2: ['col-span-4', 'col-span-1', 'col-span-1', 'col-span-1'],
        // (você pode adicionar mais índices se quiser mais variações)
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 overflow-hidden">
            <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                navigation
                pagination={{ clickable: true }}
                loop
                autoplay={{ delay: 5000, disableOnInteraction: true }}
                slidesPerView={1}
                centeredSlides
            >
                {slides.map((chunk, slideIdx) => {
                    const n = chunk.length

                    // Se for exatamente 4 e tivermos config, usamos layoutConfigs
                    const useCustom =
                        n === 4 && layoutConfigs[slideIdx % Object.keys(layoutConfigs).length]

                    return (
                        <SwiperSlide key={slideIdx}>
                            {useCustom ? (
                                // grid customizado para 4 itens
                                (() => {
                                    const config =
                                        layoutConfigs[slideIdx % Object.keys(layoutConfigs).length]
                                    // escolhe grid-container
                                    let gridClass = ''
                                    if (config[0] === 'col-span-3') {
                                        gridClass = 'grid-cols-4 grid-rows-2'
                                    } else if (config[0] === 'col-span-4') {
                                        gridClass = 'grid-cols-4 grid-rows-1'
                                    } else {
                                        gridClass = 'grid-cols-2 grid-rows-2'
                                    }
                                    return (
                                        <div className={`grid ${gridClass} gap-2`}>
                                            {chunk.map((pub, idx) => (
                                                <Tile
                                                    key={pub.id}
                                                    pub={pub}
                                                    spanClass={config[idx]}
                                                />
                                            ))}
                                        </div>
                                    )
                                })()
                            ) : (
                                // fallback: grid responsivo para n itens (1 ≤ n < 4)
                                <div
                                    className={`grid grid-cols-${n} auto-rows-min gap-2`}
                                >
                                    {chunk.map((pub) => (
                                        <Tile key={pub.id} pub={pub} spanClass="col-span-1" />
                                    ))}
                                </div>
                            )}
                        </SwiperSlide>
                    )
                })}
            </Swiper>
        </div>
    )
}

type TileProps = {
    pub: PublicationProps
    spanClass: string
}

const Tile: React.FC<TileProps> = ({ pub, spanClass }) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
    const src = `${API_URL}/files/${pub.image_url}`

    return (
        <Link
            href={pub.redirect_url}
            target="_blank"
            rel="noreferrer"
            className={`${spanClass} relative h-48 overflow-hidden`}
        >
            <Image
                src={src}
                alt={pub.title}
                fill
                className="object-cover"
            />
            <div className="absolute top-2 left-2 bg-black/40 px-2 py-1 text-white text-xs">
                {pub.text_publication}
            </div>
            <button
                onClick={(e) => {
                    e.preventDefault()
                    window.open(pub.redirect_url, '_blank')
                }}
                className="absolute bottom-2 left-2 bg-black/40 px-2 py-1 text-white text-xs"
            >
                {pub.text_button}
            </button>
        </Link>
    )
}