export const MOCK_BANK_ACCOUNTS = [
  { id: 'ba001', scheme_name: 'UNION Large Cap Fund',          bank_name: 'HDFC Bank',          account_no: '001122334455', ifsc: 'HDFC0001234', branch: 'Andheri East, Mumbai',    account_type: 'Current' },
  { id: 'ba002', scheme_name: 'UNION Flexi Cap Fund',          bank_name: 'ICICI Bank',         account_no: '112233445566', ifsc: 'ICIC0002345', branch: 'Bandra West, Mumbai',     account_type: 'Current' },
  { id: 'ba003', scheme_name: 'UNION Balanced Advantage Fund', bank_name: 'Axis Bank',          account_no: '223344556677', ifsc: 'UTIB0003456', branch: 'Powai, Mumbai',           account_type: 'Current' },
  { id: 'ba004', scheme_name: 'UNION Tax Saver Fund (ELSS)',   bank_name: 'State Bank of India',account_no: '334455667788', ifsc: 'SBIN0004567', branch: 'Fort, Mumbai',            account_type: 'Current' },
  { id: 'ba005', scheme_name: 'UNION Liquid Fund',             bank_name: 'Kotak Mahindra Bank',account_no: '445566778899', ifsc: 'KKBK0005678', branch: 'Nariman Point, Mumbai',  account_type: 'Current' },
]

// Raw daily entries per account: [date, [[description, ref_no, credit|null, debit|null], ...]]
const RAW = {
  ba001: [
    ['2026-06-01', [
      ['NEFT/RAJESH KUMAR SHARMA/SUBSCRIPTION',  'NEFT260601A001', 50000,  null],
      ['RTGS/DEEPA KRISHNASWAMY/SUBSCRIPTION',   'RTGS260601B001', 150000, null],
      ['NEFT/PRIYA NAIR/SUBSCRIPTION',           'NEFT260601A002', 25000,  null],
    ]],
    ['2026-06-02', [
      ['RTGS/ARUN VENKATARAMAN/SUBSCRIPTION',    'RTGS260602B001', 100000, null],
      ['NEFT/SUNITA MEHTA/SUBSCRIPTION',         'NEFT260602A001', 75000,  null],
    ]],
    ['2026-06-03', [
      ['NEFT/ANAND IYER/SUBSCRIPTION',           'NEFT260603A001', 40000,  null],
      ['BANK CHARGES/MAINTENANCE FEE',           'CHG260603A001',  null,   354 ],
    ]],
    ['2026-06-04', [
      ['RTGS/LAKSHMI DEVI/SUBSCRIPTION',         'RTGS260604B001', 200000, null],
      ['NEFT/MOHD FAROOQ/SUBSCRIPTION',          'NEFT260604A001', 30000,  null],
    ]],
    ['2026-06-05', [
      ['NEFT/KAVITHA RAJAN/SUBSCRIPTION',        'NEFT260605A001', 60000,  null],
      ['NEFT/SURESH KUMAR/SUBSCRIPTION',         'NEFT260605A002', 45000,  null],
    ]],
    ['2026-06-06', [
      ['RTGS/MEENA PILLAI/SUBSCRIPTION',         'RTGS260606B001', 80000,  null],
    ]],
    ['2026-06-07', [
      ['NEFT/RAJESH KUMAR SHARMA/SUBSCRIPTION',  'NEFT260607A001', 50000,  null],
      ['NEFT/DEEPA KRISHNASWAMY/SUBSCRIPTION',   'NEFT260607A002', 150000, null],
    ]],
    ['2026-06-08', [
      ['RTGS/ARUN VENKATARAMAN/SUBSCRIPTION',    'RTGS260608B001', 100000, null],
      ['BANK CHARGES/GST ON FEES',               'CHG260608A001',  null,   63.72],
      ['NEFT/PRIYA NAIR/SUBSCRIPTION',           'NEFT260608A001', 25000,  null],
    ]],
  ],
  ba002: [
    ['2026-06-01', [
      ['NEFT/RAVI SHANKAR/SUBSCRIPTION',         'NEFT260601C001', 35000,  null],
      ['RTGS/MEENA PILLAI/SUBSCRIPTION',         'RTGS260601D001', 90000,  null],
    ]],
    ['2026-06-02', [
      ['NEFT/SURESH KUMAR/SUBSCRIPTION',         'NEFT260602C001', 20000,  null],
      ['BANK CHARGES/MAINTENANCE FEE',           'CHG260602C001',  null,   354 ],
    ]],
    ['2026-06-03', [
      ['RTGS/KAVITHA RAJAN/SUBSCRIPTION',        'RTGS260603D001', 120000, null],
      ['NEFT/ANAND IYER/SUBSCRIPTION',           'NEFT260603C001', 55000,  null],
    ]],
    ['2026-06-04', [
      ['NEFT/PRIYA NAIR/SUBSCRIPTION',           'NEFT260604C001', 25000,  null],
    ]],
    ['2026-06-05', [
      ['RTGS/SUNITA MEHTA/SUBSCRIPTION',         'RTGS260605D001', 75000,  null],
      ['NEFT/RAVI SHANKAR/SUBSCRIPTION',         'NEFT260605C001', 40000,  null],
    ]],
    ['2026-06-06', [
      ['NEFT/LAKSHMI DEVI/SUBSCRIPTION',         'NEFT260606C001', 60000,  null],
      ['BANK CHARGES/GST ON FEES',               'CHG260606C001',  null,   63.72],
    ]],
    ['2026-06-07', [
      ['RTGS/MEENA PILLAI/SUBSCRIPTION',         'RTGS260607D001', 90000,  null],
      ['NEFT/SURESH KUMAR/SUBSCRIPTION',         'NEFT260607C001', 15000,  null],
    ]],
    ['2026-06-08', [
      ['NEFT/KAVITHA RAJAN/SUBSCRIPTION',        'NEFT260608C001', 45000,  null],
    ]],
  ],
  ba003: [
    ['2026-06-01', [
      ['RTGS/DEEPA KRISHNASWAMY/SUBSCRIPTION',   'RTGS260601E001', 150000, null],
      ['NEFT/SUNITA MEHTA/SUBSCRIPTION',         'NEFT260601F001', 75000,  null],
    ]],
    ['2026-06-02', [
      ['NEFT/RAVI SHANKAR/SUBSCRIPTION',         'NEFT260602F001', 30000,  null],
      ['BANK CHARGES/MAINTENANCE FEE',           'CHG260602E001',  null,   354 ],
    ]],
    ['2026-06-03', [
      ['RTGS/MOHD FAROOQ/SUBSCRIPTION',          'RTGS260603E001', 200000, null],
    ]],
    ['2026-06-04', [
      ['NEFT/KAVITHA RAJAN/SUBSCRIPTION',        'NEFT260604F001', 50000,  null],
      ['NEFT/ANAND IYER/SUBSCRIPTION',           'NEFT260604F002', 35000,  null],
    ]],
    ['2026-06-05', [
      ['RTGS/PRIYA NAIR/SUBSCRIPTION',           'RTGS260605E001', 60000,  null],
      ['BANK CHARGES/GST ON FEES',               'CHG260605E001',  null,   63.72],
    ]],
    ['2026-06-06', [
      ['NEFT/SURESH KUMAR/SUBSCRIPTION',         'NEFT260606F001', 45000,  null],
      ['RTGS/RAJESH KUMAR SHARMA/SUBSCRIPTION',  'RTGS260606E001', 50000,  null],
    ]],
    ['2026-06-07', [
      ['NEFT/DEEPA KRISHNASWAMY/SUBSCRIPTION',   'NEFT260607F001', 150000, null],
    ]],
    ['2026-06-08', [
      ['RTGS/SUNITA MEHTA/SUBSCRIPTION',         'RTGS260608E001', 75000,  null],
      ['NEFT/RAVI SHANKAR/SUBSCRIPTION',         'NEFT260608F001', 30000,  null],
    ]],
  ],
  ba004: [
    ['2026-06-01', [
      ['NEFT/ARUN VENKATARAMAN/SUBSCRIPTION',    'NEFT260601G001', 100000, null],
    ]],
    ['2026-06-02', [
      ['RTGS/LAKSHMI DEVI/SUBSCRIPTION',         'RTGS260602H001', 80000,  null],
      ['NEFT/MEENA PILLAI/SUBSCRIPTION',         'NEFT260602G001', 40000,  null],
    ]],
    ['2026-06-03', [
      ['BANK CHARGES/MAINTENANCE FEE',           'CHG260603G001',  null,   354 ],
      ['NEFT/ANAND IYER/SUBSCRIPTION',           'NEFT260603G001', 30000,  null],
    ]],
    ['2026-06-04', [
      ['RTGS/RAJESH KUMAR SHARMA/SUBSCRIPTION',  'RTGS260604H001', 50000,  null],
      ['NEFT/SURESH KUMAR/SUBSCRIPTION',         'NEFT260604G001', 25000,  null],
    ]],
    ['2026-06-05', [
      ['NEFT/KAVITHA RAJAN/SUBSCRIPTION',        'NEFT260605G001', 60000,  null],
    ]],
    ['2026-06-06', [
      ['RTGS/PRIYA NAIR/SUBSCRIPTION',           'RTGS260606H001', 35000,  null],
      ['BANK CHARGES/GST ON FEES',               'CHG260606G001',  null,   63.72],
    ]],
    ['2026-06-07', [
      ['NEFT/ARUN VENKATARAMAN/SUBSCRIPTION',    'NEFT260607G001', 100000, null],
      ['NEFT/LAKSHMI DEVI/SUBSCRIPTION',         'NEFT260607G002', 80000,  null],
    ]],
    ['2026-06-08', [
      ['RTGS/MOHD FAROOQ/SUBSCRIPTION',          'RTGS260608H001', 200000, null],
    ]],
  ],
  ba005: [
    ['2026-06-01', [
      ['RTGS/MOHD FAROOQ/SUBSCRIPTION',          'RTGS260601I001', 200000, null],
      ['NEFT/KAVITHA RAJAN/SUBSCRIPTION',        'NEFT260601J001', 45000,  null],
    ]],
    ['2026-06-02', [
      ['NEFT/SURESH KUMAR/SUBSCRIPTION',         'NEFT260602J001', 30000,  null],
      ['RTGS/ANAND IYER/SUBSCRIPTION',           'RTGS260602I001', 70000,  null],
    ]],
    ['2026-06-03', [
      ['BANK CHARGES/MAINTENANCE FEE',           'CHG260603I001',  null,   354 ],
      ['NEFT/LAKSHMI DEVI/SUBSCRIPTION',         'NEFT260603J001', 55000,  null],
    ]],
    ['2026-06-04', [
      ['RTGS/MEENA PILLAI/SUBSCRIPTION',         'RTGS260604I001', 90000,  null],
    ]],
    ['2026-06-05', [
      ['NEFT/RAVI SHANKAR/SUBSCRIPTION',         'NEFT260605J001', 40000,  null],
      ['RTGS/RAJESH KUMAR SHARMA/SUBSCRIPTION',  'RTGS260605I001', 50000,  null],
      ['BANK CHARGES/GST ON FEES',               'CHG260605I001',  null,   63.72],
    ]],
    ['2026-06-06', [
      ['NEFT/DEEPA KRISHNASWAMY/SUBSCRIPTION',   'NEFT260606J001', 150000, null],
    ]],
    ['2026-06-07', [
      ['RTGS/SUNITA MEHTA/SUBSCRIPTION',         'RTGS260607I001', 75000,  null],
      ['NEFT/PRIYA NAIR/SUBSCRIPTION',           'NEFT260607J001', 25000,  null],
    ]],
    ['2026-06-08', [
      ['NEFT/MOHD FAROOQ/SUBSCRIPTION',          'NEFT260608J001', 200000, null],
      ['RTGS/KAVITHA RAJAN/SUBSCRIPTION',        'RTGS260608I001', 45000,  null],
    ]],
  ],
}

const START_BALANCES = { ba001: 1250000, ba002: 980000, ba003: 1540000, ba004: 720000, ba005: 2100000 }

function buildStatements(accountId, rawDays) {
  const stmts = []
  let balance = START_BALANCES[accountId]
  rawDays.forEach(([date, rawEntries]) => {
    const entries = rawEntries.map(([desc, ref, credit, debit], idx) => {
      balance = Math.round((balance + (credit || 0) - (debit || 0)) * 100) / 100
      return {
        id:          `e-${accountId}-${date.replace(/-/g, '')}-${idx}`,
        date,
        description: desc,
        ref_no:      ref,
        credit:      credit || null,
        debit:       debit  || null,
        balance,
        is_matched:  credit ? idx % 3 !== 2 : false,
      }
    })
    stmts.push({
      id:            `stmt-${accountId}-${date.replace(/-/g, '')}`,
      account_id:    accountId,
      from_date:     date,
      to_date:       date,
      uploaded_at:   `${date}T18:30:00Z`,
      uploaded_by:   'System',
      total_credits: entries.reduce((s, e) => s + (e.credit || 0), 0),
      total_debits:  entries.reduce((s, e) => s + (e.debit  || 0), 0),
      entries,
    })
  })
  return stmts.reverse()
}

export const MOCK_STATEMENTS_BY_ACCOUNT = Object.fromEntries(
  Object.entries(RAW).map(([id, days]) => [id, buildStatements(id, days)])
)
