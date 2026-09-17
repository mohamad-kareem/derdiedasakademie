export function lookup(dict, key) {
  return key.split(".").reduce((obj, k) => (obj == null ? undefined : obj[k]), dict);
}

export function makeT(dict, fallback) {
  return function t(key, vars) {
    let value = lookup(dict, key);
    if (value === undefined && fallback) value = lookup(fallback, key);
    if (value === undefined) return key;
    if (typeof value === "string" && vars) {
      value = value.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`));
    }
    return value;
  };
}
