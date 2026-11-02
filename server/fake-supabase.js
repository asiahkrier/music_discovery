// Test-only fake of the Supabase client: in-memory tables, simple filters,
// and auth that treats the bearer token as the user ID ('invalid' means logged out).
export function fakeDatabase(tableNames) {
  const tables = Object.fromEntries(tableNames.map(name => [name, []]));
  return { tables, auth: { getUser: async token => ({ data: { user: token === 'invalid' ? null : { id: token } } }) }, from(name) {
    let mode = 'select', value, filters = [], single = false;
    // A real Promise runs after the synchronous query-builder methods set the filters.
    const query = Promise.resolve().then(() => {
      let rows = tables[name].filter(r => filters.every(f => f(r)));
      if (mode === 'upsert') { tables[name] = tables[name].filter(r => r.user_id !== value.user_id); tables[name].push(structuredClone(value)); rows = [value]; }
      if (mode === 'delete') tables[name] = tables[name].filter(r => !rows.includes(r));
      if (mode === 'update') rows.forEach(r => Object.assign(r, structuredClone(value)));
      return { data: structuredClone(single ? rows[0] || null : rows), error: null };
    });
    return Object.assign(query, {
      select() { return query; }, maybeSingle() { single = true; return query; },
      eq(k, v) { filters.push(r => r[k] === v); return query; },
      gt(k, v) { filters.push(r => r[k] > v); return query; },
      lt(k, v) { filters.push(r => r[k] < v); return query; },
      order() { return query; }, limit() { return query; },
      delete() { mode = 'delete'; return query; }, update(v) { mode = 'update'; value = v; return query; }, upsert(v) { mode = 'upsert'; value = v; return query; },
    });
  } };
}
