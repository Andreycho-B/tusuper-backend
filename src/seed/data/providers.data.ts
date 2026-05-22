import { Provider } from '../../inventory/entities/provider.entity';

export type ProviderSeedData = Pick<
  Provider,
  'name' | 'phone' | 'email' | 'address' | 'isActive'
>;

export const providersData: ProviderSeedData[] = [
  {
    name: 'Colanta',
    phone: '6044448800',
    email: 'ventas@colanta.com.co',
    address: 'Carrera 65 No. 74A-90, Medellín, Antioquia',
    isActive: true,
  },
  {
    name: 'Zenú',
    phone: '6044403636',
    email: 'clientes@zenu.com.co',
    address: 'Calle 8 No. 43A-130, Medellín, Antioquia',
    isActive: true,
  },
  {
    name: 'Fruver del Valle',
    phone: '3104567890',
    email: 'pedidos@fruverdelvalle.com.co',
    address: 'Carrera 15 No. 25-10, Buga, Valle del Cauca',
    isActive: true,
  },
  {
    name: 'Distribuidora La Económica',
    phone: '3209876543',
    email: 'distribuciones@laeconomica.com.co',
    address: 'Avenida 30 de Agosto No. 40-12, Pereira, Risaralda',
    isActive: true,
  },
  {
    name: 'Chocorramo',
    phone: '6017420303',
    email: 'contacto@chocorramo.com',
    address: 'Zona Industrial, Bogotá, Colombia',
    isActive: true,
  },
];
