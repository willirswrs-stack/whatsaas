import { PatternBreakerService } from '../modules/anti-ban/pattern-breaker.service';

async function test() {
    try {
        const pb = new PatternBreakerService();
        console.log('Successfully created PatternBreakerService!');
        
        const testCases = [
            {
                name: 'Standard Greeting Style 1',
                template: `Opa {{nome}}! , Tudo bem?

Passei aqui porque vi que seu acesso...`
            },
            {
                name: 'Greeting starting with Name 1',
                template: `{{nome}}, e aee! , Tudo bem?

Passei aqui porque vi que seu acesso...`
            },
            {
                name: 'Greeting starting with Name 2',
                template: `{{nome}}, olá! , Tudo bem?

Passei aqui porque vi que seu acesso...`
            },
            {
                name: 'Greeting with trailing emojis and name',
                template: `⭐ Fala, {{nome}}! Passando aqui pra avisar: , Tudo bem?

Passei aqui porque vi que seu acesso...`
            },
            {
                name: 'Oii template',
                template: `Oii {{nome}}! , Tudo bem?

Passei aqui porque vi que seu acesso...`
            },
            {
                name: 'Plain Template (No Greeting)',
                template: `Passei aqui porque vi que seu acesso ao Escritório Inteligente está vencido.`
            }
        ];

        for (const tc of testCases) {
            const res = pb.breakPattern(tc.template, 'Tati');
            console.log(`\n=================== TEST CASE: ${tc.name} ===================`);
            console.log('--- Original template: ---');
            console.log(tc.template);
            console.log('--- Processed Result: ---');
            console.log(res.content);
            console.log('--- Transformations: ---', res.transformationsApplied);
        }

    } catch (err) {
        console.error('Error executing breakPattern:', err);
    }
}

test();
