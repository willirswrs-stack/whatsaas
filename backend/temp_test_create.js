const axios = require('axios');

async function test() {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZGEyNDE2OC01NzU2LTQ5YzgtYjcyMS05ZGRmNTk5NzRkN2UiLCJlbWFpbCI6IndpbGxpLnJzLndyc0BnbWFpbC5jb20iLCJ0ZW5hbnRJZCI6ImQ1ZTVmZWJlLWY3ZGMtNDBiZC04ZjczLWRhNTM2N2YzMGMwZSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3NTYxMjk0OX0.T1ZIWFhGfo5nRxbUT0yjFCn7puI_YBpHD5v_VTokKXw';
    
    try {
        const res = await axios.post('http://localhost:3333/api/v1/campaigns', {
            name: 'test campaign debug',
            contactIds: [],
            tagIds: [],
            aiSpinEnabled: true,
            variationCount: 10,
            settings: {
                greetingStyle: 'random',
                activeHoursStart: '08:00',
                activeHoursEnd: '20:00',
                metaTemplateId: '772c72b8-9bd3-4f93-b1d5-bcaf24c9c1bd'
            }
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('SUCCESS:', res.data);
    } catch (e) {
        if (e.response) {
            console.error('API Error Response:', JSON.stringify(e.response.data, null, 2));
        } else {
            console.error('Error:', e.message);
        }
    }
}
test();
