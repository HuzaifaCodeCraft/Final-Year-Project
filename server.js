const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const db = new sqlite3.Database('./eduflow.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database successfully.');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rollNo TEXT,
        name TEXT,
        className TEXT,
        dob TEXT,
        admissionDate TEXT,
        fatherName TEXT,
        motherName TEXT,
        contactNo TEXT,
        emergencyContact TEXT,
        address TEXT,
        admissionFee TEXT,
        monthlyFee TEXT,
        feeStatus TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dateKey TEXT UNIQUE,
        status TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        teacher TEXT,
        className TEXT
    )`);

    db.get(`SELECT COUNT(*) as count FROM students`, (err, row) => {
        if (row && row.count === 0) {
            const classesList = ["Nursery", "Prep", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
            const karachiAddresses = [
                "Gulshan-e-Iqbal, Block 13-D, Karachi", "Clifton, Block 4, Karachi",
                "Defence V, Phase 6, Karachi", "North Nazimabad, Block H, Karachi",
                "F.B. Area, Block 10, Karachi", "Tariq Road, PECHS, Karachi",
                "Gulistan-e-Jauhar, Block 15, Karachi", "Bahria Town, Precinct 19, Karachi",
                "Nazimabad No. 3, Karachi", "Buffer Zone, Sector 15-A, Karachi"
            ];
            const muslimNames = [
                "Muhammad Ali", "Ahmed Raza", "Fatima Bibi", "Ayesha Siddiqua", "Umer Farooq", 
                "Zainab Khan", "Hamza Malik", "Ibrahim Sheikh", "Hassan Ahmed", "Hussain Raza",
                "Maryam Nawaz", "Khadija Tul Kubra", "Usman Ghani", "Bilal Ahmed", "Areeba Siddique"
            ];

            let idCounter = 1;
            const stmt = db.prepare(`INSERT INTO students (rollNo, name, className, dob, admissionDate, fatherName, motherName, contactNo, emergencyContact, address, admissionFee, monthlyFee, feeStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            
            classesList.forEach((cls, classIndex) => {
                for (let i = 0; i < 15; i++) {
                    let randomName = muslimNames[i % muslimNames.length] + " " + idCounter;
                    let feeStatus = i % 2 === 0 ? "Paid" : "Unpaid";
                    
                    let admissionDate = (i < 2) ? "2026-10-13" : ((i < 6) ? "2026-10-04" : `2026-0${(classIndex % 8) + 1}-10`);
                    let dob = `201${(classIndex % 6) + 2}-0${(i % 9) + 1}-15`;
                    let contactNo = `0300-${1000000 + idCounter * 123}`;
                    let emergencyContact = `0321-${9000000 - idCounter * 321}`;

                    stmt.run(
                        `R-${100 + idCounter}`, 
                        randomName, 
                        cls, 
                        dob, 
                        admissionDate, 
                        "Muhammad Akram", 
                        "Suraiya Bano", 
                        contactNo, 
                        emergencyContact, 
                        karachiAddresses[i % karachiAddresses.length], 
                        "PKR 5,000", 
                        "PKR 12,000", 
                        feeStatus
                    );
                    idCounter++;
                }
            });
            stmt.finalize();
            console.log('Database seeded with 150 students.');
        }
    });

    db.get(`SELECT COUNT(*) as count FROM subjects`, (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO subjects (name, teacher, className) VALUES ('Mathematics', 'Sir Tariq', 'Class 10')`);
            db.run(`INSERT INTO subjects (name, teacher, className) VALUES ('English Literature', 'Maam Sadia', 'Class 9')`);
        }
    });
});

app.get('/api/students', (req, res) => {
    db.all(`SELECT * FROM students`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/students', (req, res) => {
    const { rollNo, name, className, dob, admissionDate, fatherName, motherName, contactNo, emergencyContact, address, admissionFee, monthlyFee, feeStatus } = req.body;
    db.run(`INSERT INTO students (rollNo, name, className, dob, admissionDate, fatherName, motherName, contactNo, emergencyContact, address, admissionFee, monthlyFee, feeStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [rollNo, name, className, dob, admissionDate, fatherName, motherName, contactNo, emergencyContact, address, admissionFee, monthlyFee, feeStatus], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Student admitted successfully' });
        });
});

app.put('/api/students/:id', (req, res) => {
    const { name, className, dob, admissionDate, fatherName, motherName, contactNo, emergencyContact, address, admissionFee, monthlyFee, feeStatus } = req.body;
    const { id } = req.params;
    db.run(`UPDATE students SET name = ?, className = ?, dob = ?, admissionDate = ?, fatherName = ?, motherName = ?, contactNo = ?, emergencyContact = ?, address = ?, admissionFee = ?, monthlyFee = ?, feeStatus = ? WHERE id = ?`,
        [name, className, dob, admissionDate, fatherName, motherName, contactNo, emergencyContact, address, admissionFee, monthlyFee, feeStatus, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Updated successfully', changes: this.changes });
        });
});

app.get('/api/attendance', (req, res) => {
    db.all(`SELECT * FROM attendance`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        let attObj = {};
        rows.forEach(r => { attObj[r.dateKey] = r.status; });
        res.json(attObj);
    });
});

app.post('/api/attendance', (req, res) => {
    const attendanceMap = req.body;
    const stmt = db.prepare(`INSERT OR REPLACE INTO attendance (dateKey, status) VALUES (?, ?)`);
    for (let [key, status] of Object.entries(attendanceMap)) {
        stmt.run(key, status);
    }
    stmt.finalize(err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Attendance saved successfully' });
    });
});

app.get('/api/subjects', (req, res) => {
    db.all(`SELECT * FROM subjects`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduFlow Enterprise Server running on port ${PORT}`);
});