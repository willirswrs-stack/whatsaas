async function test() {
    try {
        const url = 'http://127.0.0.1:8081/instance/fetchInstances';
        console.log('Fetching', url);
        const res = await fetch(url, {
            headers: { 'apikey': '429683C4C977415CAAFCCE10F7D57E11' }
        });
        
        const text = await res.text();
        console.log('Raw text:', text);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
test();
