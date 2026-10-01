

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. AGENT PUBLIC TOKEN
-- =====================================================

ALTER TABLE agents
ADD COLUMN public_token CHAR(64) NULL AFTER address;

ALTER TABLE agents
ADD UNIQUE INDEX uq_agents_public_token (public_token);


-- =====================================================
-- 2. CREATE PUBLIC TOKEN FOR OLD AGENTS
-- =====================================================
-- ໃຫ້ Node.js ສ້າງ token ໃຫ້ agent ເກົ່າ
-- ເພາະ SQL ບໍ່ຄວນໃຊ້ token ແບບຄາດເດົາໄດ້.


-- =====================================================
-- 3. SIM STATUS
-- =====================================================

INSERT INTO sim_status (
    status_name,
    description
)
SELECT
    'Available',
    'SIM ພ້ອມໃຫ້ລົງທະບຽນ'
WHERE NOT EXISTS (
    SELECT 1
    FROM sim_status
    WHERE LOWER(status_name) = 'available'
);


INSERT INTO sim_status (
    status_name,
    description
)
SELECT
    'Registered',
    'SIM ລົງທະບຽນແລ້ວ'
WHERE NOT EXISTS (
    SELECT 1
    FROM sim_status
    WHERE LOWER(status_name) = 'registered'
);


INSERT INTO sim_status (
    status_name,
    description
)
SELECT
    'Blocked',
    'SIM ຖືກບລັອກ'
WHERE NOT EXISTS (
    SELECT 1
    FROM sim_status
    WHERE LOWER(status_name) = 'blocked'
);


INSERT INTO sim_status (
    status_name,
    description
)
SELECT
    'Reserved',
    'SIM ຖືກຈອງລໍຖ້າການອະນຸມັດ'
WHERE NOT EXISTS (
    SELECT 1
    FROM sim_status
    WHERE LOWER(status_name) = 'reserved'
);


-- =====================================================
-- 4. REGISTRATION STATUS
-- =====================================================

INSERT INTO registrations_status (
    status_name,
    description
)
SELECT
    'Pending',
    'ລໍຖ້າການກວດສອບ'
WHERE NOT EXISTS (
    SELECT 1
    FROM registrations_status
    WHERE LOWER(status_name) = 'pending'
);


INSERT INTO registrations_status (
    status_name,
    description
)
SELECT
    'Approved',
    'ອະນຸມັດແລ້ວ'
WHERE NOT EXISTS (
    SELECT 1
    FROM registrations_status
    WHERE LOWER(status_name) = 'approved'
);


INSERT INTO registrations_status (
    status_name,
    description
)
SELECT
    'Rejected',
    'ປະຕິເສດ'
WHERE NOT EXISTS (
    SELECT 1
    FROM registrations_status
    WHERE LOWER(status_name) = 'rejected'
);


-- =====================================================
-- 5. REFRESH TOKEN COLUMN
-- =====================================================
-- schema ໃຊ້ last_activity
-- code ເກົ່າໃຊ້ last_activity_at
-- ຈະແກ້ code ໃຫ້ກົງກັບ schema
-- ດັ່ງນັ້ນບໍ່ຕ້ອງ ALTER table


SET FOREIGN_KEY_CHECKS = 1;