const XLSX = require("xlsx");
const pool = require("../db");

const exportRegistrations = async (req, res) => {
    try {
        const {
            status,
            id_agent,
            search,
            date_from,
            date_to
        } = req.query;

        let sql = `
            SELECT
                r.id_registration AS ID,
                rs.status_name AS Status,
                CONCAT(
                    c.first_name,
                    ' ',
                    c.last_name
                ) AS Customer,
                c.passport_number AS Passport,
                s.phone_number AS Phone,
                s.iccid AS ICCID,
                s.imsi AS IMSI,
                a.agent_name AS Agent,
                r.registered_at AS Registered_At,
                u.username AS Reviewed_By,
                r.reviewed_at AS Reviewed_At,
                r.notes AS Notes
            FROM registrations r

            LEFT JOIN registrations_status rs
                ON r.id_registration_status =
                   rs.id_registration_status

            LEFT JOIN customers c
                ON r.id_customer = c.id_customer

            LEFT JOIN sim_cards s
                ON r.id_sim = s.id_sim

            LEFT JOIN agents a
                ON r.id_agent = a.id_agent

            LEFT JOIN users u
                ON r.reviewed_by = u.id_user

            WHERE r.deleted_at IS NULL
        `;

        const params = [];

        // STATUS
        if (status && status !== "All") {
            sql += `
                AND rs.status_name = ?
            `;
            params.push(status);
        }

        // AGENT
        if (id_agent && id_agent !== "All") {
            sql += `
                AND r.id_agent = ?
            `;
            params.push(Number(id_agent));
        }

        // SEARCH
        if (search) {
            sql += `
                AND (
                    CONCAT(
                        c.first_name,
                        ' ',
                        c.last_name
                    ) LIKE ?

                    OR c.passport_number LIKE ?

                    OR s.phone_number LIKE ?

                    OR s.iccid LIKE ?

                    OR s.imsi LIKE ?
                )
            `;

            const keyword = `%${search}%`;

            params.push(
                keyword,
                keyword,
                keyword,
                keyword,
                keyword
            );
        }

        // DATE FROM
        if (date_from) {
            sql += `
                AND DATE(r.created_at) >= ?
            `;
            params.push(date_from);
        }

        // DATE TO
        if (date_to) {
            sql += `
                AND DATE(r.created_at) <= ?
            `;
            params.push(date_to);
        }

        sql += `
            ORDER BY r.created_at DESC
        `;

        const [rows] = await pool.query(
            sql,
            params
        );

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Registrations"
        );

        const buffer =
            XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx"
            });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="registrations_filtered.xlsx"`
        );

        res.send(buffer);

    } catch (error) {
        console.error(
            "EXPORT REGISTRATIONS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};
const exportCustomers = async (req, res) => {
    try {
        const [rows] = await pool.query(`
    SELECT
        s.id_sim AS ID,
        s.iccid AS ICCID,
        s.imsi AS IMSI,
        s.phone_number AS Phone_Number,
        st.sim_type AS SIM_Type,
        ss.status_name AS SIM_Status,
        s.id_package AS ID_package,
        s.qr_code AS QR_Code,
        s.id_file AS File_ID,
        hf.file_name AS File_Name,
        s.link_url AS Link_URL,
        s.imported_at AS Imported_At
    FROM sim_cards s

    LEFT JOIN sim_types st
        ON s.id_sim_type = st.id_sim_type

    LEFT JOIN sim_status ss
        ON s.id_sim_status = ss.id_sim_status

    LEFT JOIN history_sim_card_file hf
        ON s.id_file = hf.id_file

    WHERE s.deleted_at IS NULL

    ORDER BY s.id_sim DESC
`);

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Customers"
        );

        const buffer =
            XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx"
            });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="customers.xlsx"`
        );

        res.send(buffer);

    } catch (error) {
        console.error(
            "EXPORT CUSTOMERS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};


const exportSims = async (req, res) => {
    try {
        const [rows] = await pool.query(`
    SELECT
        s.id_sim AS ID,
        s.iccid AS ICCID,
        s.imsi AS IMSI,
        s.phone_number AS Phone_Number,
        st.sim_type AS SIM_Type,
        ss.status_name AS SIM_Status,
        s.id_package AS ID_Package,
        s.qr_code AS QR_Code,
        s.id_file AS File_ID,
        hf.file_name AS File_Name,
        s.link_url AS Link_URL,
        s.imported_at AS Imported_At
    FROM sim_cards s

    LEFT JOIN sim_types st
        ON s.id_sim_type = st.id_sim_type

    LEFT JOIN sim_status ss
        ON s.id_sim_status = ss.id_sim_status

    LEFT JOIN history_sim_card_file hf
        ON s.id_file = hf.id_file

    WHERE s.deleted_at IS NULL

    ORDER BY s.id_sim DESC
`);

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "SIM Cards"
        );

        const buffer =
            XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx"
            });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="sim_cards.xlsx"`
        );

        res.send(buffer);

    } catch (error) {
        console.error(
            "EXPORT SIM ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });
    }
};

module.exports = {
    exportRegistrations,
    exportCustomers,
    exportSims
};