import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          // ── CORRIGIDO: usar join table UserDepartment (departments plural) ──
          include: {
            departments: {
              include: { department: true }
            }
          }
        })

        if (!user || !user.active) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id:          user.id,
          name:        user.name,
          email:       user.email,
          role:        user.role,
          // Array de IDs dos departamentos do usuário
          departments: user.departments.map(ud => ud.departmentId),
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id          = user.id
        token.role        = user.role
        token.departments = user.departments // string[]
      }
      return token
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id          = token.id
        session.user.role        = token.role
        session.user.departments = token.departments ?? []  // string[]
      }
      return session
    }
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' as const },
}

export const getSession = () => getServerSession(authOptions)
