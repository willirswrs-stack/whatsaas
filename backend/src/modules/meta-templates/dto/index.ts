import { IsString, IsNotEmpty, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';

export enum BusinessCategory {
    AUTOMOTIVE = 'AUTOMOTIVE',
    BEAUTY_SPA_SALON = 'BEAUTY_SPA_SALON',
    CLOTHING_APPAREL = 'CLOTHING_APPAREL',
    EDUCATION = 'EDUCATION',
    ENTERTAINMENT = 'ENTERTAINMENT',
    EVENT_PLANNING = 'EVENT_PLANNING',
    FINANCE = 'FINANCE',
    GROCERY = 'GROCERY',
    GOVERNMENT = 'GOVERNMENT',
    HOTEL_LODGING = 'HOTEL_LODGING',
    HEALTH = 'HEALTH',
    NONPROFIT = 'NONPROFIT',
    PROFESSIONAL_SERVICES = 'PROFESSIONAL_SERVICES',
    RETAIL = 'RETAIL',
    TRAVEL_TRANSPORTATION = 'TRAVEL_TRANSPORTATION',
    RESTAURANT = 'RESTAURANT',
    OTHER = 'OTHER',
}

export class CreateWabaAccountDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(100)
    name: string;

    @IsString()
    @IsNotEmpty()
    wabaId: string;

    @IsString()
    @IsNotEmpty()
    phoneNumberId: string;

    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @IsString()
    @IsNotEmpty()
    accessToken: string;

    @IsString()
    @IsOptional()
    appId?: string;
}

export class UpdateWabaProfileDto {
    @IsString()
    @IsOptional()
    @MaxLength(139)
    about?: string;

    @IsString()
    @IsOptional()
    @MaxLength(512)
    description?: string;

    @IsEnum(BusinessCategory)
    @IsOptional()
    category?: BusinessCategory;

    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    appId?: string;

    @IsString()
    @IsOptional()
    accessToken?: string;

    @IsOptional()
    websites?: string[];

    @IsString()
    @IsOptional()
    address?: string;
}

export class CreateMetaTemplateDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(512)
    name: string;

    @IsEnum(['MARKETING', 'UTILITY', 'AUTHENTICATION'])
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

    @IsString()
    @IsNotEmpty()
    language: string;

    @IsOptional()
    header?: {
        type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
        text?: string;
        example?: string;
    };

    @IsString()
    @IsNotEmpty()
    body: string;

    @IsString()
    @IsOptional()
    footer?: string;

    @IsOptional()
    buttons?: Array<{
        type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
        text: string;
        url?: string;
        phone_number?: string;
    }>;
}
