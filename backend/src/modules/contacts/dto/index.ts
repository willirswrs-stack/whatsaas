import { IsString, IsOptional, IsBoolean, IsEmail, IsObject, IsArray, IsUUID, IsNotEmpty, MaxLength, IsIn, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ============ CONTACT DTOs ============

export class CreateContactDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    phone: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    name?: string;

    @IsString()
    @IsOptional()
    email?: string;

    @IsObject()
    @IsOptional()
    customFields?: Record<string, any>;

    @IsArray()
    @IsOptional()
    @IsUUID('4', { each: true })
    tagIds?: string[];
}

export class UpdateContactDto {
    @IsString()
    @IsOptional()
    @MaxLength(20)
    phone?: string;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    name?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsObject()
    @IsOptional()
    customFields?: Record<string, any>;

    @IsBoolean()
    @IsOptional()
    isValid?: boolean;

    @IsBoolean()
    @IsOptional()
    optedOut?: boolean;

    @IsArray()
    @IsOptional()
    @IsUUID('4', { each: true })
    tagIds?: string[];
}

export class ContactQueryDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    tagIds?: string[];

    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null || value === '') return undefined;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return Boolean(value);
    })
    isValid?: boolean;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null || value === '') return undefined;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return Boolean(value);
    })
    optedOut?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number = 50;
}

export class ImportContactsDto {
    @IsArray()
    contacts: CreateContactDto[];
}

export class BulkAddTagsDto {
    @IsArray()
    @IsUUID('4', { each: true })
    contactIds: string[];

    @IsArray()
    @IsUUID('4', { each: true })
    tagIds: string[];
}

export class BulkRemoveTagsDto {
    @IsArray()
    @IsUUID('4', { each: true })
    contactIds: string[];

    @IsArray()
    @IsUUID('4', { each: true })
    tagIds: string[];
}

// ============ TAG DTOs ============

export class CreateTagDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsString()
    @IsOptional()
    @MaxLength(7)
    color?: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateTagDto {
    @IsString()
    @IsOptional()
    @MaxLength(100)
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(7)
    color?: string;

    @IsString()
    @IsOptional()
    description?: string;
}

// ============ CUSTOM FIELD DTOs ============

export class CreateCustomFieldDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    key: string;

    @IsString()
    @IsOptional()
    @IsIn(['text', 'number', 'date', 'boolean', 'select'])
    type?: 'text' | 'number' | 'date' | 'boolean' | 'select';

    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    options?: string[];

    @IsBoolean()
    @IsOptional()
    required?: boolean;
}

export class UpdateCustomFieldDto {
    @IsString()
    @IsOptional()
    @MaxLength(100)
    name?: string;

    @IsString()
    @IsOptional()
    @IsIn(['text', 'number', 'date', 'boolean', 'select'])
    type?: 'text' | 'number' | 'date' | 'boolean' | 'select';

    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    options?: string[];

    @IsBoolean()
    @IsOptional()
    required?: boolean;

    @IsInt()
    @IsOptional()
    @Min(0)
    order?: number;
}

export class ReorderCustomFieldsDto {
    @IsArray()
    fields: { id: string; order: number }[];
}
