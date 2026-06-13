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

export interface BootstrapResult {
  message: string;
  modulesReady: number;
  rolesReady: number;
  adminEmail: string;
  adminCreated: boolean;
}

export interface ProductionSeedResult {
  bootstrap: BootstrapResult;
  inventory: SeedResult;
}
