/*
 Navicat Premium Dump SQL

 Source Server         : ETL_SIMU
 Source Server Type    : MySQL
 Source Server Version : 80408 (8.4.8)
 Source Schema         : sim1

 Date: 28/09/2026
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 1. Table structure for roles
-- ----------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id_role` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_role`) USING BTREE,
  UNIQUE INDEX `role_name`(`role_name` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

INSERT INTO `roles` VALUES (1, 'Super Admin', 'ຜູ້ດູແລລະບົບສູງສຸດ ມີສິດຈັດການທຸກຢ່າງ', '2026-09-22 08:47:49', '2026-09-22 08:47:49');
INSERT INTO `roles` VALUES (2, 'Admin', 'ຜູ້ດູແລລະບົບທົ່ວໄປ ຈັດການຂໍ້ມູນ ແລະ ອະນຸມັດ', '2026-09-22 08:47:49', '2026-09-22 08:47:49');
INSERT INTO `roles` VALUES (3, 'Agent', 'ຕົວແທນຈໍາໜ່າຍ/ເຈົ້າໜ້າທີ່ລົງທະບຽນ', '2026-09-22 08:47:49', '2026-09-22 08:47:49');

-- ----------------------------
-- 2. Table structure for status_user
-- ----------------------------
DROP TABLE IF EXISTS `status_user`;
CREATE TABLE `status_user` (
  `id_status_user` int NOT NULL AUTO_INCREMENT,
  `status_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_status_user`) USING BTREE,
  UNIQUE INDEX `status_name`(`status_name` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

INSERT INTO `status_user` VALUES (1, 'Active', 'ບັນຊີໃຊ້ງານໄດ້ປົກກະຕິ', '2026-09-22 08:47:49', '2026-09-22 08:47:49');
INSERT INTO `status_user` VALUES (2, 'Inactive', 'ບັນຊີຖືກປິດໃຊ້ງານຊົ່ວຄາວ', '2026-09-22 08:47:49', '2026-09-22 08:47:49');
INSERT INTO `status_user` VALUES (3, 'Locked', 'ບັນຊີຖືກລັອກເນື່ອງຈາກລອກອິນຜິດຫຼາຍຄັ້ງ', '2026-09-22 08:47:49', '2026-09-22 08:47:49');

-- ----------------------------
-- 3. Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id_user` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `fullname` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `phone_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `id_role` int NOT NULL,
  `id_status_user` int NOT NULL,
  `failed_login_attempts` int NOT NULL DEFAULT 0,
  `locked_until` datetime NULL DEFAULT NULL,
  `deleted_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_user`) USING BTREE,
  UNIQUE INDEX `username`(`username` ASC) USING BTREE,
  UNIQUE INDEX `email`(`email` ASC) USING BTREE,
  INDEX `fk_users_role`(`id_role` ASC) USING BTREE,
  INDEX `fk_users_status`(`id_status_user` ASC) USING BTREE,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`id_role`) REFERENCES `roles` (`id_role`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_users_status` FOREIGN KEY (`id_status_user`) REFERENCES `status_user` (`id_status_user`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

INSERT INTO `users` VALUES (3, 'admin', 'admin@example.com', '$2a$12$e0M2/LgL3yS5Rz7/q4u1IeI.uB8n1uT1Y3e3E3u1E3u1E3u1E3u1E', 'System Administrator', '02012345678', 1, 1, 0, '2026-09-28 10:57:00', NULL, '2026-09-22 08:47:50', '2026-09-28 03:56:49');

-- ----------------------------
-- 4. Table structure for agents
-- ----------------------------
DROP TABLE IF EXISTS `agents`;
CREATE TABLE `agents` (
  `id_agent` int NOT NULL AUTO_INCREMENT,
  `agent_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `contact_phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `contact_email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_by` int NULL DEFAULT NULL,
  `deleted_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_agent`) USING BTREE,
  INDEX `fk_agents_created_by`(`created_by` ASC) USING BTREE,
  CONSTRAINT `fk_agents_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id_user`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 5. Table structure for packages
-- ----------------------------
DROP TABLE IF EXISTS `packages`;
CREATE TABLE `packages` (
  `id_package` int NOT NULL AUTO_INCREMENT,
  `package_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `duration_days` int NOT NULL,
  `price` decimal(14, 2) NOT NULL,
  `currency` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'LAK',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` int NULL DEFAULT NULL,
  `deleted_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_package`) USING BTREE,
  INDEX `fk_packages_created_by`(`created_by` ASC) USING BTREE,
  CONSTRAINT `fk_packages_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id_user`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 6. Table structure for sim_status
-- ----------------------------
DROP TABLE IF EXISTS `sim_status`;
CREATE TABLE `sim_status` (
  `id_sim_status` int NOT NULL AUTO_INCREMENT,
  `sim_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_sim_status`) USING BTREE,
  UNIQUE INDEX `sim_status`(`status_name` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 7. Table structure for sim_types
-- ----------------------------
DROP TABLE IF EXISTS `sim_types`;
CREATE TABLE `sim_types` (
  `id_sim_type` int NOT NULL AUTO_INCREMENT,
  `sim_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_sim_type`) USING BTREE,
  UNIQUE INDEX `sim_type`(`sim_type` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 8. Table structure for history_sim_card_file
-- ----------------------------
DROP TABLE IF EXISTS `history_sim_card_file`;
CREATE TABLE `history_sim_card_file` (
  `id_file` int NOT NULL AUTO_INCREMENT,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `id_agent` int NULL DEFAULT NULL,
  `uploaded_by` int NULL DEFAULT NULL,
  `total_rows` int NULL DEFAULT 0,
  `success_rows` int NULL DEFAULT 0,
  `failed_rows` int NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_file`) USING BTREE,
  INDEX `fk_history_agent`(`id_agent` ASC) USING BTREE,
  INDEX `fk_history_uploaded_by`(`uploaded_by` ASC) USING BTREE,
  CONSTRAINT `fk_history_agent` FOREIGN KEY (`id_agent`) REFERENCES `agents` (`id_agent`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_history_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id_user`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 9. Table structure for sim_cards
-- ----------------------------
DROP TABLE IF EXISTS `sim_cards`;
CREATE TABLE `sim_cards` (
  `id_sim` int NOT NULL AUTO_INCREMENT,
  `iccid` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `imsi` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `qr_code` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `activation_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `package` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `phone_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `id_sim_type` int NULL DEFAULT NULL,
  `id_package` int NULL DEFAULT NULL,
  `id_sim_status` int NOT NULL DEFAULT 1,
  `imported_by` int NULL DEFAULT NULL,
  `id_file` int NULL DEFAULT NULL,
  `imported_at` datetime NULL DEFAULT NULL,
  `link_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `deleted_at` datetime NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_sim`) USING BTREE,
  UNIQUE INDEX `iccid`(`iccid` ASC) USING BTREE,
  UNIQUE INDEX `imsi`(`imsi` ASC) USING BTREE,
  INDEX `fk_sim_type`(`id_sim_type` ASC) USING BTREE,
  INDEX `fk_sim_status`(`id_sim_status` ASC) USING BTREE,
  INDEX `fk_sim_imported_by`(`imported_by` ASC) USING BTREE,
  INDEX `fk_sim_file`(`id_file` ASC) USING BTREE,
  INDEX `fk_sim_cards_package`(`id_package` ASC) USING BTREE,
  CONSTRAINT `fk_sim_cards_package` FOREIGN KEY (`id_package`) REFERENCES `packages` (`id_package`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_sim_file` FOREIGN KEY (`id_file`) REFERENCES `history_sim_card_file` (`id_file`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_sim_imported_by` FOREIGN KEY (`imported_by`) REFERENCES `users` (`id_user`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_sim_status` FOREIGN KEY (`id_sim_status`) REFERENCES `sim_status` (`id_sim_status`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_sim_type` FOREIGN KEY (`id_sim_type`) REFERENCES `sim_types` (`id_sim_type`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 53 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 10. Table structure for customers
-- ----------------------------
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id_customer` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `passport_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `nationality` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `date_of_birth` date NULL DEFAULT NULL,
  `passport_expiry_date` date NULL DEFAULT NULL,
  `phone_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `selfie_photo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `passport_photo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_customer`) USING BTREE,
  UNIQUE INDEX `passport_number`(`passport_number` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 11. Table structure for registrations_status
-- ----------------------------
DROP TABLE IF EXISTS `registrations_status`;
CREATE TABLE `registrations_status` (
  `id_registration_status` int NOT NULL AUTO_INCREMENT,
  `status_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_registration_status`) USING BTREE,
  UNIQUE INDEX `status_name`(`status_name` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 12. Table structure for registrations
-- ----------------------------
DROP TABLE IF EXISTS `registrations`;
CREATE TABLE `registrations` (
  `id_registration` int NOT NULL AUTO_INCREMENT,
  `id_registration_status` int NOT NULL DEFAULT 1,
  `id_customer` int NOT NULL,
  `id_sim` int NOT NULL,
  `id_agent` int NOT NULL,
  `id_package` int NULL DEFAULT NULL,
  `registered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_by` int NULL DEFAULT NULL,
  `reviewed_at` datetime NULL DEFAULT NULL,
  `notes` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id_registration`) USING BTREE,
  INDEX `fk_reg_status`(`id_registration_status` ASC) USING BTREE,
  INDEX `fk_reg_customer`(`id_customer` ASC) USING BTREE,
  INDEX `fk_reg_sim`(`id_sim` ASC) USING BTREE,
  INDEX `fk_reg_agent`(`id_agent` ASC) USING BTREE,
  INDEX `fk_reg_package`(`id_package` ASC) USING BTREE,
  INDEX `fk_reg_reviewer`(`reviewed_by` ASC) USING BTREE,
  CONSTRAINT `fk_reg_agent` FOREIGN KEY (`id_agent`) REFERENCES `agents` (`id_agent`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_reg_customer` FOREIGN KEY (`id_customer`) REFERENCES `customers` (`id_customer`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_reg_package` FOREIGN KEY (`id_package`) REFERENCES `packages` (`id_package`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_reg_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id_user`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_reg_sim` FOREIGN KEY (`id_sim`) REFERENCES `sim_cards` (`id_sim`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_reg_status` FOREIGN KEY (`id_registration_status`) REFERENCES `registrations_status` (`id_registration_status`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 13. Table structure for audit_logs
-- ----------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id_audit_log` bigint NOT NULL AUTO_INCREMENT,
  `id_user` int NULL DEFAULT NULL,
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `target_entity` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `target_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `metadata` json NULL,
  `ip_address` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `old_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  PRIMARY KEY (`id_audit_log`) USING BTREE,
  INDEX `fk_audit_user`(`id_user` ASC) USING BTREE,
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

INSERT INTO `audit_logs` VALUES (6, NULL, 'LOGIN_FAILED', 'users', '3', '{"attempt": 1, "username": "admin"}', '38.18.157.122, 172.71.124.42, 10.28.19.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36', '2026-09-24 02:35:30', NULL);
INSERT INTO `audit_logs` VALUES (7, NULL, 'LOGIN_FAILED', 'users', '3', '{"attempt": 2, "username": "admin"}', '101.78.12.94, 172.71.124.57, 10.24.101.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0', '2026-09-28 03:15:28', NULL);
INSERT INTO `audit_logs` VALUES (8, NULL, 'LOGIN_FAILED', 'users', '3', '{"attempt": 2, "username": "admin"}', '101.78.12.94, 172.71.124.57, 10.24.101.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0', '2026-09-28 03:15:28', NULL);
INSERT INTO `audit_logs` VALUES (9, NULL, 'LOGIN_FAILED', 'users', '3', '{"attempt": 2, "username": "admin"}', '101.78.12.94, 172.70.116.170, 10.28.19.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0', '2026-09-28 03:15:29', NULL);
INSERT INTO `audit_logs` VALUES (10, NULL, 'LOGIN_FAILED', 'users', '3', '{"attempt": 2, "username": "admin"}', '101.78.12.94, 172.70.116.170, 10.24.101.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0', '2026-09-28 03:15:29', NULL);
INSERT INTO `audit_logs` VALUES (11, NULL, 'LOGIN_FAILED', 'users', '3', '{"attempt": 3, "username": "admin"}', '101.78.12.94, 104.22.66.218, 10.25.19.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0', '2026-09-28 03:15:46', NULL);
INSERT INTO `audit_logs` VALUES (12, NULL, 'LOGIN_FAILED', 'users', '3', '{"attempt": 4, "username": "admin"}', '101.78.12.94, 172.70.116.170, 10.28.19.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0', '2026-09-28 03:18:39', NULL);
INSERT INTO `audit_logs` VALUES (13, NULL, 'ACCOUNT_LOCKED', 'users', '3', '{"attempts": 5, "username": "admin", "lockout_minutes": 15}', '101.78.12.94, 172.70.116.170, 10.24.101.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0', '2026-09-28 03:52:12', NULL);
INSERT INTO `audit_logs` VALUES (14, NULL, 'ACCOUNT_LOCKED', 'users', '3', '{"attempts": 5, "username": "admin", "lockout_minutes": 15}', '101.78.12.94, 104.22.66.218, 10.25.19.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 Edg/154.0.0.0', '2026-09-28 03:52:13', NULL);

-- ----------------------------
-- 14. Table structure for notifications
-- ----------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id_notification` bigint NOT NULL AUTO_INCREMENT,
  `id_user` int NOT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `message` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'info',
  `is_read` tinyint(1) NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_notification`) USING BTREE,
  INDEX `fk_notification_user`(`id_user` ASC) USING BTREE,
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- 15. Table structure for refresh_tokens
-- ----------------------------
DROP TABLE IF EXISTS `refresh_tokens`;
CREATE TABLE `refresh_tokens` (
  `id_refresh_token` bigint NOT NULL AUTO_INCREMENT,
  `id_user` int NOT NULL,
  `token_hash` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `issued_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `last_activity` datetime NULL DEFAULT NULL,
  `revoked` tinyint(1) NOT NULL DEFAULT 0,
  `ip_address` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `device_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id_refresh_token`) USING BTREE,
  UNIQUE INDEX `token_hash`(`token_hash` ASC) USING BTREE,
  INDEX `fk_refresh_user`(`id_user` ASC) USING BTREE,
  CONSTRAINT `fk_refresh_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;