import { AppDataSource } from '../database/data-source';

async function main() {
  await AppDataSource.initialize();
  
  // Get ALL tables
  const tables = await AppDataSource.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public'`
  );
  console.log('TABLES:');
  for (const t of tables) {
    console.log('  -', t.tablename);
  }

  // Check if migrations table exists and what's been run
  try {
    const migrations = await AppDataSource.query(`SELECT * FROM migrations ORDER BY id`);
    console.log('MIGRATIONS RUN:');
    for (const m of migrations) {
      console.log('  -', m.name, '(timestamp:', m.timestamp, ')');
    }
  } catch {
    console.log('No migrations table found');
  }

  // Check user or users table columns
  for (const tbl of ['user', 'users']) {
    const cols = await AppDataSource.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
      [tbl]
    );
    if (cols.length > 0) {
      console.log(`COLUMNS for "${tbl}":`);
      for (const c of cols) {
        console.log(`  - ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`);
      }
    } else {
      console.log(`Table "${tbl}" has no columns or does not exist`);
    }
  }

  await AppDataSource.destroy();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
