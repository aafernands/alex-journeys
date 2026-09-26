/**
 * Small in-memory stand-in for the Firestore Admin API, enough for the
 * trips limit and member downloads tests. Paths are "col/doc/col/doc".
 */
let autoId = 0;

export function createFakeFirestore() {
  const docs = new Map();

  function childrenOf(path) {
    const depth = path.split("/").length + 1;
    return [...docs.entries()].filter(
      ([key]) => key.startsWith(`${path}/`) && key.split("/").length === depth,
    );
  }

  function docRef(path) {
    const id = path.split("/").pop();
    return {
      id,
      path,
      async get() {
        const data = docs.get(path);
        return { id, exists: data !== undefined, data: () => (data ? { ...data } : undefined), ref: docRef(path) };
      },
      async set(data) {
        docs.set(path, { ...data });
      },
      async update(patch) {
        if (!docs.has(path)) throw new Error(`No document to update: ${path}`);
        docs.set(path, { ...docs.get(path), ...patch });
      },
      async delete() {
        docs.delete(path);
      },
      collection(name) {
        return collectionRef(`${path}/${name}`);
      },
    };
  }

  function snapshot(entries) {
    const list = entries.map(([key, data]) => ({
      id: key.split("/").pop(),
      data: () => ({ ...data }),
      ref: docRef(key),
    }));
    return { empty: list.length === 0, docs: list, size: list.length };
  }

  function query(path, filters = [], order = null) {
    const run = () => {
      let entries = childrenOf(path);
      for (const [field, value] of filters) entries = entries.filter(([, d]) => d[field] === value);
      if (order) {
        const [field, dir] = order;
        entries.sort(([, a], [, b]) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0));
        if (dir === "desc") entries.reverse();
      }
      return entries;
    };
    return {
      where(field, op, value) {
        if (op !== "==") throw new Error("fake supports == only");
        return query(path, [...filters, [field, value]], order);
      },
      orderBy(field, dir = "asc") {
        return query(path, filters, [field, dir]);
      },
      limit() {
        return query(path, filters, order);
      },
      count() {
        return { get: async () => ({ data: () => ({ count: run().length }) }) };
      },
      async get() {
        return snapshot(run());
      },
    };
  }

  function collectionRef(path) {
    return {
      ...query(path),
      doc(id) {
        autoId += 1;
        return docRef(`${path}/${id ?? `auto${autoId}`}`);
      },
      firestore: db,
    };
  }

  const db = {
    collection: (name) => collectionRef(name),
    batch() {
      const ops = [];
      return {
        set: (ref, data) => ops.push(() => ref.set(data)),
        update: (ref, data) => ops.push(() => ref.update(data)),
        delete: (ref) => ops.push(() => ref.delete()),
        async commit() {
          for (const op of ops) await op();
        },
      };
    },
    _docs: docs,
  };
  return db;
}
