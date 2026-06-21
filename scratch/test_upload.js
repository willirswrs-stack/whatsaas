const fs = require('fs');
const path = require('path');

async function testUpload() {
    try {
        const imgPath = path.join(__dirname, 'test.jpg');
        fs.writeFileSync(imgPath, 'fake-image-data');

        // Can't use FormData easily without a library in old node, but node v18+ supports global FormData
        const formData = new FormData();
        const fileBlob = new Blob([fs.readFileSync(imgPath)], { type: 'image/jpeg' });
        formData.append('file', fileBlob, 'test.jpg');

        console.log('Sending request...');
        const response = await fetch('http://localhost:3333/api/v1/uploads/media', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Success:', data);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testUpload();
