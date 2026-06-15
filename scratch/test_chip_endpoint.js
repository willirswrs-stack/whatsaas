async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await fetch('http://localhost:3333/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'willi.rs.wrs@gmail.com',
                password: 'admin123'
            })
        });
        
        const loginData = await loginRes.json();
        const token = loginData.accessToken;
        if (!token) {
            console.error('Failed to log in:', loginData);
            return;
        }
        console.log('Token acquired successfully.');
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        try {
            console.log('Requesting GET /api/v1/instances ...');
            const instRes = await fetch('http://localhost:3333/api/v1/instances', { headers });
            console.log('GET /api/v1/instances status:', instRes.status);
            const instData = await instRes.json();
            if (instRes.status !== 200) {
                console.error('GET /api/v1/instances error body:', instData);
            } else {
                console.log('Instances count:', instData.length);
            }
        } catch (err) {
            console.error('GET /api/v1/instances FAILED:', err.message);
        }
        
        try {
            console.log('Requesting GET /api/v1/proxies ...');
            const proxyRes = await fetch('http://localhost:3333/api/v1/proxies', { headers });
            console.log('GET /api/v1/proxies status:', proxyRes.status);
            const proxyData = await proxyRes.json();
            if (proxyRes.status !== 200) {
                console.error('GET /api/v1/proxies error body:', proxyData);
            } else {
                console.log('Proxies count:', proxyData.length);
            }
        } catch (err) {
            console.error('GET /api/v1/proxies FAILED:', err.message);
        }
    } catch (err) {
        console.error('Login or main flow failed:', err.message);
    }
}

test();
