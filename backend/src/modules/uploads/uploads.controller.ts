import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) { }

    @Post('media')
    @UseGuards(JwtAuthGuard, TenantGuard)
    @ApiBearerAuth()
    @UseInterceptors(FileInterceptor('file', {
        limits: {
            fileSize: 60 * 1024 * 1024, // 60MB max
        },
        fileFilter: (req, file, callback) => {
            const allowedMimes = [
                'video/mp4', 'video/webm', 'video/quicktime',
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
                'application/pdf',
                'application/msword', // .doc
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
                'application/vnd.ms-excel', // .xls
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                'application/vnd.ms-powerpoint', // .ppt
                'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
            ];
            if (allowedMimes.includes(file.mimetype)) {
                callback(null, true);
            } else {
                callback(new BadRequestException(`Tipo de arquivo não suportado: ${file.mimetype}`), false);
            }
        },
    }))
    @ApiOperation({ summary: 'Upload media file (video, image, audio, document)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    async uploadMedia(
        @UploadedFile() file: Express.Multer.File,
        @CurrentTenant() tenantId: string,
    ) {
        if (!file) {
            throw new BadRequestException('Nenhum arquivo enviado');
        }

        const result = await this.uploadsService.saveFile(file, tenantId);

        return {
            success: true,
            ...result,
        };
    }
}
