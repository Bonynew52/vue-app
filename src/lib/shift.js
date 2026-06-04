// Staff shift windows for Belly Monster Bites.
//
// Per the operations transcript the store opens with a morning shift at 08:00,
// and a second person takes over the afternoon shift at 15:30 (and is expected
// to log in under their own account). These helpers are shared by the login
// prefill and the dashboard shift badge / forced sign-out on shift change.

const AFTERNOON_START_MIN = 15 * 60 + 30 // 15:30

export const shiftStaffEmails = {
  morning: 'staff@bellymonsterbites.com',
  afternoon: 'staff.tarde@bellymonsterbites.com',
}

function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes()
}

// Which shift is active at `date`. Anything from midnight up to 15:30 counts as
// the morning shift (the store opens at 08:00); 15:30 onward is the afternoon.
export function currentShift(date = new Date()) {
  return minutesOfDay(date) >= AFTERNOON_START_MIN ? 'afternoon' : 'morning'
}

// Start instant of the shift that is active at `date`.
export function shiftStart(date = new Date()) {
  const start = new Date(date)
  if (currentShift(date) === 'afternoon') {
    start.setHours(15, 30, 0, 0)
  } else {
    // The public store opening is 08:00, but staff may sign in earlier for prep.
    // Midnight cleanly expires the previous afternoon without kicking out the
    // morning person again right at opening time.
    start.setHours(0, 0, 0, 0)
  }
  return start
}

// When the active shift hands over to the next one.
export function nextShiftChange(date = new Date()) {
  const change = new Date(date)
  if (currentShift(date) === 'morning') {
    change.setHours(15, 30, 0, 0)
  } else {
    // The afternoon shift rolls over to the next morning's 08:00 opening.
    change.setDate(change.getDate() + 1)
    change.setHours(8, 0, 0, 0)
  }
  return change
}

export function shiftLabel(shift) {
  return shift === 'afternoon' ? 'Turno tarde' : 'Turno mañana'
}

export function shiftStaffEmail(shift) {
  return shiftStaffEmails[shift] || shiftStaffEmails.morning
}

export function formatShiftTime(date) {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(date)
}
