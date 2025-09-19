'use client'

import React from 'react'
import { useTheme } from '@/app/contexts/ThemeContext'
import { NavbarCheckout } from '@/app/components/navbar/navbarCheckout'
import { FooterCheckout } from '@/app/components/footer/footerCheckout'
import AddressList from '@/app/components/checkout/AddressList'
import ShippingOptions from '@/app/components/checkout/ShippingOptions'
import PaymentSection from '@/app/components/checkout/PaymentSection'
import OrderSummary from '@/app/components/checkout/OrderSummary'
import AddressModal from '@/app/components/checkout/AddressModal'
import DeleteConfirmModal from '@/app/components/checkout/DeleteConfirmModal'
import useFinishOrder from './hooks/useFinishOrder'

export default function FinishOrderContainer() {
    
    const { colors } = useTheme()
    const hook = useFinishOrder()

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

    return (
        <>
            <NavbarCheckout />
            <main
                className="flex-1 flex px-4 py-8 text-black"
                style={{ background: colors?.segundo_fundo_layout_site || '#e1e4e9' }}
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                    <div className="lg:col-span-2 space-y-6">
                        <AddressList
                            addresses={hook.addresses}
                            selectedAddressId={hook.selectedAddressId}
                            setSelectedAddressId={(id) => {
                                hook.setSelectedAddressId(id)
                                hook.fetchShippingOptions(id)
                            }}
                            openCreateAddress={hook.openCreateAddress}
                            openEditAddress={hook.openEditAddress}
                            requestRemoveAddress={hook.requestRemoveAddress}
                            fetchShippingOptions={hook.fetchShippingOptions}
                        />

                        <ShippingOptions
                            shippingOptions={hook.shippingOptions}
                            selectedShippingId={hook.selectedShippingId}
                            setSelectedShippingId={hook.setSelectedShippingId}
                            shippingLoading={hook.shippingLoading}
                        />

                        <PaymentSection
                            paymentOptions={hook.paymentOptions}
                            selectedPaymentId={hook.selectedPaymentId}
                            setSelectedPaymentId={hook.setSelectedPaymentId}
                            cardNumber={hook.cardNumber}
                            cardHolder={hook.cardHolder}
                            cardExpMonth={hook.cardExpMonth}
                            cardExpYear={hook.cardExpYear}
                            cardCvv={hook.cardCvv}
                            cardInstallments={hook.cardInstallments}
                            detectedBrand={hook.detectedBrand}
                            onCardNumberChange={hook.onCardNumberChange}
                            onCardHolderChange={hook.onCardHolderChange}
                            onExpMonthChange={hook.onExpMonthChange}
                            onExpYearChange={hook.onExpYearChange}
                            onCvvChange={hook.onCvvChange}
                            setCardInstallments={hook.setCardInstallments}
                            installmentOptions={hook.installmentOptions}
                            brandImageSrc={hook.brandImageSrc}
                        />
                    </div>

                    <OrderSummary
                        cartItems={hook.cart?.items}
                        itemsTotal={hook.itemsTotal}
                        promotions={hook.promotions}
                        freeGifts={hook.freeGifts}
                        productDiscount={hook.productDiscount}
                        currentFrete={hook.currentFrete}
                        shippingDiscount={hook.shippingDiscount}
                        appliedCoupon={hook.appliedCoupon}
                        couponInput={hook.couponInput}
                        setCouponInput={hook.setCouponInput}
                        applyCoupon={hook.applyCoupon}
                        removeCoupon={hook.removeCoupon}
                        loadingPromo={hook.loadingPromo}
                        promoError={hook.promoError}
                        placingOrder={hook.placingOrder}
                        handlePlaceOrder={hook.handlePlaceOrder}
                        cardInstallments={hook.cardInstallments}
                        installmentOptions={hook.installmentOptions}
                        API_URL={API_URL}
                        totalWithInstallments={hook.totalWithInstallments}
                        validatingCoupon={hook.validatingCoupon}
                        skippedPromotions={hook.skippedPromotions}
                    />
                </div>

                <AddressModal
                    open={hook.addressModalOpen}
                    setOpen={hook.setAddressModalOpen}
                    addressForm={hook.addressForm}
                    setAddressForm={hook.setAddressForm}
                    submitAddress={hook.submitAddress}
                    editingId={hook.editingId}
                    estadosBR={hook.estadosBR}
                />

                <DeleteConfirmModal
                    open={!!hook.deleteTarget}
                    onCancel={hook.cancelDelete}
                    onConfirm={hook.confirmDelete}
                />
            </main>
            <FooterCheckout />
        </>
    )
}