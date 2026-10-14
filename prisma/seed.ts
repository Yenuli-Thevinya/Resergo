/**
 * Development seed data.   Run with:  npm run db:seed
 *
 * LOCAL DEVELOPMENT ONLY — the demo passwords below are public. Never run this
 * against a production database (it also clears all reservations and sessions).
 */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { DateTime } from 'luxon'
import { PrismaClient } from '../src/generated/prisma/client'

const TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Asia/Colombo'
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

const ADMIN_PASSWORD = 'Admin@12345'
const USER_PASSWORD = 'User@12345'

/** day offset from today + "HH:mm" in the app time zone -> Date */
function at(dayOffset: number, time: string): Date {
  const [h, m] = time.split(':').map(Number)
  return DateTime.now().setZone(TZ).startOf('day').plus({ days: dayOffset }).set({ hour: h, minute: m }).toJSDate()
}

async function main() {
  // Departments
  const departments: Record<string, number> = {}
  for (const name of ['IT Department', 'Marketing', 'Finance', 'Human Resources']) {
    const d = await prisma.department.upsert({ where: { name }, update: {}, create: { name } })
    departments[name] = d.id
  }

  // Users
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  const userHash = await bcrypt.hash(USER_PASSWORD, 12)
  const people = [
    { fullName: 'Dilan Fernando', email: 'dilan@company.com', dept: 'Finance', role: 'ADMIN' as const, hash: adminHash },
    { fullName: 'Nimal Perera', email: 'nimal@company.com', dept: 'IT Department', role: 'USER' as const, hash: userHash },
    { fullName: 'Sarah Silva', email: 'sarah@company.com', dept: 'Marketing', role: 'USER' as const, hash: userHash },
  ]
  const users: Record<string, number> = {}
  for (const p of people) {
    const u = await prisma.user.upsert({
      where: { email: p.email },
      update: { fullName: p.fullName, departmentId: departments[p.dept], role: p.role, status: 'ACTIVE', passwordHash: p.hash },
      create: { fullName: p.fullName, email: p.email, departmentId: departments[p.dept], role: p.role, passwordHash: p.hash },
    })
    users[p.email] = u.id
  }

  // Resources
  const resourceData = [
    { name: 'Meeting Room A', category: 'Meeting room', location: '1st floor', capacity: '10 seats', description: 'Bright room with a wall display and whiteboard.', status: 'AVAILABLE' as const },
    { name: 'Conference Room B', category: 'Conference room', location: '2nd floor', capacity: '20 seats', description: 'Large conference room with video-call equipment.', status: 'AVAILABLE' as const },
    { name: 'Projector 01', category: 'Equipment', location: 'IT storage', capacity: 'Portable', description: 'Portable HD projector with HDMI and USB-C adapters.', status: 'AVAILABLE' as const },
    { name: 'Laptop Kit 04', category: 'Equipment', location: 'IT storage', capacity: '12 devices', description: 'Cart of 12 laptops for workshops and training.', status: 'AVAILABLE' as const },
    { name: 'Training Room C', category: 'Meeting room', location: '3rd floor', capacity: '16 seats', description: 'Classroom-style training room.', status: 'MAINTENANCE' as const },
    { name: 'Boardroom', category: 'Conference room', location: '2nd floor', capacity: '14 seats', description: 'Executive boardroom with a presentation screen.', status: 'AVAILABLE' as const },
  ]
  const resources: Record<string, number> = {}
  for (const r of resourceData) {
    const row = await prisma.resource.upsert({ where: { name: r.name }, update: { ...r, isActive: true }, create: r })
    resources[r.name] = row.id
  }

  // Sample reservations (relative to "today" so the dashboard always has data). Resets existing ones.
  await prisma.session.deleteMany()
  await prisma.reservation.deleteMany()

  const nimal = users['nimal@company.com']
  const sarah = users['sarah@company.com']
  const dilan = users['dilan@company.com']

  await prisma.reservation.createMany({
    data: [
      { resourceId: resources['Meeting Room A'], userId: nimal, startTime: at(0, '10:00'), endTime: at(0, '11:00'), purpose: 'Development meeting' },
      { resourceId: resources['Conference Room B'], userId: sarah, startTime: at(0, '13:00'), endTime: at(0, '14:00'), purpose: 'Campaign discussion' },
      { resourceId: resources['Projector 01'], userId: dilan, startTime: at(0, '11:00'), endTime: at(0, '13:00'), purpose: 'Quarterly review' },
      { resourceId: resources['Boardroom'], userId: sarah, startTime: at(1, '09:00'), endTime: at(1, '10:30'), purpose: 'Planning session' },
      { resourceId: resources['Laptop Kit 04'], userId: nimal, startTime: at(1, '14:00'), endTime: at(1, '15:00'), purpose: 'Onboarding workshop' },
      { resourceId: resources['Meeting Room A'], userId: dilan, startTime: at(2, '09:00'), endTime: at(2, '10:00'), purpose: 'Budget check-in' },
      // history
      { resourceId: resources['Meeting Room A'], userId: sarah, startTime: at(-1, '10:00'), endTime: at(-1, '11:00'), purpose: 'Weekly sync', status: 'COMPLETED' },
      { resourceId: resources['Conference Room B'], userId: nimal, startTime: at(-1, '14:00'), endTime: at(-1, '15:00'), purpose: 'Client call', status: 'CANCELLED' },
    ],
  })

  console.log('Seed complete.')
  console.log('  Admin : dilan@company.com / ' + ADMIN_PASSWORD)
  console.log('  Users : nimal@company.com, sarah@company.com / ' + USER_PASSWORD)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
