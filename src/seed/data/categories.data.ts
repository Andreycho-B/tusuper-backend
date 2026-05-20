import { Category } from '../../inventory/entities/category.entity';

export type CategorySeedData = Pick<Category, 'name' | 'description' | 'isActive'>;

export const categoriesData: CategorySeedData[] = [
  {
    name: 'Lácteos',
    description: 'Leches, quesos, yogures y derivados lácteos',
    isActive: true,
  },
  {
    name: 'Carnes y Embutidos',
    description: 'Carnes frescas, embutidos, chorizos y salchichas',
    isActive: true,
  },
  {
    name: 'Despensa',
    description: 'Granos, aceites, conservas, condimentos y productos no perecederos',
    isActive: true,
  },
  {
    name: 'Frutas y Verduras',
    description: 'Productos frescos de temporada, frutas y verduras del campo colombiano',
    isActive: true,
  },
  {
    name: 'Bebidas',
    description: 'Jugos, gaseosas, aguas, cervezas e infusiones',
    isActive: true,
  },
  {
    name: 'Aseo y Hogar',
    description: 'Detergentes, jabones, desinfectantes y productos de limpieza del hogar',
    isActive: true,
  },
];
