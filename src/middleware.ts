import { NextRequest, NextResponse } from 'next/server'

/**
 * Rotas que TODO mundo pode acessar sem estar logado
 */
const PUBLIC_PATHS = [
    '/',
    '/categoria',
    '/cadastro',
    '/login',
    '/not-found',
    '/recover_password_customer',
    '/produto',
    '/busca',
    '/carrinho',
    '/favoritos',
    '/atendimento',
    '/quem-somos',
    '/politicas-de-privacidade',
    '/trocas-e-devolucao',
    '/como-comprar',
    '/envio-e-prazo-de-entrega',
    '/perguntas-frequentes',
    '/formas-de-pagamento'
    // se você tiver mais rotas públicas, adicione aqui
]

/**
 * Rotas que um usuário LOGADO não deve acessar
 */
const BLOCKED_FOR_AUTHED = [
    '/login',
    '/cadastro',
]

export const config = {
    // todos os caminhos, exceto API, assets e _next
    matcher: [
        /*
          combina tudo que não seja:
          - rota /api
          - arquivos estáticos em /_next, /favicon.ico, /images, /assets
        */
        '/((?!api|_next/static|_next/image|favicon.ico|images|assets).*)',
    ],
}

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // pega o token do cookie
    const token = req.cookies.get('storeToken')?.value

    // 1) Usuário autenticado tentando acessar /login ou /cadastro → joga pra /
    if (token && BLOCKED_FOR_AUTHED.some(path => pathname.startsWith(path))) {
        return NextResponse.redirect(new URL('/', req.url))
    }

    // 2) Rota pública? → deixa passar
    if (PUBLIC_PATHS.some(path => {
        // suporte a parâmetros dinâmicos ou subcaminhos
        return path === '/'
            ? pathname === '/'
            : pathname.startsWith(path)
    })
    ) {
        return NextResponse.next()
    }

    // 3) Qualquer outra rota é protegida → exige token
    if (!token) {
        // redireciona para login, passando a rota original como redirect
        const loginUrl = new URL('/login', req.url)
        loginUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // 4) Usuário logado em rota protegida → tudo OK
    return NextResponse.next()
}