'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type Item = {
    id: number
    image: string
    title: string
    button: string
    link: string
}

type Slide = {
    id: number
    items: Item[]  // sempre 4 neste exemplo
}

export const MosaicSlider: React.FC = () => {
    
    const [slides, setSlides] = useState<Slide[]>([])
    const [current, setCurrent] = useState(0)

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/mosaic')
            const data: Slide[] = await res.json()
            setSlides(data)
        }
        load()
    }, [])

    if (!slides.length) return null

    const prev = () =>
        setCurrent((c) => (c === 0 ? slides.length - 1 : c - 1))
    const next = () =>
        setCurrent((c) => (c === slides.length - 1 ? 0 : c + 1))

    const slide = slides[current]

    return (
        <div className="relative">
            {/* Setas */}
            <button
                onClick={prev}
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 bg-black/30 p-2 text-white hover:bg-black/50"
            >
                ‹
            </button>
            <button
                onClick={next}
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 bg-black/30 p-2 text-white hover:bg-black/50"
            >
                ›
            </button>

            {/* Container do mosaico */}
            <div className="grid grid-cols-2 grid-rows-2 gap-2">
                {slide.items.map((item, idx) => {
                    // Aqui você pode trocar as classes para criar layouts diferentes
                    // dependendo do índice ou até do próprio slide.id
                    // Exemplo: no slide 2, inverter o layout
                    const isSecondSlide = slide.id === slides[1].id
                    const baseClasses = 'relative w-full h-64 overflow-hidden'
                    let extra =
                        !isSecondSlide
                            ? ['col-span-1 row-span-2', '', '', 'col-span-1 row-span-2'][idx]
                            : ['', 'col-span-2 row-span-1', 'col-span-2 row-span-1', ''][idx]

                    return (
                        <div key={item.id} className={`${baseClasses} ${extra}`}>
                            <Link href={item.link}>
                                <a className="block w-full h-full">
                                    <Image
                                        src={item.image}
                                        alt={item.title}
                                        width={800}
                                        height={600}
                                        className="object-cover w-full h-full"
                                    />
                                    {/* Overlay: bloco superior */}
                                    <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 text-white text-sm rounded">
                                        {item.title}
                                    </div>
                                    {/* Overlay: bloco inferior com botão */}
                                    <div className="absolute bottom-2 left-2 flex items-center space-x-2">
                                        <span className="bg-black/60 px-2 py-1 text-white text-sm rounded">
                                            {item.button}
                                        </span>
                                    </div>
                                </a>
                            </Link>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}