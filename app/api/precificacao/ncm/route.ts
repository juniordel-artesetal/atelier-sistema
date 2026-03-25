import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { produto } = await req.json()
    if (!produto?.trim()) {
      return NextResponse.json({ error: 'Descrição obrigatória' }, { status: 400 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Você é um especialista tributário brasileiro. O usuário fabrica artesanato personalizado (laços, cofrinhos, tags, convites, kits festa, embalagens, papelaria).\n\nProduto: "${produto}"\n\nResponda APENAS em JSON válido, sem markdown:\n{"ncms":[{"id":"XXXX","nome":"Nome descritivo","icmsInterno":0.18,"ipi":0.00,"nota":"Explicação da tributação"}]}\n\nRetorne 1 a 3 NCMs mais relevantes, do mais ao menos provável.`
        }]
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Erro na API')

    const text = data.content?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao identificar NCM' }, { status: 500 })
  }
}