const pool = require("../db");

const createAuditLog = async ({
    req,
    action,
    targetEntity,
    targetId = null,
    oldValue = null,
    metadata = null
}) => {
    try {
        const userId = req.user?.id_user || null;

        const ipAddress =
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            null;

        const userAgent =
            req.headers["user-agent"] || null;

        await pool.query(
            `
            INSERT INTO audit_logs (
                id_user,
                action,
                target_entity,
                target_id,
                ip_address,
                user_agent,
                old_value,
                metadata
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                userId,
                action,
                targetEntity,
                targetId,
                ipAddress,
                userAgent,
                oldValue
                    ? JSON.stringify(oldValue)
                    : null,
                metadata
                    ? JSON.stringify(metadata)
                    : null
            ]
        );

    } catch (error) {
        // Audit failure should not break the main request
        console.error(
            "AUDIT LOG ERROR:",
            error.message
        );
    }
};

module.exports = {
    createAuditLog
};