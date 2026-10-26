/* PRD Diff & Merge untuk PRD Studio.
   Membandingkan dua versi PRD dan menghasilkan diff + merge.
   ES5 murni tanpa bundler. */
(function () {
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function flattenSpec(spec) {
    spec = spec || {};
    var flat = {};
    // meta
    if (spec.meta) {
      Object.keys(spec.meta).forEach(function (k) { flat['meta.' + k] = spec.meta[k]; });
    }
    // answers
    if (spec.answers) {
      Object.keys(spec.answers).forEach(function (k) { flat['answers.' + k] = spec.answers[k]; });
    }
    // entities
    if (spec.entities) {
      spec.entities.forEach(function (e, i) {
        flat['entities[' + i + '].label'] = e.label;
        (e.fields || []).forEach(function (f, j) {
          flat['entities[' + i + '].fields[' + j + ']'] = f.n + ':' + f.t;
        });
      });
    }
    // endpoints
    if (spec.endpoints) {
      spec.endpoints.forEach(function (ep, i) {
        flat['endpoints[' + i + ']'] = ep.m + ' ' + ep.p;
      });
    }
    return flat;
  }

  function diffSpecs(specA, specB) {
    var flatA = flattenSpec(specA);
    var flatB = flattenSpec(specB);
    var allKeys = {};
    Object.keys(flatA).forEach(function (k) { allKeys[k] = true; });
    Object.keys(flatB).forEach(function (k) { allKeys[k] = true; });

    var added = [];
    var removed = [];
    var changed = [];
    var unchanged = [];

    Object.keys(allKeys).forEach(function (k) {
      var inA = flatA.hasOwnProperty(k);
      var inB = flatB.hasOwnProperty(k);
      if (inA && !inB) {
        removed.push({ key: k, value: flatA[k] });
      } else if (!inA && inB) {
        added.push({ key: k, value: flatB[k] });
      } else if (flatA[k] !== flatB[k]) {
        changed.push({ key: k, oldValue: flatA[k], newValue: flatB[k] });
      } else {
        unchanged.push({ key: k, value: flatA[k] });
      }
    });

    return {
      added: added,
      removed: removed,
      changed: changed,
      unchanged: unchanged,
      totalChanges: added.length + removed.length + changed.length,
      hasChanges: (added.length + removed.length + changed.length) > 0
    };
  }

  function mergeSpecs(specA, specB, strategy) {
    strategy = strategy || 'union'; // 'union' | 'theirs' | 'ours' | 'interactive'
    var result = JSON.parse(JSON.stringify(specA || {}));

    if (strategy === 'theirs') {
      return JSON.parse(JSON.stringify(specB || {}));
    }
    if (strategy === 'ours') {
      return JSON.parse(JSON.stringify(specA || {}));
    }

    // union: merge entities, endpoints, answers (B overrides A for conflicts)
    if (specB) {
      if (specB.meta) {
        result.meta = result.meta || {};
        Object.keys(specB.meta).forEach(function (k) { result.meta[k] = specB.meta[k]; });
      }
      if (specB.answers) {
        result.answers = result.answers || {};
        Object.keys(specB.answers).forEach(function (k) { result.answers[k] = specB.answers[k]; });
      }
      // Merge entities by label
      if (specB.entities) {
        result.entities = result.entities || [];
        var existingLabels = result.entities.map(function (e) { return e.label; });
        specB.entities.forEach(function (e) {
          if (existingLabels.indexOf(e.label) === -1) {
            result.entities.push(JSON.parse(JSON.stringify(e)));
            existingLabels.push(e.label);
          }
        });
      }
      // Merge endpoints (dedupe by m+p)
      if (specB.endpoints) {
        result.endpoints = result.endpoints || [];
        var existingEPs = result.endpoints.map(function (ep) { return ep.m + ' ' + ep.p; });
        specB.endpoints.forEach(function (ep) {
          var key = ep.m + ' ' + ep.p;
          if (existingEPs.indexOf(key) === -1) {
            result.endpoints.push(JSON.parse(JSON.stringify(ep)));
            existingEPs.push(key);
          }
        });
      }
    }
    return result;
  }

  function diffMarkdown(diff) {
    diff = diff || {};
    var lines = [];
    lines.push('# PRD Diff Report');
    lines.push('');
    lines.push('**Total changes:** ' + (diff.totalChanges || 0));
    lines.push('');
    if (diff.added && diff.added.length) {
      lines.push('## Added (' + diff.added.length + ')');
      diff.added.forEach(function (a) { lines.push('+ ' + a.key + ': ' + a.value); });
      lines.push('');
    }
    if (diff.removed && diff.removed.length) {
      lines.push('## Removed (' + diff.removed.length + ')');
      diff.removed.forEach(function (r) { lines.push('- ' + r.key + ': ' + r.value); });
      lines.push('');
    }
    if (diff.changed && diff.changed.length) {
      lines.push('## Changed (' + diff.changed.length + ')');
      diff.changed.forEach(function (c) { lines.push('~ ' + c.key + ': ' + c.oldValue + ' -> ' + c.newValue); });
      lines.push('');
    }
    if (diff.unchanged && diff.unchanged.length) {
      lines.push('## Unchanged (' + diff.unchanged.length + ')');
    }
    return lines.join('\n');
  }

  function summary(diff) {
    diff = diff || {};
    return {
      added: (diff.added || []).length,
      removed: (diff.removed || []).length,
      changed: (diff.changed || []).length,
      unchanged: (diff.unchanged || []).length,
      total: diff.totalChanges || 0
    };
  }

  window.PRDDiff = {
    flattenSpec: flattenSpec,
    diffSpecs: diffSpecs,
    mergeSpecs: mergeSpecs,
    diffMarkdown: diffMarkdown,
    summary: summary
  };
})();
