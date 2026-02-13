import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TestFlowDto {
    @IsString()
    @IsNotEmpty()
    flowId: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    instanceId?: string;
}
