const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function test() {
    const api = axios.create({
        headers: {
            'Content-Type': 'application/json',
        }
    });

    const form = new FormData();
    form.append('file', Buffer.from('hello'), { filename: 'test.txt' });

    api.interceptors.request.use(config => {
        console.log('Final Headers:', config.headers);
        return config;
    });

    try {
        await api.post('http://localhost:3333/api/v1/uploads/media', form);
    } catch(e) {
        // don't care about response
    }
}
test();
