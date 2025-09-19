export function maskCep(v: string) {
    const d = (v ?? '').replace(/\D/g, '').slice(0, 8)
    return d.replace(/(\d{5})(\d)/, '$1-$2')
}