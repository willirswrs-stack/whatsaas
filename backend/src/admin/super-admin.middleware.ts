import { Injectable, NestMiddleware } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request, Response, NextFunction } from "express";
import { normalizeRole, Role } from "../auth/roles.enum";

@Injectable()
export class SuperAdminMiddleware implements NestMiddleware {
    constructor(private readonly jwt: JwtService) { }

    use(req: Request, res: Response, next: NextFunction) {
        const auth = req.headers["authorization"];
        if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
            return res.status(401).json({ error: "UNAUTHORIZED" });
        }

        const token = auth.slice(7).trim();
        try {
            const payload: any = this.jwt.verify(token);
            const role = normalizeRole(payload?.role);

            if (role !== Role.SUPER_ADMIN) {
                return res.status(403).json({ error: "FORBIDDEN" });
            }

            (req as any).user = payload;
            return next();
        } catch {
            return res.status(401).json({ error: "UNAUTHORIZED" });
        }
    }
}
