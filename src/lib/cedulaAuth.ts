/** Dominio interno: Supabase Auth requiere email, el usuario solo ve su cédula. */
const INTERNAL_DOMAIN = 'rrhh.local'

export const cedulaToEmail = (cedula: string): string =>
  `${cedula.replace(/\D/g, '')}@${INTERNAL_DOMAIN}`
