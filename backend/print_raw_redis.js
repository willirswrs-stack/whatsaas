const Redis = require('ioredis');

const redis = new Redis({
    host: '127.0.0.1',
    port: 6379,
    password: 'wathsaas_redis_2024'
});

async function main() {
    try {
        const delayedKey = 'bull:scheduler-queue:delayed';
        const items = await redis.zrange(delayedKey, 0, -1, 'WITHSCORES');
        console.log('Raw delayed set items:', items);
        
        console.log('\n--- Redis Keys ---');
        const keys = await redis.keys('bull:scheduler-queue:*');
        for (const key of keys) {
            const type = await redis.type(key);
            console.log(`Key: ${key}, Type: ${type}`);
            if (type === 'hash') {
                const fields = await redis.hkeys(key);
                console.log(`  Hash fields:`, fields);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        redis.disconnect();
    }
}
main();
