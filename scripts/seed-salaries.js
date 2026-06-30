/**
 * Ankaa ERP — Seed realistic salary data for all employees
 * Run: node scripts/seed-salaries.js
 *
 * Sets basic_salary, employee_id, position_title, department_id, contract_type, status
 * on the profiles table. These are representative/sample values for local dev.
 * Real salaries will be imported from the company server.
 */
const path    = require('path')
const { randomUUID } = require('crypto')
const { PGlite } = require('@electric-sql/pglite')

// Load .env.local
const fs = require('fs')
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const t = line.trim(); if (!t || t.startsWith('#')) return
    const eq = t.indexOf('='); if (eq < 0) return
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  })
}

const DATA_DIR = process.env.LOCAL_DB_PATH ||
  path.resolve(__dirname, '..', '.local-db').replace(/\\/g, '/')

// ── Salary data keyed by email ─────────────────────────────────────────────────
// Salaries in OMR. Based on typical Oman market rates for each level.
// Marked NULL where data is not available (external / no profile).
const SALARY_DATA = [
  // ── Executive ────────────────────────────────────────────────────────────────
  { email: 'khalid.balushi@ankaa.om',   emp_id: 'ANK-001', dept: 'Executive',              title: 'Managing Director',                       contract: 'full_time', salary: 3500 },
  { email: 'mohammed.riyami@ankaa.om',  emp_id: 'ANK-002', dept: 'Executive',              title: 'Chief Executive Officer',                 contract: 'full_time', salary: 3200 },
  // ── Marketing ────────────────────────────────────────────────────────────────
  { email: 'reham.ghanboosi@ankaa.om',  emp_id: 'ANK-003', dept: 'Marketing',              title: 'Head of Marketing Department',            contract: 'full_time', salary: 1800 },
  { email: 'mekaeel.abdullah@ankaa.om', emp_id: 'ANK-004', dept: 'Marketing',              title: 'Projects Director (Special Projects)',    contract: 'full_time', salary: 2200 },
  // ── Finance ──────────────────────────────────────────────────────────────────
  { email: 'fateme.sohrabi@ankaa.om',   emp_id: 'ANK-005', dept: 'Finance',                title: 'Accountant',                              contract: 'full_time', salary: 1400 },
  { email: 'jawahir.harthi@ankaa.om',   emp_id: 'ANK-006', dept: 'Finance',                title: 'Accounts Assistant',                      contract: 'full_time', salary: 900  },
  { email: 'huria.hamdani@ankaa.om',    emp_id: 'ANK-007', dept: 'HR & Administration',    title: 'Head of Department (HR)',                 contract: 'full_time', salary: 1600 },
  { email: 'rayan.rawahi@ankaa.om',     emp_id: 'ANK-008', dept: 'HR & Administration',    title: 'HR Executive',                            contract: 'full_time', salary: 900  },
  // ── HR & Administration ───────────────────────────────────────────────────────
  { email: 'khamis.hashmi@ankaa.om',    emp_id: 'ANK-009', dept: 'HR & Administration',    title: 'HR & Admin Manager',                      contract: 'full_time', salary: 1800 },
  { email: 'sultan.balushi@ankaa.om',   emp_id: 'ANK-010', dept: 'HR & Administration',    title: 'Head of Department (Administration)',     contract: 'full_time', salary: 1500 },
  { email: 'hilal.riyami@ankaa.om',     emp_id: 'ANK-011', dept: 'HR & Administration',    title: 'Public Relations Executive',              contract: 'full_time', salary: 850  },
  { email: 'reynaldo.marasigan@ankaa.om',emp_id:'ANK-012', dept: 'HR & Administration',    title: 'Supervisor (TAQSI)',                       contract: 'full_time', salary: 750  },
  { email: 'ahmed.nasser@ankaa.om',     emp_id: 'ANK-013', dept: 'HR & Administration',    title: 'IT Executive',                            contract: 'full_time', salary: 950  },
  { email: 'jamal.raisi@ankaa.om',      emp_id: 'ANK-014', dept: 'HR & Administration',    title: 'Cybersecurity Expert',                    contract: 'full_time', salary: 1200 },
  // ── Operations ───────────────────────────────────────────────────────────────
  { email: 'ali.ghassani@ankaa.om',     emp_id: 'ANK-015', dept: 'Operations',             title: 'Acting COO',                              contract: 'full_time', salary: 2500 },
  { email: 'ghaydah.jabri@ankaa.om',    emp_id: 'ANK-016', dept: 'Operations',             title: 'Head of Space Department',                contract: 'full_time', salary: 1700 },
  { email: 'imad.zadjali@ankaa.om',     emp_id: 'ANK-017', dept: 'Operations',             title: 'Head of Aviation Department',             contract: 'full_time', salary: 1700 },
  { email: 'darwish.balushi@ankaa.om',  emp_id: 'ANK-018', dept: 'Operations',             title: 'Operations Manager (Aviation)',           contract: 'full_time', salary: 1400 },
  { email: 'yousuf.riyami@ankaa.om',    emp_id: 'ANK-019', dept: 'Operations',             title: 'Head of Department (Drone)',              contract: 'full_time', salary: 1500 },
  { email: 'ahmed.mandhiri@ankaa.om',   emp_id: 'ANK-020', dept: 'Operations',             title: 'Lead Technical Team',                     contract: 'full_time', salary: 1200 },
  { email: 'mansury.yahya@ankaa.om',    emp_id: 'ANK-021', dept: 'Operations',             title: 'Drone Pilot / Tech',                      contract: 'full_time', salary: 900  },
  { email: 'abdulmajeed.balushi@ankaa.om',emp_id:'ANK-022',dept: 'Operations',             title: 'Drone Pilot / Tech',                      contract: 'full_time', salary: 900  },
  { email: 'maadh.balushi@ankaa.om',    emp_id: 'ANK-023', dept: 'Operations',             title: 'Lead Drone Pilot Team',                   contract: 'full_time', salary: 1100 },
  { email: 'hussain.harooni@ankaa.om',  emp_id: 'ANK-024', dept: 'Operations',             title: 'Drone Pilot',                             contract: 'full_time', salary: 850  },
  { email: 'abdulmalik.juma@ankaa.om',  emp_id: 'ANK-025', dept: 'Operations',             title: 'Drone Pilot',                             contract: 'full_time', salary: 850  },
  { email: 'abdulmalik.abd@ankaa.om',   emp_id: 'ANK-026', dept: 'Operations',             title: 'Drone Pilot',                             contract: 'full_time', salary: 850  },
  { email: 'mohammed.kindi@ankaa.om',   emp_id: 'ANK-027', dept: 'Operations',             title: 'Drone Pilot',                             contract: 'full_time', salary: 850  },
  { email: 'hisham.musheifri@ankaa.om', emp_id: 'ANK-028', dept: 'Operations',             title: 'Drone Pilot',                             contract: 'full_time', salary: 850  },
  { email: 'hamed.wuhaibi@ankaa.om',    emp_id: 'ANK-029', dept: 'Operations',             title: 'Drone Pilot',                             contract: 'full_time', salary: 850  },
  { email: 'yahya.hajri@ankaa.om',      emp_id: 'ANK-030', dept: 'Operations',             title: 'Drone Pilot',                             contract: 'full_time', salary: 850  },
  { email: 'albaraa.yarubi@ankaa.om',   emp_id: 'ANK-031', dept: 'Operations',             title: 'Drone Pilot',                             contract: 'full_time', salary: 850  },
  // ── Technology ────────────────────────────────────────────────────────────────
  { email: 'rami.katat@ankaa.om',       emp_id: 'ANK-032', dept: 'Technology',             title: 'CTO',                                     contract: 'full_time', salary: 3000 },
  { email: 'omar.ghaithy@ankaa.om',     emp_id: 'ANK-034', dept: 'Technology',             title: 'Head of IT Department',                   contract: 'full_time', salary: 1900 },
  { email: 'palwasha.asif@ankaa.om',    emp_id: 'ANK-035', dept: 'Technology',             title: 'Software Developer',                      contract: 'full_time', salary: 1100 },
  { email: 'khalid.masoudi@ankaa.om',   emp_id: 'ANK-036', dept: 'Technology',             title: 'Software Developer',                      contract: 'full_time', salary: 1000 },
  { email: 'ibrahim.masoudi@ankaa.om',  emp_id: 'ANK-037', dept: 'Technology',             title: 'Software Developer',                      contract: 'full_time', salary: 1000 },
  { email: 'khalid.shibli@ankaa.om',    emp_id: 'ANK-038', dept: 'Technology',             title: 'Software Developer',                      contract: 'full_time', salary: 950  },
  { email: 'furwa.asim@ankaa.om',       emp_id: 'ANK-039', dept: 'Technology',             title: 'Software Developer (DevOps)',             contract: 'full_time', salary: 950  },
  { email: 'mohammad.imthiyaz@ankaa.om',emp_id: 'ANK-040', dept: 'Technology',             title: 'Software Developer (DevOps)',             contract: 'full_time', salary: 950  },
  { email: 'mohammed.ali@ankaa.om',     emp_id: 'ANK-041', dept: 'Technology',             title: 'Trainee – IT Department',                 contract: 'intern',    salary: 400  },
  { email: 'dima.maawali@ankaa.om',     emp_id: 'ANK-042', dept: 'Technology',             title: 'Business Analyst',                        contract: 'full_time', salary: 1100 },
  { email: 'ahmed.kharusi@ankaa.om',    emp_id: 'ANK-043', dept: 'Technology',             title: 'Team Lead (IT)',                          contract: 'full_time', salary: 1400 },
  { email: 'mohammed.almaskari@ankaa.om',emp_id:'ANK-044', dept: 'Technology',             title: 'Senior Software Developer',               contract: 'full_time', salary: 1300 },
  { email: 'maryam.alkalbani@ankaa.om', emp_id: 'ANK-045', dept: 'Technology',             title: 'Quality Assurance Officer',               contract: 'full_time', salary: 1000 },
  { email: 'rahma.jahwari@ankaa.om',    emp_id: 'ANK-046', dept: 'Technology',             title: 'Software Developer',                      contract: 'full_time', salary: 950  },
  { email: 'maram.nualmi@ankaa.om',     emp_id: 'ANK-047', dept: 'Technology',             title: 'Software Developer',                      contract: 'full_time', salary: 950  },
  { email: 'mazin.ambouri@ankaa.om',    emp_id: 'ANK-048', dept: 'Technology',             title: 'Software Developer',                      contract: 'full_time', salary: 950  },
  { email: 'rayan.hashmi@ankaa.om',     emp_id: 'ANK-049', dept: 'Technology',             title: 'Software Developer',                      contract: 'full_time', salary: 900  },
  // ── Research & Development ────────────────────────────────────────────────────
  { email: 'jasim.balushi@ankaa.om',    emp_id: 'ANK-050', dept: 'Research & Development', title: 'CRDO',                                    contract: 'full_time', salary: 2000 },
  { email: 'mazin.toubi@ankaa.om',      emp_id: 'ANK-051', dept: 'Research & Development', title: 'Technical Projects Developer',            contract: 'full_time', salary: 1100 },
  { email: 'mohammed.bader@ankaa.om',   emp_id: 'ANK-052', dept: 'Research & Development', title: 'R&D Drone Pilot',                         contract: 'full_time', salary: 850  },
  // ── Tenders & Contracts ───────────────────────────────────────────────────────
  { email: 'maathir.wahaibi@ankaa.om',  emp_id: 'ANK-053', dept: 'Tenders & Contracts',   title: 'Tender & ICV Manager',                    contract: 'full_time', salary: 1600 },
  { email: 'daniya.shabibi@ankaa.om',   emp_id: 'ANK-054', dept: 'Tenders & Contracts',   title: 'Sales Executive',                         contract: 'full_time', salary: 900  },
  // ── Ashraf accounts ───────────────────────────────────────────────────────────
  { email: 'ashraf@ankaa.om',           emp_id: 'ANK-033', dept: 'Technology',             title: 'ERP Project Lead',                        contract: 'full_time', salary: 2200 },
  { email: 'mdashraf@ankaa.om',         emp_id: 'ANK-033A',dept: 'Technology',             title: 'ERP Administrator',                       contract: 'full_time', salary: 2000 },
  { email: 'mdashraf.intern@ankaa.om',  emp_id: 'ANK-033T',dept: 'Technology',             title: 'Software Engineering Trainee',            contract: 'intern',    salary: 500  },
]

async function main() {
  console.log('\nAnkaa ERP — Seed Salary Data')
  console.log('─'.repeat(55))
  console.log('DB:', DATA_DIR)
  console.log(`Employees to update: ${SALARY_DATA.length}`)
  console.log('─'.repeat(55))

  const db = new PGlite(DATA_DIR)

  let updated = 0, notFound = 0

  for (const s of SALARY_DATA) {
    const res = await db.query(
      `UPDATE profiles
       SET basic_salary    = $1,
           employee_id     = $2,
           department_id   = $3,
           position_title  = $4,
           contract_type   = $5,
           status          = 'active',
           updated_at      = $6
       WHERE email = $7
       RETURNING id`,
      [s.salary, s.emp_id, s.dept, s.title, s.contract, new Date().toISOString(), s.email]
    )
    if (res.rows.length) {
      updated++
      console.log(`  ✓ ${s.email.padEnd(38)} ${s.emp_id.padEnd(10)} OMR ${String(s.salary).padStart(5)}`)
    } else {
      notFound++
      console.log(`  ⊘ ${s.email.padEnd(38)} not in DB (will be populated from live server)`)
    }
  }

  // Ensure leave balances exist for everyone
  const { rows: profiles } = await db.query('SELECT id FROM profiles')
  for (const p of profiles) {
    await db.query(
      `INSERT INTO leave_balances (id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [randomUUID(), p.id]
    ).catch(() => {})
  }

  console.log('\n' + '─'.repeat(55))
  console.log(`✅  Done — ${updated} updated, ${notFound} not in local DB`)
  console.log('─'.repeat(55) + '\n')

  await db.close()
}

main().catch(e => { console.error('\nFailed:', e.message); process.exit(1) })
