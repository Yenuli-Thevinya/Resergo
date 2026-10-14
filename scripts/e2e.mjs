/**
 * End-to-end API test for Resergo.
 *
 *   1. npm run db:seed        (fresh demo data)
 *   2. npm run dev            (or: npm run build && npm start)
 *   3. npm run test:e2e
 *
 * Talks to the running app over HTTP exactly like a browser would (cookies and all).
 * It cleans up after itself (cancels the reservations it created, removes its test records).
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Asia/Colombo'
const ADMIN_PW = 'Admin@12345'
const USER_PW = 'User@12345'

const dayStr = (offset) => new Date(Date.now() + offset * 864e5).toLocaleDateString('en-CA', { timeZone: TZ })
const TEST_DAY = dayStr(20) // far in the future so it never collides with seed data
const PAST_DAY = dayStr(-3)

let passed = 0
let failed = 0
const created = [] // { id, who } reservations to cancel at the end

function client(name) {
  let cookie = ''
  const call = async (method, path, body, headers = {}) => {
    const res = await fetch(BASE + path, {
      method,
      redirect: 'manual',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const set = res.headers.getSetCookie?.() ?? []
    for (const c of set) {
      const pair = c.split(';')[0]
      if (pair.startsWith('resergo_session=')) cookie = pair.endsWith('=') ? '' : pair
    }
    let json = null
    try { json = await res.json() } catch {}
    return { status: res.status, data: json?.data, error: json?.error, headers: res.headers, raw: json, setCookie: set }
  }
  return { name, call, get: (p) => call('GET', p), post: (p, b) => call('POST', p, b), patch: (p, b) => call('PATCH', p, b), del: (p) => call('DELETE', p) }
}

function check(label, condition, extra = '') {
  if (condition) { passed++; console.log(`  ✔ ${label}`) }
  else { failed++; console.log(`  ✘ ${label} ${extra}`) }
}
const section = (t) => console.log(`\n${t}`)

async function login(who, email, password) {
  const c = client(who)
  const r = await c.post('/api/auth/login', { email, password })
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status} ${JSON.stringify(r.error)}`)
  return c
}

async function book(c, resourceId, start, end, purpose = 'E2E test', date = TEST_DAY) {
  const r = await c.post('/api/reservations', { resourceId, date, startTime: start, endTime: end, purpose })
  if (r.status === 201) created.push({ id: r.data.id, c })
  return r
}

async function main() {
  const anon = client('anon')
  section('0. Authentication basics')
  check('unauthenticated API call → 401', (await anon.get('/api/resources')).status === 401)
  const page = await fetch(BASE + '/resources', { redirect: 'manual' })
  check('unauthenticated page visit redirects to /login', page.status >= 300 && page.status < 400 && (page.headers.get('location') || '').includes('/login'))
  const bad = await anon.post('/api/auth/login', { email: 'nimal@company.com', password: 'wrong-password' })
  check('wrong password → 401 "Invalid email or password."', bad.status === 401 && bad.error?.message === 'Invalid email or password.')

  const nimal = await login('nimal', 'nimal@company.com', USER_PW)
  const sarah = await login('sarah', 'sarah@company.com', USER_PW)
  const dilan = await login('dilan', 'dilan@company.com', ADMIN_PW)

  const loginRes = await client('x').post('/api/auth/login', { email: 'nimal@company.com', password: USER_PW })
  const cookieHeader = loginRes.setCookie.join(' ').toLowerCase()
  check('session cookie is HttpOnly + SameSite', cookieHeader.includes('httponly') && cookieHeader.includes('samesite=lax'))
  check('login response never contains a password hash', !JSON.stringify(loginRes.raw).toLowerCase().includes('hash'))

  section('TEST 1 — Login & dashboard from the database')
  const me = await nimal.get('/api/auth/me')
  check('Nimal is signed in (USER, IT Department)', me.data?.user?.role === 'USER' && me.data.user.departmentName === 'IT Department')
  const dash = await nimal.get('/api/dashboard')
  check('dashboard returns live counts', typeof dash.data?.availableNow === 'number' && typeof dash.data?.todaysReservations === 'number')

  const resources = (await nimal.get('/api/resources')).data
  const roomA = resources.find((r) => r.name === 'Meeting Room A')
  check('resources come from PostgreSQL (Meeting Room A found)', !!roomA)
  const upcomingBefore = dash.data.yourUpcoming

  section('TEST 2 — Create reservation')
  const r1 = await book(nimal, roomA.id, '10:00', '11:00', 'Development meeting')
  check('Nimal reserves Meeting Room A → 201', r1.status === 201, JSON.stringify(r1.error))
  check('booked-by & department come from the session (not the request)', r1.data?.bookedBy === 'Nimal Perera' && r1.data?.department === 'IT Department')
  const spoof = await book(nimal, roomA.id, '13:00', '14:00', 'spoof attempt')
  const spoofBody = await nimal.call('POST', '/api/reservations', { resourceId: roomA.id, date: TEST_DAY, startTime: '14:00', endTime: '14:30', purpose: 'spoof', userId: 3, role: 'ADMIN', department: 'Finance' })
  if (spoofBody.status === 201) created.push({ id: spoofBody.data.id, c: nimal })
  check('a spoofed userId/role in the body is ignored', spoofBody.status === 201 && spoofBody.data.bookedBy === 'Nimal Perera')
  const list = (await nimal.get(`/api/reservations?date=${TEST_DAY}`)).data
  check('appears in the reservation list', list.some((r) => r.id === r1.data.id))
  const cal = (await nimal.get(`/api/calendar?date=${TEST_DAY}`)).data
  const calRow = cal.rows.find((row) => row.resource.id === roomA.id)
  check('appears on the calendar', calRow.reservations.some((r) => r.id === r1.data.id))
  const detail = (await nimal.get(`/api/resources/${roomA.id}`)).data
  check('appears in the resource details', detail.upcoming.some((r) => r.id === r1.data.id))
  const dash2 = (await nimal.get('/api/dashboard')).data
  check('"your upcoming" count increased', dash2.yourUpcoming >= upcomingBefore + 3, `${upcomingBefore} → ${dash2.yourUpcoming}`)

  section('TEST 3 — Booking conflicts (server-side)')
  for (const [s, e] of [['09:30', '10:30'], ['10:00', '11:00'], ['10:30', '11:30'], ['09:00', '12:00']]) {
    const r = await book(sarah, roomA.id, s, e)
    check(`reject ${s}–${e}`, r.status === 409 && r.error?.code === 'RESERVATION_CONFLICT')
  }
  const c0 = (await book(sarah, roomA.id, '10:30', '11:30')).error?.details?.conflict
  check('conflict response names who holds it', c0?.bookedBy === 'Nimal Perera' && c0?.department === 'IT Department' && !!c0?.startTime)
  const adj1 = await book(sarah, roomA.id, '09:00', '10:00', 'adjacent before')
  const adj2 = await book(sarah, roomA.id, '11:00', '12:00', 'adjacent after')
  check('allow 09:00–10:00 (touching, not overlapping)', adj1.status === 201, JSON.stringify(adj1.error))
  check('allow 11:00–12:00 (touching, not overlapping)', adj2.status === 201, JSON.stringify(adj2.error))

  section('Validation')
  check('end before start rejected', (await book(sarah, roomA.id, '12:00', '11:00')).error?.message === 'End time must be later than start time.')
  check('equal start/end rejected', (await book(sarah, roomA.id, '12:00', '12:00')).status === 400)
  check('empty purpose rejected', (await book(sarah, roomA.id, '12:00', '13:00', '   ')).status === 400)
  check('booking in the past rejected', (await book(sarah, roomA.id, '10:00', '11:00', 'past', PAST_DAY)).status === 400)
  check('invalid date rejected', (await book(sarah, roomA.id, '10:00', '11:00', 'x', '2026-02-31')).status === 400)
  check('outside working hours rejected', (await book(sarah, roomA.id, '16:00', '17:00')).status === 400)
  const trainingRoom = resources.find((r) => r.name === 'Training Room C')
  const maint = await book(sarah, trainingRoom.id, '10:00', '11:00')
  check('maintenance resource cannot be booked', maint.status === 400 && /unavailable/i.test(maint.error?.message))

  section('TEST 4 — Everyone can view who booked')
  const seen = await sarah.get(`/api/reservations/${r1.data.id}`)
  check('Sarah sees Nimal Perera / IT Department / purpose / time', seen.data?.bookedBy === 'Nimal Perera' && seen.data?.department === 'IT Department' && seen.data?.purpose === 'Development meeting')
  check('…but gets no edit/cancel rights', seen.data?.isMine === false && seen.data?.canEdit === false && seen.data?.canCancel === false)

  section('TEST 5 — Security: ownership enforced on the server')
  const hack = { resourceId: roomA.id, date: TEST_DAY, startTime: '10:00', endTime: '11:00', purpose: 'hijacked' }
  const e1 = await sarah.patch(`/api/reservations/${r1.data.id}`, hack)
  check("Sarah PATCH Nimal's reservation → 403", e1.status === 403, `got ${e1.status}`)
  const e2 = await sarah.del(`/api/reservations/${r1.data.id}`)
  check("Sarah DELETE Nimal's reservation → 403", e2.status === 403, `got ${e2.status}`)
  check('reservation unchanged', (await nimal.get(`/api/reservations/${r1.data.id}`)).data.purpose === 'Development meeting')

  section('TEST 10 — Admin gets no special reservation rights')
  const adminView = await dilan.get(`/api/reservations/${r1.data.id}`)
  check('Dilan (ADMIN) can view it', adminView.status === 200 && adminView.data.bookedBy === 'Nimal Perera')
  check('…without edit/cancel flags', adminView.data.canEdit === false && adminView.data.canCancel === false)
  check("Dilan PATCH Nimal's reservation → 403", (await dilan.patch(`/api/reservations/${r1.data.id}`, hack)).status === 403)
  check("Dilan DELETE Nimal's reservation → 403", (await dilan.del(`/api/reservations/${r1.data.id}`)).status === 403)

  section('TEST 6 — Owner update')
  const upd = await nimal.patch(`/api/reservations/${r1.data.id}`, { resourceId: roomA.id, date: TEST_DAY, startTime: '10:00', endTime: '10:30', purpose: 'Shorter meeting' })
  check('owner can update (own time is not a conflict with itself)', upd.status === 200 && upd.data.purpose === 'Shorter meeting', JSON.stringify(upd.error))
  const updConflict = await nimal.patch(`/api/reservations/${r1.data.id}`, { resourceId: roomA.id, date: TEST_DAY, startTime: '10:00', endTime: '11:30', purpose: 'Too long' })
  check('update re-checks conflicts (runs into Sarah 11:00)', updConflict.status === 409)
  const calAfter = (await nimal.get(`/api/calendar?date=${TEST_DAY}`)).data.rows.find((r) => r.resource.id === roomA.id).reservations.find((r) => r.id === r1.data.id)
  check('calendar reflects the edit', calAfter?.purpose === 'Shorter meeting' && new Date(calAfter.endTime) - new Date(calAfter.startTime) === 30 * 60000)

  section('TEST 7 — Owner cancel (soft)')
  const cancel = await nimal.del(`/api/reservations/${r1.data.id}`)
  check('owner cancels → status CANCELLED', cancel.status === 200 && cancel.data.status === 'CANCELLED')
  const calCancel = (await nimal.get(`/api/calendar?date=${TEST_DAY}`)).data.rows.find((r) => r.resource.id === roomA.id)
  check('calendar slot is free again', !calCancel.reservations.some((r) => r.id === r1.data.id))
  const hist = (await nimal.get('/api/reservations?scope=mine')).data
  check('cancelled booking stays in history', hist.some((r) => r.id === r1.data.id && r.status === 'CANCELLED'))
  const rebook = await book(sarah, roomA.id, '10:00', '10:30', 'takes the freed slot')
  check('freed slot can be booked by someone else', rebook.status === 201, JSON.stringify(rebook.error))
  check('cannot edit a cancelled reservation', (await nimal.patch(`/api/reservations/${r1.data.id}`, hack)).status === 400)
  check('cannot cancel twice', (await nimal.del(`/api/reservations/${r1.data.id}`)).status === 400)

  section('Race condition — 12 simultaneous requests for the same slot')
  const boardroom = resources.find((r) => r.name === 'Boardroom')
  const racers = await Promise.all(Array.from({ length: 12 }, (_, i) => book(i % 2 ? nimal : sarah, boardroom.id, '12:00', '13:00', `race ${i}`)))
  const wins = racers.filter((r) => r.status === 201).length
  const losses = racers.filter((r) => r.status === 409).length
  check(`exactly 1 wins, 11 rejected (wins=${wins}, conflicts=${losses})`, wins === 1 && losses === 11)

  section('TEST 8 — Resource management is admin-only')
  const newRes = { name: `E2E Resource ${Date.now()}`, category: 'Meeting room', description: 'temp', location: 'Test floor', capacity: '4 seats', status: 'AVAILABLE' }
  check('normal user cannot create a resource → 403', (await nimal.post('/api/resources', newRes)).status === 403)
  const made = await dilan.post('/api/resources', newRes)
  check('admin creates a resource → 201', made.status === 201, JSON.stringify(made.error))
  check('duplicate name → 409', (await dilan.post('/api/resources', newRes)).status === 409)
  check('normal user cannot edit a resource → 403', (await nimal.patch(`/api/resources/${made.data.id}`, { status: 'UNAVAILABLE' })).status === 403)
  check('normal user cannot delete a resource → 403', (await nimal.del(`/api/resources/${made.data.id}`)).status === 403)
  const edited = await dilan.patch(`/api/resources/${made.data.id}`, { status: 'MAINTENANCE', location: 'Moved floor' })
  check('admin edits resource', edited.status === 200 && edited.data.availability === 'Maintenance' && edited.data.location === 'Moved floor')
  check('resource visible to normal users', (await nimal.get('/api/resources')).data.some((r) => r.id === made.data.id))
  await dilan.patch(`/api/resources/${made.data.id}`, { status: 'AVAILABLE' })
  const used = await book(nimal, made.data.id, '09:00', '10:00', 'uses temp resource')
  check('resource with upcoming reservation cannot be deleted', (await dilan.del(`/api/resources/${made.data.id}`)).status === 409)
  await nimal.del(`/api/reservations/${used.data.id}`)
  const deact = await dilan.del(`/api/resources/${made.data.id}`)
  check('resource with history is deactivated (history kept)', deact.status === 200 && deact.data.result === 'deactivated')
  check('deactivated resource disappears from lists', !(await nimal.get('/api/resources')).data.some((r) => r.id === made.data.id))
  const neverUsed = await dilan.post('/api/resources', { ...newRes, name: `E2E Unused ${Date.now()}` })
  check('never-used resource is hard-deleted', (await dilan.del(`/api/resources/${neverUsed.data.id}`)).data?.result === 'deleted')

  section('TEST 9 — User management is admin-only')
  const depts = (await dilan.get('/api/departments')).data
  const newUser = { fullName: 'E2E Tester', email: `e2e.${Date.now()}@company.com`, departmentId: depts[0].id, role: 'USER', status: 'ACTIVE', password: 'Temp@12345' }
  check('normal user cannot create users → 403', (await nimal.post('/api/users', newUser)).status === 403)
  const u = await dilan.post('/api/users', newUser)
  check('admin creates a user → 201', u.status === 201, JSON.stringify(u.error))
  check('response has no password data', !JSON.stringify(u.raw).toLowerCase().includes('password'))
  check('duplicate email → 409', (await dilan.post('/api/users', newUser)).status === 409)
  check('normal user cannot edit users → 403', (await nimal.patch(`/api/users/${u.data.id}`, { role: 'ADMIN' })).status === 403)
  const tester = await login('tester', newUser.email, newUser.password)
  check('new user can sign in', (await tester.get('/api/auth/me')).status === 200)
  const moved = await dilan.patch(`/api/users/${u.data.id}`, { departmentId: depts[1].id, role: 'ADMIN' })
  check('admin changes department & role', moved.status === 200 && moved.data.departmentId === depts[1].id && moved.data.role === 'ADMIN')
  const deactivated = await dilan.patch(`/api/users/${u.data.id}`, { status: 'INACTIVE' })
  check('admin deactivates user', deactivated.status === 200 && deactivated.data.status === 'INACTIVE')
  check('deactivated user is signed out immediately', (await tester.get('/api/auth/me')).status === 401)
  const blocked = await client('b').post('/api/auth/login', { email: newUser.email, password: newUser.password })
  check('deactivated user cannot log in → 403', blocked.status === 403)
  check('admin cannot demote/deactivate themselves', (await dilan.patch('/api/users/' + (await dilan.get('/api/auth/me')).data.user.id, { status: 'INACTIVE' })).status === 400)

  section('TEST 11 — Dashboard matches the database')
  const todayStr = dayStr(0)
  const todaysList = (await nimal.get(`/api/reservations?date=${todayStr}`)).data.filter((r) => r.status !== 'CANCELLED')
  const dashNow = (await nimal.get('/api/dashboard')).data
  check("today's reservation count matches the list", dashNow.todaysReservations === todaysList.length, `${dashNow.todaysReservations} vs ${todaysList.length}`)
  const allRes = (await nimal.get('/api/resources')).data
  const free = allRes.filter((r) => r.availability === 'Available').length
  check('"available now" matches resource availability', dashNow.availableNow === free, `${dashNow.availableNow} vs ${free}`)
  check('rooms + assets = available', dashNow.roomsOpen + dashNow.assetsOpen === dashNow.availableNow)

  section('TEST 12 — Calendar')
  const calToday = (await nimal.get('/api/calendar')).data
  check('defaults to today', calToday.isToday === true && calToday.date === todayStr)
  check('one row per active resource', calToday.rows.length === allRes.length)
  check('invalid date falls back safely', (await nimal.get('/api/calendar?date=nonsense')).data.isToday === true)

  section('Misc security')
  const cross = await fetch(BASE + '/api/reservations', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example', cookie: '' }, body: '{}' })
  check('cross-site POST is blocked', cross.status === 403 || cross.status === 401)
  check('GET /api/users never exposes passwordHash', !JSON.stringify((await nimal.get('/api/users')).raw).toLowerCase().includes('hash'))
  await nimal.post('/api/auth/logout')
  check('logout destroys the session', (await nimal.get('/api/auth/me')).status === 401)
}

main()
  .catch((e) => { failed++; console.error('\nFATAL:', e.message) })
  .finally(async () => {
    // cleanup: cancel everything created (best effort; each reservation can only be cancelled by its owner)
    try {
      const owners = [await login('nimal', 'nimal@company.com', USER_PW), await login('sarah', 'sarah@company.com', USER_PW)]
      for (const { id } of created) for (const o of owners) await o.del(`/api/reservations/${id}`).catch(() => {})
    } catch {}
    console.log(`\n${passed} passed, ${failed} failed`)
    process.exit(failed ? 1 : 0)
  })
