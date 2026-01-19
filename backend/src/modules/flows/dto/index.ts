import { IsString, IsOptional, IsArray, IsObject, IsIn, IsBoolean, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateFlowDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    channel?: string;

    @IsArray()
    @IsOptional()
    nodes?: any[];

    @IsArray()
    @IsOptional()
    edges?: any[];
}

export class UpdateFlowDto {
    @IsString()
    @IsOptional()
    @MaxLength(255)
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    @IsIn(['draft', 'active', 'paused', 'archived'])
    status?: 'draft' | 'active' | 'paused' | 'archived';

    @IsOptional()
    folderId?: string | null;

    @IsArray()
    @IsOptional()
    nodes?: any[];

    @IsArray()
    @IsOptional()
    edges?: any[];
}

export class CreateTriggerDto {
    @IsString()
    @IsNotEmpty()
    flowId: string;

    @IsString()
    @IsIn(['keyword', 'any_message', 'webhook', 'schedule', 'manual'])
    type: 'keyword' | 'any_message' | 'webhook' | 'schedule' | 'manual';

    @IsObject()
    @IsOptional()
    config?: {
        keywords?: string[];
        matchType?: 'exact' | 'contains' | 'starts_with';
        webhookKey?: string;
        cronExpression?: string;
    };

    @IsBoolean()
    @IsOptional()
    active?: boolean;
}

export class ExecuteFlowDto {
    @IsString()
    @IsNotEmpty()
    flowId: string;

    @IsString()
    @IsNotEmpty()
    contactId: string;

    @IsString()
    @IsOptional()
    instanceId?: string;

    @IsObject()
    @IsOptional()
    initialVariables?: Record<string, any>;
}
