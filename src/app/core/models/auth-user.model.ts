/**
 * Misma forma que @similart/auth-contract (jp-back-auth es el emisor para
 * las dos apps), redeclarada acá en vez de agregar una dependencia file:
 * cruzando a otro repo — mudanza-app no vive en el monorepo de similart.
 */
export interface AuthUser {
  id: string;
  username: string;
  profilePictureUrl: string | null;
  isGuest: boolean;
  isAdmin: boolean;
}
