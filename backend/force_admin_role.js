const { Client } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Load backend env
dotenv.config({ path: path.join(__dirname, '.env') });

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

async function forceAdmin() {
  await client.connect();
  console.log('Connected to DB.');

  try {
    const email = 'admin@whatsaas.com';
    
    // 1. Ensure a system tenant exists
    let tenantRes = await client.query("SELECT id FROM tenants WHERE slug = 'system' LIMIT 1");
    let tenantId;
    if (tenantRes.rows.length === 0) {
      console.log('Creating System Tenant...');
      const newT = await client.query(
        "INSERT INTO tenants (name, slug, email, status) VALUES ('System', 'system', 'system@whatsaas.com', 'active') RETURNING id"
      );
      tenantId = newT.rows[0].id;
    } else {
      tenantId = tenantRes.rows[0].id;
    }

    // 2. Upsert the user
    const userRes = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    if (userRes.rows.length > 0) {
      console.log('User exists. Forcing super_admin role and resetting password...');
      await client.query(
        "UPDATE users SET role = 'super_admin', password_hash = $1 WHERE email = $2",
        [passwordHash, email]
      );
      console.log('User role forced to super_admin successfully!');
    } else {
      console.log('Creating Super Admin User...');
      await client.query(
        "INSERT INTO users (name, email, password_hash, role, tenant_id) VALUES ('Super Admin', $1, $2, 'super_admin', $3)",
        [email, passwordHash, tenantId]
      );
      console.log('Super Admin User created successfully!');
    }
    
    console.log('\nNOW TRY LOGGING IN WITH:\nEmail: admin@whatsaas.com\nPass: admin123');

    // Bonus: Promote current developer user automatically
    await client.query("UPDATE users SET role = 'super_admin' WHERE email = 'willi.rs.wrs@gmail.com'");
    console.log('PROMOTED YOUR ACTIVE EMAIL (willi.rs.wrs@gmail.com) TO SUPER ADMIN TOO! 🚀');

  } catch (err) {
    console.error('ERROR forcing admin:', err);
  } finally {
    await client.end();
  }
}

forceAdmin();
