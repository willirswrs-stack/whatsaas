const { validateSync } = require('class-validator');

// Mocks the DTO
class CreateInstanceDto {
    constructor(data) {
        Object.assign(this, data);
    }
}

const { IsString, IsOptional, IsIn, IsNumber } = require('class-validator');

IsString()(CreateInstanceDto.prototype, 'instanceName');
IsOptional()(CreateInstanceDto.prototype, 'proxyId');
IsString()(CreateInstanceDto.prototype, 'proxyId');
IsOptional()(CreateInstanceDto.prototype, 'provider');
IsIn(['waha', 'evolution'])(CreateInstanceDto.prototype, 'provider');
IsOptional()(CreateInstanceDto.prototype, 'config');
IsOptional()(CreateInstanceDto.prototype, 'warmupProfile');
IsIn(['inbound', 'warm_outbound', 'cold_outbound', 'groups'])(CreateInstanceDto.prototype, 'warmupProfile');
IsOptional()(CreateInstanceDto.prototype, 'warmupDay');
IsNumber()(CreateInstanceDto.prototype, 'warmupDay');

const dto = new CreateInstanceDto({
  "instanceName": "63991022401",
  "provider": "evolution",
  "warmupProfile": "cold_outbound",
  "warmupDay": 60
});

const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
console.log('Errors:', errors);
