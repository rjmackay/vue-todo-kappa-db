import makeView from "kappa-view";
import HLC from "@consento/hlc";

const makeKvView = (storage) => {
  return makeView(storage, { valueEncoding: "json" }, function (db) {
    return {
      map: function (entries, next) {
        Promise.allSettled(
          entries.map(function (entry) {
            const { key, type, ...value } = entry.value;
            value.tombstone = type === "del"; // Never remove records, only tombstone.
            return db
              .get(key)
              .then(({ ts }) => {
                if (ts) {
                  const oldTS = new HLC.Timestamp(ts);
                  const newTS = new HLC.Timestamp(value.ts);
                  // If newTS is older, don't apply this entry
                  if (newTS.compare(oldTS) == -1) {
                    return {};
                  }
                }
                return { type: "put", key, value };
              })
              .catch(() => {
                return { type: "put", key, value };
              });
          })
        ).then((batch) => {
          db.batch(
            batch.map(({ value }) => value).filter(({ key }) => !!key),
            next
          );
        });
      },

      api: {
        get: function (core, key, cb) {
          core.ready(() => {
            db.get(key, (entry) => {
              if (!entry.tombstone) {
                cb(entry);
              } else {
                cb(null);
              }
            });
          });
        },
        all: function (core, cb) {
          core.ready(() => {
            const data = [];
            db.createReadStream()
              .on("data", (entry) => {
                if (!entry.value?.tombstone) {
                  data.push(entry);
                }
              })
              .on("end", () => {
                cb(data);
              });
          });
        },
        on: (core, event, cb) => {
          core.ready(() => {
            db.on(event, cb);
          });
        },
      },
    };
  });
};
export default makeKvView;
