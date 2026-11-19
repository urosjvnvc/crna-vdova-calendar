const ROOM_MCP_URL = 'VSTAVI_NASLOV_MCP';

function namesti() {
  if (!/^https:\/\//.test(ROOM_MCP_URL)) throw new Error('V prvo vrstico vpiši naslov MCP svoje sobe.');
  const p = props();
  if (!p.getProperty('key')) p.setProperty('key', 'gcal-' + Utilities.getUuid());
  if (!p.getProperty('registered')) {
    room('register_agent', {agent_key: p.getProperty('key'), display_name: 'Google Koledar'});
    p.setProperty('registered', '1');
  }
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'uskladi');
  if (!triggers.some(t => t.getEventType() === ScriptApp.EventType.ON_EVENT_UPDATED))
    ScriptApp.newTrigger('uskladi').forUserCalendar(CalendarApp.getDefaultCalendar().getId()).onEventUpdated().create();
  if (!triggers.some(t => t.getEventType() === ScriptApp.EventType.CLOCK))
    ScriptApp.newTrigger('uskladi').timeBased().everyMinutes(15).create();
  uskladi();
}

function uskladi() {
  const lock = LockService.getUserLock();
  if (!lock.tryLock(5000)) return;
  try {
    syncRoom();
    prikaziZasedenost();
  } finally { lock.releaseLock(); }
}

const props = () => PropertiesService.getUserProperties();

function room(tool, args) {
  const response = UrlFetchApp.fetch(ROOM_MCP_URL, {
    method: 'post', contentType: 'application/json',
    headers: {Accept: 'application/json, text/event-stream'},
    payload: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: {name: tool, arguments: args}})
  }).getContentText();
  const line = response.split('\n').find(s => s.startsWith('data:'));
  const msg = JSON.parse(line ? line.slice(5) : response);
  if (!msg.result || msg.result.isError) throw new Error('Neuspešen klic ' + tool);
  return msg.result.structuredContent || JSON.parse(msg.result.content[0].text);
}

function syncRoom() {
  const now = new Date();
  const until = new Date(+now + 180 * 86400000);
  const p = props();
  const key = p.getProperty('key');
  const wanted = new Map();
  for (const ev of CalendarApp.getDefaultCalendar().getEvents(now, until)) {
    if (ev.isAllDayEvent() || ev.getMyStatus() === CalendarApp.GuestStatus.NO) continue;
    const address = /\bdunajska\s+cesta\s+5[\s,]+(?:1000\s+)?ljubljana\b/i;
    if (![ev.getLocation(), ev.getTitle()].some(v => address.test(v)) &&
        !/(?:^|\s)#sejna\b/i.test(ev.getTitle() + ' ' + ev.getDescription())) continue;
    const start = ev.getStartTime();
    const end = ev.getEndTime();
    const ref = 'gcal-' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, ev.getId() + '/' + start.toISOString()));
    wanted.set(ref, {start, end, title: ev.getTitle()});
  }
  const result = room('list_bookings', {from: now.toISOString(), to: until.toISOString(), agent_key: key});
  const rows = Array.isArray(result) ? result : result.bookings;
  const confirmed = new Set();
  const busy = [];
  for (const row of rows) {
    const ev = wanted.get(row.notes);
    const owned = row.mine === true && /^gcal-/.test(row.notes);
    if (owned && (!ev || +ev.end !== Date.parse(row.ends_at))) {
      room('cancel_booking', {agent_key: key, booking_id: row.id});
      continue;
    }
    busy.push([Date.parse(row.starts_at), Date.parse(row.ends_at)]);
    if (owned && ev) confirmed.add(row.notes);
  }
  for (const [ref, ev] of wanted) {
    if (confirmed.has(ref)) continue;
    if (busy.some(([s,e]) => s < ev.end && e > ev.start)) {
      statusMail(ref, ev, 'Termin je zaseden. Soba ni rezervirana.');
      continue;
    }
    room('create_booking', {agent_key: key, title: 'Sejna soba', notes: ref,
      starts_at: ev.start.toISOString(), duration_minutes: Math.ceil((ev.end - ev.start) / 60000)});
    busy.push([+ev.start, +ev.end]);
    confirmed.add(ref);
  }
  for (const ref of confirmed) statusMail(ref, wanted.get(ref), 'Rezervacija je potrjena.');
  for (const name of Object.keys(p.getProperties()))
    if (name.startsWith('gcal-') && !wanted.has(name)) p.deleteProperty(name);
}

function statusMail(ref, ev, message) {
  const state = message + ev.end.toISOString();
  if (props().getProperty(ref) === state) return;
  const local = d => Utilities.formatDate(d, 'Europe/Ljubljana', 'dd.MM.yyyy HH:mm');
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Črna vdova – ' + message,
    ev.title + '\n' + local(ev.start) + ' – ' + local(ev.end) + '\n' + message);
  props().setProperty(ref, state);
}

function prikaziZasedenost() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(+from + 180 * 86400000);
  const result = room('list_bookings', {from: from.toISOString(), to: to.toISOString()});
  const rows = Array.isArray(result) ? result : result.bookings;
  const pending = new Map(rows.map(row => [row.id, row]));
  const p = props();
  let calendar = p.getProperty('occupancyCalendarId') &&
      CalendarApp.getCalendarById(p.getProperty('occupancyCalendarId'));
  if (!calendar) {
    calendar = CalendarApp.createCalendar('Črna vdova – zasedenost', {
      timeZone: 'Europe/Ljubljana', selected: true,
      description: 'Zasedeni termini sejne sobe na Dunajski cesti 5.'
    });
    p.setProperty('occupancyCalendarId', calendar.getId());
  }
  const prefix = 'Rezervacija sobe · ';
  const title = 'Zasedeno · Črna vdova';
  for (const event of calendar.getEvents(from, to)) {
    const note = event.getDescription() || '';
    if (!note.startsWith(prefix)) continue;
    const id = note.slice(prefix.length);
    const row = pending.get(id);
    if (!row) {
      event.deleteEvent();
      continue;
    }
    const start = new Date(row.starts_at), end = new Date(row.ends_at);
    if (+event.getStartTime() !== +start || +event.getEndTime() !== +end)
      event.setTime(start, end);
    pending.delete(id);
  }
  for (const row of pending.values())
    calendar.createEvent(title, new Date(row.starts_at), new Date(row.ends_at),
      {description: prefix + row.id});
}
