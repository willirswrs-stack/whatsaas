const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function testUpload() {
    try {
        const filePath = path.join(__dirname, 'test.pdf');
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, 'dummy pdf content %PDF-1.4');
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        // Let's test the production API directly
        // We don't have a valid token, but maybe we get 401 instead of 400?
        // Wait, the API returns 401 if unauthorized. If it returns 400 for the user, they ARE authorized.
        console.log('Sending request...');
        const response = await axios.post('http://127.0.0.1:3333/api/v1/uploads/media', formData, {
            headers: {
                ...formData.getHeaders(), // This is required for Node.js axios FormData
            }
        });
        
        console.log('Success:', response.data);
    } catch (err) {
        console.error('Error status:', err.response?.status);
        console.error('Error data:', JSON.stringify(err.response?.data, null, 2));
    }
}

testUpload();
