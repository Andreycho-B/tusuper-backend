import { AppDataSource } from '../database/data-source';

async function fixSequence(): Promise<void> {
  process.env.NODE_ENV = process.env.NODE_ENV || 'dev';
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();

  try {
    const before = await qr.query('SELECT last_value, is_called FROM migrations_id_seq');
    console.log('Secuencia ANTES:', JSON.stringify(before[0]));

    const maxId = await qr.query('SELECT MAX(id) as max_id FROM migrations');
    const currentMax = Number(maxId[0].max_id);
    console.log('MAX(id) en migrations:', currentMax);

    await qr.query(`SELECT setval('migrations_id_seq', $1, true)`, [currentMax]);

    const after = await qr.query('SELECT last_value, is_called FROM migrations_id_seq');
    console.log('Secuencia DESPUÉS:', JSON.stringify(after[0]));
    console.log('Próximo nextval() retornará:', currentMax + 1);
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

fixSequence().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Error:', msg);
  process.exit(1);
});
