import { IsString, IsOptional, IsUUID, IsBoolean, IsInt, Min } from 'class-validator';

export class CreateFolderDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsUUID()
    parentId?: string;
}

export class UpdateFolderDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsUUID()
    parentId?: string;

    @IsOptional()
    @IsBoolean()
    archived?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    order?: number;
}
