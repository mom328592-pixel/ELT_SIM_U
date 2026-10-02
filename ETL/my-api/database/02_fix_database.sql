-- =========================================================
-- ETL SIM PROJECT
-- PACKAGE + eSIM UPDATE
-- Tourist 20GB / 15 Days
-- =========================================================

SET FOREIGN_KEY_CHECKS = 0;


-- =========================================================
-- 1. CREATE PACKAGES TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS packages (
    id_package INT NOT NULL AUTO_INCREMENT,

    package_name VARCHAR(150) NOT NULL,

    description VARCHAR(500) DEFAULT NULL,

    data_gb DECIMAL(10,2) NOT NULL DEFAULT 0,

    duration_days INT NOT NULL DEFAULT 0,

    price DECIMAL(14,2) NOT NULL DEFAULT 0,

    currency VARCHAR(10) NOT NULL DEFAULT 'LAK',

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_by INT DEFAULT NULL,

    deleted_at DATETIME DEFAULT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id_package),

    INDEX idx_packages_active (is_active),

    INDEX idx_packages_created_by (created_by),

    CONSTRAINT fk_packages_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id_user)
        ON DELETE SET NULL
        ON UPDATE RESTRICT

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_0900_ai_ci;


-- =========================================================
-- 2. ADD id_package TO sim_cards
-- =========================================================

-- ຖ້າ id_package ມີຢູ່ແລ້ວ ຢ່າລັນ ALTER ສ່ວນນີ້ຊ້ຳ
ALTER TABLE sim_cards
ADD COLUMN id_package INT DEFAULT NULL
AFTER id_sim_type;


-- =========================================================
-- 3. INDEX
-- =========================================================

ALTER TABLE sim_cards
ADD INDEX idx_sim_cards_package (id_package);


-- =========================================================
-- 4. FOREIGN KEY
-- =========================================================

ALTER TABLE sim_cards
ADD CONSTRAINT fk_sim_cards_package
FOREIGN KEY (id_package)
REFERENCES packages(id_package)
ON DELETE SET NULL
ON UPDATE CASCADE;


-- =========================================================
-- 5. REMOVE OLD PACKAGE FROM REGISTRATIONS
-- =========================================================
-- ຖ້າ registrations ຂອງເຈົ້າບໍ່ມີ id_package ຢູ່ແລ້ວ
-- ໃຫ້ຂ້າມສ່ວນນີ້.
--
-- ຖ້າມີ id_package ຢູ່:
--
-- ALTER TABLE registrations
-- DROP COLUMN id_package;


-- =========================================================
-- 6. REMOVE NOTIFICATIONS TABLE
-- =========================================================

DROP TABLE IF EXISTS notifications;


-- =========================================================
-- 7. INSERT TOURIST eSIM PACKAGE
-- =========================================================

INSERT INTO packages (
    package_name,
    description,
    data_gb,
    duration_days,
    price,
    currency,
    is_active
)
SELECT
    'Tourist eSIM 20GB / 15 Days',
    'Tourist eSIM package with 20GB data valid for 15 days',
    20,
    15,
    0,
    'LAK',
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM packages
    WHERE package_name = 'Tourist eSIM 20GB / 15 Days'
);


SET FOREIGN_KEY_CHECKS = 1;


-- =========================================================
-- 8. CHECK PACKAGE
-- =========================================================

SELECT
    id_package,
    package_name,
    data_gb,
    duration_days,
    price,
    currency,
    is_active
FROM packages
WHERE deleted_at IS NULL;


-- =========================================================
-- 9. CHECK SIM + PACKAGE
-- =========================================================

SELECT
    s.id_sim,
    s.phone_number,
    s.iccid,
    s.imsi,
    st.sim_type,
    p.package_name,
    p.data_gb,
    p.duration_days,
    ss.sim_status
FROM sim_cards s
LEFT JOIN sim_types st
    ON s.id_sim_type = st.id_sim_type
LEFT JOIN packages p
    ON s.id_package = p.id_package
LEFT JOIN sim_status ss
    ON s.id_sim_status = ss.id_sim_status
WHERE s.deleted_at IS NULL
ORDER BY s.id_sim;