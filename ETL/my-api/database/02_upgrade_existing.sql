USE sim_management_db;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS passport_expiry_date DATE NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50) NULL;
ALTER TABLE sim_cards ADD COLUMN IF NOT EXISTS activation_code VARCHAR(255) NULL;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS id_package INT NULL;
CREATE TABLE IF NOT EXISTS packages (id_package INT AUTO_INCREMENT PRIMARY KEY, package_name VARCHAR(150) NOT NULL, description VARCHAR(255), duration_days INT NOT NULL, price DECIMAL(14,2) NOT NULL, currency VARCHAR(10) NOT NULL DEFAULT 'LAK', is_active TINYINT(1) NOT NULL DEFAULT 1, created_by INT NULL, deleted_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS payments (id_payment INT AUTO_INCREMENT PRIMARY KEY, id_registration INT NOT NULL, id_package INT NOT NULL, amount DECIMAL(14,2) NOT NULL, currency VARCHAR(10) NOT NULL DEFAULT 'LAK', payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash', payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending', transaction_reference VARCHAR(150) NULL, paid_at DATETIME NULL, notes VARCHAR(500) NULL, created_by INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB;

-- Assign packages directly to SIM cards. Customer registration reads package from the selected SIM.
ALTER TABLE sim_cards ADD COLUMN IF NOT EXISTS id_package INT NULL;
SET @fk_exists := (SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='fk_sim_package');
SET @sql := IF(@fk_exists=0, 'ALTER TABLE sim_cards ADD CONSTRAINT fk_sim_package FOREIGN KEY (id_package) REFERENCES packages(id_package) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE sim_cards SET id_package = 1 WHERE id_sim = 1 AND id_package IS NULL;
UPDATE sim_cards SET id_package = 3 WHERE id_sim = 2 AND id_package IS NULL;
