export interface SeedResult {
  message: string;
  bootstrap?: {
    adminEmail: string;
    adminCreated: boolean;
    rolesInserted: number;
    modulesInserted: number;
  };
  categoriesInserted: number;
  providersInserted: number;
  productsInserted: number;
}
