

export default function Product({ params }: { params: { productSlug: string } }) {


    return (
        <h1>{params.productSlug}</h1>
    )
}