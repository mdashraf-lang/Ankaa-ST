/**
 * Ankaa ERP — Seed Org Chart (from Ankaa_Organization_Chart.xlsx)
 * Run: node scripts/seed-org-chart.js
 *
 * Populates the org_chart table with all 55 Ankaa S&T employees.
 * Nodes without a matching profile get full_name/email stored directly.
 */
const path    = require('path')
const { PGlite } = require('@electric-sql/pglite')

const DATA_DIR = path.resolve(__dirname, '..', '.local-db').replace(/\\/g, '/')

// ── Org Chart Data (from Excel: Full Directory + Reporting Lines) ─────────────
// Format: { id, title, department, level, parent_id, full_name, email,
//           is_c_level, is_head_of_department, can_direct_approve, order }
const ORG_NODES = [
  // ── Executive ─────────────────────────────────────────────────────────────
  {
    id: 'md', parent_id: null, order: 1,
    full_name: 'Khalid Al Balushi', email: 'khalid.balushi@ankaa.om',
    title: 'Managing Director', department: 'Executive', level: 'MD',
    is_c_level: 1, is_head_of_department: 0, can_direct_approve: 1,
  },
  {
    id: 'ceo', parent_id: 'md', order: 1,
    full_name: 'Mohammed Al Riyami', email: 'mohammed.riyami@ankaa.om',
    title: 'Chief Executive Officer', department: 'Executive', level: 'CEO',
    is_c_level: 1, is_head_of_department: 0, can_direct_approve: 1,
  },

  // ── External Advisors (under CEO) ────────────────────────────────────────
  {
    id: 'alberto', parent_id: 'ceo', order: 9,
    full_name: 'Alberto Jorge', email: 'alberto.jorge@external.com',
    title: 'Advisor (Management)', department: 'External', level: 'External',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'ikram-ext', parent_id: 'ceo', order: 10,
    full_name: 'Ikram Al Balushi', email: 'ikram.balushi@external.com',
    title: 'CFOO – Projects & Field Operations', department: 'External', level: 'External',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },

  // ── Marketing ─────────────────────────────────────────────────────────────
  {
    id: 'marketing-head', parent_id: 'ceo', order: 1,
    full_name: 'Reham Al Ghanboosi', email: 'reham.ghanboosi@ankaa.om',
    title: 'Head of Marketing Department', department: 'Marketing', level: 'Manager',
    is_c_level: 0, is_head_of_department: 1, can_direct_approve: 0,
  },
  {
    id: 'mekaeel', parent_id: 'marketing-head', order: 1,
    full_name: 'Mekaeel Abdullah', email: 'mekaeel.abdullah@ankaa.om',
    title: 'Projects Director (Special Projects)', department: 'Marketing', level: 'Manager',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    id: 'fateme', parent_id: 'ceo', order: 2,
    full_name: 'Fateme Sohrabi', email: 'fateme.sohrabi@ankaa.om',
    title: 'Accountant', department: 'Finance', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'jawahir', parent_id: 'fateme', order: 1,
    full_name: 'Jawahir Ali Amur Al Harthi', email: 'jawahir.harthi@ankaa.om',
    title: 'Accounts Assistant', department: 'Finance', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'huria', parent_id: 'ceo', order: 3,
    full_name: 'Huria Al Hamdani', email: 'huria.hamdani@ankaa.om',
    title: 'Head of Department (HR)', department: 'Finance', level: 'Manager',
    is_c_level: 0, is_head_of_department: 1, can_direct_approve: 0,
  },
  {
    id: 'rayan-rawahi', parent_id: 'huria', order: 1,
    full_name: 'Rayan Al Rawahi', email: 'rayan.rawahi@ankaa.om',
    title: 'HR Executive', department: 'Finance', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },

  // ── HR & Administration ───────────────────────────────────────────────────
  {
    id: 'hr-head', parent_id: 'ceo', order: 4,
    full_name: 'Khamis Al Hashmi', email: 'khamis.hashmi@ankaa.om',
    title: 'HR & Admin Manager', department: 'HR & Administration', level: 'C-Level',
    is_c_level: 1, is_head_of_department: 1, can_direct_approve: 1,
  },
  {
    id: 'sultan', parent_id: 'hr-head', order: 1,
    full_name: 'Sultan Al Balushi', email: 'sultan.balushi@ankaa.om',
    title: 'Head of Department (Administration)', department: 'HR & Administration', level: 'Manager',
    is_c_level: 0, is_head_of_department: 1, can_direct_approve: 0,
  },
  {
    id: 'hilal', parent_id: 'sultan', order: 1,
    full_name: 'Hilal Al Riyami', email: 'hilal.riyami@ankaa.om',
    title: 'Public Relations Executive', department: 'HR & Administration', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'reynaldo', parent_id: 'hr-head', order: 2,
    full_name: 'Reynaldo Marasigan', email: 'reynaldo.marasigan@ankaa.om',
    title: 'Supervisor (TAQSI)', department: 'HR & Administration', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'ahmed-nasser', parent_id: 'hr-head', order: 3,
    full_name: 'Ahmed Nasser', email: 'ahmed.nasser@ankaa.om',
    title: 'IT Executive', department: 'HR & Administration', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'jamal', parent_id: 'hr-head', order: 4,
    full_name: 'Jamal Al Raisi', email: 'jamal.raisi@ankaa.om',
    title: 'Cybersecurity Expert', department: 'HR & Administration', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },

  // ── Operations ────────────────────────────────────────────────────────────
  {
    id: 'ops-head', parent_id: 'ceo', order: 5,
    full_name: 'Ali Al Ghassani', email: 'ali.ghassani@ankaa.om',
    title: 'Acting COO', department: 'Operations', level: 'C-Level',
    is_c_level: 1, is_head_of_department: 1, can_direct_approve: 1,
  },
  {
    id: 'ghaydah', parent_id: 'ops-head', order: 1,
    full_name: 'Ghaydah Al Jabri', email: 'ghaydah.jabri@ankaa.om',
    title: 'Head of Space Department', department: 'Operations', level: 'Manager',
    is_c_level: 0, is_head_of_department: 1, can_direct_approve: 0,
  },
  {
    id: 'ops-aviation-head', parent_id: 'ops-head', order: 2,
    full_name: 'Imad Al Zadjali', email: 'imad.zadjali@ankaa.om',
    title: 'Head of Aviation Department', department: 'Operations', level: 'Manager',
    is_c_level: 0, is_head_of_department: 1, can_direct_approve: 0,
  },
  {
    id: 'darwish', parent_id: 'ops-aviation-head', order: 1,
    full_name: 'Darwish Al Balushi', email: 'darwish.balushi@ankaa.om',
    title: 'Operations Manager (Aviation)', department: 'Operations', level: 'Manager',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'drone-head', parent_id: 'ops-aviation-head', order: 2,
    full_name: 'Yousuf Al Riyami', email: 'yousuf.riyami@ankaa.om',
    title: 'Head of Department (Drone)', department: 'Operations', level: 'Manager',
    is_c_level: 0, is_head_of_department: 1, can_direct_approve: 0,
  },
  {
    id: 'drone-tech-lead', parent_id: 'drone-head', order: 1,
    full_name: 'Ahmed Abdul H. Al Mandhiri', email: 'ahmed.mandhiri@ankaa.om',
    title: 'Lead Technical Team', department: 'Operations', level: 'Lead',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'mansury', parent_id: 'drone-tech-lead', order: 1,
    full_name: 'Mansury Yahya', email: 'mansury.yahya@ankaa.om',
    title: 'Drone Pilot / Tech', department: 'Operations', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'abdulmajeed', parent_id: 'drone-tech-lead', order: 2,
    full_name: 'Abdulmajeed Al Balushi', email: 'abdulmajeed.balushi@ankaa.om',
    title: 'Drone Pilot / Tech', department: 'Operations', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'drone-pilot-lead', parent_id: 'drone-head', order: 2,
    full_name: 'Maadh Juma Al Balushi', email: 'maadh.balushi@ankaa.om',
    title: 'Lead Drone Pilot Team', department: 'Operations', level: 'Lead',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'hussain-harooni', parent_id: 'drone-pilot-lead', order: 1,
    full_name: 'Al Hussain Ali Al Harooni', email: 'hussain.harooni@ankaa.om',
    title: 'Drone Pilot', department: 'Operations', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'abdulmalik-juma', parent_id: 'drone-pilot-lead', order: 2,
    full_name: 'Abdul Malik Juma Al Balushi', email: 'abdulmalik.juma@ankaa.om',
    title: 'Drone Pilot', department: 'Operations', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'abdulmalik-abd', parent_id: 'drone-pilot-lead', order: 3,
    full_name: 'Abdul Malik Abdullah Al Balushi', email: 'abdulmalik.abd@ankaa.om',
    title: 'Drone Pilot', department: 'Operations', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'mohammed-kindi', parent_id: 'drone-pilot-lead', order: 4,
    full_name: 'Mohammed Al Kindi', email: 'mohammed.kindi@ankaa.om',
    title: 'Drone Pilot', department: 'Operations', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'hisham', parent_id: 'drone-pilot-lead', order: 5,
    full_name: 'Hisham Al Musheifri', email: 'hisham.musheifri@ankaa.om',
    title: 'Drone Pilot', department: 'Operations', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'hamed-wuhaibi', parent_id: 'drone-pilot-lead', order: 6,
    full_name: 'Hamed Al Wuhaibi', email: 'hamed.wuhaibi@ankaa.om',
    title: 'Drone Pilot', department: 'Operations', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'yahya-hajri', parent_id: 'drone-pilot-lead', order: 7,
    full_name: 'Yahya Al Hajri', email: 'yahya.hajri@ankaa.om',
    title: 'Drone Pilot', department: 'Operations', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'albaraa', parent_id: 'drone-pilot-lead', order: 8,
    full_name: 'Al Baraa Al Yarubi', email: 'albaraa.yarubi@ankaa.om',
    title: 'Drone Pilot', department: 'Operations', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },

  // ── Technology ────────────────────────────────────────────────────────────
  {
    id: 'tech-head', parent_id: 'ceo', order: 6,
    full_name: 'Rami Katat', email: 'rami.katat@ankaa.om',
    title: 'CTO', department: 'Technology', level: 'C-Level',
    is_c_level: 1, is_head_of_department: 1, can_direct_approve: 1,
  },
  {
    id: 'it-dept-head', parent_id: 'tech-head', order: 1,
    full_name: 'Omar Al Ghaithy', email: 'omar.ghaithy@ankaa.om',
    title: 'Head of IT Department', department: 'Technology', level: 'Manager',
    is_c_level: 0, is_head_of_department: 1, can_direct_approve: 0,
  },
  {
    id: 'palwasha', parent_id: 'it-dept-head', order: 1,
    full_name: 'Palwasha Asif', email: 'palwasha.asif@ankaa.om',
    title: 'Software Developer', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'khalid-masoudi', parent_id: 'it-dept-head', order: 2,
    full_name: 'Khalid Al Masoudi', email: 'khalid.masoudi@ankaa.om',
    title: 'Software Developer', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'ibrahim-masoudi', parent_id: 'it-dept-head', order: 3,
    full_name: 'Ibrahim Al Masoudi', email: 'ibrahim.masoudi@ankaa.om',
    title: 'Software Developer', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'khalid-shibli', parent_id: 'it-dept-head', order: 4,
    full_name: 'Khalid Al Shibli', email: 'khalid.shibli@ankaa.om',
    title: 'Software Developer', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'furwa', parent_id: 'it-dept-head', order: 5,
    full_name: 'Furwa Asim', email: 'furwa.asim@ankaa.om',
    title: 'Software Developer (DevOps)', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'imthiyaz', parent_id: 'it-dept-head', order: 6,
    full_name: 'Mohammad Imthiyaz', email: 'mohammad.imthiyaz@ankaa.om',
    title: 'Software Developer (DevOps)', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'ashraf', parent_id: 'it-dept-head', order: 7,
    full_name: 'Mohammed Ashraf Ali', email: 'mohammed.ali@ankaa.om',
    title: 'Trainee – IT Department', department: 'Technology', level: 'Trainee',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'dima', parent_id: 'it-dept-head', order: 8,
    full_name: 'Dima Khalaf Al Maawali', email: 'dima.maawali@ankaa.om',
    title: 'Business Analyst', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'it-team-lead', parent_id: 'tech-head', order: 2,
    full_name: 'Ahmed Al Kharusi', email: 'ahmed.kharusi@ankaa.om',
    title: 'Team Lead (IT)', department: 'Technology', level: 'Lead',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'almaskari', parent_id: 'it-team-lead', order: 1,
    full_name: 'Mohammed Almaskari', email: 'mohammed.almaskari@ankaa.om',
    title: 'Senior Software Developer', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'maryam', parent_id: 'it-team-lead', order: 2,
    full_name: 'Maryam Alkalbani', email: 'maryam.alkalbani@ankaa.om',
    title: 'Quality Assurance Officer', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'rahma', parent_id: 'it-team-lead', order: 3,
    full_name: 'Rahma Al Jahwari', email: 'rahma.jahwari@ankaa.om',
    title: 'Software Developer', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'maram', parent_id: 'it-team-lead', order: 4,
    full_name: 'Maram Al Nualmi', email: 'maram.nualmi@ankaa.om',
    title: 'Software Developer', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'mazin-ambouri', parent_id: 'it-team-lead', order: 5,
    full_name: 'Mazin Al Ambouri', email: 'mazin.ambouri@ankaa.om',
    title: 'Software Developer', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'rayan-hashmi', parent_id: 'it-team-lead', order: 6,
    full_name: 'Rayan Al Hashmi', email: 'rayan.hashmi@ankaa.om',
    title: 'Software Developer', department: 'Technology', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },

  // ── Research & Development ────────────────────────────────────────────────
  {
    id: 'rd-head', parent_id: 'ceo', order: 7,
    full_name: 'Jasim Al Balushi', email: 'jasim.balushi@ankaa.om',
    title: 'CRDO', department: 'Research & Development', level: 'Manager',
    is_c_level: 1, is_head_of_department: 1, can_direct_approve: 0,
  },
  {
    id: 'mazin-toubi', parent_id: 'rd-head', order: 1,
    full_name: 'Mazin Al Toubi', email: 'mazin.toubi@ankaa.om',
    title: 'Technical Projects Developer', department: 'Research & Development', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
  {
    id: 'mohammed-bader', parent_id: 'mazin-toubi', order: 1,
    full_name: 'Mohammed Bader', email: 'mohammed.bader@ankaa.om',
    title: 'R&D Drone Pilot', department: 'Research & Development', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },

  // ── Tenders & Contracts ───────────────────────────────────────────────────
  {
    id: 'tender-head', parent_id: 'ceo', order: 8,
    full_name: 'Maathir Al Wahaibi', email: 'maathir.wahaibi@ankaa.om',
    title: 'Tender & ICV Manager', department: 'Tenders & Contracts', level: 'Manager',
    is_c_level: 0, is_head_of_department: 1, can_direct_approve: 0,
  },
  {
    id: 'daniya', parent_id: 'tender-head', order: 1,
    full_name: 'Daniya Al Shabibi', email: 'daniya.shabibi@ankaa.om',
    title: 'Sales Executive', department: 'Tenders & Contracts', level: 'Staff',
    is_c_level: 0, is_head_of_department: 0, can_direct_approve: 0,
  },
]

async function main() {
  console.log('\nAnkaa ERP — Seed Org Chart')
  console.log('─'.repeat(50))

  const db = new PGlite(DATA_DIR)
  console.log('Database path:', DATA_DIR)

  // Add columns if they don't exist (safe for re-runs)
  const alterStmts = [
    `ALTER TABLE org_chart ADD COLUMN IF NOT EXISTS full_name TEXT`,
    `ALTER TABLE org_chart ADD COLUMN IF NOT EXISTS email TEXT`,
    `ALTER TABLE org_chart ADD COLUMN IF NOT EXISTS level TEXT`,
  ]
  for (const stmt of alterStmts) {
    try { await db.query(stmt) } catch { /* already exists */ }
  }

  // Clear existing org chart data
  await db.query(`DELETE FROM org_chart`)
  console.log('  ✓ Cleared existing org chart')

  let inserted = 0
  for (const n of ORG_NODES) {
    try {
      await db.query(
        `INSERT INTO org_chart
           (id, title, user_id, parent_id, position, color, children_layout,
            "order", department, reporting_to, is_c_level, can_direct_approve,
            is_head_of_department, full_name, email, level)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title, parent_id = EXCLUDED.parent_id,
           department = EXCLUDED.department, "order" = EXCLUDED."order",
           is_c_level = EXCLUDED.is_c_level, can_direct_approve = EXCLUDED.can_direct_approve,
           is_head_of_department = EXCLUDED.is_head_of_department,
           full_name = EXCLUDED.full_name, email = EXCLUDED.email, level = EXCLUDED.level`,
        [
          n.id, n.title, null, n.parent_id,
          'center', null, null,
          n.order, n.department, null,
          n.is_c_level, n.can_direct_approve, n.is_head_of_department,
          n.full_name, n.email, n.level,
        ]
      )
      inserted++
    } catch (e) {
      console.warn(`  ⚠ Failed to insert ${n.id}:`, e.message)
    }
  }

  console.log(`  ✓ Inserted ${inserted} / ${ORG_NODES.length} org chart nodes`)
  console.log('\nDone! Run the ERP app to see the updated org chart.\n')
  process.exit(0)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
