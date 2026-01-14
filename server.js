const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const prisma = new PrismaClient();
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Helper to convert Excel date
function excelDateToJSDate(serial) {
    return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

app.get('/api/calendars', async (req, res) => {
    try {
        const headers = await prisma.cycleCalendarHeader.findMany({
            include: { client: true },
            orderBy: { uploaded_date: 'desc' }
        });
        res.json(headers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/calendars/:id', async (req, res) => {
    try {
        const header = await prisma.cycleCalendarHeader.findUnique({
            where: { header_id: parseInt(req.params.id) },
            include: {
                client: true,
                details: {
                    orderBy: { mcp_date: 'asc' }
                }
            }
        });
        if (!header) return res.status(404).json({ error: 'Calendar not found' });
        res.json(header);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
    const clientName = req.body.clientName;
    const uploadedBy = req.body.uploadedBy || 'Admin';
    const overwrite = req.body.overwrite === 'true';

    if (!file || !clientName) {
        return res.status(400).json({ error: 'File and Client Name are required' });
    }

    try {
        const workbook = XLSX.readFile(file.path, { cellDates: true });
        let sheetName = workbook.SheetNames.find(n => n.includes('Cycle') && n.includes('Calendar')) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

        let headerRowIndex = -1;
        let detectedHeaders = [];

        for (let i = 0; i < Math.min(20, rawData.length); i++) {
            const row = rawData[i];
            if (!row || !Array.isArray(row)) continue;
            const rowClean = row.map(c => String(c || '').trim().toLowerCase());
            const hasCycle = rowClean.some(c => c === 'cycle');
            const hasDate = rowClean.some(c => c === 'cycle date' || c === 'date');
            const hasType = rowClean.some(c => c === 'type');

            if (hasCycle && hasDate && hasType) {
                headerRowIndex = i;
                detectedHeaders = row.map(c => String(c || '').trim());
                break;
            }
        }

        if (headerRowIndex === -1) {
            return res.status(400).json({ error: 'Invalid format: Could not find headers (Cycle, Cycle Date, Type).' });
        }

        const allRows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            range: headerRowIndex + 1,
            blankrows: false
        });

        const colMap = {};
        detectedHeaders.forEach((h, i) => {
            if (h && i < 7) {
                const cleanH = String(h).toLowerCase().trim();
                if (!(cleanH in colMap)) colMap[cleanH] = i;
            }
        });

        const getVal = (row, keywords, fallbackIdx) => {
            const idx = keywords.map(k => colMap[k.toLowerCase().trim()]).find(i => i !== undefined);
            const finalIdx = idx !== undefined ? idx : fallbackIdx;
            return finalIdx !== undefined ? row[finalIdx] : null;
        };

        const validRows = [];
        const seenDates = new Set();
        let maxCycle = 0;

        for (let i = 0; i < allRows.length; i++) {
            const row = allRows[i];
            const rawCycle = getVal(row, ['cycle', 'cycle #'], 0);
            const rawZone = getVal(row, ['zone'], 1);
            const rawDate = getVal(row, ['cycle date', 'date'], 3);
            const rawType = getVal(row, ['type'], 4);

            if (rawDate === null || rawDate === undefined) continue;

            let dateObj = null;
            if (rawDate instanceof Date) dateObj = rawDate;
            else if (typeof rawDate === 'number') dateObj = excelDateToJSDate(rawDate);
            else if (typeof rawDate === 'string' && rawDate.trim() !== '') {
                const parsed = new Date(rawDate);
                if (!isNaN(parsed.getTime())) dateObj = parsed;
            }

            if (!dateObj || isNaN(dateObj.getTime())) continue;

            const typeStr = String(rawType || '').trim().toUpperCase();
            if (!['R', 'W', 'H'].includes(typeStr)) continue;

            const cleanNum = (val) => {
                const s = String(val || '').replace(/[^\d]/g, '');
                return s ? parseInt(s, 10) : 0;
            };

            let cycleNum = cleanNum(rawCycle);
            let zoneNum = cleanNum(rawZone);

            if (cycleNum === 0 && dateObj) cycleNum = dateObj.getUTCMonth() + 1;
            if (zoneNum === 0 && dateObj) zoneNum = dateObj.getUTCDate();

            const dateKey = dateObj.toISOString().split('T')[0];
            if (seenDates.has(dateKey)) continue;
            seenDates.add(dateKey);

            if (!isNaN(cycleNum) && cycleNum > maxCycle) maxCycle = cycleNum;

            validRows.push({
                cycle_number: cycleNum,
                zone: zoneNum,
                mcp_date: dateObj,
                type: typeStr,
                plot_flag: typeStr === 'R' ? 1 : 0,
                version: 1
            });
        }

        if (validRows.length === 0) return res.status(400).json({ error: 'No valid data rows found' });

        const year = validRows[0].mcp_date.getFullYear();
        const cycleCode = `${clientName}_${year}_${Date.now()}`;

        let client = await prisma.client.findUnique({ where: { name: clientName } });
        if (!client) client = await prisma.client.create({ data: { name: clientName } });
        const clientId = client.id;

        const existingHeader = await prisma.cycleCalendarHeader.findFirst({
            where: { client_id: clientId, year: year }
        });

        if (existingHeader) {
            if (!overwrite) {
                return res.status(409).json({
                    error: `Calendar for ${clientName} in ${year} already exists.`,
                    requiresOverwrite: true
                });
            }
            await prisma.cycleCalendarHeader.delete({ where: { header_id: existingHeader.header_id } });
        }

        const result = await prisma.$transaction(async (tx) => {
            const header = await tx.cycleCalendarHeader.create({
                data: {
                    cycle_code: cycleCode,
                    year: year,
                    cycles: maxCycle,
                    uploaded_by: uploadedBy,
                    client_id: clientId,
                }
            });

            for (const row of validRows) {
                await tx.cycleCalendarDetail.create({
                    data: {
                        header_id: header.header_id,
                        mcp_date: row.mcp_date,
                        cycle_number: row.cycle_number,
                        type: row.type,
                        zone: row.zone,
                        plot_flag: row.plot_flag,
                        version: row.version,
                        modified_by: uploadedBy
                    }
                });
            }
            return header;
        });

        res.json({ success: true, headerId: result.header_id, message: 'Processed successfully' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (file) fs.unlinkSync(file.path);
    }
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
