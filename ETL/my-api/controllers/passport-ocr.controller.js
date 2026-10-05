const { createWorker } = require("tesseract.js");

const processPassportOCR = async (req, res) => {
    let worker = null;
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Passport image is required"
            });
        }

        // 1. ກວດສອບ Source ຂອງຮູບ (ຖ້າໃຊ້ diskStorage ເອົາ .path, ຖ້າ memoryStorage ເອົາ .buffer)
        const imageSource = req.file.path || req.file.buffer;

        if (!imageSource) {
            return res.status(400).json({
                success: false,
                message: "Invalid image file source"
            });
        }

        // 2. ສ້າງ Worker ສຳລັບພາສາອັງກິດ
        worker = await createWorker("eng");

        // 3. ປະມວນຜົນ OCR
        const result = await worker.recognize(imageSource);
        const text = result.data.text || "";

        // 4. ຄາຍ Memory ຂອງ Worker
        await worker.terminate();

        // 5. Parse ຂໍ້ມູນ Passport
        const parsed = parsePassportText(text);

        return res.json({
            success: true,
            message: "Passport OCR completed",
            data: {
                raw_text: text,
                passport: parsed
            }
        });

    } catch (error) {
        // ຖ້າເກີດ Error ໃຫ້ປິດ worker ໄວ້
        if (worker) {
            await worker.terminate();
        }

        console.error("PASSPORT OCR ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Unable to process passport image"
        });
    }
};

const parsePassportText = (text) => {
    const normalized = text.replace(/\r/g, "");
    
    // ແຍກບັນທັດ ແລະ Clean Up Space
    const lines = normalized
        .split("\n")
        .map((l) => l.trim().replace(/\s+/g, ""))
        .filter(Boolean);

    let passportNumber = "";
    let dateOfBirth = "";
    let nationality = "";
    let firstName = "";
    let lastName = "";

    // 1. ຊອກຫາບັນທັດ MRZ Line 1 (ເລີ່ມດ້ວຍ P)
    const mrzLine1 = lines.find((l) => /^P[A-Z0-9<]/i.test(l) && (l.includes("<") || l.includes("K")));

    // 2. ຊອກຫາບັນທັດ MRZ Line 2 (ບັນທັດທີ່ມີ Passport/DOB structure)
    const mrzLine2 = lines.find((l) => {
        return l !== mrzLine1 && /[0-9O]{6,}[0-9M F<K]/i.test(l) && l.length >= 30;
    });

    // --- PARSE MRZ LINE 1 ---
    if (mrzLine1) {
        // ແທນທີ່ Noise ອັກສອນ K ຫຼື L ທີ່ OCR ອ່ານຜິດຈາກ < ໃຫ້ກັບມາເປັນ <
        let cleanLine1 = mrzLine1.replace(/KL|LK|K|L/g, "<");

        // Extract Country Code (3 ຕົວອັກສອນ ຫຼັງຈາກ P<)
        const countryMatch = cleanLine1.match(/^P[A-Z0-9<]([A-Z0-9]{1,3})/);
        if (countryMatch) {
            nationality = countryMatch[1].replace(/0/g, "O");
        }

        // ຕັດ Prefix (P<D<<) ອອກ ແລ້ວແຍກ Surname / Given Name
        const namePart = cleanLine1.substring(5);
        const nameSegments = namePart.split("<<").filter(Boolean);

        if (nameSegments.length >= 1) {
            lastName = nameSegments[0].replace(/</g, " ").trim();
        }
        if (nameSegments.length >= 2) {
            // ເອົາພຽງ Segment ຂອງ First Name ແທ້ໆ (ຕັດ Filler < ທ້າຍອອກ)
            firstName = nameSegments[1].split("<")[0].trim();
        }
    }

    // --- PARSE MRZ LINE 2 ---
    if (mrzLine2) {
        let cleanLine2 = mrzLine2.replace(/K/g, "<");

        // 1. Passport Number (9 ຕົວອັກສອນທຳອິດ)
        let rawPassport = cleanLine2.substring(0, 9).replace(/</g, "");
        // ແປງ O ທີ່ຢູ່ຫຼັງ Alpha-prefix ໃຫ້ເປັນ 0
        passportNumber = rawPassport.replace(/^([A-Z]{1,2})O/, "$10");

        // 2. Date of Birth (ຕຳແໜ່ງ index 13-18)
        const dobStr = cleanLine2.substring(13, 19).replace(/O/g, "0");

        if (/^[0-9]{6}$/.test(dobStr)) {
            const yy = parseInt(dobStr.substring(0, 2), 10);
            const mm = dobStr.substring(2, 4);
            const dd = dobStr.substring(4, 6);

            const currentYear = new Date().getFullYear() % 100;
            const century = yy > currentYear + 5 ? "19" : "20";

            dateOfBirth = `${century}${yy}-${mm}-${dd}`;
        }
    }

    // --- FALLBACK REGEX (ກໍລະນີ MRZ parse ບໍ່ໄດ້) ---
    if (!passportNumber) {
        const passportMatch = normalized.match(/\b[A-Z0-9]{6,9}\b/);
        if (passportMatch) passportNumber = passportMatch[0];
    }

    return {
        first_name: firstName,
        last_name: lastName,
        passport_number: passportNumber,
        nationality: nationality || "",
        date_of_birth: dateOfBirth
    };
};

module.exports = {
    processPassportOCR
};