const plugin = require('eslint-plugin-security');
console.log('Keys:', Object.keys(plugin));
console.log('Configs keys:', Object.keys(plugin.configs || {}));
