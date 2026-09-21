-- This file prepares the Admin role/status. Password hashing is handled by create-admin.js.
USE sim1;

INSERT INTO roles (id_role, role_name, description)
VALUES (1, 'Admin', 'Top-level system administrator')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), description = VALUES(description);

INSERT INTO status_user (id_status_user, status_name, description)
VALUES (1, 'Active', 'Active user')
ON DUPLICATE KEY UPDATE status_name = VALUES(status_name), description = VALUES(description);
