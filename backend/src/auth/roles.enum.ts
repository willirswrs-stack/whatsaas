export enum Role {
    USER = "USER",
    ADMIN = "ADMIN",
    SUPER_ADMIN = "SUPER_ADMIN",
}

// legado: member/admin/owner
export function normalizeRole(raw?: string): Role {
    const v = (raw || "").toLowerCase();
    if (v === "owner") return Role.SUPER_ADMIN;
    if (v === "admin") return Role.ADMIN;
    if (v === "member") return Role.USER;

    if (raw === Role.SUPER_ADMIN) return Role.SUPER_ADMIN;
    if (raw === Role.ADMIN) return Role.ADMIN;
    return Role.USER;
}
