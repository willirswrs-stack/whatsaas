import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function fixPassword() {
    const ds = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'wathsaas',
        password: 'wathsaas_secret_2024',
        database: 'wathsaas',
        synchronize: false,
        logging: false,
    });

    try {
        await ds.initialize();
        console.log('✅ Conectado!');

        const newPassword = 'admin123';
        const hash = await bcrypt.hash(newPassword, 12);

        const result = await ds.query(
            `UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, role`,
            [hash, 'willi.rs.wrs@gmail.com']
        );

        if (result.length > 0) {
            console.log(`✅ Senha atualizada para: ${result[0].email} [${result[0].role}]`);
            console.log(`   Nova senha: ${newPassword}`);
        } else {
            console.log('❌ Usuário não encontrado!');
        }

        // Verifica o hash gravado
        const check = await ds.query(`SELECT email, LEFT(password_hash, 10) as hash_prefix FROM users WHERE email = $1`, ['willi.rs.wrs@gmail.com']);
        console.log('Verificação:', check[0]);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await ds.destroy();
    }
}

fixPassword();
