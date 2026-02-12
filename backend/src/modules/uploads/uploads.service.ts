import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
    private readonly logger = new Logger(UploadsService.name);
    private readonly uploadDir: string;
    private readonly baseUrl: string;

    constructor(private configService: ConfigService) {
        // Upload directory - relative to backend root
        this.uploadDir = path.join(process.cwd(), 'uploads');

        // Base URL for serving files - configurable for Docker/Production access
        // In production behind Nginx/SSL, this should be the full public URL
        const enforcedBaseUrl = configService.get<string>('UPLOADS_BASE_URL');

        if (enforcedBaseUrl) {
            this.baseUrl = enforcedBaseUrl.endsWith('/') ? enforcedBaseUrl.slice(0, -1) : enforcedBaseUrl;
        } else {
            // Development fallback
            const port = configService.get('PORT', 3333);
            const publicHost = configService.get('PUBLIC_HOST', 'host.docker.internal');
            this.baseUrl = `http://${publicHost}:${port}/uploads`;
        }

        this.logger.log(`Uploads base URL: ${this.baseUrl}`);

        // Ensure upload directory exists
        this.ensureUploadDir();
    }

    private ensureUploadDir(): void {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
            this.logger.log(`Created uploads directory: ${this.uploadDir}`);
        }
    }

    async saveFile(file: Express.Multer.File, tenantId: string): Promise<{
        filename: string;
        url: string;
        mimetype: string;
        size: number;
    }> {
        const ext = path.extname(file.originalname) || this.getExtensionFromMimetype(file.mimetype);
        const filename = `${tenantId}_${uuidv4()}${ext}`;
        const filePath = path.join(this.uploadDir, filename);

        // Write file to disk
        fs.writeFileSync(filePath, file.buffer);

        this.logger.log(`Saved file: ${filename} (${file.mimetype}, ${file.size} bytes)`);

        return {
            filename,
            url: `${this.baseUrl}/${filename}`,
            mimetype: file.mimetype,
            size: file.size,
        };
    }

    async deleteFile(filename: string): Promise<void> {
        const filePath = path.join(this.uploadDir, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            this.logger.log(`Deleted file: ${filename}`);
        }
    }

    private getExtensionFromMimetype(mimetype: string): string {
        const map: Record<string, string> = {
            'video/mp4': '.mp4',
            'video/webm': '.webm',
            'video/quicktime': '.mov',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'audio/mpeg': '.mp3',
            'audio/wav': '.wav',
            'audio/ogg': '.ogg',
            'audio/mp4': '.m4a',
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'application/vnd.ms-powerpoint': '.ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        };
        return map[mimetype] || '.bin';
    }
}
