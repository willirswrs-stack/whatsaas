import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { createProxyMiddleware } from "http-proxy-middleware";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { SuperAdminMiddleware } from "./super-admin.middleware";

function basicAuthHeader(user: string, pass: string) {
    const token = Buffer.from(`${user}:${pass}`).toString("base64");
    return `Basic ${token}`;
}

@Module({
    imports: [
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                // Ajuste se seu projeto usa outra env var de secret
                secret: config.get<string>("JWT_SECRET"),
            }),
        }),
    ],
    providers: [SuperAdminMiddleware],
})
export class AdminPanelsModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        // Evolution
        consumer
            .apply(
                SuperAdminMiddleware,
                createProxyMiddleware({
                    target: process.env.EVOLUTION_INTERNAL_URL || "http://evolution:8080",
                    changeOrigin: true,
                    ws: true,
                    pathRewrite: { "^/admin/panels/evolution": "" },
                }),
            )
            .forRoutes("/admin/panels/evolution");

        // WAHA (pede Basic) -> injeta Basic pelo proxy
        // Usando 'as any' para evitar erro TS2353 em versões mais novas do @types/http-proxy-middleware
        consumer
            .apply(
                SuperAdminMiddleware,
                createProxyMiddleware({
                    target: process.env.WAHA_INTERNAL_URL || "http://waha:3000",
                    changeOrigin: true,
                    ws: true,
                    pathRewrite: { "^/admin/panels/waha": "" },
                    onProxyReq: (proxyReq) => {
                        const user = process.env.WAHA_BASIC_USER || "waha";
                        const pass = process.env.WAHA_BASIC_PASS || "";
                        if (pass) {
                            proxyReq.setHeader("Authorization", basicAuthHeader(user, pass));
                        }
                    },
                } as any),
            )
            .forRoutes("/admin/panels/waha");

        // WWebJS (raiz pode dar 404, mas proxy funciona para rotas válidas)
        consumer
            .apply(
                SuperAdminMiddleware,
                createProxyMiddleware({
                    target: process.env.WWEBJS_INTERNAL_URL || "http://wwebjs:3000",
                    changeOrigin: true,
                    ws: true,
                    pathRewrite: { "^/admin/panels/wwebjs": "" },
                }),
            )
            .forRoutes("/admin/panels/wwebjs");
    }
}
