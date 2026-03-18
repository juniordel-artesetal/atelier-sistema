import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      departments: string[]   // array de departmentId
    }
  }

  interface User {
    id: string
    name: string
    email: string
    role: string
    departments: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    departments: string[]
  }
}
