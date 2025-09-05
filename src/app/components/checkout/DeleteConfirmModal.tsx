'use client'

import React from 'react'
import { Dialog } from '@headlessui/react'

type Props = {
    open: boolean
    onCancel: () => void
    onConfirm: () => Promise<void> | void
}

export default function DeleteConfirmModal({ open, onCancel, onConfirm }: Props) {
    return (
        <Dialog open={open} onClose={onCancel} className="relative z-50 text-black">
            <div className="fixed inset-0 bg-black/30" aria-hidden />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-sm bg-white p-6 rounded-lg">
                    <Dialog.Title className="text-lg font-semibold">Remover endereço</Dialog.Title>
                    <div className="mt-4">
                        <p>Tem certeza de que deseja remover este endereço?</p>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <button className="px-4 py-2 border rounded" onClick={onCancel}>Cancelar</button>
                        <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={() => onConfirm()}>Remover</button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    )
}